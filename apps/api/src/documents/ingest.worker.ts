import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Worker } from 'bullmq';
import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';
import { requestContext } from '../common/request-context';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { EmbeddingsService } from '../ai/embeddings/embeddings.service';
import { chunkText } from '../ai/embeddings/chunker';
import { startWorker } from '../queue/bullmq.client';
import { QUEUE_NAMES } from '../queue/queues';

export type DocumentIngestJob = {
  documentId: string;
  tenantId: string;
};

type ExtractedText = {
  text: string;
  pages: number | null;
};

function vectorSql(embedding: number[]): Prisma.Sql {
  const vec = `[${embedding.map((value) => {
    if (!Number.isFinite(value)) throw new Error('Embedding contains a non-finite value');
    return String(value);
  }).join(',')}]`;
  return Prisma.raw(`'${vec}'::vector`);
}

@Injectable()
export class IngestWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IngestWorker.name);
  private worker: Worker<DocumentIngestJob> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly embeddings: EmbeddingsService,
  ) {}

  onModuleInit(): void {
    this.worker = startWorker<DocumentIngestJob>(QUEUE_NAMES.documentsIngest, (data, jobId) =>
      this.process(data, jobId),
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
  }

  async process(job: DocumentIngestJob, jobId: string): Promise<void> {
    this.logger.log(`ingest job ${jobId} started for document ${job.documentId}`);
    try {
      const document = await this.prisma.document.findFirst({
        where: { id: job.documentId, tenantId: job.tenantId },
      });
      if (!document) throw new Error(`Document not found: ${job.documentId}`);

      const data = await this.storage.readBuffer(document.storageKey);
      const extracted = await this.extractText(document.mimeType, data);
      const chunks = chunkText(extracted.text);
      const vectors = await this.embeddings.embedBatch(chunks.map((chunk) => chunk.text));

      await requestContext.run({ requestId: `ingest:${jobId}`, tenantId: document.tenantId }, async () => {
        await this.prisma.scoped.documentChunk.deleteMany({ where: { documentId: document.id } });

        for (let index = 0; index < chunks.length; index += 1) {
          const chunk = chunks[index];
          const embedding = vectors[index];
          if (!chunk || !embedding) throw new Error(`Missing chunk or embedding at index ${index}`);

          const created = await this.prisma.scoped.documentChunk.create({
            data: {
              tenantId: document.tenantId,
              documentId: document.id,
              chunkIndex: index,
              text: chunk.text,
              page: null,
              section: chunk.headerHint,
              tokenCount: chunk.tokenCount,
            },
          });

          await this.prisma.$executeRaw(Prisma.sql`
            UPDATE "DocumentChunk"
            SET embedding = ${vectorSql(embedding)}
            WHERE id = ${created.id}
              AND "tenantId" = ${document.tenantId}
          `);
        }

        await this.prisma.scoped.document.update({
          where: { id: document.id },
          data: {
            status: 'READY',
            chunkCount: chunks.length,
            pages: extracted.pages,
          },
        });
      });
      this.logger.log(`ingest job ${jobId} completed for document ${job.documentId}`);
    } catch (error) {
      this.logger.error(`ingest job ${jobId} failed for document ${job.documentId}`, (error as Error).stack);
      await requestContext.run({ requestId: `ingest:${jobId}`, tenantId: job.tenantId }, async () => {
        await this.prisma.scoped.document
          .update({ where: { id: job.documentId }, data: { status: 'FAILED' } })
          .catch((updateError: unknown) => {
            this.logger.error(`failed to mark document ${job.documentId} as FAILED`, (updateError as Error).stack);
          });
      });
      throw error;
    }
  }

  private async extractText(mimeType: string, data: Buffer): Promise<ExtractedText> {
    if (mimeType === 'application/pdf') {
      const parser = new PDFParse({ data });
      try {
        const result = await parser.getText();
        return { text: result.text, pages: result.total || null };
      } finally {
        await parser.destroy();
      }
    }

    if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimeType === 'application/msword'
    ) {
      const result = await mammoth.extractRawText({ buffer: data });
      return { text: result.value, pages: null };
    }

    return { text: data.toString('utf8'), pages: null };
  }
}
