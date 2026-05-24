import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthPrincipal } from '../common/types/authenticated-request';
import { AddProjectMemberDto } from './dto/add-project-member.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { MemoryService } from './memory.service';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly memory: MemoryService) {}

  @Get()
  listProjects(): Promise<unknown> {
    return this.memory.listProjects();
  }

  @Post()
  createProject(@Body() dto: CreateProjectDto, @CurrentUser() user: AuthPrincipal): Promise<unknown> {
    return this.memory.createProject(dto, user);
  }

  @Get(':id')
  getProject(@Param('id') id: string): Promise<unknown> {
    return this.memory.getProject(id);
  }

  @Post(':id/members')
  addMember(@Param('id') id: string, @Body() dto: AddProjectMemberDto): Promise<unknown> {
    return this.memory.addProjectMember(id, dto);
  }
}
