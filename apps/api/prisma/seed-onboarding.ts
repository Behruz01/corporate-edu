import { PrismaClient } from '@prisma/client';
import type { Prisma } from '@prisma/client';

const prisma = new PrismaClient();

const TENANT_SLUG = process.env.DEMO_TENANT_SLUG ?? 'sqb';
const TEMPLATE_NAME = 'Credit Officer 5-day';
const BEKZOD_EMAIL = 'bekzod@sqb.uz';

type SeedDay = {
  dayNumber: number;
  title: string;
  description: string;
  estimatedMin: number;
  topics: Array<{ title: string; content: string }>;
  quiz: Array<{
    type: 'MCQ' | 'TRUE_FALSE' | 'SHORT_ANSWER';
    prompt: string;
    options: unknown;
    correct: unknown;
    explanation: string;
  }>;
};

const DAYS: SeedDay[] = [
  {
    dayNumber: 1,
    title: 'SQB tarixi va qadriyatlari',
    description: 'SQB missiyasi, mijozga xizmat madaniyati va ichki qadriyatlar bilan tanishish.',
    estimatedMin: 45,
    topics: [
      {
        title: 'SQB tarixi',
        content:
          "SQB bank sanoat va qurilish sohalarini moliyalashtirish tajribasiga ega bank sifatida shakllangan. Yangi kredit xodimi bank tarixini mijozlar bilan ishonchli muloqot qilish uchun bilishi kerak.",
      },
      {
        title: 'Bank qadriyatlari',
        content:
          'Asosiy qadriyatlar: mijoz manfaatini tushunish, masuliyatli kreditlash, shaffoflik, jamoaviy hamkorlik va qonunchilikka rioya qilish.',
      },
      {
        title: 'Xizmat sifati',
        content:
          'Kredit xodimi har bir mijozga aniq talablar, muddatlar va keyingi qadamlarni tushunarli qilib aytadi. Savolga javob topilmasa, masul bo limga eskalatsiya qilinadi.',
      },
    ],
    quiz: [
      {
        type: 'MCQ',
        prompt: 'SQB xodimi mijoz bilan ishlaganda qaysi tamoyil birinchi o rinda turadi?',
        options: ['Tez va shaffof tushuntirish', 'Faqat ichki atamalar ishlatish', 'Savollarni keyinga qoldirish'],
        correct: 'Tez va shaffof tushuntirish',
        explanation: 'Mijozga aniq va shaffof tushuntirish xizmat sifatining asosi hisoblanadi.',
      },
      {
        type: 'TRUE_FALSE',
        prompt: 'Masuliyatli kreditlash SQB qadriyatlaridan biridir.',
        options: [true, false],
        correct: true,
        explanation: 'Kredit xodimi mijoz imkoniyatlarini real baholashi kerak.',
      },
      {
        type: 'SHORT_ANSWER',
        prompt: 'SQB qadriyatlaridan bittasini yozing.',
        options: null,
        correct: { keywords: ['shaffoflik', 'masuliyat', 'hamkorlik', 'mijoz'] },
        explanation: 'Shaffoflik, masuliyat va mijozga e tibor asosiy qadriyatlardandir.',
      },
    ],
  },
  {
    dayNumber: 2,
    title: 'Bank mahsulotlari',
    description: 'Jismoniy va yuridik shaxslar uchun asosiy bank mahsulotlari hamda kredit yo nalishlari.',
    estimatedMin: 60,
    topics: [
      {
        title: 'Yuridik shaxslar mahsulotlari',
        content:
          'Yuridik shaxslar uchun hisobvaraqlar, aylanma mablag kreditlari, investitsion kreditlar, kafolatlar va savdo moliyalashtirish xizmatlari mavjud.',
      },
      {
        title: 'Jismoniy shaxslar xizmatlari',
        content:
          'Jismoniy shaxslar omonat, karta, pul o tkazmalari, masofaviy xizmatlar va iste mol kreditlari bo yicha bankka murojaat qiladi.',
      },
      {
        title: 'Mahsulot tanlash',
        content:
          'Mahsulot tavsiyasi mijoz segmenti, ehtiyoj, muddat, ta minot, pul oqimi va risk darajasiga qarab beriladi.',
      },
    ],
    quiz: [
      {
        type: 'MCQ',
        prompt: 'Aylanma mablag krediti asosan nimaga xizmat qiladi?',
        options: ['Kundalik biznes xarajatlarini moliyalashtirish', 'Faqat karta chiqarish', 'Faqat omonat ochish'],
        correct: 'Kundalik biznes xarajatlarini moliyalashtirish',
        explanation: 'Aylanma mablag krediti biznesning operatsion ehtiyojlarini qoplaydi.',
      },
      {
        type: 'TRUE_FALSE',
        prompt: 'Mahsulot tanlashda mijozning pul oqimi hisobga olinadi.',
        options: [true, false],
        correct: true,
        explanation: 'Pul oqimi kredit qaytarish qobiliyatini baholashda muhim.',
      },
      {
        type: 'SHORT_ANSWER',
        prompt: 'Yuridik shaxslar uchun bitta bank mahsulotini yozing.',
        options: null,
        correct: { keywords: ['kredit', 'kafolat', 'hisobvaraq', 'savdo'] },
        explanation: 'Kredit, kafolat va hisobvaraq xizmatlari yuridik shaxslar uchun asosiy mahsulotlardir.',
      },
    ],
  },
  {
    dayNumber: 3,
    title: 'Kredit baholash',
    description: 'Mijoz daromadi, garov, kredit tarixi va risk signallarini baholash.',
    estimatedMin: 75,
    topics: [
      {
        title: 'Daromad va pul oqimi',
        content:
          'Kredit qarori mijozning barqaror daromadi, pul oqimi, mavjud majburiyatlari va qarzni qaytarish imkoniyatiga tayanadi.',
      },
      {
        title: 'Garov va ta minot',
        content:
          'Garov likvidligi, hujjatlari, bozor qiymati va huquqiy tozaligi alohida tekshiriladi. Garov qarorni almashtirmaydi, riskni kamaytiradi.',
      },
      {
        title: 'Risk signallari',
        content:
          'Noaniq hujjatlar, keskin tushgan tushum, haddan tashqari qarzdorlik va tushuntirilmagan tranzaksiyalar risk signali bo lishi mumkin.',
      },
    ],
    quiz: [
      {
        type: 'MCQ',
        prompt: 'Kredit qaytarish qobiliyatini baholashda eng muhim ma lumotlardan biri nima?',
        options: ['Pul oqimi', 'Ofis rangi', 'Reklama shiori'],
        correct: 'Pul oqimi',
        explanation: 'Pul oqimi qarzni qaytarish imkoniyatini ko rsatadi.',
      },
      {
        type: 'TRUE_FALSE',
        prompt: 'Garov kredit riskini kamaytiradi, lekin mijoz tahlilini almashtirmaydi.',
        options: [true, false],
        correct: true,
        explanation: 'Garov yordamchi risk mitigatsiyasi hisoblanadi.',
      },
      {
        type: 'SHORT_ANSWER',
        prompt: 'Kredit baholashdagi bitta risk signalini yozing.',
        options: null,
        correct: { keywords: ['qarzdorlik', 'noaniq', 'tranzaksiya', 'tushum', 'hujjat'] },
        explanation: 'Noaniq hujjat, keskin tushum pasayishi yoki ortiqcha qarzdorlik risk signalidir.',
      },
    ],
  },
  {
    dayNumber: 4,
    title: 'Compliance va AML',
    description: 'Mijozni bilish, shubhali operatsiyalar va AML eskalatsiya tartibi.',
    estimatedMin: 60,
    topics: [
      {
        title: 'KYC asoslari',
        content:
          'KYC jarayoni mijoz shaxsi, faoliyati, benefitsiar egasi va pul mablaglari manbasini tushunishga yordam beradi.',
      },
      {
        title: 'AML qizil bayroqlari',
        content:
          'Mijoz faoliyatiga mos kelmaydigan tranzaksiyalar, bo lib-bo lib o tkazmalar, noaniq benefitsiar yoki hujjatdagi ziddiyatlar qizil bayroqdir.',
      },
      {
        title: 'Eskalatsiya',
        content:
          'Shubhali holat aniqlansa, xodim mustaqil qaror chiqarmaydi. Holat compliance bo limiga belgilangan ichki tartibda yuboriladi.',
      },
    ],
    quiz: [
      {
        type: 'MCQ',
        prompt: 'Shubhali tranzaksiya aniqlansa birinchi qadam nima?',
        options: ['Compliance bo limiga eskalatsiya qilish', 'Mijozga sirni aytish', 'Hujjatlarni o chirish'],
        correct: 'Compliance bo limiga eskalatsiya qilish',
        explanation: 'Shubhali holatlar ichki tartib bo yicha compliance jamoasiga yuboriladi.',
      },
      {
        type: 'TRUE_FALSE',
        prompt: 'KYC mijoz faoliyati va mablag manbasini tushunishga yordam beradi.',
        options: [true, false],
        correct: true,
        explanation: 'KYC AML nazoratining asosiy qismidir.',
      },
      {
        type: 'SHORT_ANSWER',
        prompt: 'AML qizil bayrog iga misol yozing.',
        options: null,
        correct: { keywords: ['shubhali', 'benefitsiar', 'ziddiyat', 'tranzaksiya', 'mablag'] },
        explanation: 'Noaniq benefitsiar yoki faoliyatga mos bo lmagan tranzaksiya qizil bayroq bo ladi.',
      },
    ],
  },
  {
    dayNumber: 5,
    title: 'Simulatorga kirish',
    description: 'Mijoz bilan muloqot simulyatori, baholash mezonlari va bilim ko prigi.',
    estimatedMin: 45,
    topics: [
      {
        title: 'Simulyator maqsadi',
        content:
          'Simulyator real mijoz suhbatiga yaqin mashq muhitini beradi. Xodim savol berish, tushuntirish va eskalatsiya ko nikmalarini sinaydi.',
      },
      {
        title: 'Baholash mezonlari',
        content:
          'Javoblar aniqlik, mijoz ehtiyojini tushunish, compliance sezgirligi, empatiya va keyingi qadamni belgilash bo yicha baholanadi.',
      },
      {
        title: 'Bilim ko prigi',
        content:
          'Natijadan so ng zaif joylarga mos KB hujjatlari va tajribali xodimlar tavsiyalari ko rsatiladi.',
      },
    ],
    quiz: [
      {
        type: 'MCQ',
        prompt: 'Simulyatorning asosiy foydasi nima?',
        options: ['Mijoz suhbatini xavfsiz mashq qilish', 'Parol almashtirish', 'Faqat hisobot yuklash'],
        correct: 'Mijoz suhbatini xavfsiz mashq qilish',
        explanation: 'Simulyator xodimga real suhbatga tayyorlanish imkonini beradi.',
      },
      {
        type: 'TRUE_FALSE',
        prompt: 'Simulyator natijasi zaif joylar bo yicha KB tavsiyalarini ko rsatishi mumkin.',
        options: [true, false],
        correct: true,
        explanation: 'Bilim ko prigi o quv materiallarini natija bilan bog laydi.',
      },
      {
        type: 'SHORT_ANSWER',
        prompt: 'Simulyatorda baholanadigan bitta ko nikmani yozing.',
        options: null,
        correct: { keywords: ['empatiya', 'aniqlik', 'compliance', 'savol', 'tushuntirish'] },
        explanation: 'Empatiya, aniqlik va compliance sezgirligi asosiy ko nikmalardandir.',
      },
    ],
  },
];

async function main(): Promise<void> {
  console.log(`Seeding onboarding for tenant ${TENANT_SLUG}`);
  const tenant = await prisma.tenant.findUnique({ where: { slug: TENANT_SLUG } });
  if (!tenant) throw new Error(`Tenant not found: ${TENANT_SLUG}`);

  const template =
    (await prisma.onboardingTemplate.findFirst({
      where: { tenantId: tenant.id, OR: [{ id: { contains: 'credit-5d' } }, { name: TEMPLATE_NAME }] },
    })) ??
    (await prisma.onboardingTemplate.create({
      data: {
        id: `${tenant.id}-credit-5d`,
        tenantId: tenant.id,
        role: 'credit_officer',
        name: TEMPLATE_NAME,
        isActive: true,
      },
    }));

  await prisma.onboardingTemplate.update({
    where: { id: template.id },
    data: { role: 'credit_officer', name: TEMPLATE_NAME, isActive: true },
  });

  await prisma.onboardingDay.deleteMany({ where: { templateId: template.id } });
  for (const day of DAYS) {
    await prisma.onboardingDay.create({
      data: {
        templateId: template.id,
        dayNumber: day.dayNumber,
        title: day.title,
        description: day.description,
        estimatedMin: day.estimatedMin,
        topics: {
          create: day.topics.map((topic, index) => ({
            order: index + 1,
            title: topic.title,
            content: topic.content,
            documentIds: [],
          })),
        },
        quiz: {
          create: {
            questions: {
              create: day.quiz.map((question) => {
                const base = {
                  type: question.type,
                  prompt: question.prompt,
                  correct: toJson(question.correct),
                  explanation: question.explanation,
                };
                return question.options === null ? base : { ...base, options: toJson(question.options) };
              }),
            },
          },
        },
      },
    });
  }

  const bekzod = await prisma.user.findFirst({ where: { tenantId: tenant.id, email: BEKZOD_EMAIL } });
  if (!bekzod) throw new Error(`User not found: ${BEKZOD_EMAIL}`);

  const existingAssignment = await prisma.onboardingAssignment.findFirst({
    where: { tenantId: tenant.id, userId: bekzod.id, templateId: template.id },
  });
  if (existingAssignment) {
    await prisma.onboardingAssignment.update({
      where: { id: existingAssignment.id },
      data: { currentDay: 1, status: 'IN_PROGRESS', startedAt: new Date() },
    });
  } else {
    await prisma.onboardingAssignment.create({
      data: {
        tenantId: tenant.id,
        userId: bekzod.id,
        templateId: template.id,
        startedAt: new Date(),
        currentDay: 1,
        status: 'IN_PROGRESS',
      },
    });
  }

  console.log(`Seeded ${DAYS.length} onboarding days and assigned ${BEKZOD_EMAIL}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

function toJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}
