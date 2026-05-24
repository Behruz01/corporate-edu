import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { InterviewStatus, OnboardingStatus, Role, UserStatus } from '@corpmind/shared';
import type { AuthPrincipal } from '../common/types/authenticated-request';
import { PrismaService } from '../prisma/prisma.service';

type NotificationDto = {
  id: string;
  kind: string;
  title: string;
  body: string;
  link: string | null;
  readAt: Date | null;
  createdAt: Date;
};

type NotificationCandidate = {
  kind: string;
  title: string;
  body: string;
  link: string;
};

type UserNotificationSeedRecord = {
  id: string;
  fullName: string;
  role: string;
  onboardingAssignments: Array<{
    id: string;
    status: string;
    startedAt: Date;
    currentDay: number;
    template: { days: Array<{ id: string }> };
    dayProgress: Array<{ completedAt: Date | null }>;
  }>;
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async listForUser(user: AuthPrincipal, unreadOnly: boolean): Promise<NotificationDto[]> {
    const where: Prisma.NotificationWhereInput = { userId: user.userId };
    if (unreadOnly) where.readAt = null;

    const notifications = await this.prisma.scoped.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: this.notificationSelect(),
    });
    return notifications;
  }

  async markRead(user: AuthPrincipal, id: string): Promise<NotificationDto> {
    const notification = await this.prisma.scoped.notification.findFirst({
      where: { id, userId: user.userId },
      select: this.notificationSelect(),
    });
    if (!notification) throw new NotFoundException('Notification not found');
    if (notification.readAt) return notification;

    return this.prisma.scoped.notification.update({
      where: { id },
      data: { readAt: new Date() },
      select: this.notificationSelect(),
    });
  }

  async markAllRead(user: AuthPrincipal): Promise<{ updated: number }> {
    const result = await this.prisma.scoped.notification.updateMany({
      where: { userId: user.userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: result.count };
  }

  async seedDemo(user: AuthPrincipal): Promise<{ created: number; notifications: NotificationDto[] }> {
    const existing = await this.prisma.scoped.notification.count({ where: { userId: user.userId } });
    if (existing === 0) {
      await this.generateForUser(user);
    }
    const notifications = await this.listForUser(user, false);
    return { created: Math.max(0, notifications.length - existing), notifications };
  }

  async generateForUser(user: AuthPrincipal): Promise<NotificationDto[]> {
    const candidates = await this.deriveCandidates(user);
    const upserted: NotificationDto[] = [];

    for (const candidate of candidates) {
      const existing = await this.prisma.scoped.notification.findFirst({
        where: { userId: user.userId, kind: candidate.kind, link: candidate.link },
        select: this.notificationSelect(),
      });
      if (existing) {
        upserted.push(existing);
        continue;
      }

      const created = await this.prisma.scoped.notification.create({
        data: {
          tenantId: user.tenantId,
          userId: user.userId,
          kind: candidate.kind,
          title: candidate.title,
          body: candidate.body,
          link: candidate.link,
        },
        select: this.notificationSelect(),
      });
      upserted.push(created);
    }

    return upserted;
  }

  private async deriveCandidates(user: AuthPrincipal): Promise<NotificationCandidate[]> {
    const record = await this.prisma.scoped.user.findFirst({
      where: { id: user.userId },
      select: {
        id: true,
        fullName: true,
        role: true,
        onboardingAssignments: {
          where: { status: { in: [OnboardingStatus.IN_PROGRESS, OnboardingStatus.OVERDUE] } },
          orderBy: { startedAt: 'desc' },
          take: 1,
          select: {
            id: true,
            status: true,
            startedAt: true,
            currentDay: true,
            template: { select: { days: { select: { id: true } } } },
            dayProgress: { select: { completedAt: true } },
          },
        },
      },
    });
    if (!record) {
      this.logger.warn(`notifications requested for missing user ${user.userId}`);
      throw new NotFoundException('User not found');
    }

    const candidates: NotificationCandidate[] = [];
    const currentAssignment = (record as UserNotificationSeedRecord).onboardingAssignments[0];
    if (currentAssignment && this.isOnboardingBehind(currentAssignment)) {
      candidates.push({
        kind: 'onboarding.behind',
        title: 'Onboarding needs attention',
        body: 'Your onboarding plan is behind schedule. Open today\'s tasks to get back on track.',
        link: '/onboarding',
      });
    }

    const departingRisk = await this.findDepartingKnowledgeRisk();
    if (departingRisk) {
      candidates.push({
        kind: 'knowledge.departing-risk',
        title: 'Knowledge capture at risk',
        body: `${departingRisk.fullName} has incomplete offboarding answers. Capture critical knowledge before departure.`,
        link: '/memory/offboarding',
      });
    }

    if (this.canReceiveManagerDigest(record.role)) {
      const reportCount = await this.prisma.scoped.user.count({ where: { managerId: user.userId } });
      candidates.push({
        kind: 'manager.weekly-digest',
        title: 'Weekly team digest is ready',
        body: reportCount > 0
          ? `${reportCount} direct reports have fresh learning and knowledge signals to review.`
          : 'Review team learning, skill gaps, and knowledge-risk signals for this week.',
        link: user.role === Role.MANAGER ? '/team' : '/admin',
      });
    }

    const demoCandidates: NotificationCandidate[] = [
      {
        kind: 'demo.welcome',
        title: 'Welcome to CorpMind',
        body: 'Your learning workspace is ready. Start with onboarding or ask the knowledge base a question.',
        link: '/home',
      },
      {
        kind: 'demo.kb',
        title: 'Try the knowledge base',
        body: 'Ask CorpMind about policies, internal processes, or project context from uploaded documents.',
        link: '/kb',
      },
    ];
    for (const demoCandidate of demoCandidates) {
      if (candidates.length >= 2) break;
      if (!candidates.some((candidate) => candidate.kind === demoCandidate.kind)) {
        candidates.push(demoCandidate);
      }
    }

    return candidates.slice(0, 3);
  }

  private async findDepartingKnowledgeRisk(): Promise<{ id: string; fullName: string } | null> {
    return this.prisma.scoped.user.findFirst({
      where: {
        status: UserStatus.DEPARTING,
        offboardingInterviews: {
          some: {
            OR: [
              { status: { not: InterviewStatus.COMPLETED } },
              { questions: { some: { answerText: null } } },
            ],
          },
        },
      },
      orderBy: { departingAt: 'asc' },
      select: { id: true, fullName: true },
    });
  }

  private isOnboardingBehind(assignment: UserNotificationSeedRecord['onboardingAssignments'][number]): boolean {
    if (assignment.status === OnboardingStatus.OVERDUE) return true;

    const elapsedDays = Math.floor((Date.now() - assignment.startedAt.getTime()) / 86_400_000) + 1;
    const expectedCompleted = Math.max(0, Math.min(elapsedDays - 1, assignment.template.days.length));
    const completed = assignment.dayProgress.filter((progress) => progress.completedAt).length;
    return expectedCompleted >= 2 && completed < expectedCompleted;
  }

  private canReceiveManagerDigest(role: string): boolean {
    return role === Role.MANAGER || role === Role.HR_ADMIN || role === Role.PLATFORM_ADMIN;
  }

  private notificationSelect(): Prisma.NotificationSelect {
    return {
      id: true,
      kind: true,
      title: true,
      body: true,
      link: true,
      readAt: true,
      createdAt: true,
    };
  }
}
