import { ForbiddenException, Injectable, Logger, NotFoundException, type MessageEvent } from '@nestjs/common';
import { Role } from '@corpmind/shared';
import { InterviewStatus, PersonaSource, Prisma } from '@prisma/client';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { randomUUID } from 'node:crypto';
import { Observable } from 'rxjs';
import { EmbeddingsService } from '../ai/embeddings/embeddings.service';
import { OpenAiClient } from '../ai/openai.client';
import { TelemetryService } from '../ai/telemetry.service';
import type { AuthPrincipal } from '../common/types/authenticated-request';
import { loadEnv } from '../config/env';
import { PrismaService } from '../prisma/prisma.service';
import type { AddProjectMemberDto } from './dto/add-project-member.dto';
import type { AnswerOffboardingQaDto } from './dto/answer-offboarding-qa.dto';
import type { AskPersonaDto } from './dto/ask-persona.dto';
import type { CreateNoteDto } from './dto/create-note.dto';
import type { CreateOffboardingInterviewDto } from './dto/create-offboarding-interview.dto';
import type { CreateProjectDto } from './dto/create-project.dto';
import type { UpdateNoteDto } from './dto/update-note.dto';
import {
  buildPersonaSystemPrompt,
  estimateTokens,
  isLowConfidence,
  normalizeTags,
  rankExperts,
  vectorLiteral,
  type WhoKnowsCandidate,
} from './memory.util';

type PersonaSearchRow = {
  id: string;
  source: PersonaSource;
  sourceRefId: string;
  text: string;
  createdAt: Date;
  similarity: number | Prisma.Decimal;
};

type PersonaSourceRef = {
  id: string;
  source: PersonaSource;
  sourceRefId: string;
  snippet: string;
  similarity: number;
};

type PersonaAskDonePayload = {
  confidence: number;
  sources: PersonaSourceRef[];
};

type GeneratedQuestions = {
  questions?: Array<{ text?: string; kind?: string }>;
};

@Injectable()
export class MemoryService {
  private readonly logger = new Logger(MemoryService.name);
  private readonly env = loadEnv();
  private readonly chatModel = this.env.OPENAI_MODEL_CHAT;
  private readonly interviewerModel = this.env.OPENAI_MODEL_SCORING;
  private readonly confidenceThreshold = this.env.PERSONA_CONFIDENCE_THRESHOLD;

  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddings: EmbeddingsService,
    private readonly openai: OpenAiClient,
    private readonly telemetry: TelemetryService,
  ) {}

  async listProjects(): Promise<unknown> {
    return this.prisma.scoped.project.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { members: true, notes: true } } },
    });
  }

  async createProject(dto: CreateProjectDto, user: AuthPrincipal): Promise<unknown> {
    const data: Prisma.ProjectUncheckedCreateInput = {
      tenantId: user.tenantId,
      name: dto.name.trim(),
      status: dto.status?.trim() || 'active',
    };
    const department = dto.department?.trim();
    if (department) data.department = department;
    const description = dto.description?.trim();
    if (description) data.description = description;
    return this.prisma.scoped.project.create({ data });
  }

  async getProject(id: string): Promise<unknown> {
    const project = await this.prisma.scoped.project.findUnique({
      where: { id },
      include: {
        members: {
          include: { user: { select: { id: true, fullName: true, email: true, position: true, department: true } } },
          orderBy: { role: 'asc' },
        },
        notes: {
          orderBy: { createdAt: 'desc' },
          include: { author: { select: { id: true, fullName: true, position: true } } },
        },
      },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async addProjectMember(projectId: string, dto: AddProjectMemberDto): Promise<unknown> {
    await this.getProjectOrThrow(projectId);
    const user = await this.prisma.scoped.user.findUnique({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException('User not found');
    return this.prisma.projectMember.upsert({
      where: { projectId_userId: { projectId, userId: dto.userId } },
      create: { projectId, userId: dto.userId, role: dto.role.trim() },
      update: { role: dto.role.trim() },
      include: { user: { select: { id: true, fullName: true, email: true, position: true, department: true } } },
    });
  }

  async myNotes(user: AuthPrincipal): Promise<unknown> {
    return this.prisma.scoped.knowledgeNote.findMany({
      where: { authorId: user.userId },
      orderBy: { createdAt: 'desc' },
      include: { project: { select: { id: true, name: true } } },
    });
  }

  async createNote(dto: CreateNoteDto, user: AuthPrincipal): Promise<unknown> {
    if (dto.projectId) await this.getProjectOrThrow(dto.projectId);
    const tags = normalizeTags(dto.tags);
    const data: Prisma.KnowledgeNoteUncheckedCreateInput = {
      tenantId: user.tenantId,
      authorId: user.userId,
      kind: dto.kind,
      text: dto.text.trim(),
      visibility: dto.visibility,
      tags,
    };
    if (dto.projectId) data.projectId = dto.projectId;
    const prompt = dto.prompt?.trim();
    if (prompt) data.prompt = prompt;

    const note = await this.prisma.scoped.knowledgeNote.create({ data });
    await this.indexPersonaText({
      tenantId: user.tenantId,
      userId: user.userId,
      source: PersonaSource.NOTE,
      sourceRefId: note.id,
      text: note.text,
      tags,
      replaceExisting: true,
    });
    return note;
  }

  async updateNote(id: string, dto: UpdateNoteDto, user: AuthPrincipal): Promise<unknown> {
    const existing = await this.getOwnedNoteOrThrow(id, user);
    if (dto.projectId) await this.getProjectOrThrow(dto.projectId);

    const data: Prisma.KnowledgeNoteUncheckedUpdateInput = {};
    if (dto.projectId !== undefined) data.projectId = dto.projectId;
    if (dto.kind !== undefined) data.kind = dto.kind;
    if (dto.prompt !== undefined) data.prompt = dto.prompt?.trim() || null;
    if (dto.text !== undefined) data.text = dto.text.trim();
    if (dto.visibility !== undefined) data.visibility = dto.visibility;
    const tags = dto.tags !== undefined ? normalizeTags(dto.tags) : undefined;
    if (tags !== undefined) data.tags = tags;

    const note = await this.prisma.scoped.knowledgeNote.update({ where: { id }, data });
    if (dto.text !== undefined || tags !== undefined) {
      await this.indexPersonaText({
        tenantId: user.tenantId,
        userId: user.userId,
        source: PersonaSource.NOTE,
        sourceRefId: existing.id,
        text: note.text,
        tags: tags ?? note.tags,
        replaceExisting: true,
      });
    }
    return note;
  }

  async removeNote(id: string, user: AuthPrincipal): Promise<void> {
    await this.getOwnedNoteOrThrow(id, user);
    await this.prisma.scoped.knowledgeNote.delete({ where: { id } });
    await this.deletePersonaChunk(user.tenantId, PersonaSource.NOTE, id);
  }

  async listPersonas(): Promise<unknown> {
    return this.prisma.scoped.persona.findMany({
      orderBy: [{ lastTrainedAt: 'desc' }, { createdAt: 'desc' }],
      include: {
        user: { select: { id: true, fullName: true, email: true, position: true, department: true, status: true } },
        _count: { select: { chunks: true } },
      },
    });
  }

  async getPersona(id: string): Promise<unknown> {
    const persona = await this.prisma.scoped.persona.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            position: true,
            department: true,
            status: true,
            manager: { select: { id: true, fullName: true } },
          },
        },
        chunks: {
          orderBy: { createdAt: 'desc' },
          take: 12,
          select: { id: true, source: true, sourceRefId: true, text: true, createdAt: true },
        },
      },
    });
    if (!persona) throw new NotFoundException('Persona not found');
    return persona;
  }

  askPersonaStream(personaId: string, dto: AskPersonaDto, user: AuthPrincipal): Observable<MessageEvent> {
    return new Observable<MessageEvent>((subscriber) => {
      void this.runPersonaAsk(personaId, dto, user, (event) => subscriber.next(event))
        .then((payload) => {
          subscriber.next({ type: 'done', data: JSON.stringify(payload) });
          subscriber.complete();
        })
        .catch((error: unknown) => subscriber.error(error));
    });
  }

  async whoKnows(query: string): Promise<unknown> {
    if (query.trim().length < 2) return [];
    const personas = await this.prisma.scoped.persona.findMany({
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            position: true,
            department: true,
            knowledgeNotes: {
              orderBy: { createdAt: 'desc' },
              take: 10,
              select: { tags: true },
            },
          },
        },
      },
    });
    const candidates: WhoKnowsCandidate[] = personas.map((persona) => ({
      personaId: persona.id,
      userId: persona.userId,
      fullName: persona.user.fullName,
      position: persona.user.position,
      department: persona.user.department,
      expertiseTags: persona.expertiseTags,
      recentNoteTags: persona.user.knowledgeNotes.flatMap((note) => note.tags),
    }));
    return rankExperts(query, candidates).slice(0, 10);
  }

  async createOffboardingInterview(dto: CreateOffboardingInterviewDto, user: AuthPrincipal): Promise<unknown> {
    const target = await this.prisma.scoped.user.findUnique({
      where: { id: dto.userId },
      include: {
        projectMemberships: { include: { project: { select: { name: true, description: true } } } },
      },
    });
    if (!target) throw new NotFoundException('User not found');

    const questions = await this.generateOffboardingQuestions(target);
    return this.prisma.$transaction(async (tx) => {
      const interview = await tx.offboardingInterview.create({
        data: {
          tenantId: user.tenantId,
          userId: target.id,
          triggeredBy: user.userId,
          status: InterviewStatus.SCHEDULED,
        },
      });
      await tx.offboardingQA.createMany({
        data: questions.map((question, index) => ({
          interviewId: interview.id,
          order: index + 1,
          questionText: question.text,
          questionKind: question.kind,
        })),
      });
      return tx.offboardingInterview.findUnique({
        where: { id: interview.id },
        include: { questions: { orderBy: { order: 'asc' } } },
      });
    });
  }

  async myOffboardingInterview(user: AuthPrincipal): Promise<unknown> {
    return this.prisma.scoped.offboardingInterview.findFirst({
      where: { userId: user.userId, status: { in: [InterviewStatus.SCHEDULED, InterviewStatus.IN_PROGRESS] } },
      orderBy: { startedAt: 'desc' },
      include: { questions: { orderBy: { order: 'asc' } } },
    });
  }

  async startOffboardingInterview(id: string, user: AuthPrincipal): Promise<unknown> {
    await this.getInterviewForUserOrAdmin(id, user);
    return this.prisma.scoped.offboardingInterview.update({
      where: { id },
      data: { status: InterviewStatus.IN_PROGRESS, startedAt: new Date() },
      include: { questions: { orderBy: { order: 'asc' } } },
    });
  }

  async answerOffboardingQuestion(
    id: string,
    qaId: string,
    dto: AnswerOffboardingQaDto,
    user: AuthPrincipal,
  ): Promise<unknown> {
    const interview = await this.getInterviewForUserOrAdmin(id, user);
    const qa = await this.prisma.offboardingQA.findFirst({ where: { id: qaId, interviewId: id } });
    if (!qa) throw new NotFoundException('Question not found');
    const answerText = dto.text.trim();
    const updated = await this.prisma.offboardingQA.update({
      where: { id: qaId },
      data: { answerText },
    });
    await this.indexPersonaText({
      tenantId: interview.tenantId,
      userId: interview.userId,
      source: PersonaSource.OFFBOARDING_ANSWER,
      sourceRefId: qaId,
      text: answerText,
      tags: [],
      replaceExisting: true,
    });
    return updated;
  }

  async completeOffboardingInterview(id: string, user: AuthPrincipal): Promise<unknown> {
    const interview = await this.getInterviewForUserOrAdmin(id, user);
    await this.ensurePersona(interview.tenantId, interview.userId, []);
    return this.prisma.scoped.offboardingInterview.update({
      where: { id },
      data: { status: InterviewStatus.COMPLETED, completedAt: new Date() },
      include: { questions: { orderBy: { order: 'asc' } } },
    });
  }

  private async runPersonaAsk(
    personaId: string,
    dto: AskPersonaDto,
    user: AuthPrincipal,
    emit: (event: MessageEvent) => void,
  ): Promise<PersonaAskDonePayload> {
    const persona = await this.prisma.scoped.persona.findUnique({
      where: { id: personaId },
      include: { user: { include: { manager: { select: { fullName: true } } } } },
    });
    if (!persona) throw new NotFoundException('Persona not found');

    const snippets = await this.searchPersonaChunks(user.tenantId, persona.id, dto.question, 5);
    const topSimilarity = snippets[0]?.similarity;
    if (isLowConfidence(topSimilarity, this.confidenceThreshold)) {
      const managerName = persona.user.manager?.fullName ?? 'their manager';
      const fallback = `I don't have enough context. Please ask ${managerName}.`;
      emit({ type: 'token', data: JSON.stringify(fallback) });
      return { confidence: topSimilarity ?? 0, sources: snippets };
    }

    const messages = this.buildPersonaMessages({
      fullName: persona.user.fullName,
      voiceProfile: persona.voiceProfile,
      managerName: persona.user.manager?.fullName ?? null,
      question: dto.question,
      snippets,
    });
    await this.streamCompletion(messages, emit);
    return { confidence: topSimilarity ?? 0, sources: snippets };
  }

  private buildPersonaMessages(input: {
    fullName: string;
    voiceProfile: string;
    managerName: string | null;
    question: string;
    snippets: PersonaSourceRef[];
  }): ChatCompletionMessageParam[] {
    const context = input.snippets
      .map((snippet, index) => `[${index + 1}] ${snippet.source}:${snippet.sourceRefId}\n${snippet.snippet}`)
      .join('\n\n');
    return [
      {
        role: 'system',
        content: buildPersonaSystemPrompt({
          fullName: input.fullName,
          voiceProfile: input.voiceProfile,
          fallbackManagerName: input.managerName,
        }),
      },
      { role: 'user', content: `Memory snippets:\n${context}\n\nQuestion: ${input.question}` },
    ];
  }

  private async streamCompletion(messages: ChatCompletionMessageParam[], emit: (event: MessageEvent) => void): Promise<string> {
    const startedAt = Date.now();
    const stream = await this.openai.raw.chat.completions.create({
      model: this.chatModel,
      messages,
      stream: true,
      temperature: 0.2,
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
    return answer;
  }

  private async searchPersonaChunks(tenantId: string, personaId: string, question: string, topK: number): Promise<PersonaSourceRef[]> {
    const embedding = await this.embeddings.embedQuery(question);
    const vector = vectorLiteral(embedding);
    const rows = await this.prisma.$queryRaw<PersonaSearchRow[]>`
      SELECT
        pc.id,
        pc.source,
        pc."sourceRefId",
        pc.text,
        pc."createdAt",
        1 - (pc.embedding <=> ${vector}::vector) AS similarity
      FROM "PersonaChunk" pc
      WHERE pc."tenantId" = ${tenantId}
        AND pc."personaId" = ${personaId}
      ORDER BY pc.embedding <=> ${vector}::vector
      LIMIT ${topK}
    `;
    return rows.map((row) => ({
      id: row.id,
      source: row.source,
      sourceRefId: row.sourceRefId,
      snippet: row.text.slice(0, 700),
      similarity: Number(row.similarity),
    }));
  }

  private async indexPersonaText(input: {
    tenantId: string;
    userId: string;
    source: PersonaSource;
    sourceRefId: string;
    text: string;
    tags: string[];
    replaceExisting: boolean;
  }): Promise<void> {
    const persona = await this.ensurePersona(input.tenantId, input.userId, input.tags);
    if (input.replaceExisting) await this.deletePersonaChunk(input.tenantId, input.source, input.sourceRefId);
    const embedding = await this.embeddings.embedQuery(input.text);
    await this.insertPersonaChunk({
      tenantId: input.tenantId,
      personaId: persona.id,
      source: input.source,
      sourceRefId: input.sourceRefId,
      text: input.text,
      embedding,
    });
    await this.prisma.scoped.persona.update({
      where: { id: persona.id },
      data: { lastTrainedAt: new Date() },
    });
  }

  private async ensurePersona(tenantId: string, userId: string, tags: string[]): Promise<{ id: string; expertiseTags: string[] }> {
    const user = await this.prisma.scoped.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    const existing = await this.prisma.scoped.persona.findFirst({ where: { userId } });
    if (!existing) {
      const expertiseTags = normalizeTags([...(user.department ? [user.department] : []), ...(user.position ? [user.position] : []), ...tags]);
      const created = await this.prisma.scoped.persona.create({
        data: {
          tenantId,
          userId,
          voiceProfile: `${user.fullName}'s practical workplace notes and project memory.`,
          expertiseTags,
          expertiseScore: this.buildExpertiseScore(expertiseTags),
        },
      });
      return { id: created.id, expertiseTags: created.expertiseTags };
    }

    const expertiseTags = normalizeTags([...existing.expertiseTags, ...tags]);
    const updated = await this.prisma.scoped.persona.update({
      where: { id: existing.id },
      data: { expertiseTags, expertiseScore: this.buildExpertiseScore(expertiseTags) },
    });
    return { id: updated.id, expertiseTags: updated.expertiseTags };
  }

  private async insertPersonaChunk(input: {
    tenantId: string;
    personaId: string;
    source: PersonaSource;
    sourceRefId: string;
    text: string;
    embedding: number[];
  }): Promise<void> {
    const vector = vectorLiteral(input.embedding);
    await this.prisma.$executeRaw`
      INSERT INTO "PersonaChunk"
        (id, "tenantId", "personaId", source, "sourceRefId", text, "tokenCount", embedding, "createdAt")
      VALUES
        (${randomUUID()}, ${input.tenantId}, ${input.personaId}, ${input.source}::"PersonaSource", ${input.sourceRefId},
         ${input.text}, ${estimateTokens(input.text)}, ${vector}::vector, NOW())
    `;
  }

  private async deletePersonaChunk(tenantId: string, source: PersonaSource, sourceRefId: string): Promise<void> {
    await this.prisma.$executeRaw`
      DELETE FROM "PersonaChunk"
      WHERE "tenantId" = ${tenantId}
        AND source = ${source}::"PersonaSource"
        AND "sourceRefId" = ${sourceRefId}
    `;
  }

  private async generateOffboardingQuestions(user: {
    fullName: string;
    position: string | null;
    department: string | null;
    projectMemberships: Array<{ role: string; project: { name: string; description: string | null } }>;
  }): Promise<Array<{ text: string; kind: string }>> {
    const projects = user.projectMemberships
      .map((member) => `${member.project.name} (${member.role})${member.project.description ? `: ${member.project.description}` : ''}`)
      .join('\n');
    const messages: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content:
          'Generate 12 to 18 offboarding knowledge-transfer questions. Return JSON only: {"questions":[{"text":"...","kind":"PROJECT|PROCESS|DECISION|RISK|HANDOFF"}]}.',
      },
      {
        role: 'user',
        content: [
          `Employee: ${user.fullName}`,
          `Role: ${user.position ?? 'unknown'}`,
          `Department: ${user.department ?? 'unknown'}`,
          `Projects:\n${projects || 'No recorded projects'}`,
        ].join('\n'),
      },
    ];
    const startedAt = Date.now();
    const completion = await this.openai.raw.chat.completions.create({
      model: this.interviewerModel,
      messages,
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });
    const content = completion.choices[0]?.message.content ?? '{}';
    await this.telemetry.record({
      model: this.interviewerModel,
      promptTokens: completion.usage?.prompt_tokens ?? this.estimatePromptTokens(messages),
      completionTokens: completion.usage?.completion_tokens ?? Math.ceil(content.length / 4),
      latencyMs: Date.now() - startedAt,
    });
    const parsed = this.parseGeneratedQuestions(content);
    if (parsed.length >= 12) return parsed.slice(0, 18);
    this.logger.warn(`offboarding question generation returned ${parsed.length} usable questions; filling deterministic fallback`);
    return [...parsed, ...this.fallbackOffboardingQuestions(user)].slice(0, 12);
  }

  private parseGeneratedQuestions(content: string): Array<{ text: string; kind: string }> {
    try {
      const parsed = JSON.parse(content) as GeneratedQuestions;
      return (parsed.questions ?? [])
        .map((question) => ({
          text: question.text?.trim() ?? '',
          kind: question.kind?.trim() || 'HANDOFF',
        }))
        .filter((question) => question.text.length >= 8);
    } catch (error) {
      this.logger.warn(`failed to parse offboarding questions: ${(error as Error).message}`);
      return [];
    }
  }

  private fallbackOffboardingQuestions(user: { position: string | null; department: string | null }): Array<{ text: string; kind: string }> {
    const role = user.position ?? 'your role';
    const department = user.department ?? 'your department';
    return [
      { text: `Which recurring responsibilities in ${role} need the most context before handoff?`, kind: 'HANDOFF' },
      { text: `Which ${department} decisions are not fully documented elsewhere?`, kind: 'DECISION' },
      { text: 'Which active projects carry the highest operational risk after your departure?', kind: 'RISK' },
      { text: 'What process shortcuts or exceptions should your replacement understand?', kind: 'PROCESS' },
      { text: 'Which stakeholders should be contacted first for urgent escalations?', kind: 'HANDOFF' },
      { text: 'What are the most common mistakes someone new in this role should avoid?', kind: 'PROCESS' },
      { text: 'Which files, dashboards, or systems contain the source of truth for your work?', kind: 'HANDOFF' },
      { text: 'What unresolved questions should your manager track after your final day?', kind: 'RISK' },
      { text: 'Which client or internal cases need special background context?', kind: 'PROJECT' },
      { text: 'What would you teach your replacement during their first week?', kind: 'PROCESS' },
      { text: 'Which policies are easy to misinterpret without practical examples?', kind: 'PROCESS' },
      { text: 'What final advice would help preserve your institutional knowledge?', kind: 'HANDOFF' },
    ];
  }

  private async getProjectOrThrow(projectId: string): Promise<void> {
    const project = await this.prisma.scoped.project.findUnique({ where: { id: projectId }, select: { id: true } });
    if (!project) throw new NotFoundException('Project not found');
  }

  private async getOwnedNoteOrThrow(id: string, user: AuthPrincipal): Promise<{ id: string }> {
    const note = await this.prisma.scoped.knowledgeNote.findFirst({ where: { id, authorId: user.userId }, select: { id: true } });
    if (!note) throw new NotFoundException('Note not found');
    return note;
  }

  private async getInterviewForUserOrAdmin(
    id: string,
    user: AuthPrincipal,
  ): Promise<{ id: string; tenantId: string; userId: string }> {
    const interview = await this.prisma.scoped.offboardingInterview.findUnique({
      where: { id },
      select: { id: true, tenantId: true, userId: true },
    });
    if (!interview) throw new NotFoundException('Interview not found');
    if (interview.userId !== user.userId && user.role !== Role.HR_ADMIN && user.role !== Role.PLATFORM_ADMIN) {
      throw new ForbiddenException('Interview is not assigned to this user');
    }
    return interview;
  }

  private buildExpertiseScore(tags: string[]): Prisma.InputJsonObject {
    return Object.fromEntries(tags.map((tag) => [tag, 1])) as Prisma.InputJsonObject;
  }

  private estimatePromptTokens(messages: ChatCompletionMessageParam[]): number {
    const chars = messages.reduce((sum, message) => {
      const content = message.content;
      if (typeof content === 'string') return sum + content.length;
      return sum + (JSON.stringify(content) ?? '').length;
    }, 0);
    return Math.ceil(chars / 4);
  }
}
