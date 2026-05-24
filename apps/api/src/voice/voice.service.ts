import { Injectable } from '@nestjs/common';
import { toFile } from 'openai';
import { OpenAiClient } from '../ai/openai.client';

@Injectable()
export class VoiceService {
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
}
