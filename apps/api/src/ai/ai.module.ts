import { Global, Module } from '@nestjs/common';
import { OpenAiClient } from './openai.client';
import { TelemetryService } from './telemetry.service';
import { EmbeddingsService } from './embeddings/embeddings.service';
import { RagService } from './rag/rag.service';

@Global()
@Module({
  providers: [OpenAiClient, TelemetryService, EmbeddingsService, RagService],
  exports: [OpenAiClient, TelemetryService, EmbeddingsService, RagService],
})
export class AiModule {}
