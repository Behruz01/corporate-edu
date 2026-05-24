import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Role } from '@corpmind/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthPrincipal } from '../common/types/authenticated-request';
import { CreateScenarioDto } from './dto/create-scenario.dto';
import { ListScenariosDto } from './dto/list-scenarios.dto';
import { UpdateScenarioDto } from './dto/update-scenario.dto';
import { ScenariosService } from './scenarios.service';

@Controller('scenarios')
export class ScenariosController {
  constructor(private readonly scenarios: ScenariosService) {}

  @Get()
  list(@Query() query: ListScenariosDto): Promise<unknown> {
    return this.scenarios.list(query);
  }

  @Get(':id')
  get(@Param('id') id: string): Promise<unknown> {
    return this.scenarios.get(id);
  }

  @Post()
  @Roles(Role.HR_ADMIN, Role.PLATFORM_ADMIN, Role.KNOWLEDGE_CURATOR)
  create(@Body() dto: CreateScenarioDto, @CurrentUser() user: AuthPrincipal): Promise<unknown> {
    return this.scenarios.create(dto, user);
  }

  @Patch(':id')
  @Roles(Role.HR_ADMIN, Role.PLATFORM_ADMIN, Role.KNOWLEDGE_CURATOR)
  update(@Param('id') id: string, @Body() dto: UpdateScenarioDto): Promise<unknown> {
    return this.scenarios.update(id, dto);
  }
}
