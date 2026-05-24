import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException, type MessageEvent } from '@nestjs/common';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { Observable } from 'rxjs';
import type { Prisma } from '@prisma/client';
import { OpenAiClient } from '../ai/openai.client';
import { buildSimulatorRoleplaySystemPrompt } from '../ai/prompts/simulator-roleplay.prompt';
import { buildSimulatorScoringMessages } from '../ai/prompts/simulator-scoring.prompt';
import { TelemetryService } from '../ai/telemetry.service';
import type { AuthPrincipal } from '../common/types/authenticated-request';
import { loadEnv } from '../config/env';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateSimulatorSessionDto } from './dto/create-session.dto';
import type { SimulatorTurnDto } from './dto/simulator-turn.dto';
import { simulatorScoreSchema, type SimulatorScorePayload } from './simulator-score.schema';

type SessionWithScenario = {
  id: string;
  tenantId: string;
  userId: string;
  scenarioId: string;
  status: string;
  scenario: {
    id: string;
    title: string;
    brief: string;
    personaDesc: string;
    difficulty: string;
    criteria: Array<{ dimension: string; weight: number; rubric: string }>;
  };
  turns: Array<{ id: string; turnIndex: number; speaker: string; text: string; createdAt: Date }>;
};

@Injectable()
export class SimulatorService {
  private readonly logger = new Logger(SimulatorService.name);
  private readonly chatModel = loadEnv().OPENAI_MODEL_CHAT;
  private readonly scoringModel = loadEnv().OPENAI_MODEL_SCORING;

  constructor(
    private readonly prisma: PrismaService,
    private readonly openai: OpenAiClient,
    private readonly telemetry: TelemetryService,
  ) {}

  async createSession(dto: CreateSimulatorSessionDto, user: AuthPrincipal): Promise<{ sessionId: string }> {
    const scenario = await this.prisma.scoped.scenario.findFirst({
      where: { id: dto.scenarioId, active: true },
      select: { id: true },
    });
    if (!scenario) throw new NotFoundException('Scenario not found');

    const attempts = await this.prisma.scoped.simulatorSession.count({
      where: { scenarioId: dto.scenarioId, userId: user.userId },
    });
    const session = await this.prisma.scoped.simulatorSession.create({
      data: {
        tenantId: user.tenantId,
        userId: user.userId,
        scenarioId: dto.scenarioId,
        attemptNum: attempts + 1,
        status: 'IN_PROGRESS',
      },
      select: { id: true },
    });
    return { sessionId: session.id };
  }

  turnStream(sessionId: string, dto: SimulatorTurnDto, user: AuthPrincipal): Observable<MessageEvent> {
    return new Observable<MessageEvent>((subscriber) => {
      void this.runTurn(sessionId, dto, user, (event) => subscriber.next(event))
        .then((turnId) => {
          subscriber.next({ type: 'done', data: JSON.stringify({ turnId }) });
          subscriber.complete();
        })
        .catch((error: unknown) => subscriber.error(error));
    });
  }

  async endSession(sessionId: string, user: AuthPrincipal): Promise<unknown> {
    const session = await this.getSessionForUser(sessionId, user);
    if (session.turns.length === 0) throw new BadRequestException('Cannot score an empty simulator session');

    const existing = await this.prisma.simulatorScore.findUnique({ where: { sessionId } });
    if (existing) return this.toScoreResponse(existing);

    const score = await this.scoreTranscript(session);
    const persisted = await this.prisma.simulatorScore.create({
      data: {
        sessionId,
        overall: Math.round(score.overall),
        dimensionScores: score.dimensions,
        feedback: score.feedback,
        weakAreas: score.weakAreas,
      },
    });
    await this.prisma.scoped.simulatorSession.update({
      where: { id: sessionId },
      data: { status: 'COMPLETED', endedAt: new Date() },
    });
    return this.toScoreResponse(persisted);
  }

  async getSession(sessionId: string, user: AuthPrincipal): Promise<unknown> {
    const session = await this.prisma.scoped.simulatorSession.findFirst({
      where: { id: sessionId, userId: user.userId },
      include: {
        scenario: { include: { criteria: { orderBy: { dimension: 'asc' } } } },
        turns: { orderBy: { turnIndex: 'asc' } },
        score: true,
      },
    });
    if (!session) throw new NotFoundException('Simulator session not found');
    return {
      id: session.id,
      status: session.status,
      attemptNum: session.attemptNum,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      scenario: session.scenario,
      turns: session.turns,
      score: session.score ? this.toScoreResponse(session.score) : null,
    };
  }

  async getScore(sessionId: string, user: AuthPrincipal): Promise<unknown> {
    await this.getSessionForUser(sessionId, user);
    const score = await this.prisma.simulatorScore.findUnique({ where: { sessionId } });
    if (!score) throw new NotFoundException('Simulator score not found');
    return this.toScoreResponse(score);
  }

  async history(user: AuthPrincipal): Promise<unknown> {
    return this.prisma.scoped.simulatorSession.findMany({
      where: { userId: user.userId },
      orderBy: { startedAt: 'desc' },
      take: 30,
      include: {
        scenario: { select: { id: true, title: true, category: true, difficulty: true } },
        score: true,
      },
    });
  }

  private async runTurn(
    sessionId: string,
    dto: SimulatorTurnDto,
    user: AuthPrincipal,
    emit: (event: MessageEvent) => void,
  ): Promise<string> {
    const session = await this.getSessionForUser(sessionId, user);
    if (session.status !== 'IN_PROGRESS') throw new ConflictException('Simulator session is not in progress');

    const employeeText = dto.text.trim();
    if (!employeeText) throw new BadRequestException('Turn text is required');

    const employeeTurnIndex = session.turns.length;
    await this.prisma.simulatorTurn.create({
      data: { sessionId, turnIndex: employeeTurnIndex, speaker: 'EMPLOYEE', text: employeeText },
    });

    const promptTurns = [...session.turns, { speaker: 'EMPLOYEE', text: employeeText }];
    const messages: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: buildSimulatorRoleplaySystemPrompt({
          personaDesc: session.scenario.personaDesc,
          brief: session.scenario.brief,
          difficulty: session.scenario.difficulty,
          turns: promptTurns,
          userText: employeeText,
        }),
      },
      { role: 'user', content: employeeText },
    ];

    const answer = await this.streamRoleplayCompletion(messages, emit);
    const aiTurn = await this.prisma.simulatorTurn.create({
      data: { sessionId, turnIndex: employeeTurnIndex + 1, speaker: 'AI_PERSONA', text: answer },
      select: { id: true },
    });
    return aiTurn.id;
  }

  private async streamRoleplayCompletion(messages: ChatCompletionMessageParam[], emit: (event: MessageEvent) => void): Promise<string> {
    const startedAt = Date.now();
    const stream = await this.openai.raw.chat.completions.create({
      model: this.chatModel,
      messages,
      stream: true,
      temperature: 0.7,
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

  private async scoreTranscript(session: SessionWithScenario): Promise<SimulatorScorePayload> {
    const messages = buildSimulatorScoringMessages({
      brief: session.scenario.brief,
      personaDesc: session.scenario.personaDesc,
      difficulty: session.scenario.difficulty,
      criteria: session.scenario.criteria,
      transcript: session.turns,
    });

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const startedAt = Date.now();
      const completion = await this.openai.raw.chat.completions.create({
        model: this.scoringModel,
        messages,
        response_format: { type: 'json_object' },
        temperature: 0.1,
      });
      const content = completion.choices[0]?.message.content ?? '';
      await this.telemetry.record({
        model: this.scoringModel,
        promptTokens: this.estimatePromptTokens(messages),
        completionTokens: Math.ceil(content.length / 4),
        latencyMs: Date.now() - startedAt,
      });

      const parsed = this.parseScore(content);
      if (parsed) return parsed;
      this.logger.warn(`simulator score JSON validation failed for session ${session.id}, attempt ${attempt + 1}`);
    }

    throw new BadRequestException('Simulator scoring failed validation');
  }

  private parseScore(content: string): SimulatorScorePayload | null {
    try {
      const parsed = JSON.parse(content) as unknown;
      return simulatorScoreSchema.parse(parsed);
    } catch (error) {
      this.logger.warn(`invalid simulator score JSON: ${(error as Error).message}`);
      return null;
    }
  }

  private async getSessionForUser(sessionId: string, user: AuthPrincipal): Promise<SessionWithScenario> {
    const session = await this.prisma.scoped.simulatorSession.findFirst({
      where: { id: sessionId, userId: user.userId },
      include: {
        scenario: { include: { criteria: { orderBy: { dimension: 'asc' } } } },
        turns: { orderBy: { turnIndex: 'asc' } },
      },
    });
    if (!session) throw new NotFoundException('Simulator session not found');
    return session;
  }

  private toScoreResponse(score: {
    id: string;
    sessionId: string;
    overall: number;
    dimensionScores: Prisma.JsonValue;
    feedback: Prisma.JsonValue;
    weakAreas: Prisma.JsonValue;
    createdAt: Date;
  }): {
    id: string;
    sessionId: string;
    overall: number;
    dimensions: Prisma.JsonValue;
    feedback: Prisma.JsonValue;
    weakAreas: Prisma.JsonValue;
    createdAt: Date;
  } {
    return {
      id: score.id,
      sessionId: score.sessionId,
      overall: score.overall,
      dimensions: score.dimensionScores,
      feedback: score.feedback,
      weakAreas: score.weakAreas,
      createdAt: score.createdAt,
    };
  }

  private estimatePromptTokens(messages: Array<{ content?: unknown }>): number {
    const chars = messages.reduce((sum, message) => {
      const content = message.content;
      return sum + (typeof content === 'string' ? content.length : JSON.stringify(content).length);
    }, 0);
    return Math.ceil(chars / 4);
  }
}
