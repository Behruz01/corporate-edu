import { Clock, Trophy } from 'lucide-react';
import type React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { OnboardingAssignment, OnboardingDay } from '../api';
import { TopicAccordion } from './TopicAccordion';

type DayViewProps = {
  assignment: OnboardingAssignment;
  day: OnboardingDay;
  startPending: boolean;
  onStart: () => void;
  children: React.ReactNode;
};

export function DayView({ assignment, day, startPending, onStart, children }: DayViewProps): JSX.Element {
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>Day {day.dayNumber} of {assignment.totalDays}</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              {day.estimatedMin} min
            </span>
            <span className="inline-flex items-center gap-1">
              <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
              50 points
            </span>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <CardTitle>{day.title}</CardTitle>
              <p className="text-sm leading-6 text-muted-foreground">{day.description}</p>
            </div>
            <Button variant="outline" onClick={onStart} disabled={startPending}>
              {startPending ? 'Starting...' : 'Start day'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <TopicAccordion topics={day.topics} />
        </CardContent>
      </Card>

      {children}
    </div>
  );
}
