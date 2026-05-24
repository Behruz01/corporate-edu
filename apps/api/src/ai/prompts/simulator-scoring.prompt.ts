type ScoringPromptInput = {
  brief: string;
  personaDesc: string;
  difficulty: string;
  criteria: Array<{ dimension: string; weight: number; rubric: string }>;
  transcript: Array<{ speaker: string; text: string }>;
};

export function buildSimulatorScoringMessages(input: ScoringPromptInput): Array<{ role: 'system' | 'user'; content: string }> {
  return [
    {
      role: 'system',
      content: [
        'You are an evaluator for a corporate roleplay simulator.',
        'Return only valid JSON. Do not wrap it in Markdown.',
        'Score the employee from 0 to 100.',
        'The JSON shape must be:',
        '{"overall":number,"dimensions":{"correctness":number,"tone":number,"processAdherence":number,"resolution":number,"compliance":number},"feedback":[{"dimension":string,"comment":string,"quote"?:string,"severity":"praise"|"minor"|"major"}],"weakAreas":[{"topic":string,"suggestKbQuery"?:string,"suggestPersonaTags":string[]}]}',
      ].join('\n'),
    },
    {
      role: 'user',
      content: [
        'SCENARIO BRIEF:',
        input.brief,
        '',
        'PERSONA:',
        input.personaDesc,
        '',
        `DIFFICULTY: ${input.difficulty}`,
        '',
        'RUBRICS:',
        input.criteria.map((criterion) => `- ${criterion.dimension} (weight ${criterion.weight}): ${criterion.rubric}`).join('\n'),
        '',
        'TRANSCRIPT:',
        input.transcript.map((turn) => `${turn.speaker}: ${turn.text}`).join('\n'),
      ].join('\n'),
    },
  ];
}
