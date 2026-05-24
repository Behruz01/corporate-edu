import { gradeQuizAnswers } from './quiz-grading';

describe('gradeQuizAnswers', () => {
  it('grades mcq, true-false, and short-answer questions with explanations', () => {
    const result = gradeQuizAnswers(
      [
        {
          id: 'q1',
          type: 'MCQ',
          prompt: 'SQB qachon tashkil topgan?',
          options: ['1991', '1922', '2000'],
          correct: '1922',
          explanation: 'SQB tarixi 1922 yildan boshlanadi.',
        },
        {
          id: 'q2',
          type: 'TRUE_FALSE',
          prompt: 'AML talablari majburiy.',
          options: null,
          correct: true,
          explanation: null,
        },
        {
          id: 'q3',
          type: 'SHORT_ANSWER',
          prompt: "Kredit baholashda asosiy ko'rsatkichlardan biri?",
          options: null,
          correct: { keywords: ['daromad', 'garov'] },
          explanation: 'Daromad va garov kredit riskini baholashda ishlatiladi.',
        },
      ],
      { q1: '1922', q2: 'false', q3: 'Mijoz daromadlari tekshiriladi' },
    );

    expect(result.score).toBe(67);
    expect(result.passed).toBe(false);
    expect(result.answers).toEqual([
      { questionId: 'q1', correct: true, expected: '1922', received: '1922', explanation: 'SQB tarixi 1922 yildan boshlanadi.' },
      { questionId: 'q2', correct: false, expected: true, received: 'false', explanation: null },
      {
        questionId: 'q3',
        correct: true,
        expected: { keywords: ['daromad', 'garov'] },
        received: 'Mijoz daromadlari tekshiriladi',
        explanation: 'Daromad va garov kredit riskini baholashda ishlatiladi.',
      },
    ]);
  });
});
