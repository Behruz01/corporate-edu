import { Injectable, Logger } from '@nestjs/common';
import { toFile } from 'openai';
import { OpenAiClient } from '../ai/openai.client';
import { loadEnv } from '../config/env';

@Injectable()
export class VoiceService {
  private readonly logger = new Logger(VoiceService.name);

  constructor(private readonly openai: OpenAiClient) {}

  async transcribe(buffer: Buffer, filename: string, lang?: string): Promise<{ text: string }> {
    const file = await toFile(buffer, filename, { type: 'audio/webm' });
    const model = process.env['OPENAI_MODEL_STT'] ?? 'whisper-1';
    const language = lang?.trim();

    const transcription = language
      ? await this.openai.raw.audio.transcriptions.create({ file, model, language })
      : await this.openai.raw.audio.transcriptions.create({ file, model });

    return { text: transcription.text };
  }

  async synthesize(text: string): Promise<Buffer> {
    const env = loadEnv();

    try {
      const response = await this.openai.raw.audio.speech.create({
        model: env.OPENAI_MODEL_TTS,
        voice: env.OPENAI_TTS_VOICE as any,
        input: text.slice(0, 4000),
        response_format: 'mp3',
      });

      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      this.logger.error('Failed to synthesize speech', error instanceof Error ? error.stack : undefined);
      throw error;
    }
  }
}
