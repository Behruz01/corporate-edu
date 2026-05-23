import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { IngestWorker } from './ingest.worker';

@Module({
  controllers: [DocumentsController],
  providers: [DocumentsService, IngestWorker],
})
export class DocumentsModule {}
