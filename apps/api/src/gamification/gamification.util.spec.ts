import { computeGamificationPoints, deriveGamificationBadges } from './gamification.util';

describe('gamification utilities', () => {
  it('computes point totals and category breakdown from activity counts', () => {
    const points = computeGamificationPoints({
      onboardingDaysCompleted: 6,
      kbQuestionsAsked: 4,
      completedSimulatorSessions: 2,
      simulatorScoreBonus: 15,
      knowledgeNotesAuthored: 3,
    });

    expect(points).toEqual({
      total: 455,
      breakdown: {
        onboarding: 300,
        kbQuestions: 20,
        simulator: 75,
        notes: 60,
      },
    });
  });

  it('derives earned badges with latest relevant dates', () => {
    const badges = deriveGamificationBadges({
      onboardingCompletedAt: [
        new Date('2026-01-01T00:00:00.000Z'),
        new Date('2026-01-02T00:00:00.000Z'),
        new Date('2026-01-03T00:00:00.000Z'),
        new Date('2026-01-04T00:00:00.000Z'),
        new Date('2026-01-05T00:00:00.000Z'),
      ],
      completedSimulatorSessions: [{ endedAt: new Date('2026-02-01T00:00:00.000Z'), overall: 91, scoredAt: new Date('2026-02-02T00:00:00.000Z') }],
      notesCreatedAt: [
        new Date('2026-03-01T00:00:00.000Z'),
        new Date('2026-03-02T00:00:00.000Z'),
        new Date('2026-03-03T00:00:00.000Z'),
      ],
    });

    expect(badges).toEqual([
      { code: 'DAY_5', label: '5 kunni yakunladi', earned: true, earnedAt: new Date('2026-01-05T00:00:00.000Z') },
      { code: 'FIRST_SIM', label: 'Birinchi simulyator', earned: true, earnedAt: new Date('2026-02-01T00:00:00.000Z') },
      { code: 'KNOWLEDGE_CONTRIBUTOR', label: "Bilim ulashuvchi", earned: true, earnedAt: new Date('2026-03-03T00:00:00.000Z') },
      { code: 'TOP_SCORER', label: 'Yuqori natija', earned: true, earnedAt: new Date('2026-02-02T00:00:00.000Z') },
    ]);
  });

  it('returns locked badges with null dates when thresholds are not met', () => {
    const badges = deriveGamificationBadges({
      onboardingCompletedAt: [new Date('2026-01-01T00:00:00.000Z')],
      completedSimulatorSessions: [],
      notesCreatedAt: [],
    });

    expect(badges).toEqual([
      { code: 'DAY_5', label: '5 kunni yakunladi', earned: false, earnedAt: null },
      { code: 'FIRST_SIM', label: 'Birinchi simulyator', earned: false, earnedAt: null },
      { code: 'KNOWLEDGE_CONTRIBUTOR', label: "Bilim ulashuvchi", earned: false, earnedAt: null },
      { code: 'TOP_SCORER', label: 'Yuqori natija', earned: false, earnedAt: null },
    ]);
  });
});
