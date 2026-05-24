/* Rich manager-demo seed: a full SQB credit team under Malika with a clear,
 * understandable story across the manager dashboard (team status, skill gap,
 * knowledge risk, most-asked) and the leaderboard. Idempotent: all team-created
 * rows use the `${tenantId}-team-` id prefix and are deleted+recreated on re-run.
 */
import { PrismaClient, Prisma } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();
const TENANT_SLUG = process.env.DEMO_TENANT_SLUG ?? 'sqb';
const MANAGER_EMAIL = 'malika@sqb.uz';

type Profile = 'onTrack' | 'behind' | 'atRisk';

type Member = {
  email: string;
  fullName: string;
  position: string;
  tenureDays: number;
  profile: Profile;
  departing?: boolean;
  notes?: number;
};

const MEMBERS: Member[] = [
  { email: 'sardor@sqb.uz', fullName: 'Sardor Aliyev', position: 'Senior Credit Officer', tenureDays: 760, profile: 'onTrack', notes: 3 },
  { email: 'gulnora@sqb.uz', fullName: 'Gulnora Ismoilova', position: 'Credit Officer', tenureDays: 1100, profile: 'onTrack', notes: 4 },
  { email: 'nodira@sqb.uz', fullName: 'Nodira Yo‘ldosheva', position: 'Lead Credit Officer', tenureDays: 1500, profile: 'onTrack', notes: 4 },
  { email: 'bekzod@sqb.uz', fullName: 'Bekzod Toirov', position: 'Credit Officer', tenureDays: 1, profile: 'behind', notes: 0 },
  { email: 'dilshod@sqb.uz', fullName: 'Dilshod Rakhimov', position: 'Credit Officer', tenureDays: 14, profile: 'behind', notes: 1 },
  { email: 'jasur@sqb.uz', fullName: 'Jasur Komilov', position: 'Credit Officer', tenureDays: 35, profile: 'behind', notes: 1 },
  { email: 'kamola@sqb.uz', fullName: 'Kamola Tursunova', position: 'Junior Credit Officer', tenureDays: 180, profile: 'atRisk', notes: 0 },
  { email: 'rustam@sqb.uz', fullName: 'Rustam Saidov', position: 'Senior Credit Officer', tenureDays: 420, profile: 'atRisk', departing: true, notes: 2 },
];

const KB_QUESTIONS = [
  'Yuridik shaxslar uchun kredit foiz stavkalari qanday?',
  'Valyuta o‘tkazmalari uchun kunlik limit qancha?',
  'Hisob ochish uchun qanday hujjatlar kerak?',
  'Shubhali tranzaksiyani qanday aniqlayman?',
  'Erta to‘lashda komissiya olinadimi?',
  'AML bo‘yicha qaysi hujjatlar majburiy?',
];
const KB_UNANSWERED = [
  'Ipoteka uchun sug‘urta shartlari qanday?',
  'Chet el fuqarosiga karta ochsa bo‘ladimi?',
  'Biznes kartaga limit qanday oshiriladi?',
  'Kriptovalyuta operatsiyalari bo‘yicha siyosat bormi?',
  'Mobil ilovada parolni qanday tiklayman?',
];

const DIMENSIONS = ['correctness', 'tone', 'resolution', 'processAdherence', 'compliance'] as const;

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86_400_000);
}
function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}
function toJson(v: unknown): Prisma.InputJsonValue {
  return v as Prisma.InputJsonValue;
}

function scoreFor(profile: Profile, seed: number): {
  overall: number;
  dims: Record<(typeof DIMENSIONS)[number], number>;
} {
  const base = profile === 'onTrack' ? 82 : profile === 'behind' ? 66 : 52;
  const jitter = ((seed * 7) % 9) - 4; // -4..+4 deterministic
  const dims = {
    correctness: clamp(base + 6 + jitter),
    tone: clamp(base + 9 + jitter),
    resolution: clamp(base + jitter),
    processAdherence: clamp(base - 17 + jitter), // engineered low
    compliance: clamp(base - 21 + jitter), // engineered low → visible skill gap
  };
  const overall = clamp(
    (dims.correctness + dims.tone + dims.resolution + dims.processAdherence + dims.compliance) / 5,
  );
  return { overall, dims };
}

async function main(): Promise<void> {
  const tenant = await prisma.tenant.findUnique({ where: { slug: TENANT_SLUG } });
  if (!tenant) throw new Error(`Tenant not found: ${TENANT_SLUG}. Run seed first.`);
  const prefix = `${tenant.id}-team-`;

  const manager = await prisma.user.findFirst({ where: { tenantId: tenant.id, email: MANAGER_EMAIL } });
  if (!manager) throw new Error(`Manager not found: ${MANAGER_EMAIL}. Run seed first.`);

  const template = await prisma.onboardingTemplate.findFirst({
    where: { tenantId: tenant.id, OR: [{ id: { contains: 'credit-5d' } }, { name: 'Credit Officer 5-day' }] },
    include: { days: { orderBy: { dayNumber: 'asc' } } },
  });
  if (!template || template.days.length === 0) throw new Error('Onboarding template/days missing. Run seed:onboarding first.');
  const days = template.days;

  const scenarios = await prisma.scenario.findMany({ where: { tenantId: tenant.id }, orderBy: { title: 'asc' } });
  if (scenarios.length === 0) throw new Error('Scenarios missing. Run seed:demo first.');

  const passwordHash = await argon2.hash('Demo123!', { type: argon2.argon2id, memoryCost: 19_456, timeCost: 2, parallelism: 1 });

  // 1) Upsert team members under Malika
  const memberIds = new Map<string, string>();
  for (const m of MEMBERS) {
    const existing = await prisma.user.findFirst({ where: { tenantId: tenant.id, email: m.email } });
    const data = {
      fullName: m.fullName,
      position: m.position,
      department: 'Credit',
      role: 'EMPLOYEE' as const,
      managerId: manager.id,
      status: (m.departing ? 'DEPARTING' : 'ACTIVE') as 'DEPARTING' | 'ACTIVE',
      startedAt: daysAgo(m.tenureDays),
      departingAt: m.departing ? daysAgo(10) : null,
    };
    if (existing) {
      await prisma.user.update({ where: { id: existing.id }, data });
      memberIds.set(m.email, existing.id);
    } else {
      const created = await prisma.user.create({
        data: { ...data, tenantId: tenant.id, email: m.email, passwordHash, preferredLang: 'UZ' },
      });
      memberIds.set(m.email, created.id);
    }
  }
  const ids = [...memberIds.values()];

  // Clean previous team-prefixed activity (idempotent re-run)
  await prisma.conversation.deleteMany({ where: { id: { startsWith: prefix } } });
  await prisma.simulatorSession.deleteMany({ where: { id: { startsWith: prefix } } });
  await prisma.onboardingAssignment.deleteMany({ where: { OR: [{ id: { startsWith: prefix } }, { userId: { in: ids } }] } });
  await prisma.offboardingInterview.deleteMany({ where: { id: { startsWith: prefix } } });
  await prisma.knowledgeNote.deleteMany({ where: { id: { startsWith: prefix } } });
  await prisma.project.deleteMany({ where: { id: { startsWith: prefix } } });

  let onboardingCount = 0;
  let sessionCount = 0;
  let kbCount = 0;
  let noteCount = 0;

  // 2) Onboarding spread + 3) Simulator activity + 4) KB activity
  for (const m of MEMBERS) {
    const uid = memberIds.get(m.email)!;
    const completedDays = m.profile === 'onTrack' ? 5 : m.profile === 'behind' ? (m.tenureDays < 7 ? 1 : 3) : 1;
    const status = completedDays >= 5 ? 'COMPLETED' : m.profile === 'atRisk' ? 'OVERDUE' : 'IN_PROGRESS';
    const startedDaysAgo = m.profile === 'atRisk' ? 60 : m.profile === 'behind' ? 10 : 30;

    await prisma.onboardingAssignment.create({
      data: {
        id: `${prefix}ob-${m.email}`,
        tenantId: tenant.id,
        userId: uid,
        templateId: template.id,
        startedAt: daysAgo(startedDaysAgo),
        currentDay: Math.min(5, completedDays + 1),
        status,
        dayProgress: {
          create: days.slice(0, completedDays).map((d, i) => ({
            dayId: d.id,
            startedAt: daysAgo(startedDaysAgo - i),
            completedAt: daysAgo(startedDaysAgo - i),
            quizScore: clamp((m.profile === 'onTrack' ? 85 : 70) + ((i * 5) % 15)),
            timeSpentSec: 1200 + i * 200,
          })),
        },
      },
    });
    onboardingCount += 1;

    // 3) Simulator: 5 sessions across scenarios
    for (let s = 0; s < 5; s += 1) {
      const scenario = scenarios[s % scenarios.length]!;
      const { overall, dims } = scoreFor(m.profile, s + m.tenureDays);
      const weak = DIMENSIONS.filter((d) => dims[d] < 60);
      await prisma.simulatorSession.create({
        data: {
          id: `${prefix}sess-${m.email}-${s}`,
          tenantId: tenant.id,
          userId: uid,
          scenarioId: scenario.id,
          attemptNum: 1,
          status: 'COMPLETED',
          startedAt: daysAgo(20 - s),
          endedAt: daysAgo(20 - s),
          turns: {
            create: [
              { turnIndex: 1, speaker: 'AI_PERSONA', text: 'Assalomu alaykum, menga zudlik bilan yordam kerak.' },
              { turnIndex: 2, speaker: 'EMPLOYEE', text: 'Albatta, vaziyatni tushuntirib bering, men yordam beraman.' },
              { turnIndex: 3, speaker: 'AI_PERSONA', text: 'Operatsiyani tezroq bajaring, hujjatlarni keyin keltiraman.' },
              { turnIndex: 4, speaker: 'EMPLOYEE', text: 'Kechirasiz, qoidalarga ko‘ra avval hujjatlar kerak.' },
            ],
          },
          score: {
            create: {
              overall,
              dimensionScores: toJson(dims),
              feedback: toJson(
                DIMENSIONS.map((d) => ({
                  dimension: d,
                  comment:
                    dims[d] < 60
                      ? `${d}: jarayon/qoidaga rioya yetishmadi — yaxshilash kerak.`
                      : `${d}: ishonchli va to‘g‘ri yondashuv.`,
                  severity: dims[d] < 60 ? 'major' : 'praise',
                })),
              ),
              weakAreas: toJson(
                weak.map((topic) => ({ topic, suggestKbQuery: `${topic} bo‘yicha qoidalar`, suggestPersonaTags: [topic] })),
              ),
            },
          },
        },
      });
      sessionCount += 1;
    }

    // 4) KB activity: 3 answered (repeated) + maybe 1 unanswered
    const qCount = m.profile === 'onTrack' ? 4 : m.profile === 'behind' ? 3 : 2;
    for (let q = 0; q < qCount; q += 1) {
      const question = KB_QUESTIONS[(m.tenureDays + q) % KB_QUESTIONS.length]!;
      await prisma.conversation.create({
        data: {
          id: `${prefix}conv-${m.email}-${q}`,
          tenantId: tenant.id,
          userId: uid,
          source: 'KB',
          title: question.slice(0, 40),
          createdAt: daysAgo(15 - q),
          messages: {
            create: [
              { role: 'USER', content: question, createdAt: daysAgo(15 - q) },
              { role: 'ASSISTANT', content: 'Hujjatlarga asoslangan javob...', createdAt: daysAgo(15 - q) },
            ],
          },
        },
      });
      kbCount += 1;
    }
    // some unanswered (documentation gaps)
    if (m.profile !== 'onTrack') {
      const uq = KB_UNANSWERED[m.tenureDays % KB_UNANSWERED.length]!;
      await prisma.conversation.create({
        data: {
          id: `${prefix}conv-${m.email}-x`,
          tenantId: tenant.id,
          userId: uid,
          source: 'KB',
          title: uq.slice(0, 40),
          createdAt: daysAgo(8),
          messages: {
            create: [
              { role: 'USER', content: uq, createdAt: daysAgo(8) },
              { role: 'ASSISTANT', content: 'Bu mavzu bo‘yicha hujjat topilmadi.', noAnswerFlag: true, createdAt: daysAgo(8) },
            ],
          },
        },
      });
      kbCount += 1;
    }
  }

  // 5) Projects + notes (one project without notes for knowledge-risk)
  const projWithNotes = await prisma.project.create({
    data: { id: `${prefix}proj-portfel`, tenantId: tenant.id, name: 'Q2 Kredit portfeli', department: 'Credit', status: 'active' },
  });
  await prisma.project.create({
    data: { id: `${prefix}proj-aml`, tenantId: tenant.id, name: 'AML yangilanishi 2026', department: 'Credit', status: 'active' },
  });
  await prisma.project.create({
    data: { id: `${prefix}proj-empty`, tenantId: tenant.id, name: 'Yangi mahsulot tadqiqoti', department: 'Credit', status: 'active' },
  }); // intentionally no notes

  const noteTexts = [
    'Erta to‘lashda komissiya bandini va foiz hisoblash sanasini birinchi tekshirish kerak.',
    'Yirik o‘tkazmalarda mablag‘ manbasi va benefitsiarni alohida hujjatlash shart.',
    'KPI hisobotida ko‘rib chiqish vaqti va rad sabablari eng foydali indikator.',
    'Garov yechish muddatini mijozga oldindan aniq aytish ishonchni oshiradi.',
  ];
  for (const m of MEMBERS) {
    for (let i = 0; i < (m.notes ?? 0); i += 1) {
      await prisma.knowledgeNote.create({
        data: {
          id: `${prefix}note-${m.email}-${i}`,
          tenantId: tenant.id,
          authorId: memberIds.get(m.email)!,
          projectId: projWithNotes.id,
          kind: 'LESSON',
          text: noteTexts[(i + m.tenureDays) % noteTexts.length]!,
          visibility: 'TEAM',
          tags: ['credit_risk', 'process'],
          createdAt: daysAgo(12 - i),
        },
      });
      noteCount += 1;
    }
  }

  // 6) Departing member with INCOMPLETE offboarding interview (knowledge risk)
  const rustam = MEMBERS.find((m) => m.departing)!;
  await prisma.offboardingInterview.create({
    data: {
      id: `${prefix}offb-${rustam.email}`,
      tenantId: tenant.id,
      userId: memberIds.get(rustam.email)!,
      triggeredBy: manager.id,
      status: 'IN_PROGRESS',
      startedAt: daysAgo(5),
      questions: {
        create: [
          { order: 1, questionText: 'Eng murakkab loyihangiz qaysi edi?', questionKind: 'project', answerText: 'Yirik korporativ kredit qayta tuzilishi.' },
          { order: 2, questionText: 'Yozilmagan qaysi jarayon bilimingiz bor?', questionKind: 'process', answerText: null },
          { order: 3, questionText: 'O‘rningizga keladigan odam birinchi kuni nimani bilishi kerak?', questionKind: 'handover', answerText: null },
          { order: 4, questionText: 'Qaysi qarorlar 6 oyda qayta ko‘rilishi kerak?', questionKind: 'decisions', answerText: null },
        ],
      },
    },
  });

  console.log(
    `Team seed complete: ${MEMBERS.length} members under ${MANAGER_EMAIL}; ` +
      `${onboardingCount} onboarding assignments (3 on-track / 3 behind / 2 at-risk), ` +
      `${sessionCount} simulator sessions (compliance & processAdherence engineered <60), ` +
      `${kbCount} KB conversations (incl. unanswered gaps), ${noteCount} notes, 1 departing w/ incomplete offboarding.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
