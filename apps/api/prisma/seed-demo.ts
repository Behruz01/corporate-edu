import { PrismaClient, type Prisma } from '@prisma/client';

const prisma = new PrismaClient();

const TENANT_SLUG = process.env.DEMO_TENANT_SLUG ?? 'sqb';

const DIMENSIONS = ['correctness', 'tone', 'processAdherence', 'resolution', 'compliance'] as const;

type Dimension = (typeof DIMENSIONS)[number];

type ScenarioSeed = {
  key: string;
  title: string;
  category: string;
  brief: string;
  personaDesc: string;
  difficulty: 'BASIC' | 'INTERMEDIATE' | 'ADVANCED';
  criteria: Record<Dimension, string>;
};

type SessionSeed = {
  key: string;
  userEmail: string;
  scenarioKey: string;
  attemptNum: number;
  startedDaysAgo: number;
  turns: Array<{ speaker: 'EMPLOYEE' | 'AI_PERSONA'; text: string }>;
  dimensionScores: Record<Dimension, number>;
  overall: number;
  feedback: string[];
  weakAreas: string[];
};

const SCENARIOS: ScenarioSeed[] = [
  {
    key: 'urgent-client',
    title: 'Shoshilinch mijoz',
    category: 'credit_service',
    difficulty: 'INTERMEDIATE',
    brief:
      "Mijoz bugun 2,4 mlrd so'm aylanma mablag' kreditini yopib, garovni tez yechishni so'raydi. U shoshilmoqda va komissiya yo'qligini da'vo qiladi.",
    personaDesc:
      'Mijoz asabiy, vaqt bosimi kuchli, lekin hujjatlari bor. Xodim shartnoma, qoldiq foiz va eskalatsiya tartibini tushuntirishi kerak.',
    criteria: {
      correctness:
        'Qoldiq qarz, hisoblangan foiz, komissiya va garov yechish muddatini bank tartibiga mos tushuntiradi.',
      tone: 'Mijoz shoshayotganini tan oladi, xotirjam va hurmatli ohangni saqlaydi.',
      processAdherence:
        "Ariza, shartnoma tekshiruvi, Credit Risk yoki Operations eskalatsiyasini to'g'ri ketma-ketlikda yuritadi.",
      resolution: 'Mijozga bugungi aniq keyingi qadamlar va qaytish vaqtini beradi.',
      compliance: "Tasdiqlanmagan imtiyoz yoki komissiya bekor qilinishini va'da qilmaydi.",
    },
  },
  {
    key: 'suspicious-transaction',
    title: 'Shubhali tranzaksiya',
    category: 'aml_compliance',
    difficulty: 'ADVANCED',
    brief:
      "Yangi korporativ mijoz offshor konsalting kompaniyasiga 480 000 AQSH dollari o'tkazmoqchi. To'lov maqsadi noaniq va direktor tez o'tkazishni talab qiladi.",
    personaDesc:
      "Mijoz bosim qiladi, savollardan qochadi va hujjatlar keyin bo'lishini aytadi. Xodim AML qizil bayroqlarini sezib, neytral savollar bilan eskalatsiya qilishi kerak.",
    criteria: {
      correctness:
        "SWIFT, kontrakt, benefitsiar, mablag' manbasi va sanksiya tekshiruviga oid talablarni aniq aytadi.",
      tone: 'Mijozni ayblamasdan, tekshiruvni standart bank jarayoni sifatida tushuntiradi.',
      processAdherence:
        "Compliance formasiga faktlarni yig'ib, operatsiyani tegishli tasdiqqacha ushlab turadi.",
      resolution: "Mijozga kerakli hujjatlar ro'yxati va qayta aloqa muddatini beradi.",
      compliance:
        "Tipping-off qilmaydi, ichki shubha mezonlarini oshkor qilmaydi va tez o'tkazishga rozi bo'lmaydi.",
    },
  },
  {
    key: 'confused-retiree',
    title: "Chalkash nafaqaxo'r",
    category: 'retail_service',
    difficulty: 'BASIC',
    brief:
      "Nafaqaxo'r mijoz kartasiga pensiya tushmagan deb o'ylaydi, SMSlarni tushunmayapti va valyuta kursi bilan adashmoqda.",
    personaDesc:
      "Mijoz xavotirlangan, bank atamalarini bilmaydi. Xodim sodda tilda tekshirish, tushuntirish va keyingi qadamni ko'rsatishi kerak.",
    criteria: {
      correctness: 'Hisob harakati, karta balansi, SMS va kurs farqini sodda tushuntiradi.',
      tone: 'Sabrli, empatik va katta yoshli mijozga mos hurmatli ohangda gapiradi.',
      processAdherence:
        "Shaxsni tekshirish va maxfiy ma'lumotni himoya qilish qoidalariga rioya qiladi.",
      resolution: "Mijoz muammosini yakuniy tekshiruv yoki aniq kanalga yo'naltirish bilan yopadi.",
      compliance: "PIN, SMS kod yoki maxfiy rekvizitlarni so'ramaydi.",
    },
  },
];

const NOTE_SEEDS = [
  {
    idSuffix: 'early-repayment',
    prompt: "Erta so'ndirishda eng ko'p uchraydigan xato nima?",
    text: "Erta so'ndirishda men doim uchta narsani birinchi tekshiraman: shartnomadagi komissiya bandi, oxirgi foiz hisoblangan sana va garov yechish uchun Operations muddatlari. Mijoz shoshilsa ham, qoldiq qarzni og'zaki aytib yubormaslik kerak. Avval kredit hisobvarag'i bo'yicha rasmiy qoldiq chiqariladi, keyin ariza qabul qilinadi. Agar mijoz bugun yopmoqchi bo'lsa, unga to'lov tushgandan keyingi 3-5 ish kuni ichida garov hujjatlari tayyorlanishini aytaman.",
    tags: ['early_repayment', 'credit_risk', 'collateral'],
  },
  {
    idSuffix: 'aml-case',
    prompt: 'Qiyin AML holatidan qanday saboq oldingiz?',
    text: "Bir marta eksport qilmaydigan mijoz 300 000 dollarni yangi ochilgan hisobdan chet eldagi konsalting kompaniyasiga yubormoqchi bo'lgan. Direktor hujjatlarni keyin olib kelishini aytdi. Biz ayblov ohangiga o'tmadik, faqat to'lov maqsadi, kontrakt, benefitsiar va mablag' manbasini so'radik. Hujjatlar mos kelmagani uchun Compliance operatsiyani to'xtatdi. Sabog'im: mijoz bosimi qanchalik kuchli bo'lsa ham, qizil bayroqni oddiy xizmat talabi sifatida hujjatlashtirish kerak.",
    tags: ['AML', 'compliance', 'FX'],
  },
  {
    idSuffix: 'kpi-reporting',
    prompt: "Kredit bo'limi KPI hisobotida nimalar muhim?",
    text: "KPI hisobotida faqat berilgan kredit summasini ko'rsatish yetarli emas. Men har hafta yangi arizalar soni, o'rtacha ko'rib chiqish vaqti, rad etish sabablari, muddatidan o'tgan hujjatlar va AML sababli pauzaga tushgan operatsiyalarni alohida chiqaraman. Malika opa uchun eng foydali indikator - qaysi bosqichda mijoz kutib qolayotgani. Shunda jamoa muammoni foiz stavkasidan emas, jarayondagi tiqilinchdan izlaydi.",
    tags: ['KPI', 'credit_risk', 'process'],
  },
];

const OFFBOARDING_QA = [
  {
    question:
      "Kredit xodimi sifatida o'rningizga keladigan odam birinchi haftada nimani bilishi kerak?",
    kind: 'HANDOFF',
    answer:
      "Birinchi hafta u kredit shartnomasi, garov hujjati va mijozga berilgan va'da bir-biriga mos kelishini tekshirishni o'rgansin. Eng ko'p xato og'zaki kelishuvni tizimdagi haqiqiy status deb qabul qilishdan chiqadi.",
  },
  {
    question: "Erta so'ndirish bo'yicha eng muhim amaliy qoidangiz nima?",
    kind: 'PROCESS',
    answer:
      "Mijozga qoldiqni aytishdan oldin foiz hisoblash sanasini tekshirish kerak. Bir kunlik farq ham summa va mijoz ishonchiga ta'sir qiladi. Garov yechish muddatini alohida tushuntirish shart.",
  },
  {
    question: 'Qaysi holatda Compliance bilan darhol maslahatlashasiz?',
    kind: 'RISK',
    answer:
      "Yangi mijoz katta valyuta o'tkazmasini shoshilinch so'rasa, benefitsiar noaniq bo'lsa yoki hujjatdagi xizmat mazmuni juda umumiy yozilgan bo'lsa, men darhol Compliancega yuboraman.",
  },
  {
    question: "Malika Yusupovaga qaysi hisobotlar eng ko'p yordam beradi?",
    kind: 'HANDOFF',
    answer:
      "Malika opaga haftalik ariza statusi, rad etish sabablari va eskalatsiya kutayotgan mijozlar ro'yxati kerak bo'ladi. Faqat jami portfel summasi boshqaruv qaroriga kam yordam beradi.",
  },
  {
    question: 'Mijoz bilan qiyin suhbatda ohangni qanday ushlaysiz?',
    kind: 'PROCESS',
    answer:
      "Avval mijozning vaqt bosimini tan olaman, keyin bank nima qila olishi va nima uchun tekshiruv kerakligini oddiy tilda aytaman. 'Men tushundim, hozir tekshirib aniq vaqt bilan qaytaman' degan jumla ko'p holatda vaziyatni yumshatadi.",
  },
  {
    question: 'Qaysi hujjatlar doim alohida tekshirilishi kerak?',
    kind: 'PROCESS',
    answer:
      'Garov baholash hisoboti, direktor vakolati, benefitsiar egalik zanjiri, soliq qarzdorligi va eksport-import kontraktlari alohida tekshiriladi. Sana va summa mosligi ham muhim.',
  },
  {
    question: "Bekzod kabi yangi xodimga qaysi xatodan ehtiyot bo'lishni aytasiz?",
    kind: 'PROCESS',
    answer:
      "Mijozni xursand qilish uchun tasdiqlanmagan foiz yoki muddat va'da qilmasin. Har bir va'da ichki egasi, hujjati va aniq qaytish vaqti bilan berilsin.",
  },
  {
    question: "Siz ketgandan keyin qaysi bilim yo'qolib ketmasligi kerak?",
    kind: 'HANDOFF',
    answer:
      "Mahsulot shartlari jadvalda bor, lekin mijoz bosimi ostida qaysi savolni birinchi berish kerakligi tajribada yig'iladi. Shubhali holatda ham xotirjam savol berish va faktni yozish mening eng muhim odatim.",
  },
];

const SESSION_SEEDS: SessionSeed[] = [
  {
    key: 'bekzod-urgent-1',
    userEmail: 'bekzod@sqb.uz',
    scenarioKey: 'urgent-client',
    attemptNum: 1,
    startedDaysAgo: 1,
    turns: [
      {
        speaker: 'AI_PERSONA',
        text: "Menga bugun garovni yechib bering, pulni hozir o'tkazaman. Komissiya bo'lmasligi kerak.",
      },
      {
        speaker: 'EMPLOYEE',
        text: 'Tushundim, sizga muddat muhim. Avval shartnoma va qoldiq foizni tekshirib, aniq summani chiqaraman.',
      },
      {
        speaker: 'AI_PERSONA',
        text: "Men kutolmayman, siz og'zaki ayting, keyin rasmiylashtiramiz.",
      },
      {
        speaker: 'EMPLOYEE',
        text: "Og'zaki summa noto'g'ri bo'lishi mumkin. Arizani qabul qilib, 16:00 gacha tasdiqlangan qoldiq bilan qaytaman.",
      },
    ],
    dimensionScores: {
      correctness: 76,
      tone: 82,
      processAdherence: 72,
      resolution: 70,
      compliance: 84,
    },
    overall: 77,
    feedback: [
      'Mijoz vaqt bosimini tan oldi.',
      'Garov yechish muddatini aniqroq aytish kerak edi.',
    ],
    weakAreas: ['resolution', 'processAdherence'],
  },
  {
    key: 'bekzod-retiree-1',
    userEmail: 'bekzod@sqb.uz',
    scenarioKey: 'confused-retiree',
    attemptNum: 1,
    startedDaysAgo: 2,
    turns: [
      {
        speaker: 'AI_PERSONA',
        text: 'Bolam, pensiyam kelmadi shekilli, SMSda boshqa raqamlar yozilgan.',
      },
      {
        speaker: 'EMPLOYEE',
        text: 'Xavotir olmang, birga tekshiramiz. Avval shaxsingizni tasdiqlaymiz, PIN yoki SMS kodni aytmaysiz.',
      },
      { speaker: 'AI_PERSONA', text: "Men kartamdagi pul kamayib ketgan deb o'yladim." },
      {
        speaker: 'EMPLOYEE',
        text: "SMSda kurs va balans alohida ko'ringan bo'lishi mumkin. Hisob harakatini ko'rib, qaysi summa tushganini tushuntiraman.",
      },
    ],
    dimensionScores: {
      correctness: 82,
      tone: 94,
      processAdherence: 86,
      resolution: 80,
      compliance: 92,
    },
    overall: 87,
    feedback: [
      'Sodda va hurmatli ohang yaxshi.',
      'Yakuniy kanalni aytish bilan suhbatni yanada yopish mumkin.',
    ],
    weakAreas: ['resolution'],
  },
  {
    key: 'bekzod-aml-1',
    userEmail: 'bekzod@sqb.uz',
    scenarioKey: 'suspicious-transaction',
    attemptNum: 1,
    startedDaysAgo: 3,
    turns: [
      {
        speaker: 'AI_PERSONA',
        text: '480 ming dollarni hozir yuboring, kontraktni keyin tashlayman.',
      },
      {
        speaker: 'EMPLOYEE',
        text: "Xalqaro o'tkazma uchun kontrakt, invoys va benefitsiar ma'lumotlari kerak bo'ladi.",
      },
      { speaker: 'AI_PERSONA', text: 'Boshqa banklar bunaqa savol bermaydi. Menga tezlik kerak.' },
      {
        speaker: 'EMPLOYEE',
        text: "Bu standart tekshiruv. Hujjatlar kelgach, mas'ul bo'lim bilan ko'rib chiqamiz va muddatni aytamiz.",
      },
    ],
    dimensionScores: {
      correctness: 70,
      tone: 78,
      processAdherence: 66,
      resolution: 62,
      compliance: 74,
    },
    overall: 70,
    feedback: [
      "Hujjat talabi to'g'ri aytildi.",
      "Compliance eskalatsiyasi va tipping-off chegarasi aniqroq bo'lishi kerak.",
    ],
    weakAreas: ['processAdherence', 'resolution', 'compliance'],
  },
  {
    key: 'dilshod-urgent-1',
    userEmail: 'dilshod@sqb.uz',
    scenarioKey: 'urgent-client',
    attemptNum: 1,
    startedDaysAgo: 4,
    turns: [
      { speaker: 'AI_PERSONA', text: "Shartnomada jarima yo'q. Nega yana kutishim kerak?" },
      {
        speaker: 'EMPLOYEE',
        text: "Jarima bandini birga tekshiramiz. Foiz qoldig'i va garov hujjati alohida jarayon.",
      },
      { speaker: 'AI_PERSONA', text: 'Demak bugun yechib berolmaysizmi?' },
      {
        speaker: 'EMPLOYEE',
        text: "To'lov bugun tushsa, garov yechish hujjatlari odatda 3-5 ish kuni ichida tayyorlanadi.",
      },
    ],
    dimensionScores: {
      correctness: 86,
      tone: 80,
      processAdherence: 84,
      resolution: 82,
      compliance: 88,
    },
    overall: 84,
    feedback: [
      'Muddat va jarayon aniq tushuntirildi.',
      'Mijoz hissiyotini boshida kuchliroq tan olish mumkin.',
    ],
    weakAreas: ['tone'],
  },
  {
    key: 'dilshod-aml-1',
    userEmail: 'dilshod@sqb.uz',
    scenarioKey: 'suspicious-transaction',
    attemptNum: 1,
    startedDaysAgo: 5,
    turns: [
      { speaker: 'AI_PERSONA', text: "Bu konsalting to'lovi, tafsilot kerak emas. Yuboring." },
      {
        speaker: 'EMPLOYEE',
        text: "To'lov maqsadi umumiy yozilganda bank kontrakt, invoys va xizmat tavsifini so'raydi.",
      },
      {
        speaker: 'AI_PERSONA',
        text: "Men direktor bilan gaplashganman, siz tekshiruvni o'tkazib yuboring.",
      },
      {
        speaker: 'EMPLOYEE',
        text: "Tekshiruvni o'tkazib yubora olmaymiz. Ma'lumotlarni Compliancega yuborib, javob muddati bilan qaytamiz.",
      },
    ],
    dimensionScores: {
      correctness: 88,
      tone: 83,
      processAdherence: 90,
      resolution: 78,
      compliance: 94,
    },
    overall: 87,
    feedback: [
      "Compliance chegarasi to'g'ri ushlangan.",
      "Hujjatlar ro'yxatini punktma-punkt aytish foydali bo'lardi.",
    ],
    weakAreas: ['resolution'],
  },
  {
    key: 'dilshod-retiree-1',
    userEmail: 'dilshod@sqb.uz',
    scenarioKey: 'confused-retiree',
    attemptNum: 1,
    startedDaysAgo: 6,
    turns: [
      { speaker: 'AI_PERSONA', text: 'Telefonimga kod keldi, sizga aytaymi?' },
      {
        speaker: 'EMPLOYEE',
        text: "Yo'q, kodni hech kimga aytmang. Men sizdan faqat shaxsni tasdiqlash uchun ruxsat etilgan savollarni so'rayman.",
      },
      { speaker: 'AI_PERSONA', text: 'Unda pensiya qayerdaligini qanday bilamiz?' },
      {
        speaker: 'EMPLOYEE',
        text: 'Hisob harakati orqali tushumni tekshiramiz va SMSdagi summa nimani anglatganini sodda qilib tushuntiraman.',
      },
    ],
    dimensionScores: {
      correctness: 84,
      tone: 88,
      processAdherence: 90,
      resolution: 82,
      compliance: 98,
    },
    overall: 88,
    feedback: [
      'Maxfiylik qoidasi juda yaxshi tushuntirildi.',
      "Yakuniy natijani filial yoki call-markaz bilan bog'lash mumkin.",
    ],
    weakAreas: ['resolution'],
  },
  {
    key: 'aziz-urgent-1',
    userEmail: 'aziz@sqb.uz',
    scenarioKey: 'urgent-client',
    attemptNum: 2,
    startedDaysAgo: 7,
    turns: [
      { speaker: 'AI_PERSONA', text: 'Garovni bugun yechmasangiz, bitimim buziladi.' },
      {
        speaker: 'EMPLOYEE',
        text: 'Bitim siz uchun muhimligini tushundim. Men hozir qoldiq, foiz va shartnoma bandini tekshiraman.',
      },
      { speaker: 'AI_PERSONA', text: 'Menga kafolat bering.' },
      {
        speaker: 'EMPLOYEE',
        text: "Tekshiruvsiz kafolat bera olmayman. To'lov tushgach garov yechish 3-5 ish kuni, bugun esa aniq qoldiqni 15:30 gacha beraman.",
      },
    ],
    dimensionScores: {
      correctness: 94,
      tone: 92,
      processAdherence: 94,
      resolution: 92,
      compliance: 96,
    },
    overall: 94,
    feedback: ['Mijoz bosimi tan olindi va aniq vaqt berildi.', "Tasdiqlanmagan va'da berilmadi."],
    weakAreas: [],
  },
  {
    key: 'aziz-aml-1',
    userEmail: 'aziz@sqb.uz',
    scenarioKey: 'suspicious-transaction',
    attemptNum: 2,
    startedDaysAgo: 8,
    turns: [
      {
        speaker: 'AI_PERSONA',
        text: "Offshor kompaniyaga to'lovni bugun chiqaring, bu maxfiy kelishuv.",
      },
      {
        speaker: 'EMPLOYEE',
        text: "Xalqaro to'lov uchun maxfiylikni hurmat qilamiz, lekin bank kontrakt, benefitsiar va mablag' manbasini tekshirishi shart.",
      },
      { speaker: 'AI_PERSONA', text: 'Nega shuncha savol?' },
      {
        speaker: 'EMPLOYEE',
        text: "Bu barcha mijozlar uchun standart. Hujjatlar ro'yxatini yuboraman va mas'ul bo'lim xulosasidan keyin vaqtini aytaman.",
      },
      { speaker: 'AI_PERSONA', text: 'Ichki tekshiruvmi bu?' },
      {
        speaker: 'EMPLOYEE',
        text: "Bu xalqaro to'lovni rasmiylashtirish tartibi. Hozir sizdan kontrakt, invoys va benefitsiar rekvizitlari kerak.",
      },
    ],
    dimensionScores: {
      correctness: 96,
      tone: 90,
      processAdherence: 96,
      resolution: 90,
      compliance: 98,
    },
    overall: 95,
    feedback: ['Tipping-off qilmasdan nazorat talabi tushuntirildi.', 'Hujjatlar aniq sanaldi.'],
    weakAreas: [],
  },
  {
    key: 'aziz-retiree-1',
    userEmail: 'aziz@sqb.uz',
    scenarioKey: 'confused-retiree',
    attemptNum: 2,
    startedDaysAgo: 9,
    turns: [
      { speaker: 'AI_PERSONA', text: "Men kursni tushunmadim, pulim yo'qolgandek bo'ldi." },
      {
        speaker: 'EMPLOYEE',
        text: "Pul yo'qolganini birga tekshiramiz. Avval shaxsingizni tasdiqlaymiz, keyin balans va SMSni alohida ko'ramiz.",
      },
      { speaker: 'AI_PERSONA', text: 'Men raqamlarni farqlay olmayapman.' },
      {
        speaker: 'EMPLOYEE',
        text: 'Men sizga tushgan pensiya, yechilgan summa va kurs yozuvini bittalab tushuntiraman. Kod yoki PINni aytishingiz shart emas.',
      },
    ],
    dimensionScores: {
      correctness: 90,
      tone: 96,
      processAdherence: 92,
      resolution: 90,
      compliance: 96,
    },
    overall: 93,
    feedback: ['Katta yoshli mijozga mos ohang.', 'Maxfiy rekvizitlar himoyasi eslatildi.'],
    weakAreas: [],
  },
  {
    key: 'bekzod-urgent-2',
    userEmail: 'bekzod@sqb.uz',
    scenarioKey: 'urgent-client',
    attemptNum: 2,
    startedDaysAgo: 10,
    turns: [
      {
        speaker: 'AI_PERSONA',
        text: "Kecha sizlar boshqa summa aytgansizlar. Bugun nima o'zgardi?",
      },
      {
        speaker: 'EMPLOYEE',
        text: "Farq foiz hisoblangan sana sababli bo'lishi mumkin. Hozir rasmiy qoldiqni chiqarib, farqni yozma tushuntiraman.",
      },
      { speaker: 'AI_PERSONA', text: 'Yana kutishim kerakmi?' },
      {
        speaker: 'EMPLOYEE',
        text: "Ha, lekin sizga aniq muddat beraman: qoldiq 1 soatda, garov hujjatlari to'lovdan keyin 3-5 ish kuni.",
      },
    ],
    dimensionScores: {
      correctness: 84,
      tone: 86,
      processAdherence: 82,
      resolution: 86,
      compliance: 88,
    },
    overall: 85,
    feedback: [
      'Ikkinchi urinishda vaqt va sabab aniqroq berildi.',
      'Credit Risk egasini nomlash mumkin edi.',
    ],
    weakAreas: ['processAdherence'],
  },
  {
    key: 'dilshod-urgent-2',
    userEmail: 'dilshod@sqb.uz',
    scenarioKey: 'urgent-client',
    attemptNum: 2,
    startedDaysAgo: 11,
    turns: [
      {
        speaker: 'AI_PERSONA',
        text: 'Men rahbaringiz bilan gaplashaman, komissiyani olib tashlang.',
      },
      {
        speaker: 'EMPLOYEE',
        text: "Rahbar bilan ko'rib chiqish mumkin, lekin komissiya faqat shartnoma va vakolat doirasida o'zgaradi.",
      },
      { speaker: 'AI_PERSONA', text: 'Demak yordam bermaysiz?' },
      {
        speaker: 'EMPLOYEE',
        text: 'Yordam beraman: arizangizni qabul qilaman, bandni tekshirtiraman va 16:00 gacha yozma javob qaytaraman.',
      },
    ],
    dimensionScores: {
      correctness: 88,
      tone: 88,
      processAdherence: 86,
      resolution: 88,
      compliance: 92,
    },
    overall: 88,
    feedback: ['Rahbar bosimiga qaramay vakolat chegarasi saqlandi.', 'Javob formati aniq.'],
    weakAreas: [],
  },
  {
    key: 'bekzod-retiree-2',
    userEmail: 'bekzod@sqb.uz',
    scenarioKey: 'confused-retiree',
    attemptNum: 2,
    startedDaysAgo: 12,
    turns: [
      { speaker: 'AI_PERSONA', text: 'Call-markaz menga boshqa narsa dedi, endi kimga ishonaman?' },
      {
        speaker: 'EMPLOYEE',
        text: 'Sizni tushundim. Keling, hisob harakatini rasmiy tizimdan tekshiramiz va natijani oddiy qilib yozib beraman.',
      },
      { speaker: 'AI_PERSONA', text: 'Men filialga kelishim kerakmi?' },
      {
        speaker: 'EMPLOYEE',
        text: "Agar shaxs tasdiqlansa, ko'p ma'lumotni shu yerda aytamiz. Kerak bo'lsa, eng yaqin filial va murojaat raqamini beraman.",
      },
    ],
    dimensionScores: {
      correctness: 86,
      tone: 92,
      processAdherence: 88,
      resolution: 88,
      compliance: 94,
    },
    overall: 90,
    feedback: ['Mijoz ishonchi tiklandi.', "Keyingi kanal aniq ko'rsatildi."],
    weakAreas: [],
  },
];

async function main(): Promise<void> {
  const tenant = await prisma.tenant.findUnique({ where: { slug: TENANT_SLUG } });
  if (!tenant) throw new Error(`Tenant not found: ${TENANT_SLUG}. Run base seed first.`);

  const users = await loadUsers(tenant.id);
  const scenarios = await seedScenarios(tenant.id);
  const persona = await seedAzizPersona(tenant.id, users);
  await seedSessions(tenant.id, users, scenarios);

  console.log(
    `Demo seed complete: ${scenarios.size} scenarios, ${DIMENSIONS.length * scenarios.size} criteria, ` +
      `${NOTE_SEEDS.length} Aziz notes, ${OFFBOARDING_QA.length} offboarding QAs, ` +
      `${SESSION_SEEDS.length} simulator sessions for persona ${persona.id}.`,
  );
}

async function loadUsers(tenantId: string): Promise<Map<string, { id: string; fullName: string }>> {
  const emails = [
    'aziz@sqb.uz',
    'malika@sqb.uz',
    'bekzod@sqb.uz',
    'nigora@sqb.uz',
    'dilshod@sqb.uz',
  ];
  const rows = await prisma.user.findMany({
    where: { tenantId, email: { in: emails } },
    select: { id: true, email: true, fullName: true },
  });
  const users = new Map(rows.map((user) => [user.email, { id: user.id, fullName: user.fullName }]));
  for (const email of emails) {
    if (!users.has(email))
      throw new Error(`Required demo user not found: ${email}. Run base seed first.`);
  }
  return users;
}

async function seedScenarios(tenantId: string): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  for (const scenario of SCENARIOS) {
    const id = `${tenantId}-scenario-${scenario.key}`;
    await prisma.scenario.upsert({
      where: { id },
      update: {
        category: scenario.category,
        title: scenario.title,
        brief: scenario.brief,
        personaDesc: scenario.personaDesc,
        difficulty: scenario.difficulty,
        lang: 'UZ',
        active: true,
      },
      create: {
        id,
        tenantId,
        category: scenario.category,
        title: scenario.title,
        brief: scenario.brief,
        personaDesc: scenario.personaDesc,
        difficulty: scenario.difficulty,
        lang: 'UZ',
        active: true,
      },
    });
    await prisma.scenarioCriterion.deleteMany({ where: { scenarioId: id } });
    await prisma.scenarioCriterion.createMany({
      data: DIMENSIONS.map((dimension) => ({
        scenarioId: id,
        dimension,
        weight: 1,
        rubric: scenario.criteria[dimension],
      })),
    });
    ids.set(scenario.key, id);
  }
  return ids;
}

async function seedAzizPersona(
  tenantId: string,
  users: Map<string, { id: string; fullName: string }>,
): Promise<{ id: string }> {
  const aziz = mustGet(users, 'aziz@sqb.uz');
  const nigora = mustGet(users, 'nigora@sqb.uz');
  const projectId = `${tenantId}-bootstrap`;
  const project = await prisma.project.findFirst({
    where: { id: projectId, tenantId },
    select: { id: true },
  });

  const persona = await prisma.persona.upsert({
    where: { userId: aziz.id },
    update: {
      voiceProfile:
        'Aziz Karimov xotirjam, tajribali, 5 yillik senior credit officer. U mijoz bosimini yumshoq tan oladi, lekin shartnoma, risk va compliance chegaralaridan chiqmaydi. Javoblari qisqa, amaliy va birinchi shaxsda.',
      expertiseTags: ['AML', 'credit_risk', 'FX', 'early_repayment'],
      expertiseScore: toJson({ AML: 1, credit_risk: 1, FX: 1, early_repayment: 1 }),
      lastTrainedAt: null,
    },
    create: {
      tenantId,
      userId: aziz.id,
      voiceProfile:
        'Aziz Karimov xotirjam, tajribali, 5 yillik senior credit officer. U mijoz bosimini yumshoq tan oladi, lekin shartnoma, risk va compliance chegaralaridan chiqmaydi. Javoblari qisqa, amaliy va birinchi shaxsda.',
      expertiseTags: ['AML', 'credit_risk', 'FX', 'early_repayment'],
      expertiseScore: toJson({ AML: 1, credit_risk: 1, FX: 1, early_repayment: 1 }),
    },
    select: { id: true },
  });

  for (const note of NOTE_SEEDS) {
    const noteId = `${tenantId}-aziz-note-${note.idSuffix}`;
    const data: Prisma.KnowledgeNoteUncheckedCreateInput = {
      id: noteId,
      tenantId,
      authorId: aziz.id,
      kind: 'PROJECT_REFLECTION',
      prompt: note.prompt,
      text: note.text,
      visibility: 'TEAM',
      tags: note.tags,
    };
    if (project) data.projectId = project.id;
    await prisma.knowledgeNote.upsert({
      where: { id: noteId },
      update: {
        projectId: project?.id ?? null,
        kind: 'PROJECT_REFLECTION',
        prompt: note.prompt,
        text: note.text,
        visibility: 'TEAM',
        tags: note.tags,
      },
      create: data,
    });
  }

  const interviewId = `${tenantId}-aziz-offboarding`;
  await prisma.offboardingInterview.upsert({
    where: { id: interviewId },
    update: {
      triggeredBy: nigora.id,
      status: 'COMPLETED',
      startedAt: daysAgo(2),
      completedAt: daysAgo(1),
    },
    create: {
      id: interviewId,
      tenantId,
      userId: aziz.id,
      triggeredBy: nigora.id,
      status: 'COMPLETED',
      startedAt: daysAgo(2),
      completedAt: daysAgo(1),
    },
  });
  await prisma.offboardingQA.deleteMany({ where: { interviewId } });
  await prisma.offboardingQA.createMany({
    data: OFFBOARDING_QA.map((qa, index) => ({
      id: `${interviewId}-qa-${index + 1}`,
      interviewId,
      order: index + 1,
      questionText: qa.question,
      questionKind: qa.kind,
      answerText: qa.answer,
      durationSec: 80 + index * 9,
    })),
  });

  return persona;
}

async function seedSessions(
  tenantId: string,
  users: Map<string, { id: string; fullName: string }>,
  scenarios: Map<string, string>,
): Promise<void> {
  for (const session of SESSION_SEEDS) {
    const user = mustGet(users, session.userEmail);
    const scenarioId = scenarios.get(session.scenarioKey);
    if (!scenarioId) throw new Error(`Scenario not seeded: ${session.scenarioKey}`);
    const id = `${tenantId}-session-${session.key}`;
    await prisma.simulatorSession.deleteMany({ where: { id } });
    await prisma.simulatorSession.create({
      data: {
        id,
        tenantId,
        userId: user.id,
        scenarioId,
        attemptNum: session.attemptNum,
        status: 'COMPLETED',
        startedAt: daysAgo(session.startedDaysAgo),
        endedAt: addMinutes(daysAgo(session.startedDaysAgo), 12),
        turns: {
          create: session.turns.map((turn, index) => ({
            turnIndex: index + 1,
            speaker: turn.speaker,
            text: turn.text,
            createdAt: addMinutes(daysAgo(session.startedDaysAgo), index * 2),
          })),
        },
        score: {
          create: {
            overall: session.overall,
            dimensionScores: toJson(session.dimensionScores),
            feedback: toJson(
              session.feedback.map((comment) => ({ dimension: 'Umumiy', comment, severity: 'minor' })),
            ),
            weakAreas: toJson(
              session.weakAreas.map((topic) => ({ topic, suggestPersonaTags: [topic] })),
            ),
          },
        },
      },
    });
  }
}

function mustGet(
  map: Map<string, { id: string; fullName: string }>,
  email: string,
): { id: string; fullName: string } {
  const value = map.get(email);
  if (!value) throw new Error(`Required user missing from map: ${email}`);
  return value;
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 86_400_000);
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
