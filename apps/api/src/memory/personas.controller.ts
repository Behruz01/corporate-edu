import { Body, Controller, Get, Param, Post, Sse } from '@nestjs/common';
import type { MessageEvent } from '@nestjs/common';
import { Observable } from 'rxjs';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthPrincipal } from '../common/types/authenticated-request';
import { AskPersonaDto } from './dto/ask-persona.dto';
import { MemoryService } from './memory.service';

@Controller('personas')
export class PersonasController {
  constructor(private readonly memory: MemoryService) {}

  @Get()
  list(): Promise<unknown> {
    return this.memory.listPersonas();
  }

  @Get(':id')
  get(@Param('id') id: string): Promise<unknown> {
    return this.memory.getPersona(id);
  }

  @Post(':id/ask')
  @Sse()
  ask(@Param('id') id: string, @Body() dto: AskPersonaDto, @CurrentUser() user: AuthPrincipal): Observable<MessageEvent> {
    return this.memory.askPersonaStream(id, dto, user);
  }
}
