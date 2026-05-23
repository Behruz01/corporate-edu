import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { vectorSearch } from './vector-search';
import { keywordSearch } from './keyword-search';
import { reciprocalRankFusion } from './fusion';
import type { FusedSearchResult } from './search-types';

@Injectable()
export class RagService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddings: EmbeddingsService,
  ) {}

  async search(tenantId: string, question: string, topK = 5): Promise<FusedSearchResult[]> {
    const embedding = await this.embeddings.embedQuery(question);
    const [vectorResults, keywordResults] = await Promise.all([
      vectorSearch(this.prisma, tenantId, embedding, 20),
      keywordSearch(this.prisma, tenantId, question, 20),
    ]);
    return reciprocalRankFusion(vectorResults, keywordResults).slice(0, topK);
  }
}
