import { PrismaClient, type Prisma } from '@prisma/client';
import * as argon2 from 'argon2';
import {
  computeGamificationPoints,
  deriveGamificationBadges,
  type CompletedSimulatorBadgeInput,
} from '../src/gamification/gamification.util';

const prisma = new PrismaClient();

const TENANT_SLUG = process.env.DEMO_TENANT_SLUG ?? 'sqb';
const DEPARTMENT = 'SQB Kredit departamenti';
const DAY_MS = 86_400_000;

type TeamStatus = 'ACTIVE' | 'DEPARTING';
type TeamBand = 'on_track' | 'behind' | 'at_risk';
type Dimension = 'correctness' | 'tone' | 'processAdherence' | 'resolution' | 'compliance';
type Severity = 'minor' | 'moderate' | 'critical';

type TeamMemberSeed = {
  idSuffix: string;
  email: string;
  fullName: string;
  position: string;
  startedDaysAgo: number;
  status: TeamStatus;
  onboardingBand: TeamBand;
  assignmentStartedDaysAgo: number;
  completedDays: number;
  sessions: number;
};

type UserRef = {
  id: string;
  email: string;
  fullName: string;
  idSuffix: string;
  onboardingBand: TeamBand;
  completedDays: number;
  assignmentStartedDaysAgo: number;
  sessions: number;
};

type ScenarioRef = {
  id: string;
  title: string;
  category: string;
};

type SessionSeedResult = {
  userId: string;
  overall: number;
  endedAt: Date;
  scoredAt: Date;
};

const TEAM_MEMBERS: TeamMemberSeed[] = [
  {
    idSuffix: 'bekzod',
    email: 'bekzod@sqb.uz',
    fullName: 'Bekzod Toirov',
    position: 'Kredit xodimi',
    startedDaysAgo: 365,
    status: 'ACTIVE',
    onboardingBand: 'behind',
    assignmentStartedDaysAgo: 9,
    completedDays: 3,
    sessions: 6,
  },
  {
    idSuffix: 'dilshod',
    email: 'dilshod@sqb.uz',
    fullName: 'Dilshod Rakhimov',
    position: 'Korporativ kredit xodimi',
    startedDaysAgo: 21,
    status: 'ACTIVE',
    onboardingBand: 'behind',
    assignmentStartedDaysAgo: 6,
    completedDays: 3,
    sessions: 5,
  },
  {
    idSuffix: 'madina',
    email: 'madina@sqb.uz',
    fullName: 'Madina Abdullayeva',
    position: "Aylanma mablag' kreditlari mutaxassisi",
    startedDaysAgo: 1_030,
    status: 'ACTIVE',
    onboardingBand: 'on_track',
    assignmentStartedDaysAgo: 18,
    completedDays: 5,
    sessions: 7,
  },
  {
    idSuffix: 'sardor',
    email: 'sardor@sqb.uz',
    fullName: 'Sardor Ergashev',
    position: 'Kichik biznes kredit eksperti',
    startedDaysAgo: 760,
    status: 'ACTIVE',
    onboardingBand: 'on_track',
    assignmentStartedDaysAgo: 14,
    completedDays: 5,
    sessions: 6,
  },
  {
    idSuffix: 'shahnoza',
    email: 'shahnoza@sqb.uz',
    fullName: 'Shahnoza Mirzayeva',
    position: 'Kredit risk analitigi',
    startedDaysAgo: 910,
    status: 'DEPARTING',
    onboardingBand: 'at_risk',
    assignmentStartedDaysAgo: 28,
    completedDays: 2,
    sessions: 6,
  },
  {
    idSuffix: 'jasur',
    email: 'jasur@sqb.uz',
    fullName: 'Jasur Usmonov',
    position: 'Korporativ mijozlar kredit menedjeri',
    startedDaysAgo: 430,
    status: 'ACTIVE',
    onboardingBand: 'on_track',
    assignmentStartedDaysAgo: 11,
    completedDays: 4,
    sessions: 8,
  },
  {
    idSuffix: 'feruza',
    email: 'feruza@sqb.uz',
    fullName: 'Feruza Qodirova',
    position: 'Garov hujjatlari mutaxassisi',
    startedDaysAgo: 96,
    status: 'ACTIVE',
    onboardingBand: 'behind',
    assignmentStartedDaysAgo: 12,
    completedDays: 3,
    sessions: 5,
  },
  {
    idSuffix: 'umida',
    email: 'umida@sqb.uz',
    fullName: 'Umida Xolmatova',
    position: 'Yangi mijozlar kredit konsultanti',
    startedDaysAgo: 7,
    status: 'ACTIVE',
    onboardingBand: 'at_risk',
    assignmentStartedDaysAgo: 20,
    completedDays: 1,
    sessions: 5,
  },
];

const KB_QUESTIONS = [
  {
    key: 'stavka',
    question: 'Kredit stavkalari bugun qaysi oraliqda tasdiqlanadi?',
    answer:
      "Kredit stavkasi mahsulot turi, muddat, ta'minot va mijoz risk reytingiga qarab tasdiqlanadi. Yakuniy shartni kredit qo'mitasi qarori bilan ayting.",
  },
  {
    key: 'aml-benefitsiar',
    question: "AML bo'yicha benefitsiar egasini qachon qayta tekshiramiz?",
    answer:
      "Benefitsiar egasi yangi hisob ochishda, yirik valyuta o'tkazmasida, tuzilma o'zgarganda yoki hujjatlar ziddiyatli ko'ringanda qayta tekshiriladi.",
  },
  {
    key: 'valyuta-limit',
    question: "Valyuta o'tkazmasi uchun limitlar qanday qo'llanadi?",
    answer:
      "Valyuta limiti shartnoma, to'lov maqsadi, benefitsiar mamlakati va amaldagi valyuta nazorati talablariga qarab tekshiriladi.",
  },
  {
    key: 'hisob-ochish',
    question: 'Yuridik shaxsga hisob ochishda qaysi hujjatlar kerak?',
    answer:
      "Ustav, davlat ro'yxatidan o'tganlik hujjati, direktor vakolati, STIR, benefitsiar ma'lumoti va imzo namunalari tekshiriladi.",
  },
  {
    key: 'garov',
    question: "Garov hujjatlari tayyor bo'lmasa kreditni davom ettirsak bo'ladimi?",
    answer:
      "Garov hujjatlari to'liq va huquqiy tekshiruvdan o'tmaguncha kredit ajratish bo'yicha yakuniy va'da bermang; masalani risk egasiga eskalatsiya qiling.",
  },
] as const;

const PROJECTS = [
  {
    idSuffix: 'q2-kredit-portfeli',
    name: 'Q2 Kredit portfeli',
    description: "Ikkinchi chorakda kichik biznes va korporativ kredit portfelini sog'lom o'stirish.",
    memberSuffixes: ['madina', 'sardor', 'jasur', 'bekzod'],
  },
  {
    idSuffix: 'aml-yangilanishi',
    name: 'AML yangilanishi',
    description: "Valyuta o'tkazmalari va benefitsiar tekshiruvlari bo'yicha ichki tartibni yangilash.",
    memberSuffixes: ['shahnoza', 'dilshod', 'feruza'],
  },
  {
    idSuffix: 'mijoz-onboarding',
    name: 'Mijoz onboarding jarayoni',
    description: "Yuridik shaxslar hisob ochish va dastlabki kredit suhbatini standartlashtirish.",
    memberSuffixes: ['umida', 'jasur', 'madina'],
  },
] as const;

async function main(): Promise<void> {
  const tenant = await prisma.tenant.findUnique({ where: { slug: TENANT_SLUG } });
  if (!tenant) throw new Error(`Tenant not found: ${TENANT_SLUG}. Run base seed first.`);

  const manager = await prisma.user.findFirst({
    where: { tenantId: tenant.id, email: 'malika@sqb.uz' },
    select: { id: true },
  });
  if (!manager) throw new Error('Manager malika@sqb.uz not found. Run base seed first.');

  const passwordHash = await argon2.hash('Demo123!', {
    type: argon2.argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  });

  const users = await seedUsers(tenant.id, manager.id, passwordHash);
  const onboarding = await seedOnboarding(tenant.id, users);
  const scenarios = await loadScenarios(tenant.id);
  const sessions = await seedSimulatorSessions(tenant.id, users, scenarios);
  const kbMessages = await seedKbActivity(tenant.id, users);
  const projectIds = await seedProjects(tenant.id, users);
  const notes = await seedKnowledgeNotes(tenant.id, users, projectIds);
  await seedOffboarding(tenant.id, manager.id, users);
  await seedGamification(tenant.id, users, onboarding.completedByUser, sessions, kbMessages.byUser, notes.byUser);

  const averages = averageDimensions(sessions.dimensionTotals);
  console.log(
    [
      `Team seed complete for ${TENANT_SLUG}.`,
      `Members upserted: ${users.size}. Onboarding: on_track=${onboarding.breakdown.on_track}, behind=${onboarding.breakdown.behind}, at_risk=${onboarding.breakdown.at_risk}.`,
      `Simulator sessions: ${sessions.count}. KB messages: ${kbMessages.count}. Knowledge notes: ${notes.count}.`,
      `Skill gap averages: processAdherence=${averages.processAdherence}, compliance=${averages.compliance}, correctness=${averages.correctness}, tone=${averages.tone}.`,
    ].join('\n'),
  );
}

async function seedUsers(tenantId: string, managerId: string, passwordHash: string): Promise<Map<string, UserRef>> {
  const users = new Map<string, UserRef>();
  for (const member of TEAM_MEMBERS) {
    const departingAt = member.status === 'DEPARTING' ? daysFromNow(14) : null;
    const record = await prisma.user.upsert({
      where: { tenantId_email: { tenantId, email: member.email } },
      update: {
        passwordHash,
        fullName: member.fullName,
        role: 'EMPLOYEE',
        status: member.status,
        department: DEPARTMENT,
        position: member.position,
        managerId,
        preferredLang: 'UZ',
        startedAt: daysAgo(member.startedDaysAgo),
        departingAt,
      },
      create: {
        id: `${tenantId}-team-${member.idSuffix}`,
        tenantId,
        email: member.email,
        passwordHash,
        fullName: member.fullName,
        role: 'EMPLOYEE',
        status: member.status,
        department: DEPARTMENT,
        position: member.position,
        managerId,
        preferredLang: 'UZ',
        startedAt: daysAgo(member.startedDaysAgo),
        departingAt,
      },
      select: { id: true, email: true, fullName: true },
    });
    users.set(member.idSuffix, {
      id: record.id,
      email: record.email,
      fullName: record.fullName,
      idSuffix: member.idSuffix,
      onboardingBand: member.onboardingBand,
      completedDays: member.completedDays,
      assignmentStartedDaysAgo: member.assignmentStartedDaysAgo,
      sessions: member.sessions,
    });
  }
  return users;
}

async function seedOnboarding(
  tenantId: string,
  users: Map<string, UserRef>,
): Promise<{
  breakdown: Record<TeamBand, number>;
  completedByUser: Map<string, Date[]>;
}> {
  const template = await prisma.onboardingTemplate.findFirst({
    where: { tenantId, id: `${tenantId}-credit-5d` },
    include: { days: { orderBy: { dayNumber: 'asc' } } },
  });
  if (!template) throw new Error(`Onboarding template not found: ${tenantId}-credit-5d. Run seed:onboarding first.`);
  if (template.days.length < 5) throw new Error(`Onboarding template ${template.id} has fewer than 5 days.`);

  const breakdown: Record<TeamBand, number> = { on_track: 0, behind: 0, at_risk: 0 };
  const completedByUser = new Map<string, Date[]>();

  for (const user of users.values()) {
    const assignmentId = `${tenantId}-team-onboarding-${user.idSuffix}`;
    await prisma.onboardingAssignment.deleteMany({
      where: { tenantId, userId: user.id, templateId: template.id, id: { not: assignmentId } },
    });
    await prisma.onboardingAssignment.upsert({
      where: { id: assignmentId },
      update: {
        startedAt: daysAgo(user.assignmentStartedDaysAgo),
        currentDay: Math.min(user.completedDays + 1, template.days.length),
        status: user.completedDays >= template.days.length ? 'COMPLETED' : user.onboardingBand === 'at_risk' ? 'OVERDUE' : 'IN_PROGRESS',
      },
      create: {
        id: assignmentId,
        tenantId,
        userId: user.id,
        templateId: template.id,
        startedAt: daysAgo(user.assignmentStartedDaysAgo),
        currentDay: Math.min(user.completedDays + 1, template.days.length),
        status: user.completedDays >= template.days.length ? 'COMPLETED' : user.onboardingBand === 'at_risk' ? 'OVERDUE' : 'IN_PROGRESS',
      },
    });
    await prisma.onboardingDayProgress.deleteMany({ where: { assignmentId } });

    const completedAt: Date[] = [];
    const data: Prisma.OnboardingDayProgressCreateManyInput[] = [];
    for (const day of template.days) {
      if (day.dayNumber > user.completedDays) {
        data.push({
          id: `${assignmentId}-day-${day.dayNumber}`,
          assignmentId,
          dayId: day.id,
          startedAt: day.dayNumber === user.completedDays + 1 ? daysAgo(Math.max(1, user.assignmentStartedDaysAgo - day.dayNumber + 1)) : null,
          timeSpentSec: day.dayNumber === user.completedDays + 1 ? 540 : 0,
        });
        continue;
      }
      const doneAt = daysAgo(Math.max(1, user.assignmentStartedDaysAgo - day.dayNumber));
      completedAt.push(doneAt);
      data.push({
        id: `${assignmentId}-day-${day.dayNumber}`,
        assignmentId,
        dayId: day.id,
        startedAt: addMinutes(doneAt, -35),
        completedAt: doneAt,
        quizScore: quizScoreFor(user.onboardingBand, day.dayNumber),
        timeSpentSec: 2_100 + day.dayNumber * 180,
      });
    }
    if (data.length > 0) await prisma.onboardingDayProgress.createMany({ data });
    completedByUser.set(user.id, completedAt);
    breakdown[user.onboardingBand] += 1;
  }

  return { breakdown, completedByUser };
}

async function loadScenarios(tenantId: string): Promise<ScenarioRef[]> {
  const scenarios = await prisma.scenario.findMany({
    where: { tenantId, active: true },
    orderBy: [{ category: 'asc' }, { title: 'asc' }],
    select: { id: true, title: true, category: true },
  });
  if (scenarios.length < 3) throw new Error(`Expected at least 3 active scenarios for tenant ${tenantId}. Run seed:demo first.`);
  return scenarios;
}

async function seedSimulatorSessions(
  tenantId: string,
  users: Map<string, UserRef>,
  scenarios: ScenarioRef[],
): Promise<{
  count: number;
  byUser: Map<string, SessionSeedResult[]>;
  dimensionTotals: Map<Dimension, { total: number; count: number }>;
}> {
  const byUser = new Map<string, SessionSeedResult[]>();
  const dimensionTotals = new Map<Dimension, { total: number; count: number }>();
  let count = 0;

  for (const user of users.values()) {
    const userSessions: SessionSeedResult[] = [];
    for (let index = 0; index < user.sessions; index += 1) {
      const scenario = pickScenario(scenarios, index + TEAM_MEMBERS.findIndex((item) => item.idSuffix === user.idSuffix));
      const id = `${tenantId}-team-sim-${user.idSuffix}-${index + 1}`;
      const overall = overallFor(user.onboardingBand, index);
      const dimensions = dimensionScoresFor(overall, index);
      const startedAt = daysAgo(2 + index + user.idSuffix.length);
      const endedAt = addMinutes(startedAt, 14 + (index % 3));
      await prisma.simulatorSession.deleteMany({ where: { id } });
      await prisma.simulatorSession.create({
        data: {
          id,
          tenantId,
          userId: user.id,
          scenarioId: scenario.id,
          attemptNum: index + 1,
          status: 'COMPLETED',
          startedAt,
          endedAt,
          turns: {
            create: buildTurns(scenario, user.fullName, index).map((turn, turnIndex) => ({
              turnIndex: turnIndex + 1,
              speaker: turn.speaker,
              text: turn.text,
              createdAt: addMinutes(startedAt, turnIndex * 2),
            })),
          },
          score: {
            create: {
              overall,
              dimensionScores: toJson(dimensions),
              feedback: toJson(buildFeedback(dimensions)),
              weakAreas: toJson(buildWeakAreas(dimensions)),
              createdAt: endedAt,
            },
          },
        },
      });
      for (const [dimension, value] of Object.entries(dimensions) as Array<[Dimension, number]>) {
        const bucket = dimensionTotals.get(dimension) ?? { total: 0, count: 0 };
        bucket.total += value;
        bucket.count += 1;
        dimensionTotals.set(dimension, bucket);
      }
      userSessions.push({ userId: user.id, overall, endedAt, scoredAt: endedAt });
      count += 1;
    }
    byUser.set(user.id, userSessions);
  }

  return { count, byUser, dimensionTotals };
}

async function seedKbActivity(
  tenantId: string,
  users: Map<string, UserRef>,
): Promise<{ count: number; byUser: Map<string, number> }> {
  const sequence = [
    ['bekzod', 0, false],
    ['dilshod', 0, false],
    ['madina', 0, true],
    ['sardor', 1, false],
    ['shahnoza', 1, true],
    ['jasur', 1, false],
    ['feruza', 2, false],
    ['umida', 2, true],
    ['bekzod', 2, false],
    ['madina', 3, false],
    ['dilshod', 3, true],
    ['jasur', 4, false],
    ['feruza', 4, true],
    ['umida', 0, false],
  ] as const;

  const byUser = new Map<string, number>();
  let messageCount = 0;

  for (const [index, row] of sequence.entries()) {
    const [userSuffix, questionIndex, noAnswer] = row;
    const user = mustGet(users, userSuffix);
    const item = KB_QUESTIONS[questionIndex];
    if (!item) throw new Error(`KB question index missing: ${questionIndex}`);
    const conversationId = `${tenantId}-team-kb-${index + 1}`;
    await prisma.conversation.deleteMany({ where: { id: conversationId } });
    const createdAt = daysAgo(1 + index);
    await prisma.conversation.create({
      data: {
        id: conversationId,
        tenantId,
        userId: user.id,
        source: 'KB',
        title: item.question,
        contextRef: `team-demo:${item.key}`,
        createdAt,
        messages: {
          create: [
            {
              id: `${conversationId}-user`,
              role: 'USER',
              content: item.question,
              lang: 'UZ',
              createdAt,
            },
            {
              id: `${conversationId}-assistant`,
              role: 'ASSISTANT',
              content: noAnswer
                ? "Bu savol bo'yicha bazada yetarli tasdiqlangan hujjat topilmadi. Mas'ul bo'limdan yangilangan tartibni so'rash kerak."
                : item.answer,
              lang: 'UZ',
              noAnswerFlag: noAnswer,
              createdAt: addMinutes(createdAt, 1),
            },
          ],
        },
      },
    });
    byUser.set(user.id, (byUser.get(user.id) ?? 0) + 1);
    messageCount += 2;
  }

  return { count: messageCount, byUser };
}

async function seedProjects(tenantId: string, users: Map<string, UserRef>): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  for (const project of PROJECTS) {
    const id = `${tenantId}-project-${project.idSuffix}`;
    await prisma.project.upsert({
      where: { id },
      update: {
        name: project.name,
        department: DEPARTMENT,
        description: project.description,
        status: 'active',
      },
      create: {
        id,
        tenantId,
        name: project.name,
        department: DEPARTMENT,
        description: project.description,
        status: 'active',
      },
    });
    ids.set(project.idSuffix, id);
    await prisma.projectMember.deleteMany({ where: { projectId: id } });
    await prisma.projectMember.createMany({
      data: project.memberSuffixes.map((suffix) => {
        const user = mustGet(users, suffix);
        return {
          id: `${id}-member-${suffix}`,
          projectId: id,
          userId: user.id,
          role: suffix === 'jasur' || suffix === 'shahnoza' ? 'Loyiha egasi' : 'Ishtirokchi',
        };
      }),
    });
  }

  const noNotesProjectId = ids.get('mijoz-onboarding');
  if (noNotesProjectId) await prisma.knowledgeNote.deleteMany({ where: { projectId: noNotesProjectId } });
  return ids;
}

async function seedKnowledgeNotes(
  tenantId: string,
  users: Map<string, UserRef>,
  projectIds: Map<string, string>,
): Promise<{ count: number; byUser: Map<string, Date[]> }> {
  const notes = [
    {
      idSuffix: 'shahnoza-aml-red-flags',
      author: 'shahnoza',
      project: 'aml-yangilanishi',
      kind: 'PROCESS',
      prompt: 'Valyuta operatsiyasida birinchi qizil bayroq nima?',
      text:
        "Mijoz to'lov maqsadini umumiy yozsa, benefitsiar faoliyati mos kelmasa yoki hujjatni keyin olib kelishini aytsa, operatsiyani shoshirmaslik kerak. Faktlarni neytral yozib, Compliancega yuboramiz.",
      tags: ['AML', 'valyuta', 'benefitsiar'],
      daysAgo: 12,
    },
    {
      idSuffix: 'shahnoza-benefitsiar',
      author: 'shahnoza',
      project: 'aml-yangilanishi',
      kind: 'LESSON',
      prompt: 'Benefitsiar zanjiri bo yicha dars',
      text:
        "Benefitsiar egasi bo'yicha eng ko'p xato faqat direktor pasporti bilan cheklanishdan chiqadi. Ulush zanjiri, yakuniy nazorat qiluvchi shaxs va sanksiya tekshiruvi alohida yozilishi shart.",
      tags: ['KYC', 'benefitsiar'],
      daysAgo: 10,
    },
    {
      idSuffix: 'shahnoza-risk-note',
      author: 'shahnoza',
      project: 'q2-kredit-portfeli',
      kind: 'DECISION',
      prompt: 'Portfel riskini haftalik ko rish',
      text:
        "Q2 portfelida faqat ajratilgan summa emas, hujjati kechikkan arizalar va garov baholash muddati ham kuzatiladi. Shu ko'rsatkichlar kechikish riskini oldinroq ko'rsatadi.",
      tags: ['risk', 'portfel'],
      daysAgo: 8,
    },
    {
      idSuffix: 'shahnoza-handoff',
      author: 'shahnoza',
      project: 'aml-yangilanishi',
      kind: 'PROJECT_REFLECTION',
      prompt: 'Ketishdan oldin qoldiriladigan bilim',
      text:
        "Yangi xodimga asosiy maslahat: mijoz bosim qilganda sababni baholashdan oldin faktni yozing. Shoshilinchlik, noaniq benefitsiar va umumiy kontrakt matni bir joyda kelsa, mustaqil qaror bermang.",
      tags: ['handoff', 'AML', 'eskalatsiya'],
      daysAgo: 5,
    },
    {
      idSuffix: 'madina-stavka',
      author: 'madina',
      project: 'q2-kredit-portfeli',
      kind: 'PROCESS',
      prompt: 'Kredit stavkasini qanday tushuntirish kerak?',
      text:
        "Mijozga stavkani bitta raqam qilib va'da qilmang. Mahsulot, muddat, ta'minot va risk reytingi bo'yicha oraliqni ayting, yakuniy qaror qo'mita bayonnomasida bo'lishini tushuntiring.",
      tags: ['stavka', 'kredit'],
      daysAgo: 7,
    },
    {
      idSuffix: 'madina-early-repayment',
      author: 'madina',
      project: 'q2-kredit-portfeli',
      kind: 'LESSON',
      prompt: 'Erta so ndirishda tekshiruv',
      text:
        "Erta so'ndirishda foiz hisoblangan sana, komissiya bandi va garov yechish muddati alohida tekshiriladi. Mijozga avval qoldiqni, keyin hujjat muddatini aytish kerak.",
      tags: ['erta_sondirish', 'garov'],
      daysAgo: 6,
    },
    {
      idSuffix: 'sardor-small-business',
      author: 'sardor',
      project: 'q2-kredit-portfeli',
      kind: 'PROJECT_REFLECTION',
      prompt: 'Kichik biznes arizasida muhim savol',
      text:
        "Kichik biznes mijozida pul oqimi mavsumiy bo'lsa, oylik tushumning o'rtachasi yetarli emas. Eng past mavsumdagi tushum ham kredit grafigiga yetishini tekshiramiz.",
      tags: ['kichik_biznes', 'pul_oqimi'],
      daysAgo: 4,
    },
    {
      idSuffix: 'dilshod-documents',
      author: 'dilshod',
      project: 'aml-yangilanishi',
      kind: 'PROCESS',
      prompt: 'Hisob ochishda hujjat ketma-ketligi',
      text:
        "Yuridik shaxs hisobini ochishda avval ro'yxat hujjatlari, keyin direktor vakolati va benefitsiar ma'lumoti tekshiriladi. Hujjatdagi sana mos kelmasa, ariza to'xtatiladi.",
      tags: ['hisob_ochish', 'KYC'],
      daysAgo: 3,
    },
  ] as const;

  const byUser = new Map<string, Date[]>();
  await prisma.knowledgeNote.deleteMany({ where: { id: { in: notes.map((note) => `${tenantId}-note-${note.idSuffix}`) } } });
  for (const note of notes) {
    const author = mustGet(users, note.author);
    const projectId = projectIds.get(note.project);
    if (!projectId) throw new Error(`Project missing for note: ${note.project}`);
    const createdAt = daysAgo(note.daysAgo);
    await prisma.knowledgeNote.create({
      data: {
        id: `${tenantId}-note-${note.idSuffix}`,
        tenantId,
        authorId: author.id,
        projectId,
        kind: note.kind,
        prompt: note.prompt,
        text: note.text,
        visibility: 'TEAM',
        tags: [...note.tags],
        createdAt,
      },
    });
    const existing = byUser.get(author.id) ?? [];
    existing.push(createdAt);
    byUser.set(author.id, existing);
  }

  return { count: notes.length, byUser };
}

async function seedOffboarding(tenantId: string, managerId: string, users: Map<string, UserRef>): Promise<void> {
  const shahnoza = mustGet(users, 'shahnoza');
  const interviewId = `${tenantId}-team-offboarding-shahnoza`;
  await prisma.offboardingInterview.upsert({
    where: { id: interviewId },
    update: {
      triggeredBy: managerId,
      status: 'IN_PROGRESS',
      startedAt: daysAgo(2),
      completedAt: null,
    },
    create: {
      id: interviewId,
      tenantId,
      userId: shahnoza.id,
      triggeredBy: managerId,
      status: 'IN_PROGRESS',
      startedAt: daysAgo(2),
      completedAt: null,
    },
  });
  await prisma.offboardingQA.deleteMany({ where: { interviewId } });
  await prisma.offboardingQA.createMany({
    data: [
      {
        id: `${interviewId}-qa-1`,
        interviewId,
        order: 1,
        questionText: "AML yangilanishi bo'yicha qaysi qarorlar hali hujjatlashtirilmagan?",
        questionKind: 'HANDOFF',
        answerText:
          "Valyuta o'tkazmasida benefitsiar zanjiri bo'yicha yangi tekshiruv ro'yxati bor, lekin uni hali yakuniy qo'llanmaga kiritmadik.",
        durationSec: 96,
      },
      {
        id: `${interviewId}-qa-2`,
        interviewId,
        order: 2,
        questionText: 'Qaysi mijoz segmentida risk signallari eng ko p uchrayapti?',
        questionKind: 'RISK',
        answerText: null,
        durationSec: null,
      },
      {
        id: `${interviewId}-qa-3`,
        interviewId,
        order: 3,
        questionText: "Sizsiz qoladigan eng muhim ichki kontakt kim?",
        questionKind: 'HANDOFF',
        answerText: null,
        durationSec: null,
      },
    ],
  });
}

async function seedGamification(
  tenantId: string,
  users: Map<string, UserRef>,
  onboardingCompletedAt: Map<string, Date[]>,
  sessions: { byUser: Map<string, SessionSeedResult[]> },
  kbQuestions: Map<string, number>,
  notesCreatedAt: Map<string, Date[]>,
): Promise<void> {
  for (const user of users.values()) {
    const completedSessions = sessions.byUser.get(user.id) ?? [];
    const points = computeGamificationPoints({
      onboardingDaysCompleted: onboardingCompletedAt.get(user.id)?.length ?? 0,
      kbQuestionsAsked: kbQuestions.get(user.id) ?? 0,
      completedSimulatorSessions: completedSessions.length,
      simulatorScoreBonus: completedSessions.reduce((sum, session) => sum + Math.floor(session.overall / 10), 0),
      knowledgeNotesAuthored: notesCreatedAt.get(user.id)?.length ?? 0,
    });
    await prisma.user.update({ where: { id: user.id }, data: { pointsTotal: points.total } });
    await prisma.pointsEvent.deleteMany({ where: { tenantId, userId: user.id, reason: { startsWith: 'team-demo:' } } });
    await prisma.pointsEvent.create({
      data: {
        id: `${tenantId}-team-points-${user.idSuffix}`,
        tenantId,
        userId: user.id,
        reason: 'team-demo:activity-summary',
        points: points.total,
        metadata: toJson(points.breakdown),
      },
    });

    const badgeInput: CompletedSimulatorBadgeInput[] = completedSessions.map((session) => ({
      endedAt: session.endedAt,
      overall: session.overall,
      scoredAt: session.scoredAt,
    }));
    const badges = deriveGamificationBadges({
      onboardingCompletedAt: onboardingCompletedAt.get(user.id) ?? [],
      completedSimulatorSessions: badgeInput,
      notesCreatedAt: notesCreatedAt.get(user.id) ?? [],
    }).filter((badge) => badge.earned);

    for (const badge of badges) {
      await prisma.badge.upsert({
        where: { userId_code: { userId: user.id, code: badge.code } },
        update: { tenantId, awardedAt: badge.earnedAt ?? new Date() },
        create: {
          id: `${tenantId}-team-badge-${user.idSuffix}-${badge.code}`,
          tenantId,
          userId: user.id,
          code: badge.code,
          awardedAt: badge.earnedAt ?? new Date(),
        },
      });
    }
  }
}

function buildTurns(
  scenario: ScenarioRef,
  fullName: string,
  index: number,
): Array<{ speaker: 'EMPLOYEE' | 'AI_PERSONA'; text: string }> {
  if (scenario.category.includes('aml')) {
    return [
      { speaker: 'AI_PERSONA', text: "Kontraktni keyin olib kelaman, 420 ming dollarni bugun o'tkazib bering." },
      {
        speaker: 'EMPLOYEE',
        text: `${firstName(fullName)} hujjatlarni so'raydi: kontrakt, invoys, benefitsiar va mablag' manbasi tekshiriladi.`,
      },
      { speaker: 'AI_PERSONA', text: "Nega buni cho'zyapsiz, boshqa filial tezroq qiladi." },
      {
        speaker: 'EMPLOYEE',
        text: "Bu standart bank talabi. Hujjatlar to'liq bo'lmaguncha operatsiya bo'yicha yakuniy tasdiq bera olmaymiz.",
      },
      {
        speaker: index % 2 === 0 ? 'AI_PERSONA' : 'EMPLOYEE',
        text:
          index % 2 === 0
            ? 'Ichki tekshiruv sababini aniq ayting.'
            : "Mas'ul bo'lim javobidan keyin muddatni yozma ravishda qaytaramiz.",
      },
    ];
  }

  if (scenario.category.includes('retail')) {
    return [
      { speaker: 'AI_PERSONA', text: "SMSdagi raqamlarni tushunmadim, pulim kamayib ketgandek bo'ldi." },
      {
        speaker: 'EMPLOYEE',
        text: "Xavotir olmang, avval shaxsingizni tasdiqlaymiz. PIN yoki SMS kodni hech kimga aytmaysiz.",
      },
      { speaker: 'AI_PERSONA', text: 'Men filialga kelishim kerakmi?' },
      {
        speaker: 'EMPLOYEE',
        text: "Hisob harakatini tekshirib, tushum, yechim va kurs farqini oddiy qilib tushuntiraman.",
      },
    ];
  }

  return [
    { speaker: 'AI_PERSONA', text: "Garovni bugun yechmasangiz, bitimim buziladi. Komissiya ham bo'lmasligi kerak." },
    {
      speaker: 'EMPLOYEE',
      text: "Vaqt siz uchun muhimligini tushundim. Avval shartnoma, qoldiq foiz va komissiya bandini tekshiraman.",
    },
    { speaker: 'AI_PERSONA', text: "Menga hozir og'zaki kafolat bering." },
    {
      speaker: 'EMPLOYEE',
      text: "Tekshiruvsiz kafolat bera olmayman. Arizani qabul qilib, aniq qoldiq va muddat bilan qaytaman.",
    },
    { speaker: 'EMPLOYEE', text: "To'lov tushgach garov hujjatlari odatda 3-5 ish kuni ichida tayyorlanadi." },
  ];
}

function buildFeedback(scores: Record<Dimension, number>): Array<{ dimension: Dimension; comment: string; severity: Severity }> {
  return [
    {
      dimension: 'processAdherence',
      comment: "Ichki ariza, risk egasi va hujjat ketma-ketligini aniqroq yopish kerak.",
      severity: severityFor(scores.processAdherence),
    },
    {
      dimension: 'compliance',
      comment: "Tasdiqlanmagan imtiyoz yoki AML chegaralari bo'yicha qat'iyroq pozitsiya kerak.",
      severity: severityFor(scores.compliance),
    },
    {
      dimension: 'tone',
      comment: "Mijoz bosimini tan olish va hurmatli ohang aksariyat suhbatlarda yaxshi saqlangan.",
      severity: 'minor',
    },
  ];
}

function buildWeakAreas(
  scores: Record<Dimension, number>,
): Array<{ topic: string; suggestKbQuery?: string; suggestPersonaTags: string[] }> {
  const areas: Array<{ topic: string; suggestKbQuery?: string; suggestPersonaTags: string[] }> = [
    {
      topic: 'processAdherence',
      suggestKbQuery: "kredit jarayoni eskalatsiya ketma-ketligi",
      suggestPersonaTags: ['process', 'credit_risk'],
    },
    {
      topic: 'compliance',
      suggestKbQuery: "AML qizil bayroqlar va tipping-off qoidasi",
      suggestPersonaTags: ['AML', 'compliance'],
    },
  ];
  if (scores.resolution < 70) {
    areas.push({
      topic: 'resolution',
      suggestKbQuery: "mijozga keyingi qadam va qaytish muddatini aytish",
      suggestPersonaTags: ['customer_service'],
    });
  }
  return areas;
}

function dimensionScoresFor(overall: number, index: number): Record<Dimension, number> {
  const process = [52, 48, 56, 61, 44, 58, 50, 55][index % 8] ?? 52;
  const compliance = [46, 42, 55, 58, 49, 53, 51, 47][index % 8] ?? 46;
  return {
    correctness: Math.min(96, Math.max(72, overall + 4 + (index % 3))),
    tone: Math.min(98, Math.max(74, overall + 7 + (index % 4))),
    processAdherence: process,
    resolution: Math.min(88, Math.max(58, overall - 4)),
    compliance,
  };
}

function overallFor(band: TeamBand, index: number): number {
  if (band === 'on_track') return [86, 82, 95, 78, 90, 84, 88, 80][index % 8] ?? 84;
  if (band === 'behind') return [70, 67, 74, 63, 72, 69][index % 6] ?? 70;
  return [55, 58, 62, 49, 45, 57][index % 6] ?? 55;
}

function quizScoreFor(band: TeamBand, dayNumber: number): number {
  if (band === 'on_track') return 86 + (dayNumber % 3) * 4;
  if (band === 'behind') return 72 + (dayNumber % 2) * 5;
  return 58 + dayNumber * 3;
}

function averageDimensions(totals: Map<Dimension, { total: number; count: number }>): Record<Dimension, number> {
  return {
    correctness: averageDimension(totals, 'correctness'),
    tone: averageDimension(totals, 'tone'),
    processAdherence: averageDimension(totals, 'processAdherence'),
    resolution: averageDimension(totals, 'resolution'),
    compliance: averageDimension(totals, 'compliance'),
  };
}

function averageDimension(totals: Map<Dimension, { total: number; count: number }>, dimension: Dimension): number {
  const bucket = totals.get(dimension);
  if (!bucket || bucket.count === 0) return 0;
  return Math.round((bucket.total / bucket.count) * 10) / 10;
}

function severityFor(score: number): Severity {
  if (score < 50) return 'critical';
  if (score < 60) return 'moderate';
  return 'minor';
}

function pickScenario(scenarios: ScenarioRef[], index: number): ScenarioRef {
  const scenario = scenarios[index % scenarios.length];
  if (!scenario) throw new Error('Scenario selection failed.');
  return scenario;
}

function mustGet(map: Map<string, UserRef>, idSuffix: string): UserRef {
  const value = map.get(idSuffix);
  if (!value) throw new Error(`Required team member missing: ${idSuffix}`);
  return value;
}

function firstName(fullName: string): string {
  return fullName.split(' ')[0] ?? fullName;
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * DAY_MS);
}

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * DAY_MS);
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
