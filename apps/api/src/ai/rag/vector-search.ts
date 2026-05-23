import { Prisma, type PrismaClient } from '@prisma/client';
import type { SearchResult } from './search-types';

function vectorLiteral(embedding: number[]): Prisma.Sql {
  const vec = `[${embedding.map((value) => {
    if (!Number.isFinite(value)) throw new Error('Embedding contains a non-finite value');
    return String(value);
  }).join(',')}]`;
  return Prisma.raw(`'${vec}'::vector`);
}

export async function vectorSearch(
  prisma: PrismaClient,
  tenantId: string,
  embedding: number[],
  limit = 20,
): Promise<SearchResult[]> {
  return prisma.$queryRaw<SearchResult[]>(Prisma.sql`
    SELECT dc.id,
           dc."documentId",
           d.title,
           dc.text,
           dc.page,
           dc.section,
           1 - (dc.embedding <=> ${vectorLiteral(embedding)}) AS score
    FROM "DocumentChunk" dc
    JOIN "Document" d ON d.id = dc."documentId"
    WHERE dc."tenantId" = ${tenantId}
      AND d."tenantId" = ${tenantId}
      AND d.status = 'READY'
      AND dc.embedding IS NOT NULL
    ORDER BY dc.embedding <=> ${vectorLiteral(embedding)}
    LIMIT ${limit}
  `);
}
