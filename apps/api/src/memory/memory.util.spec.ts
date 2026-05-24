import { buildPersonaSystemPrompt, isLowConfidence, rankExperts } from './memory.util';

describe('memory persona utilities', () => {
  it('uses the persona voice profile in a first-person system prompt', () => {
    const prompt = buildPersonaSystemPrompt({
      fullName: 'Aziz Karimov',
      voiceProfile: 'Direct, practical credit officer voice.',
      fallbackManagerName: 'Malika Yusupova',
    });

    expect(prompt).toContain('Aziz Karimov');
    expect(prompt).toContain('Direct, practical credit officer voice.');
    expect(prompt).toContain('first person');
    expect(prompt).toContain("I don't have enough context");
    expect(prompt).toContain('Malika Yusupova');
  });

  it('treats empty retrievals and scores below threshold as low confidence', () => {
    expect(isLowConfidence(undefined, 0.55)).toBe(true);
    expect(isLowConfidence(0.54, 0.55)).toBe(true);
    expect(isLowConfidence(0.55, 0.55)).toBe(false);
  });

  it('ranks who-knows candidates by expertise and recent note tag matches', () => {
    const ranked = rankExperts('early repayment aml', [
      {
        personaId: 'p-low',
        userId: 'u-low',
        fullName: 'Low Match',
        position: null,
        department: null,
        expertiseTags: ['cash'],
        recentNoteTags: ['aml'],
      },
      {
        personaId: 'p-high',
        userId: 'u-high',
        fullName: 'High Match',
        position: 'Senior Credit Officer',
        department: 'Credit',
        expertiseTags: ['early repayment', 'aml'],
        recentNoteTags: ['credit'],
      },
    ]);

    expect(ranked.map((candidate) => candidate.personaId)).toEqual(['p-high', 'p-low']);
    expect(ranked[0]?.score).toBeGreaterThan(ranked[1]?.score ?? 0);
    expect(ranked[0]?.matchedTags).toEqual(['early repayment', 'aml']);
  });
});
