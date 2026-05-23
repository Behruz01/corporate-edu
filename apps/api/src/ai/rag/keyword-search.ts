import { Prisma, type PrismaClient } from '@prisma/client';
import type { SearchResult } from './search-types';

export async function keywordSearch(
  prisma: PrismaClient,
  tenantId: string,
  query: string,
  limit = 20,
): Promise<SearchResult[]> {
  return prisma.$queryRaw<SearchResult[]>(Prisma.sql`
    SELECT dc.id,
           dc."documentId",
           d.title,
           dc.text,
           dc.page,
           dc.section,
           ts_rank(dc.tsv, plainto_tsquery('simple', ${query})) AS score
    FROM "DocumentChunk" dc
    JOIN "Document" d ON d.id = dc."documentId"
    WHERE dc."tenantId" = ${tenantId}
      AND d."tenantId" = ${tenantId}
      AND d.status = 'READY'
      AND dc.tsv @@ plainto_tsquery('simple', ${query})
    ORDER BY score DESC
    LIMIT ${limit}
  `);
}
