import { Injectable, Logger, NotFoundException, type MessageEvent } from '@nestjs/common';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { Observable } from 'rxjs';
import { ConvSource, MsgRole } from '@corpmind/shared';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthPrincipal } from '../common/types/authenticated-request';
import { OpenAiClient } from '../ai/openai.client';
import { RagService } from '../ai/rag/rag.service';
import type { FusedSearchResult } from '../ai/rag/search-types';
import { buildKbAnswerMessages } from '../ai/prompts/kb-answer.prompt';
import { detectLanguage } from '../ai/prompts/language-policy';
import { TelemetryService } from '../ai/telemetry.service';
import { loadEnv } from '../config/env';
import type { AskKbDto } from './dto/ask-kb.dto';

type CitationPayload = {
  citations?: Array<{ marker?: number; chunkId?: string }>;
};

@Injectable()
export class KbService {
  private readonly logger = new Logger(KbService.name);
  private readonly chatModel = loadEnv().OPENAI_MODEL_CHAT;

  constructor(
    private readonly prisma: PrismaService,
    private readonly openai: OpenAiClient,
    private readonly rag: RagService,
    private readonly telemetry: TelemetryService,
  ) {}

  askStream(dto: AskKbDto, user: AuthPrincipal): Observable<MessageEvent> {
    return new Observable<MessageEvent>((subscriber) => {
      void this.runAsk(dto, user, (event) => subscriber.next(event))
        .then((messageId) => {
          subscriber.next({ type: 'done', data: JSON.stringify({ messageId }) });
          subscriber.complete();
        })
        .catch((error: unknown) => subscriber.error(error));
    });
  }

  async conversations(user: AuthPrincipal): Promise<unknown> {
    return this.prisma.scoped.conversation.findMany({
      where: { userId: user.userId, source: ConvSource.KB },
      orderBy: { createdAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true, role: true, content: true, createdAt: true },
        },
      },
    });
  }

  async messages(conversationId: string, user: AuthPrincipal): Promise<unknown> {
    await this.getConversationOrThrow(conversationId, user);
    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      include: { citations: true, nextStep: true },
    });
  }

  async rateMessage(messageId: string, rating: -1 | 1, user: AuthPrincipal): Promise<unknown> {
    const updated = await this.prisma.message.updateMany({
      where: {
        id: messageId,
        role: MsgRole.ASSISTANT,
        conversation: { tenantId: user.tenantId, userId: user.userId, source: ConvSource.KB },
      },
      data: { rating },
    });
    if (updated.count === 0) throw new NotFoundException('Message not found');
    return { ok: true };
  }

  private async runAsk(dto: AskKbDto, user: AuthPrincipal, emit: (event: MessageEvent) => void): Promise<string> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: user.tenantId } });
    const tenantName = tenant?.name ?? 'your organization';
    const conversation = dto.conversationId
      ? await this.getConversationOrThrow(dto.conversationId, user)
      : await this.prisma.scoped.conversation.create({
          data: {
            tenantId: user.tenantId,
            userId: user.userId,
            source: ConvSource.KB,
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

    const snippets = await this.rag.search(user.tenantId, dto.question, 5);
    const messages = buildKbAnswerMessages({
      tenantName,
      question: dto.question,
      snippets,
      history: history.reverse().map((message) => ({ role: message.role, content: message.content })),
    });

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

    await this.persistCitations(assistantMessage.id, answer, snippets);
    return assistantMessage.id;
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

  private async persistCitations(messageId: string, answer: string, snippets: FusedSearchResult[]): Promise<void> {
    const byId = new Map(snippets.map((snippet) => [snippet.id, snippet]));
    const parsed = this.parseCitationPayload(answer);
    const citedIds = parsed.citations
      ?.map((citation) => citation.chunkId)
      .filter((chunkId): chunkId is string => Boolean(chunkId && byId.has(chunkId))) ?? [];
    const uniqueIds = [...new Set(citedIds.length > 0 ? citedIds : snippets.slice(0, 3).map((snippet) => snippet.id))];

    if (uniqueIds.length === 0) return;
    await this.prisma.citation.createMany({
      data: uniqueIds.map((chunkId) => {
        const snippet = byId.get(chunkId);
        if (!snippet) throw new Error(`Missing snippet for citation ${chunkId}`);
        return {
          messageId,
          documentId: snippet.documentId,
          chunkId: snippet.id,
          page: snippet.page,
          section: snippet.section,
          snippet: snippet.text.slice(0, 500),
          score: snippet.rrfScore,
        };
      }),
    });
  }

  private parseCitationPayload(answer: string): CitationPayload {
    const match = /```json\s*([\s\S]*?)```/i.exec(answer);
    if (!match?.[1]) return {};
    try {
      return JSON.parse(match[1]) as CitationPayload;
    } catch (error) {
      this.logger.warn(`failed to parse citation JSON: ${(error as Error).message}`);
      return {};
    }
  }

  private estimatePromptTokens(messages: ChatCompletionMessageParam[]): number {
    const chars = messages.reduce((sum, message) => {
      const content = message.content;
      if (typeof content === 'string') return sum + content.length;
      return sum + JSON.stringify(content).length;
    }, 0);
    return Math.ceil(chars / 4);
  }

  private async getConversationOrThrow(conversationId: string, user: AuthPrincipal): Promise<{
    id: string;
    tenantId: string;
    userId: string;
    source: string;
    contextRef: string | null;
    title: string | null;
    createdAt: Date;
  }> {
    const conversation = await this.prisma.scoped.conversation.findFirst({
      where: { id: conversationId, userId: user.userId, source: ConvSource.KB },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');
    return conversation;
  }
}
