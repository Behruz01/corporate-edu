export type QuizQuestionForGrading = {
  id: string;
  type: 'MCQ' | 'TRUE_FALSE' | 'SHORT_ANSWER';
  prompt: string;
  options: unknown;
  correct: unknown;
  explanation: string | null;
};

export type GradedAnswer = {
  questionId: string;
  correct: boolean;
  expected: unknown;
  received: unknown;
  explanation: string | null;
};

export type QuizGradeResult = {
  score: number;
  passed: boolean;
  answers: GradedAnswer[];
};

const PASSING_SCORE = 80;

export function gradeQuizAnswers(
  questions: QuizQuestionForGrading[],
  answers: Record<string, unknown>,
): QuizGradeResult {
  if (questions.length === 0) {
    return { score: 100, passed: true, answers: [] };
  }

  const graded = questions.map((question) => {
    const received = answers[question.id];
    return {
      questionId: question.id,
      correct: isCorrect(question, received),
      expected: question.correct,
      received,
      explanation: question.explanation,
    };
  });

  const correctCount = graded.filter((answer) => answer.correct).length;
  const score = Math.round((correctCount / questions.length) * 100);
  return { score, passed: score >= PASSING_SCORE, answers: graded };
}

function isCorrect(question: QuizQuestionForGrading, received: unknown): boolean {
  if (question.type === 'TRUE_FALSE') {
    const actual = toBoolean(received);
    const expected = toBoolean(question.correct);
    return actual !== null && expected !== null && actual === expected;
  }

  if (question.type === 'SHORT_ANSWER') {
    return isShortAnswerCorrect(question.correct, received);
  }

  return normalize(received) === normalize(extractAnswer(question.correct));
}

function isShortAnswerCorrect(correct: unknown, received: unknown): boolean {
  const actual = normalize(received);
  if (!actual) return false;

  const keywords = extractKeywords(correct);
  if (keywords.length > 0) {
    return keywords.some((keyword) => actual.includes(normalize(keyword)));
  }

  const expected = normalize(extractAnswer(correct));
  return Boolean(expected) && actual === expected;
}

function extractAnswer(value: unknown): unknown {
  if (isRecord(value)) {
    return value['answer'] ?? value['value'] ?? value['correct'] ?? value;
  }
  return value;
}

function extractKeywords(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }
  if (isRecord(value) && Array.isArray(value['keywords'])) {
    return value['keywords'].filter((item): item is string => typeof item === 'string');
  }
  return [];
}

function toBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  const normalized = normalize(extractAnswer(value));
  if (['true', 'ha', 'yes', '1'].includes(normalized)) return true;
  if (['false', 'yoq', "yo'q", 'no', '0'].includes(normalized)) return false;
  return null;
}

function normalize(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value).trim().toLowerCase();
  }
  return '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
