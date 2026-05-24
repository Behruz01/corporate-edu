import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ConvSource, InterviewStatus, MsgRole, Role, UserStatus } from '@corpmind/shared';
import type { AuthPrincipal } from '../common/types/authenticated-request';
import { PrismaService } from '../prisma/prisma.service';
import { computeDashboardStatusColor, type DashboardStatusColor } from './dashboard-status';

type ReportScope = 'manager' | 'admin';

type OnboardingAssignmentSummary = {
  id: string;
  status: string;
  startedAt: Date;
  currentDay: number;
  template: { id: string; name: string; days: Array<{ id: string; dayNumber: number; title: string }> };
  dayProgress: Array<{ id: string; dayId: string; completedAt: Date | null; quizScore: number | null; timeSpentSec: number }>;
};

type SimulatorSessionSummary = {
  id: string;
  attemptNum: number;
  status: string;
  startedAt: Date;
  endedAt: Date | null;
  scenario: { id: string; title: string; category: string };
  score: { overall: number; dimensionScores: Prisma.JsonValue; weakAreas: Prisma.JsonValue; createdAt: Date } | null;
};

type KnowledgeNoteSummary = {
  id: string;
  prompt: string | null;
  text: string;
  createdAt: Date;
  project: { id: string; name: string } | null;
};

type UserDashboardRecord = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  status: string;
  department: string | null;
  position: string | null;
  startedAt: Date | null;
  departingAt: Date | null;
  pointsTotal: number;
  onboardingAssignments: OnboardingAssignmentSummary[];
  simulatorSessions: SimulatorSessionSummary[];
  knowledgeNotes: KnowledgeNoteSummary[];
  persona: { id: string; expertiseTags: string[]; chunks: Array<{ id: string }> } | null;
  offboardingInterviews: Array<{
    id: string;
    status: string;
    startedAt: Date | null;
    completedAt: Date | null;
    questions: Array<{ id: string; answerText: string | null }>;
  }>;
};

type DimensionBucket = {
  total: number;
  count: number;
};

type QuestionBucket = {
  label: string;
  count: number;
  unansweredCount: number;
};

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private readonly prisma: PrismaService) {}

  async teamOverview(user: AuthPrincipal): Promise<unknown> {
    const users = await this.loadUsersForScope(user);
    return {
      generatedAt: new Date().toISOString(),
      reports: users.map((report) => {
        const onboardingPercent = this.onboardingPercent(report.onboardingAssignments);
        const avgSimulatorScore = this.averageSimulatorScore(report.simulatorSessions);
        const knowledgeContributionCount = this.knowledgeContributionCount(report);
        return {
          id: report.id,
          fullName: report.fullName,
          email: report.email,
          role: report.role,
          status: report.status,
          department: report.department,
          position: report.position,
          startedAt: report.startedAt,
          departingAt: report.departingAt,
          pointsTotal: report.pointsTotal,
          onboardingPercent,
          avgSimulatorScore,
          knowledgeContributionCount,
          statusColor: computeDashboardStatusColor({ onboardingPercent, avgSimulatorScore }),
        };
      }),
    };
  }

  async skillGap(user: AuthPrincipal): Promise<unknown> {
    const reports = await this.loadUsersForScope(user);
    const reportIds = reports.map((report) => report.id);
    if (reportIds.length === 0) return { categories: [], gaps: [] };

    const sessions = await this.prisma.scoped.simulatorSession.findMany({
      where: { userId: { in: reportIds } },
      include: {
        scenario: { select: { id: true, title: true, category: true } },
        score: { select: { overall: true, dimensionScores: true } },
      },
    });

    const categories = new Map<string, Map<string, DimensionBucket>>();
    for (const session of sessions) {
      if (!session.score) continue;
      const dimensions = this.readDimensionScores(session.score.dimensionScores);
      if (dimensions.size === 0) {
        this.logger.warn(`dashboard skipped empty dimension scores for simulator session ${session.id}`);
        continue;
      }
      const category = session.scenario.category || 'Uncategorized';
      const categoryBucket = categories.get(category) ?? new Map<string, DimensionBucket>();
      for (const [dimension, score] of dimensions.entries()) {
        const bucket = categoryBucket.get(dimension) ?? { total: 0, count: 0 };
        bucket.total += score;
        bucket.count += 1;
        categoryBucket.set(dimension, bucket);
      }
      categories.set(category, categoryBucket);
    }

    const result = [...categories.entries()].map(([category, dimensions]) => {
      const dimensionScores = [...dimensions.entries()].map(([dimension, bucket]) => ({
        dimension,
        avgScore: this.roundScore(bucket.total / bucket.count),
        samples: bucket.count,
      }));
      const categoryAverage = this.roundScore(
        dimensionScores.reduce((sum, item) => sum + item.avgScore, 0) / Math.max(1, dimensionScores.length),
      );
      return {
        category,
        avgScore: categoryAverage,
        isGap: categoryAverage < 60,
        dimensions: dimensionScores.sort((a, b) => a.dimension.localeCompare(b.dimension)),
      };
    }).sort((a, b) => a.avgScore - b.avgScore);

    return {
      categories: result,
      gaps: result.filter((category) => category.isGap),
    };
  }

  async knowledgeRisk(user: AuthPrincipal): Promise<unknown> {
    const users = await this.loadUsersForScope(user);
    const departingUsers = users.filter((item) => item.status === UserStatus.DEPARTING);
    const departingWithIncompleteOffboarding = departingUsers
      .filter((item) => !this.hasCompletedOffboarding(item))
      .map((item) => ({
        id: item.id,
        fullName: item.fullName,
        department: item.department,
        departingAt: item.departingAt,
        unansweredQuestions: item.offboardingInterviews.reduce(
          (sum, interview) => sum + interview.questions.filter((question) => !question.answerText?.trim()).length,
          0,
        ),
      }));

    const highContributionUsers = users
      .map((item) => ({
        id: item.id,
        fullName: item.fullName,
        department: item.department,
        status: item.status,
        contributionCount: this.knowledgeContributionCount(item),
        departingAt: item.departingAt,
      }))
      .filter((item) => item.contributionCount >= 3)
      .sort((a, b) => b.contributionCount - a.contributionCount)
      .slice(0, 8);

    const projectsWithNoNotes = await this.prisma.scoped.project.findMany({
      where: { notes: { none: {} } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, department: true, status: true, createdAt: true },
    });

    return {
      departingWithIncompleteOffboarding,
      highContributionUsers,
      projectsWithNoNotes,
    };
  }

  async mostAsked(_user: AuthPrincipal): Promise<unknown> {
    const conversations = await this.prisma.scoped.conversation.findMany({
      where: { source: ConvSource.KB },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          select: { id: true, role: true, content: true, noAnswerFlag: true, createdAt: true },
        },
      },
    });

    const buckets = new Map<string, QuestionBucket>();
    let unansweredTotal = 0;
    for (const conversation of conversations) {
      for (let index = 0; index < conversation.messages.length; index += 1) {
        const message = conversation.messages[index];
        if (!message || message.role !== MsgRole.USER) continue;
        const normalized = this.normalizeQuestion(message.content);
        if (!normalized) continue;
        const bucket = buckets.get(normalized) ?? { label: message.content.trim(), count: 0, unansweredCount: 0 };
        bucket.count += 1;
        const nextAssistant = conversation.messages.slice(index + 1).find((item) => item.role === MsgRole.ASSISTANT);
        if (nextAssistant?.noAnswerFlag) {
          bucket.unansweredCount += 1;
          unansweredTotal += 1;
        }
        buckets.set(normalized, bucket);
      }
    }

    const topQuestions = [...buckets.values()]
      .sort((a, b) => b.count - a.count || b.unansweredCount - a.unansweredCount)
      .slice(0, 10)
      .map((item) => ({
        question: item.label,
        count: item.count,
        unansweredCount: item.unansweredCount,
      }));

    return {
      topQuestions,
      unansweredTotal,
    };
  }

  async employee(employeeId: string, user: AuthPrincipal): Promise<unknown> {
    const employee = await this.loadEmployeeForScope(employeeId, user);
    const onboardingPercent = this.onboardingPercent(employee.onboardingAssignments);
    const avgSimulatorScore = this.averageSimulatorScore(employee.simulatorSessions);
    return {
      employee: {
        id: employee.id,
        fullName: employee.fullName,
        email: employee.email,
        role: employee.role,
        status: employee.status,
        department: employee.department,
        position: employee.position,
        startedAt: employee.startedAt,
        departingAt: employee.departingAt,
        pointsTotal: employee.pointsTotal,
        onboardingPercent,
        avgSimulatorScore,
        knowledgeContributionCount: this.knowledgeContributionCount(employee),
        statusColor: computeDashboardStatusColor({ onboardingPercent, avgSimulatorScore }),
      },
      timeline: this.buildEmployeeTimeline(employee),
      onboardingAssignments: employee.onboardingAssignments.map((assignment) => ({
        id: assignment.id,
        templateName: assignment.template.name,
        status: assignment.status,
        startedAt: assignment.startedAt,
        currentDay: assignment.currentDay,
        percent: this.onboardingPercent([assignment]),
      })),
      simulatorSessions: employee.simulatorSessions.map((session) => ({
        id: session.id,
        scenarioTitle: session.scenario.title,
        category: session.scenario.category,
        attemptNum: session.attemptNum,
        status: session.status,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        overall: session.score?.overall ?? null,
        weakAreas: session.score?.weakAreas ?? null,
      })),
      notes: employee.knowledgeNotes.map((note) => ({
        id: note.id,
        prompt: note.prompt,
        text: note.text,
        createdAt: note.createdAt,
        project: note.project,
      })),
    };
  }

  async adminOverview(user: AuthPrincipal): Promise<unknown> {
    if (!this.isAdmin(user.role)) throw new NotFoundException('Analytics not found');
    const [users, documents, simulatorSessions, messages, assignments, completedAssignments, knowledgeNotes] = await Promise.all([
      this.prisma.scoped.user.count(),
      this.prisma.scoped.document.count(),
      this.prisma.scoped.simulatorSession.count(),
      this.prisma.message.count({ where: { conversation: { tenantId: user.tenantId } } }),
      this.prisma.scoped.onboardingAssignment.count(),
      this.prisma.scoped.onboardingAssignment.count({ where: { status: 'COMPLETED' } }),
      this.prisma.scoped.knowledgeNote.count(),
    ]);
    return {
      users,
      documents,
      simulatorSessions,
      messages,
      knowledgeNotes,
      onboardingCompletionRate: assignments === 0 ? null : this.roundScore((completedAssignments / assignments) * 100),
      generatedAt: new Date().toISOString(),
    };
  }

  private async loadUsersForScope(user: AuthPrincipal): Promise<UserDashboardRecord[]> {
    const scope = this.scopeFor(user);
    const users = await this.prisma.scoped.user.findMany({
      where: scope === 'admin' ? {} : { managerId: user.userId },
      orderBy: { fullName: 'asc' },
      select: this.userSelect(),
    });
    return users as unknown as UserDashboardRecord[];
  }

  private async loadEmployeeForScope(employeeId: string, user: AuthPrincipal): Promise<UserDashboardRecord> {
    const scope = this.scopeFor(user);
    const employee = await this.prisma.scoped.user.findFirst({
      where: scope === 'admin' ? { id: employeeId } : { id: employeeId, managerId: user.userId },
      select: this.userSelect(),
    });
    if (!employee) throw new NotFoundException('Employee not found');
    return employee as unknown as UserDashboardRecord;
  }

  private userSelect(): Prisma.UserSelect {
    return {
      id: true,
      fullName: true,
      email: true,
      role: true,
      status: true,
      department: true,
      position: true,
      startedAt: true,
      departingAt: true,
      pointsTotal: true,
      onboardingAssignments: {
        orderBy: { startedAt: 'desc' },
        select: {
          id: true,
          status: true,
          startedAt: true,
          currentDay: true,
          template: {
            select: {
              id: true,
              name: true,
              days: { orderBy: { dayNumber: 'asc' }, select: { id: true, dayNumber: true, title: true } },
            },
          },
          dayProgress: {
            select: { id: true, dayId: true, completedAt: true, quizScore: true, timeSpentSec: true },
          },
        },
      },
      simulatorSessions: {
        orderBy: { startedAt: 'desc' },
        select: {
          id: true,
          attemptNum: true,
          status: true,
          startedAt: true,
          endedAt: true,
          scenario: { select: { id: true, title: true, category: true } },
          score: { select: { overall: true, dimensionScores: true, weakAreas: true, createdAt: true } },
        },
      },
      knowledgeNotes: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          prompt: true,
          text: true,
          createdAt: true,
          project: { select: { id: true, name: true } },
        },
      },
      persona: { select: { id: true, expertiseTags: true, chunks: { select: { id: true } } } },
      offboardingInterviews: {
        orderBy: { startedAt: 'desc' },
        select: {
          id: true,
          status: true,
          startedAt: true,
          completedAt: true,
          questions: { select: { id: true, answerText: true } },
        },
      },
    };
  }

  private scopeFor(user: AuthPrincipal): ReportScope {
    return this.isAdmin(user.role) ? 'admin' : 'manager';
  }

  private isAdmin(role: string): boolean {
    return role === Role.PLATFORM_ADMIN || role === Role.HR_ADMIN;
  }

  private onboardingPercent(assignments: OnboardingAssignmentSummary[]): number | null {
    const totalDays = assignments.reduce((sum, assignment) => sum + assignment.template.days.length, 0);
    if (totalDays === 0) return null;
    const completedDays = assignments.reduce(
      (sum, assignment) => sum + assignment.dayProgress.filter((progress) => Boolean(progress.completedAt)).length,
      0,
    );
    return this.roundScore((completedDays / totalDays) * 100);
  }

  private averageSimulatorScore(sessions: SimulatorSessionSummary[]): number | null {
    const scores = sessions.map((session) => session.score?.overall).filter((score): score is number => typeof score === 'number');
    if (scores.length === 0) return null;
    return this.roundScore(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  }

  private knowledgeContributionCount(user: UserDashboardRecord): number {
    return user.knowledgeNotes.length + (user.persona?.chunks.length ?? 0);
  }

  private hasCompletedOffboarding(user: UserDashboardRecord): boolean {
    return user.offboardingInterviews.some(
      (interview) =>
        interview.status === InterviewStatus.COMPLETED &&
        interview.questions.every((question) => Boolean(question.answerText?.trim())),
    );
  }

  private readDimensionScores(value: Prisma.JsonValue): Map<string, number> {
    const scores = new Map<string, number>();
    if (!this.isJsonObject(value)) return scores;
    for (const [dimension, rawScore] of Object.entries(value)) {
      if (typeof rawScore === 'number' && Number.isFinite(rawScore)) {
        scores.set(dimension, rawScore);
      }
    }
    return scores;
  }

  private isJsonObject(value: Prisma.JsonValue): value is Prisma.JsonObject {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private normalizeQuestion(content: string): string {
    return content
      .trim()
      .toLocaleLowerCase('uz')
      .replace(/[^\p{L}\p{N}\s]/gu, '')
      .replace(/\s+/g, ' ');
  }

  private roundScore(value: number): number {
    return Math.round(value * 10) / 10;
  }

  private buildEmployeeTimeline(user: UserDashboardRecord): Array<{
    id: string;
    type: 'onboarding' | 'simulator' | 'note' | 'offboarding';
    title: string;
    description: string;
    occurredAt: Date;
    score?: number | null;
    status?: DashboardStatusColor | string;
  }> {
    const onboarding = user.onboardingAssignments.map((assignment) => ({
      id: assignment.id,
      type: 'onboarding' as const,
      title: assignment.template.name,
      description: `${assignment.dayProgress.filter((progress) => Boolean(progress.completedAt)).length}/${assignment.template.days.length} days complete`,
      occurredAt: assignment.startedAt,
      status: assignment.status,
    }));
    const simulator = user.simulatorSessions.map((session) => ({
      id: session.id,
      type: 'simulator' as const,
      title: session.scenario.title,
      description: session.scenario.category,
      occurredAt: session.endedAt ?? session.startedAt,
      score: session.score?.overall ?? null,
      status: session.status,
    }));
    const notes = user.knowledgeNotes.map((note) => ({
      id: note.id,
      type: 'note' as const,
      title: note.project?.name ?? 'Knowledge note',
      description: note.prompt ?? note.text.slice(0, 120),
      occurredAt: note.createdAt,
    }));
    const offboarding = user.offboardingInterviews.map((interview) => ({
      id: interview.id,
      type: 'offboarding' as const,
      title: 'Offboarding interview',
      description: `${interview.questions.filter((question) => Boolean(question.answerText?.trim())).length}/${interview.questions.length} answered`,
      occurredAt: interview.startedAt ?? interview.completedAt ?? new Date(0),
      status: interview.status,
    }));

    return [...onboarding, ...simulator, ...notes, ...offboarding]
      .filter((item) => item.occurredAt.getTime() > 0)
      .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
  }
}
