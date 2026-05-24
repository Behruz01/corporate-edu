import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { MemoryService } from './memory.service';
import { NotesController } from './notes.controller';
import { OffboardingController } from './offboarding.controller';
import { PersonasController } from './personas.controller';
import { ProjectsController } from './projects.controller';
import { WhoKnowsController } from './who-knows.controller';

@Module({
  imports: [AiModule],
  controllers: [ProjectsController, NotesController, PersonasController, WhoKnowsController, OffboardingController],
  providers: [MemoryService],
  exports: [MemoryService],
})
export class MemoryModule {}
