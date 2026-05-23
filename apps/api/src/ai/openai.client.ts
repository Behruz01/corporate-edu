import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { loadEnv } from '../config/env';

@Injectable()
export class OpenAiClient {
  private client: OpenAI | null = null;

  get raw(): OpenAI {
    if (!this.client) {
      const env = loadEnv();
      if (!env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is required');
      this.client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    }
    return this.client;
  }
}
