import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  type MessageEvent,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { Observable } from 'rxjs';
import { ConvSource, MsgRole } from '@corpmind/shared';
import { OpenAiClient } from '../ai/openai.client';
import { detectLanguage } from '../ai/prompts/language-policy';
import { RagService } from '../ai/rag/rag.service';
import type { FusedSearchResult } from '../ai/rag/search-types';
import { TelemetryService } from '../ai/telemetry.service';
import type { AuthPrincipal } from '../common/types/authenticated-request';
import { getTenantIdOrThrow } from '../common/request-context';
import { loadEnv } from '../config/env';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateOnboardingAssignmentDto } from './dto/onboarding-assignment.dto';
import type { OnboardingCompanionAskDto } from './dto/onboarding-companion.dto';
import type { CompleteOnboardingDayDto } from './dto/onboarding-complete-day.dto';
import type {
  CreateOnboardingDayDto,
  CreateOnboardingTemplateDto,
  CreateOnboardingTopicDto,
  CreateQuizDto,
  UpdateOnboardingDayDto,
} from './dto/onboarding-template.dto';
import { gradeQuizAnswers, type QuizQuestionForGrading } from './quiz-grading';

type DayForPayload = {
  id: string;
  dayNumber: number;
  title: string;
  description: string;
  estimatedMin: number;
  topics: Array<{ id: string; order: number; title: string; content: string; documentIds: string[] }>;
  quiz: {
    id: string;
    questions: Array<{
      id: string;
      type: 'MCQ' | 'TRUE_FALSE' | 'SHORT_ANSWER';
      prompt: string;
      options: Prisma.JsonValue | null;
      correct: Prisma.JsonValue;
      explanation: string | null;
    }>;
  } | null;
};

type AssignmentForCurrentDay = {
  id: string;
  tenantId: string;
  userId: string;
  templateId: string;
  startedAt: Date;
  currentDay: number;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
  createdAt: Date;
  template: { id: string; name: string; role: string; days: DayForPayload[] };
  dayProgress: Array<{
    id: string;
    dayId: string;
    startedAt: Date | null;
    completedAt: Date | null;
    quizScore: number | null;
    timeSpentSec: number;
    day: { id: string; dayNumber: number; title: string; description: string };
  }>;
};

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);
  private readonly chatModel = loadEnv().OPENAI_MODEL_CHAT;

  constructor(
    private readonly prisma: PrismaService,
    private readonly openai: OpenAiClient,
    private readonly rag: RagService,
    private readonly telemetry: TelemetryService,
  ) {}

  async listTemplates(): Promise<unknown> {
    return this.prisma.scoped.onboardingTemplate.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { days: true, assignments: true } } },
    });
  }

  async createTemplate(dto: CreateOnboardingTemplateDto, user: AuthPrincipal): Promise<unknown> {
    return this.prisma.scoped.onboardingTemplate.create({
      data: {
        tenantId: user.tenantId,
        role: dto.role,
        name: dto.name,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async getTemplate(id: string): Promise<unknown> {
    const template = await this.prisma.scoped.onboardingTemplate.findUnique({
      where: { id },
      include: {
        days: {
          orderBy: { dayNumber: 'asc' },
          include: {
            topics: { orderBy: { order: 'asc' } },
            quiz: { include: { questions: true } },
          },
        },
      },
    });
    if (!template) throw new NotFoundException('Onboarding template not found');
    return template;
  }

  async addDay(templateId: string, dto: CreateOnboardingDayDto): Promise<unknown> {
    await this.getTemplateOwnerOrThrow(templateId);
    return this.prisma.scoped.onboardingDay.create({
      data: {
        templateId,
        dayNumber: dto.dayNumber,
        title: dto.title,
        description: dto.description,
        estimatedMin: dto.estimatedMin,
      },
    });
  }

  async updateDay(dayId: string, dto: UpdateOnboardingDayDto): Promise<unknown> {
    await this.getDayOrThrow(dayId);
    return this.prisma.scoped.onboardingDay.update({ where: { id: dayId }, data: dto });
  }

  async addTopic(dayId: string, dto: CreateOnboardingTopicDto): Promise<unknown> {
    await this.getDayOrThrow(dayId);
    return this.prisma.scoped.onboardingTopic.create({
      data: {
        dayId,
        order: dto.order,
        title: dto.title,
        content: dto.content,
        documentIds: dto.documentIds ?? [],
      },
    });
  }

  async setQuiz(dayId: string, dto: CreateQuizDto): Promise<unknown> {
    await this.getDayOrThrow(dayId);
    return this.prisma.scoped.quiz.upsert({
      where: { dayId },
      update: {
        questions: {
          deleteMany: {},
          create: dto.questions.map((question) => ({
            type: question.type,
            prompt: question.prompt,
            options: toNullableJson(question.options),
            correct: toJson(question.correct),
            explanation: question.explanation ?? null,
          })),
        },
      },
      create: {
        dayId,
        questions: {
          create: dto.questions.map((question) => ({
            type: question.type,
            prompt: question.prompt,
            options: toNullableJson(question.options),
            correct: toJson(question.correct),
            explanation: question.explanation ?? null,
          })),
        },
      },
      include: { questions: true },
    });
  }

  async createAssignment(dto: CreateOnboardingAssignmentDto, user: AuthPrincipal): Promise<unknown> {
    const [assignee, template] = await Promise.all([
      this.prisma.scoped.user.findFirst({ where: { id: dto.userId }, select: { id: true } }),
      this.prisma.scoped.onboardingTemplate.findFirst({ where: { id: dto.templateId }, select: { id: true } }),
    ]);
    if (!assignee) throw new NotFoundException('User not found');
    if (!template) throw new NotFoundException('Onboarding template not found');

    const existing = await this.prisma.scoped.onboardingAssignment.findFirst({
      where: { userId: dto.userId, templateId: dto.templateId, status: 'IN_PROGRESS' },
      include: { template: true },
    });
    if (existing) return existing;

    return this.prisma.scoped.onboardingAssignment.create({
      data: {
        tenantId: user.tenantId,
        userId: dto.userId,
        templateId: dto.templateId,
        startedAt: new Date(),
        currentDay: 1,
        status: 'IN_PROGRESS',
      },
      include: { template: true },
    });
  }

  async getMine(user: AuthPrincipal): Promise<unknown> {
    const assignment = await this.getCurrentAssignment(user);
    if (!assignment) return { assignment: null, currentDay: null, history: [] };

    const currentDay =
      assignment.status === 'IN_PROGRESS'
        ? assignment.template.days.find((day) => day.dayNumber === assignment.currentDay) ?? null
        : null;

    return {
      assignment: {
        id: assignment.id,
        templateId: assignment.templateId,
        templateName: assignment.template.name,
        startedAt: assignment.startedAt,
        currentDay: assignment.currentDay,
        status: assignment.status,
        totalDays: assignment.template.days.length,
      },
      currentDay: currentDay ? this.toDayPayload(currentDay) : null,
      history: assignment.dayProgress
        .filter((progress) => progress.completedAt)
        .sort((a, b) => a.day.dayNumber - b.day.dayNumber)
        .map((progress) => ({
          id: progress.id,
          dayId: progress.dayId,
          dayNumber: progress.day.dayNumber,
          title: progress.day.title,
          description: progress.day.description,
          startedAt: progress.startedAt,
          completedAt: progress.completedAt,
          quizScore: progress.quizScore,
          timeSpentSec: progress.timeSpentSec,
        })),
    };
  }

  async startDay(dayId: string, user: AuthPrincipal): Promise<unknown> {
    const assignment = await this.getCurrentAssignmentOrThrow(user);
    const day = assignment.template.days.find((candidate) => candidate.id === dayId);
    if (!day) throw new NotFoundException('Onboarding day not found');
    if (day.dayNumber !== assignment.currentDay) throw new ConflictException('This day is not unlocked yet');

    return this.prisma.scoped.onboardingDayProgress.upsert({
      where: { assignmentId_dayId: { assignmentId: assignment.id, dayId } },
      update: { startedAt: new Date() },
      create: { assignmentId: assignment.id, dayId, startedAt: new Date() },
    });
  }

  async completeDay(dayId: string, dto: CompleteOnboardingDayDto, user: AuthPrincipal): Promise<unknown> {
    const assignment = await this.getCurrentAssignmentOrThrow(user);
    const day = assignment.template.days.find((candidate) => candidate.id === dayId);
    if (!day) throw new NotFoundException('Onboarding day not found');
    if (day.dayNumber !== assignment.currentDay) throw new ConflictException('This day is not unlocked yet');
    if (!day.quiz) throw new BadRequestException('This onboarding day has no quiz');

    const existingProgress = assignment.dayProgress.find((progress) => progress.dayId === dayId);
    const grade = gradeQuizAnswers(this.toGradingQuestions(day), dto.quizAnswers);
    const completedAt = grade.passed ? new Date() : null;

    const progress = await this.prisma.scoped.onboardingDayProgress.upsert({
      where: { assignmentId_dayId: { assignmentId: assignment.id, dayId } },
      update: { quizScore: grade.score, completedAt },
      create: { assignmentId: assignment.id, dayId, startedAt: new Date(), completedAt, quizScore: grade.score },
    });

    const lastDayNumber = Math.max(...assignment.template.days.map((item) => item.dayNumber));
    const nextDay = grade.passed ? Math.min(day.dayNumber + 1, lastDayNumber) : assignment.currentDay;
    const finishedProgram = grade.passed && day.dayNumber >= lastDayNumber;
    if (grade.passed) {
      await this.prisma.scoped.onboardingAssignment.update({
        where: { id: assignment.id },
        data: { currentDay: nextDay, status: finishedProgram ? 'COMPLETED' : 'IN_PROGRESS' },
      });
      if (!existingProgress?.completedAt) {
        await this.awardDayPoints(user, day.id, day.dayNumber);
      }
    }

    return {
      score: grade.score,
      passed: grade.passed,
      answers: grade.answers,
      progress,
      nextDay: grade.passed && !finishedProgram ? nextDay : null,
      completed: finishedProgram,
      pointsAwarded: grade.passed && !existingProgress?.completedAt ? 50 : 0,
    };
  }

  askCompanionStream(dto: OnboardingCompanionAskDto, user: AuthPrincipal): Observable<MessageEvent> {
    return new Observable<MessageEvent>((subscriber) => {
      void this.runCompanionAsk(dto, user, (event) => subscriber.next(event))
        .then((messageId) => {
          subscriber.next({ type: 'done', data: JSON.stringify({ messageId }) });
          subscriber.complete();
        })
        .catch((error: unknown) => subscriber.error(error));
    });
  }

  private async runCompanionAsk(
    dto: OnboardingCompanionAskDto,
    user: AuthPrincipal,
    emit: (event: MessageEvent) => void,
  ): Promise<string> {
    const assignment = await this.getCurrentAssignmentOrThrow(user);
    const currentDay = assignment.template.days.find((day) => day.dayNumber === assignment.currentDay);
    if (!currentDay) throw new NotFoundException('Current onboarding day not found');

    const conversation = dto.conversationId
      ? await this.getCompanionConversationOrThrow(dto.conversationId, user)
      : await this.prisma.scoped.conversation.create({
          data: {
            tenantId: user.tenantId,
            userId: user.userId,
            source: ConvSource.ONBOARDING_COMPANION,
            contextRef: currentDay.id,
            title: dto.question.slice(0, 80),
          },
        });

    const history = await this.prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: { role: true, content: true },
    });

    await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: MsgRole.USER,
        content: dto.question,
        lang: detectLanguage(dto.question).toUpperCase() as 'UZ' | 'RU' | 'EN',
      },
    });

    const snippets = await this.searchForCurrentDay(user.tenantId, dto.question, currentDay);
    const messages = this.buildCompanionMessages(dto.question, currentDay, snippets, history.reverse());
    const answer = await this.streamCompletion(messages, emit);
    const assistantMessage = await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: MsgRole.ASSISTANT,
        content: answer,
        lang: detectLanguage(dto.question).toUpperCase() as 'UZ' | 'RU' | 'EN',
        noAnswerFlag: snippets.length === 0,
      },
    });

    await this.persistCitations(assistantMessage.id, snippets);
    return assistantMessage.id;
  }

  private async getTemplateOwnerOrThrow(templateId: string): Promise<void> {
    const template = await this.prisma.scoped.onboardingTemplate.findFirst({ where: { id: templateId } });
    if (!template) throw new NotFoundException('Onboarding template not found');
  }

  private async getDayOrThrow(dayId: string): Promise<void> {
    const tenantId = getTenantIdOrThrow();
    const day = await this.prisma.scoped.onboardingDay.findFirst({
      where: { id: dayId, template: { tenantId } },
      select: { id: true },
    });
    if (!day) throw new NotFoundException('Onboarding day not found');
  }

  private async getCurrentAssignment(user: AuthPrincipal): Promise<AssignmentForCurrentDay | null> {
    return this.prisma.scoped.onboardingAssignment.findFirst({
      where: { userId: user.userId },
      orderBy: { createdAt: 'desc' },
      include: {
        template: {
          include: {
            days: {
              orderBy: { dayNumber: 'asc' },
              include: {
                topics: { orderBy: { order: 'asc' } },
                quiz: { include: { questions: true } },
              },
            },
          },
        },
        dayProgress: {
          include: { day: { select: { id: true, dayNumber: true, title: true, description: true } } },
        },
      },
    });
  }

  private async getCurrentAssignmentOrThrow(user: AuthPrincipal): Promise<AssignmentForCurrentDay> {
    const assignment = await this.getCurrentAssignment(user);
    if (!assignment) throw new NotFoundException('Onboarding assignment not found');
    if (assignment.status !== 'IN_PROGRESS') throw new ConflictException('Onboarding assignment is not in progress');
    return assignment;
  }

  private toDayPayload(day: DayForPayload): unknown {
    return {
      id: day.id,
      dayNumber: day.dayNumber,
      title: day.title,
      description: day.description,
      estimatedMin: day.estimatedMin,
      topics: day.topics,
      quiz: day.quiz
        ? {
            id: day.quiz.id,
            questions: day.quiz.questions.map((question) => ({
              id: question.id,
              type: question.type,
              prompt: question.prompt,
              options: question.options,
              explanation: question.explanation,
            })),
          }
        : null,
    };
  }

  private toGradingQuestions(day: DayForPayload): QuizQuestionForGrading[] {
    return (
      day.quiz?.questions.map((question) => ({
        id: question.id,
        type: question.type,
        prompt: question.prompt,
        options: question.options,
        correct: question.correct,
        explanation: question.explanation,
      })) ?? []
    );
  }

  private async awardDayPoints(user: AuthPrincipal, dayId: string, dayNumber: number): Promise<void> {
    await this.prisma.scoped.pointsEvent.create({
      data: {
        tenantId: user.tenantId,
        userId: user.userId,
        reason: 'ONBOARDING_DAY_COMPLETED',
        points: 50,
        metadata: { dayId, dayNumber },
      },
    });
    await this.prisma.scoped.user.update({
      where: { id: user.userId },
      data: { pointsTotal: { increment: 50 } },
    });
  }

  private async searchForCurrentDay(
    tenantId: string,
    question: string,
    day: DayForPayload,
  ): Promise<FusedSearchResult[]> {
    const allowedDocumentIds = new Set(day.topics.flatMap((topic) => topic.documentIds));
    const general = await this.rag.search(tenantId, question, 8);
    if (allowedDocumentIds.size === 0) return general.slice(0, 5);

    const daySnippets = general.filter((snippet) => allowedDocumentIds.has(snippet.documentId)).slice(0, 5);
    if (daySnippets.length > 0) return daySnippets;

    this.logger.warn(`onboarding companion fell back to general KB for day ${day.id}`);
    return general.slice(0, 5);
  }

  private buildCompanionMessages(
    question: string,
    day: DayForPayload,
    snippets: FusedSearchResult[],
    history: Array<{ role: string; content: string }>,
  ): ChatCompletionMessageParam[] {
    const topicContext = day.topics
      .map((topic) => `- ${topic.title}: ${topic.content.slice(0, 900)}`)
      .join('\n');
    const snippetContext =
      snippets.length > 0
        ? snippets
            .map((snippet, index) => `[${index + 1}] ${snippet.title} (${snippet.section ?? 'section'}): ${snippet.text}`)
            .join('\n\n')
        : 'No document snippets were found. Answer from general onboarding context and say when a detail needs HR confirmation.';

    return [
      {
        role: 'system',
        content: [
          'You are CorpMind onboarding companion for a new SQB employee.',
          'Use a calm mentor tone. Keep answers practical, concise, and grounded.',
          'Answer in the same language as the employee. For Uzbek, use natural Uzbek banking language.',
          'Prefer the current onboarding day and snippets. If context is missing, say what is missing.',
          'You may end with a short comprehension check such as: "Bitta savol berib ko\'raymi?"',
          `Current onboarding day: Day ${day.dayNumber} - ${day.title}`,
          `Day description: ${day.description}`,
          `Topics:\n${topicContext}`,
          `Grounding snippets:\n${snippetContext}`,
        ].join('\n\n'),
      },
      ...history.map((message): ChatCompletionMessageParam => ({
        role: message.role === MsgRole.USER ? 'user' : 'assistant',
        content: message.content,
      })),
      { role: 'user', content: question },
    ];
  }

  private async streamCompletion(
    messages: ChatCompletionMessageParam[],
    emit: (event: MessageEvent) => void,
  ): Promise<string> {
    const startedAt = Date.now();
    const stream = await this.openai.raw.chat.completions.create({
      model: this.chatModel,
      messages,
      stream: true,
      temperature: 0.25,
    });

    let answer = '';
    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content ?? '';
      if (!token) continue;
      answer += token;
      emit({ type: 'token', data: JSON.stringify(token) });
    }

    await this.telemetry.record({
      model: this.chatModel,
      promptTokens: this.estimatePromptTokens(messages),
      completionTokens: Math.ceil(answer.length / 4),
      latencyMs: Date.now() - startedAt,
    });
    return answer.trim();
  }

  private async getCompanionConversationOrThrow(
    conversationId: string,
    user: AuthPrincipal,
  ): Promise<{ id: string }> {
    const conversation = await this.prisma.scoped.conversation.findFirst({
      where: { id: conversationId, userId: user.userId, source: ConvSource.ONBOARDING_COMPANION },
      select: { id: true },
    });
    if (!conversation) throw new NotFoundException('Companion conversation not found');
    return conversation;
  }

  private async persistCitations(messageId: string, snippets: FusedSearchResult[]): Promise<void> {
    if (snippets.length === 0) return;
    await this.prisma.citation.createMany({
      data: snippets.slice(0, 3).map((snippet) => ({
        messageId,
        documentId: snippet.documentId,
        chunkId: snippet.id,
        page: snippet.page,
        section: snippet.section,
        snippet: snippet.text.slice(0, 500),
        score: snippet.rrfScore,
      })),
    });
  }

  private estimatePromptTokens(messages: ChatCompletionMessageParam[]): number {
    const chars = messages.reduce((sum, message) => {
      const content = message.content;
      return sum + (typeof content === 'string' ? content.length : JSON.stringify(content).length);
    }, 0);
    return Math.ceil(chars / 4);
  }
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function toNullableJson(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return value === undefined || value === null ? Prisma.JsonNull : toJson(value);
}
