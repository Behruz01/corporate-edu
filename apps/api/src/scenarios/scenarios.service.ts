import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthPrincipal } from '../common/types/authenticated-request';
import type { CreateScenarioDto, ScenarioCriterionDto } from './dto/create-scenario.dto';
import type { ListScenariosDto } from './dto/list-scenarios.dto';
import type { UpdateScenarioDto } from './dto/update-scenario.dto';

@Injectable()
export class ScenariosService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListScenariosDto): Promise<unknown> {
    const where: Prisma.ScenarioWhereInput = { active: true };
    if (query.category !== undefined) where.category = query.category;
    if (query.difficulty !== undefined) where.difficulty = query.difficulty;
    return this.prisma.scoped.scenario.findMany({
      where,
      orderBy: [{ category: 'asc' }, { difficulty: 'asc' }, { title: 'asc' }],
      select: {
        id: true,
        category: true,
        title: true,
        brief: true,
        difficulty: true,
        lang: true,
        active: true,
        createdAt: true,
        criteria: {
          orderBy: { dimension: 'asc' },
          select: { id: true, dimension: true, weight: true, rubric: true },
        },
      },
    });
  }

  async get(id: string): Promise<unknown> {
    const scenario = await this.prisma.scoped.scenario.findUnique({
      where: { id },
      include: { criteria: { orderBy: { dimension: 'asc' } } },
    });
    if (!scenario) throw new NotFoundException('Scenario not found');
    return scenario;
  }

  async create(dto: CreateScenarioDto, user: AuthPrincipal): Promise<unknown> {
    return this.prisma.scoped.scenario.create({
      data: {
        tenantId: user.tenantId,
        category: dto.category,
        title: dto.title,
        brief: dto.brief,
        personaDesc: dto.personaDesc,
        difficulty: dto.difficulty,
        lang: dto.lang,
        active: dto.active ?? true,
        criteria: { create: this.mapCriteria(dto.criteria ?? []) },
      },
      include: { criteria: { orderBy: { dimension: 'asc' } } },
    });
  }

  async update(id: string, dto: UpdateScenarioDto): Promise<unknown> {
    const existing = await this.prisma.scoped.scenario.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Scenario not found');

    const data: Prisma.ScenarioUpdateInput = {};
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.brief !== undefined) data.brief = dto.brief;
    if (dto.personaDesc !== undefined) data.personaDesc = dto.personaDesc;
    if (dto.difficulty !== undefined) data.difficulty = dto.difficulty;
    if (dto.lang !== undefined) data.lang = dto.lang;
    if (dto.active !== undefined) data.active = dto.active;
    if (dto.criteria) data.criteria = { deleteMany: {}, create: this.mapCriteria(dto.criteria) };

    return this.prisma.scoped.scenario.update({
      where: { id },
      data,
      include: { criteria: { orderBy: { dimension: 'asc' } } },
    });
  }

  private mapCriteria(criteria: ScenarioCriterionDto[]): Array<{ dimension: string; weight: number; rubric: string }> {
    return criteria.map((criterion) => ({
      dimension: criterion.dimension,
      weight: criterion.weight ?? 1,
      rubric: criterion.rubric,
    }));
  }
}
