import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getTenantIdOrThrow } from '../common/request-context';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async current(): Promise<unknown> {
    const tenantId = getTenantIdOrThrow();
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      industry: tenant.industry,
      primaryLang: tenant.primaryLang,
      langs: tenant.langs,
      branding: tenant.branding,
    };
  }
}
