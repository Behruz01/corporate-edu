import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const TENANT_SLUG = process.env.DEMO_TENANT_SLUG ?? 'sqb';
const TENANT_NAME = process.env.DEMO_TENANT_NAME ?? 'SQB Bank';

type SeedUser = {
  email: string;
  fullName: string;
  role: 'EMPLOYEE' | 'MANAGER' | 'HR_ADMIN' | 'PLATFORM_ADMIN' | 'KNOWLEDGE_CURATOR';
  status?: 'ACTIVE' | 'DEPARTING';
  department?: string;
  position?: string;
  startedDaysAgo?: number;
  managerEmail?: string;
};

const USERS: SeedUser[] = [
  { email: 'aziz@sqb.uz',    fullName: 'Aziz Karimov',     role: 'EMPLOYEE', status: 'DEPARTING', department: 'Credit', position: 'Senior Credit Officer', startedDaysAgo: 5 * 365 },
  { email: 'malika@sqb.uz',  fullName: 'Malika Yusupova',  role: 'MANAGER',  department: 'Credit', position: 'Credit Department Head', startedDaysAgo: 8 * 365 },
  { email: 'bekzod@sqb.uz',  fullName: 'Bekzod Toirov',    role: 'EMPLOYEE', department: 'Credit', position: 'Credit Officer', startedDaysAgo: 0, managerEmail: 'malika@sqb.uz' },
  { email: 'nigora@sqb.uz',  fullName: 'Nigora Saidova',   role: 'HR_ADMIN', department: 'HR',     position: 'HR Lead', startedDaysAgo: 3 * 365 },
  { email: 'dilshod@sqb.uz', fullName: 'Dilshod Rakhimov', role: 'EMPLOYEE', department: 'Credit', position: 'Credit Officer', startedDaysAgo: 14, managerEmail: 'malika@sqb.uz' },
];

async function main(): Promise<void> {
  console.log(`Seeding tenant ${TENANT_NAME} (${TENANT_SLUG})…`);
  const tenant = await prisma.tenant.upsert({
    where: { slug: TENANT_SLUG },
    update: {},
    create: {
      slug: TENANT_SLUG,
      name: TENANT_NAME,
      industry: 'banking',
      primaryLang: 'UZ',
      langs: ['UZ', 'RU', 'EN'],
      branding: { colors: { primary: '#1d4ed8', accent: '#0d9488' }, platformName: 'CorpMind' },
    },
  });

  const passwordHash = await argon2.hash('Demo123!', { type: argon2.argon2id, memoryCost: 19_456, timeCost: 2, parallelism: 1 });

  const created = new Map<string, string>();
  for (const u of USERS) {
    const existing = await prisma.user.findFirst({ where: { tenantId: tenant.id, email: u.email } });
    if (existing) { created.set(u.email, existing.id); continue; }
    const rec = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: u.email,
        fullName: u.fullName,
        role: u.role,
        status: u.status ?? 'ACTIVE',
        department: u.department ?? null,
        position: u.position ?? null,
        preferredLang: 'UZ',
        passwordHash,
        startedAt: u.startedDaysAgo !== undefined ? new Date(Date.now() - u.startedDaysAgo * 86_400_000) : null,
        departingAt: u.status === 'DEPARTING' ? new Date() : null,
      },
    });
    created.set(u.email, rec.id);
  }
  for (const u of USERS) {
    if (!u.managerEmail) continue;
    const userId = created.get(u.email);
    const managerId = created.get(u.managerEmail);
    if (userId && managerId) {
      await prisma.user.update({ where: { id: userId }, data: { managerId } });
    }
  }

  await prisma.project.upsert({
    where: { id: `${tenant.id}-bootstrap` },
    update: {},
    create: { id: `${tenant.id}-bootstrap`, tenantId: tenant.id, name: 'General', department: 'Credit', status: 'active' },
  });

  await prisma.onboardingTemplate.upsert({
    where: { id: `${tenant.id}-credit-5d` },
    update: {},
    create: {
      id: `${tenant.id}-credit-5d`,
      tenantId: tenant.id,
      role: 'credit_officer',
      name: 'Credit Officer 5-day',
      isActive: true,
    },
  });

  console.log(`Seed complete. Users: ${created.size}. Login password: Demo123!`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
