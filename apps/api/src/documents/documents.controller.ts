import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query, UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@corpmind/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthPrincipal } from '../common/types/authenticated-request';
import { CreateDocumentDto } from './dto/create-document.dto';
import { ListDocumentsDto } from './dto/list-documents.dto';
import { DocumentsService, type UploadedDocumentFile } from './documents.service';

@Controller('documents')
@Roles(Role.HR_ADMIN, Role.PLATFORM_ADMIN, Role.KNOWLEDGE_CURATOR)
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  create(
    @Body() dto: CreateDocumentDto,
    @UploadedFile() file: UploadedDocumentFile | undefined,
    @CurrentUser() user: AuthPrincipal,
  ): Promise<unknown> {
    return this.documents.create(dto, file, user);
  }

  @Get()
  list(@Query() query: ListDocumentsDto): Promise<unknown> {
    return this.documents.list(query);
  }

  @Get(':id')
  get(@Param('id') id: string): Promise<unknown> {
    return this.documents.get(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string): Promise<void> {
    return this.documents.remove(id);
  }

  @Post(':id/reprocess')
  reprocess(@Param('id') id: string, @CurrentUser() user: AuthPrincipal): Promise<unknown> {
    return this.documents.reprocess(id, user);
  }
}
