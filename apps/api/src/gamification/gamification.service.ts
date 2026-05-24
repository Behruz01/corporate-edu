import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ConvSource, MsgRole } from '@corpmind/shared';
import type { AuthPrincipal } from '../common/types/authenticated-request';
import { PrismaService } from '../prisma/prisma.service';
import {
  computeGamificationPoints,
  deriveGamificationBadges,
  type GamificationBadge,
  type GamificationPointBreakdown,
} from './gamification.util';

type UserGamificationRecord = {
  id: string;
  fullName: string;
  onboardingAssignments: Array<{
    dayProgress: Array<{ completedAt: Date | null }>;
  }>;
  conversations: Array<{
    messages: Array<{ role: string }>;
  }>;
  simulatorSessions: Array<{
    status: string;
    endedAt: Date | null;
    score: { overall: number; createdAt: Date } | null;
  }>;
  knowledgeNotes: Array<{ createdAt: Date }>;
};

type PointsResponse = {
  total: number;
  breakdown: GamificationPointBreakdown;
};

type BadgesResponse = {
  badges: GamificationBadge[];
};

type LeaderboardEntry = {
  userId: string;
  fullName: string;
  points: number;
  rank: number;
};

@Injectable()
export class GamificationService {
  private readonly logger = new Logger(GamificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async myPoints(user: AuthPrincipal): Promise<PointsResponse> {
    const record = await this.loadUser(user.userId);
    return this.computeUserPoints(record);
  }

  async myBadges(user: AuthPrincipal): Promise<BadgesResponse> {
    const record = await this.loadUser(user.userId);
    return { badges: this.computeUserBadges(record) };
  }

  async leaderboard(_user: AuthPrincipal): Promise<LeaderboardEntry[]> {
    const users = await this.prisma.scoped.user.findMany({
      orderBy: { fullName: 'asc' },
      select: this.userSelect(),
    });
    const records = users as unknown as UserGamificationRecord[];

    return records
      .map((record) => ({
        userId: record.id,
        fullName: record.fullName,
        points: this.computeUserPoints(record).total,
      }))
      .sort((a, b) => b.points - a.points || a.fullName.localeCompare(b.fullName))
      .slice(0, 10)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));
  }

  private async loadUser(userId: string): Promise<UserGamificationRecord> {
    const record = await this.prisma.scoped.user.findFirst({
      where: { id: userId },
      select: this.userSelect(),
    });
    if (!record) {
      this.logger.warn(`gamification requested for missing user ${userId}`);
      throw new NotFoundException('User not found');
    }
    return record as unknown as UserGamificationRecord;
  }

  private userSelect(): Prisma.UserSelect {
    return {
      id: true,
      fullName: true,
      onboardingAssignments: {
        select: {
          dayProgress: {
            where: { completedAt: { not: null } },
            select: { completedAt: true },
          },
        },
      },
      conversations: {
        where: { source: ConvSource.KB },
        select: {
          messages: {
            where: { role: MsgRole.USER },
            select: { role: true },
          },
        },
      },
      simulatorSessions: {
        where: { status: 'COMPLETED' },
        select: {
          status: true,
          endedAt: true,
          score: { select: { overall: true, createdAt: true } },
        },
      },
      knowledgeNotes: {
        select: { createdAt: true },
      },
    };
  }

  private computeUserPoints(record: UserGamificationRecord): PointsResponse {
    const completedSimulatorSessions = record.simulatorSessions.filter((session) => session.status === 'COMPLETED');
    return computeGamificationPoints({
      onboardingDaysCompleted: this.onboardingCompletedAt(record).length,
      kbQuestionsAsked: record.conversations.reduce((sum, conversation) => sum + conversation.messages.length, 0),
      completedSimulatorSessions: completedSimulatorSessions.length,
      simulatorScoreBonus: completedSimulatorSessions.reduce((sum, session) => sum + Math.floor((session.score?.overall ?? 0) / 10), 0),
      knowledgeNotesAuthored: record.knowledgeNotes.length,
    });
  }

  private computeUserBadges(record: UserGamificationRecord): GamificationBadge[] {
    return deriveGamificationBadges({
      onboardingCompletedAt: this.onboardingCompletedAt(record),
      completedSimulatorSessions: record.simulatorSessions
        .filter((session) => session.status === 'COMPLETED')
        .map((session) => ({
          endedAt: session.endedAt,
          overall: session.score?.overall ?? null,
          scoredAt: session.score?.createdAt ?? null,
        })),
      notesCreatedAt: record.knowledgeNotes.map((note) => note.createdAt),
    });
  }

  private onboardingCompletedAt(record: UserGamificationRecord): Date[] {
    return record.onboardingAssignments.flatMap((assignment) =>
      assignment.dayProgress
        .map((progress) => progress.completedAt)
        .filter((completedAt): completedAt is Date => completedAt instanceof Date),
    );
  }
}
