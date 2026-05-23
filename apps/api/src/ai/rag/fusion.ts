import type { FusedSearchResult, SearchResult } from './search-types';

const RRF_K = 60;

export function reciprocalRankFusion(vectorResults: SearchResult[], keywordResults: SearchResult[]): FusedSearchResult[] {
  const byId = new Map<string, FusedSearchResult>();

  const add = (result: SearchResult, rank: number, kind: 'vector' | 'keyword'): void => {
    const existing =
      byId.get(result.id) ??
      ({
        ...result,
        rrfScore: 0,
      } satisfies FusedSearchResult);

    existing.rrfScore += 1 / (RRF_K + rank);
    if (kind === 'vector') existing.vectorScore = result.score;
    else existing.keywordScore = result.score;
    byId.set(result.id, existing);
  };

  vectorResults.forEach((result, index) => add(result, index + 1, 'vector'));
  keywordResults.forEach((result, index) => add(result, index + 1, 'keyword'));

  return [...byId.values()].sort((a, b) => b.rrfScore - a.rrfScore);
}
