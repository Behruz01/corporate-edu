import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthPrincipal } from '../common/types/authenticated-request';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { MemoryService } from './memory.service';

@Controller()
export class NotesController {
  constructor(private readonly memory: MemoryService) {}

  @Get('me/notes')
  myNotes(@CurrentUser() user: AuthPrincipal): Promise<unknown> {
    return this.memory.myNotes(user);
  }

  @Post('notes')
  createNote(@Body() dto: CreateNoteDto, @CurrentUser() user: AuthPrincipal): Promise<unknown> {
    return this.memory.createNote(dto, user);
  }

  @Patch('notes/:id')
  updateNote(@Param('id') id: string, @Body() dto: UpdateNoteDto, @CurrentUser() user: AuthPrincipal): Promise<unknown> {
    return this.memory.updateNote(id, dto, user);
  }

  @Delete('notes/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeNote(@Param('id') id: string, @CurrentUser() user: AuthPrincipal): Promise<void> {
    return this.memory.removeNote(id, user);
  }
}
