import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { CompleteDayResponse, QuizAnswers, QuizQuestion } from '../api';

type QuizRunnerProps = {
  questions: QuizQuestion[];
  pending: boolean;
  result: CompleteDayResponse | null;
  onSubmit: (answers: QuizAnswers) => void;
};

export function QuizRunner({ questions, pending, result, onSubmit }: QuizRunnerProps): JSX.Element {
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const allAnswered = useMemo(
    () => questions.every((question) => answers[question.id] !== undefined && String(answers[question.id]).trim() !== ''),
    [answers, questions],
  );

  function setAnswer(questionId: string, value: string | boolean): void {
    setAnswers((current) => ({ ...current, [questionId]: value }));
  }

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!allAnswered || pending) return;
    onSubmit(answers);
  }

  if (questions.length === 0) {
    return <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">Quiz is not configured.</div>;
  }

  return (
    <form className="space-y-5" onSubmit={submit}>
      {questions.map((question, index) => (
        <fieldset key={question.id} className="space-y-3 rounded-md border p-4">
          <legend className="px-1 text-sm font-medium">{index + 1}. {question.prompt}</legend>
          <QuestionInput question={question} value={answers[question.id]} onChange={(value) => setAnswer(question.id, value)} />
          <AnswerFeedback questionId={question.id} result={result} />
        </fieldset>
      ))}

      {result ? (
        <div className="rounded-md border bg-muted/30 p-4 text-sm">
          <div className="font-medium">Score: {result.score}%</div>
          <div className="text-muted-foreground">
            {result.passed ? `Passed. ${result.pointsAwarded} points awarded.` : 'Review the topics and try again.'}
          </div>
        </div>
      ) : null}

      <Button type="submit" disabled={!allAnswered || pending}>
        {pending ? 'Submitting...' : 'Complete day'}
      </Button>
    </form>
  );
}

type QuestionInputProps = {
  question: QuizQuestion;
  value: string | boolean | undefined;
  onChange: (value: string | boolean) => void;
};

function QuestionInput({ question, value, onChange }: QuestionInputProps): JSX.Element {
  if (question.type === 'TRUE_FALSE') {
    return (
      <div className="flex flex-wrap gap-3">
        {[true, false].map((option) => (
          <label key={String(option)} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
            <input
              type="radio"
              name={question.id}
              checked={value === option}
              onChange={() => onChange(option)}
            />
            {option ? 'True' : 'False'}
          </label>
        ))}
      </div>
    );
  }

  const options = toOptionLabels(question.options);
  if (question.type === 'MCQ' && options.length > 0) {
    return (
      <div className="grid gap-2">
        {options.map((option) => (
          <label key={option.value} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
            <input
              type="radio"
              name={question.id}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            {option.label}
          </label>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={question.id}>Answer</Label>
      <Input
        id={question.id}
        value={typeof value === 'string' ? value : ''}
        onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
      />
    </div>
  );
}

function AnswerFeedback({ questionId, result }: { questionId: string; result: CompleteDayResponse | null }): JSX.Element | null {
  const answer = result?.answers.find((item) => item.questionId === questionId);
  if (!answer) return null;
  return (
    <div className="flex gap-2 text-sm">
      {answer.correct ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" aria-hidden="true" />
      ) : (
        <XCircle className="mt-0.5 h-4 w-4 text-destructive" aria-hidden="true" />
      )}
      <span className="text-muted-foreground">{answer.explanation ?? (answer.correct ? 'Correct' : 'Needs review')}</span>
    </div>
  );
}

function toOptionLabels(value: unknown): Array<{ label: string; value: string }> {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') {
        const text = String(item);
        return { label: text, value: text };
      }
      if (typeof item === 'object' && item !== null && 'label' in item && 'value' in item) {
        const record = item as { label: unknown; value: unknown };
        return { label: String(record.label), value: String(record.value) };
      }
      return null;
    })
    .filter((item): item is { label: string; value: string } => item !== null);
}
