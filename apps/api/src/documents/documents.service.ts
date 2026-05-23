import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { getQueue } from '../queue/bullmq.client';
import { QUEUE_NAMES } from '../queue/queues';
import type { AuthPrincipal } from '../common/types/authenticated-request';
import type { CreateDocumentDto } from './dto/create-document.dto';
import type { ListDocumentsDto } from './dto/list-documents.dto';
import type { DocumentIngestJob } from './ingest.worker';

export type UploadedDocumentFile = {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
};

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async create(dto: CreateDocumentDto, file: UploadedDocumentFile | undefined, user: AuthPrincipal): Promise<unknown> {
    if (!file) throw new BadRequestException('Document file is required');
    const stored = await this.storage.putBuffer(user.tenantId, file.originalname, file.buffer);
    const title = dto.title?.trim() || file.originalname;
    const visibility = this.parseVisibility(dto.visibility);

    const document = await this.prisma.scoped.document.create({
      data: {
        tenantId: user.tenantId,
        title,
        filename: file.originalname,
        mimeType: file.mimetype,
        storageKey: stored.key,
        lang: dto.lang,
        category: dto.category ?? null,
        visibility,
        uploadedById: user.userId,
        status: 'PROCESSING',
      },
    });

    await this.enqueue({ documentId: document.id, tenantId: user.tenantId });
    return document;
  }

  async list(query: ListDocumentsDto): Promise<unknown> {
    const where = query.status
      ? { status: query.status as 'PROCESSING' | 'READY' | 'FAILED' | 'OUTDATED' }
      : {};
    return this.prisma.scoped.document.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { uploadedBy: { select: { id: true, fullName: true, email: true } } },
    });
  }

  async get(id: string): Promise<unknown> {
    const document = await this.prisma.scoped.document.findUnique({
      where: { id },
      include: {
        uploadedBy: { select: { id: true, fullName: true, email: true } },
        chunks: {
          orderBy: { chunkIndex: 'asc' },
          select: { id: true, chunkIndex: true, page: true, section: true, tokenCount: true, createdAt: true },
        },
      },
    });
    if (!document) throw new NotFoundException('Document not found');
    return document;
  }

  async remove(id: string): Promise<void> {
    const document = await this.prisma.scoped.document.findUnique({ where: { id } });
    if (!document) throw new NotFoundException('Document not found');
    await this.prisma.scoped.document.delete({ where: { id } });
    await this.storage.remove(document.storageKey);
  }

  async reprocess(id: string, user: AuthPrincipal): Promise<unknown> {
    const document = await this.prisma.scoped.document.findUnique({ where: { id } });
    if (!document) throw new NotFoundException('Document not found');
    await this.prisma.scoped.document.update({
      where: { id },
      data: { status: 'PROCESSING', chunkCount: 0 },
    });
    await this.enqueue({ documentId: id, tenantId: user.tenantId });
    return { ok: true };
  }

  private async enqueue(job: DocumentIngestJob): Promise<void> {
    await getQueue(QUEUE_NAMES.documentsIngest).add('ingest', job, { jobId: job.documentId });
  }

  private parseVisibility(value: string | undefined): string[] {
    if (!value?.trim()) return [];
    return value.split(',').map((part) => part.trim()).filter(Boolean);
  }
}
