export type SearchResult = {
  id: string;
  documentId: string;
  title: string;
  text: string;
  page: number | null;
  section: string | null;
  score: number;
};

export type FusedSearchResult = SearchResult & {
  rrfScore: number;
  vectorScore?: number;
  keywordScore?: number;
};
