export type PersonaPromptInput = {
  fullName: string;
  voiceProfile: string;
  fallbackManagerName: string | null;
};

export type WhoKnowsCandidate = {
  personaId: string;
  userId: string;
  fullName: string;
  position: string | null;
  department: string | null;
  expertiseTags: string[];
  recentNoteTags: string[];
};

export type RankedWhoKnowsCandidate = WhoKnowsCandidate & {
  score: number;
  matchedTags: string[];
};

export function buildPersonaSystemPrompt(input: PersonaPromptInput): string {
  const manager = input.fallbackManagerName ?? 'their manager';
  return [
    `You are ${input.fullName}'s preserved employee knowledge persona.`,
    'Answer strictly in first person, using only the supplied memory snippets.',
    `Voice profile: ${input.voiceProfile}`,
    `If the snippets do not contain enough context, answer exactly: "I don't have enough context. Please ask ${manager}."`,
    'Cite source references naturally and do not invent facts, dates, policies, projects, or decisions.',
  ].join('\n');
}

export function isLowConfidence(topSimilarity: number | undefined, threshold: number): boolean {
  return topSimilarity === undefined || topSimilarity < threshold;
}

export function rankExperts(query: string, candidates: WhoKnowsCandidate[]): RankedWhoKnowsCandidate[] {
  const terms = tokenize(query);
  return candidates
    .map((candidate) => {
      const tags = [...candidate.expertiseTags, ...candidate.recentNoteTags];
      const matchedTags = unique(
        tags.filter((tag) => {
          const normalized = tag.toLowerCase();
          return terms.some((term) => normalized.includes(term));
        }),
      );
      const expertiseMatches = candidate.expertiseTags.filter((tag) => {
        const normalized = tag.toLowerCase();
        return terms.some((term) => normalized.includes(term));
      }).length;
      const noteMatches = candidate.recentNoteTags.filter((tag) => {
        const normalized = tag.toLowerCase();
        return terms.some((term) => normalized.includes(term));
      }).length;
      const score = expertiseMatches * 2 + noteMatches;
      return { ...candidate, score, matchedTags };
    })
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score || a.fullName.localeCompare(b.fullName));
}

export const rankWhoKnowsCandidates = rankExperts;

export function normalizeTags(tags: string[]): string[] {
  return unique(tags.map((tag) => tag.trim().toLowerCase()).filter((tag) => tag.length > 0)).slice(0, 20);
}

export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

export function vectorLiteral(values: number[]): string {
  return `[${values.map((value) => {
    if (!Number.isFinite(value)) throw new Error('Embedding contains a non-finite value');
    return Number(value).toFixed(8);
  }).join(',')}]`;
}

function tokenize(query: string): string[] {
  return unique(
    query
      .toLowerCase()
      .split(/[^\p{L}\p{N}_'-]+/u)
      .map((part) => part.trim())
      .filter((part) => part.length >= 2),
  );
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
