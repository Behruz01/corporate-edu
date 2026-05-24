type SimulatorTurnPromptInput = {
  personaDesc: string;
  brief: string;
  difficulty: string;
  turns: Array<{ speaker: string; text: string }>;
  userText: string;
};

export function buildSimulatorRoleplaySystemPrompt(input: SimulatorTurnPromptInput): string {
  return [
    'You ROLEPLAY as a character. You are NOT an AI assistant.',
    '',
    'CHARACTER PROFILE:',
    input.personaDesc,
    '',
    'SETTING:',
    input.brief,
    '',
    'RULES:',
    '- Stay strictly in character. Never break the fourth wall.',
    '- React naturally to tone. Escalate if dismissed, de-escalate if heard.',
    '- Difficulty: BASIC=cooperative, INTERMEDIATE=mild resistance, ADVANCED=frustrated, edge cases, time pressure.',
    '- 1-3 sentences typically.',
    "- Language: same as the employee's first message.",
    '',
    'CONVERSATION SO FAR:',
    formatTurns(input.turns),
    '',
    "EMPLOYEE'S LATEST:",
    input.userText,
  ].join('\n');
}

function formatTurns(turns: Array<{ speaker: string; text: string }>): string {
  if (turns.length === 0) return '(none)';
  return turns.map((turn) => `${turn.speaker}: ${turn.text}`).join('\n');
}
