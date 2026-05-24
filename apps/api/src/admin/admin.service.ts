import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { hashPassword } from '../auth/password';
import type { AuthPrincipal } from '../common/types/authenticated-request';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateUserDto, UpdateTenantSettingsDto, UpdateUserStatusDto } from './admin.controller';

const DEFAULT_PASSWORD = 'Demo123!';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private readonly prisma: PrismaService) {}

  async listUsers(): Promise<unknown> {
    return this.prisma.scoped.user.findMany({
      orderBy: [{ fullName: 'asc' }, { email: 'asc' }],
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        department: true,
        position: true,
        status: true,
        preferredLang: true,
        pointsTotal: true,
        createdAt: true,
      },
    });
  }

  async createUser(dto: CreateUserDto, user: AuthPrincipal): Promise<unknown> {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.scoped.user.findUnique({ where: { tenantId_email: { tenantId: user.tenantId, email } } });
    if (existing) throw new ConflictException('User with this email already exists');

    const data: Prisma.UserUncheckedCreateInput = {
      tenantId: user.tenantId,
      email,
      passwordHash: await hashPassword(DEFAULT_PASSWORD),
      fullName: dto.fullName.trim(),
      role: dto.role,
    };
    const department = dto.department?.trim();
    if (department) data.department = department;

    const created = await this.prisma.scoped.user.create({
      data,
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        department: true,
        status: true,
        createdAt: true,
      },
    });
    this.logger.log(`Created user ${created.id} in tenant ${user.tenantId}`);
    return created;
  }

  async updateUserStatus(id: string, dto: UpdateUserStatusDto): Promise<unknown> {
    const existing = await this.prisma.scoped.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('User not found');

    const updated = await this.prisma.scoped.user.update({
      where: { id },
      data: { status: dto.status },
      select: { id: true, email: true, fullName: true, role: true, department: true, status: true },
    });
    this.logger.log(`Updated user ${id} status to ${dto.status}`);
    return updated;
  }

  async updateTenantSettings(dto: UpdateTenantSettingsDto, user: AuthPrincipal): Promise<unknown> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: user.tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const data: Prisma.TenantUpdateInput = {};
    if (dto.industry !== undefined) data.industry = dto.industry;

    const branding = this.mergeBranding(tenant.branding, dto);
    if (branding !== undefined) data.branding = branding;

    const updated = await this.prisma.tenant.update({
      where: { id: user.tenantId },
      data,
      select: { id: true, name: true, slug: true, industry: true, primaryLang: true, langs: true, branding: true },
    });
    this.logger.log(`Updated tenant settings for ${user.tenantId}`);
    return updated;
  }

  private mergeBranding(current: Prisma.JsonValue, dto: UpdateTenantSettingsDto): Prisma.JsonObject | undefined {
    const next: Prisma.JsonObject = this.asJsonObject(current);
    let changed = false;

    if (dto.platformName !== undefined) {
      next.platformName = dto.platformName.trim();
      changed = true;
    }

    const primaryColor = dto.primaryColor ?? dto.colors?.primary;
    if (primaryColor !== undefined) {
      const colors = this.asJsonObject(next.colors);
      colors.primary = primaryColor;
      next.colors = colors;
      changed = true;
    }

    return changed ? next : undefined;
  }

  private asJsonObject(value: Prisma.JsonValue | undefined): Prisma.JsonObject {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return { ...value };
  }
}
