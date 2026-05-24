# CorpMind — Pitch Deck (paste-ready content)

> **Qanday ishlatish:** Rasmiy templateni **File → Make a copy** qiling (tahrir qilmang, nusxa oling). Quyidagi har bir "SLIDE" blokini template'ning mos slaydiga joylang. **[Speaker notes]** — Slides'ning "Speaker notes" qismiga. Sharing: **Anyone with the link – Viewer**.
> Jami pitch: **4 daqiqa**. Har slayddagi vaqt belgisiga amal qiling. Demo'ni slayddan ustun qo'ying — gapirayotganda ekranni ko'rsating.
> Vizual: bizdagi tayyor skrinshotlardan foydalaning (KB chat, Simulator score radar, Aziz persona, Home dashboard). Rang: chuqur teal + amber (mahsulot brendi).

---

## SLIDE 1 — Cover (0:00–0:15)

**CorpMind**
*Bilim. Mahorat. Tajriba — saqlanadi.*

AI-powered korporativ ta'lim platformasi · Track: **Corporate Education**
Demo: **SQB Bank** · [Jamoa nomi]

> [Speaker notes] "Salom. Biz — CorpMind. Bir jumlada: kompaniyaning eng qimmatli aktivi — xodimlarining bilimi — biz uni saqlaymiz, o'rgatamiz va sinovdan o'tkazamiz. Bugun buni SQB Bank misolida ko'rsatamiz."

---

## SLIDE 2 — Muammo (0:15–0:55)

**Bilim eshikdan chiqib ketadi. Har kuni.**

- 🕒 Yangi xodim to'liq samaradorlikka **8–12 oy** sarflaydi — tartibsiz onboarding bilan.
- 📄 Javoblar 40 betlik PDF'larda ko'milgan — **60%** xodim kerakli ma'lumotni topa olmaydi.
- 🎭 Mahorat hech qachon sinalmaydi — faqat taxmin qilinadi. Xato esa mijoz oldida yuz beradi.
- 🚪 Tajribali xodim ketganda — uning bilimi **u bilan ketadi**. Tashkilotlarning **90%** jiddiy bilim yo'qotadi.

> Fortune 500: yiliga **$31.5 mlrd** zarar — yomon bilim almashinuvi tufayli (IDC).

> [Speaker notes] "To'rt og'riq. Sekin onboarding, topilmaydigan bilim, sinalmagan mahorat, va eng og'rig'i — tajribali xodim ketganda bilim u bilan ketadi. Bu mavhum emas: yiliga 31 milliard dollar. Banklar uchun bu — har bir kredit ofitseri."

---

## SLIDE 3 — Yechim (0:55–1:30)

**CorpMind — bitta o'rganish halqasi (loop), to'rtta modul.**

```
Onboarding  →  Knowledge Assistant  →  Simulator  →  Knowledge Memory
(tanishtiradi)    (mustahkamlaydi)      (sinaydi)      (abadiy saqlaydi)
```

1. **Smart Onboarding** — rolega mos kunlik dastur + AI companion.
2. **Knowledge Assistant** — hujjatlarga asoslangan, manbali javoblar (RAG).
3. **Roleplay Simulator** — AI mijoz bilan mashq + 5 o'lchamli baholash.
4. **Knowledge Memory** — xodim tajribasini saqlovchi **AI persona**.

> Bular alohida vositalar emas — bir-birini oziqlantiruvchi **halqa**.

> [Speaker notes] "Bizning farqimiz: bular alohida 4 ta vosita emas. Bu bitta halqa. Onboarding bilimni beradi, Assistant mustahkamlaydi, Simulator qo'llashni sinaydi, Memory esa abadiy saqlaydi. Va to'rtinchisi — bizning sirimiz."

---

## SLIDE 4 — Esda qoladigan farq (1:30–2:00)

**"Aziz ketdi. Lekin uning tajribasi shu yerda qoldi."**

Aziz Karimov — 5 yillik Senior Credit Officer, Toshkentga ko'chdi.
Endi istalgan xodim undan **birinchi shaxsda** so'ray oladi:

> *"Aziz, erta to'lash holatlarini qanday boshqargansiz?"*
> → Aziz'ning o'z yozuvlari va offboarding intervyusiga asoslangan, manbali javob.

AI persona **to'qimaydi** — faqat saqlangan bilimga asoslanadi; yetarli bo'lmasa, halol aytadi.

> [Speaker notes] "Tasavvur qiling: tajribali Aziz ketdi. Odatda bilim u bilan ketardi. CorpMind'da esa Bekzod undan so'ray oladi — Aziz'ning ovozida, uning haqiqiy yozuvlariga asoslangan javob. Bu — institutsional xotira. Mana shu hakamlar esida qoladi."

---

## SLIDE 5 — Qanday ishlaydi (AI) (2:00–2:30)

**Yuzaki chatbot emas — chuqur AI.**

- **Hybrid RAG**: pgvector (semantik) + tsvector (kalit so'z) → Reciprocal Rank Fusion → eng mos 5 bo'lak. Bank uchun raqamlar va terminlar muhim.
- **Manba + halollik**: har javob hujjatga bog'lanadi; topilmasa — "bilmayman, [kim]ga murojaat qiling".
- **AI scoring**: gpt-4o suhbatni 5 o'lcham bo'yicha baholaydi (to'g'rilik, ohang, jarayon, yechim, compliance) + Knowledge Bridge.
- **Persona RAG**: har xodim o'z bilim indeksiga ega; confidence chegarasi bilan.

> [Speaker notes] "Texnik tomondan: oddiy RAG emas — hibrid qidiruv, chunki bankda '24%' va 'AML' kabi aniq narsalar muhim. Har javob manbali va halol. Simulator esa GPT-4o bilan 5 o'lchamda baholaydi. AI bu yerda mahsulotning yadrosi, bezak emas."

---

## SLIDE 6 — Jonli demo (2:30–3:15)

**[ENG MUHIM SLAYD — ko'proq gapirmasdan, EKRANNI ko'rsating]**

Golden path (SQB, O'zbekcha):
1. Bekzod **Day 1** onboarding → quiz → ochiladi.
2. **KB**: "Kredit foiz stavkasi?" → token-token oqim + **manba chip**.
3. **Simulator**: "Shubhali tranzaksiya" → AI mijoz bilan suhbat → **ball + radar + feedback**.
4. **Aziz persona**: savol → birinchi shaxsda javob + ishonch ko'rsatkichi.
5. **Manager dashboard**: team status + skill-gap.

> [Speaker notes] "Endi jonli ko'rsataman." → Ekranga o'ting. Tez, ishonchli, gapirmang — ko'rsating. Agar internet/AI sekin bo'lsa — backup skrinshotlarga o'ting (slaydlar oxirida)."

---

## SLIDE 7 — Natija & ta'sir (3:15–3:40)

**Bitta platforma, o'lchanadigan natija.**

- ⏱️ Onboarding'ni haftalardan **kunlarga** qisqartiradi.
- 🔎 "Kim biladi?" → sekundlarda javob, hamkasbni chalg'itmasdan.
- 🛡️ Mahorat real mijozdan **oldin** sinaladi — xato narxi tushadi.
- 🧠 Bilim yo'qolmaydi — ketgan xodim ham "shu yerda yashaydi".
- 🌍 **Generic platforma**: bank — bu demo. IT, retail, sog'liq, davlat — hujjatingizni yuklang, ishlaydi.

> [Speaker notes] "Natija: tezroq onboarding, topiladigan bilim, sinalgan mahorat, yo'qolmaydigan tajriba. Va eng muhimi — bu faqat bank uchun emas. Sohani almashtiring, o'z hujjatlaringizni yuklang — platforma ishlaydi. Bu — bozor."

---

## SLIDE 8 — Texnologiya & Responsible AI (3:40–3:55)

**To'liq ishlaydigan, prodakshn darajasidagi MVP.**

- Stack: **NestJS + TypeScript (strict)** · React + Vite · PostgreSQL **pgvector** · Redis/BullMQ.
- AI: OpenAI — gpt-4o / gpt-4o-mini · text-embedding-3-small · Whisper · Hybrid RAG.
- Multi-tenant, JWT, SSE streaming, 3 til (uz/ru/en).
- **Responsible AI**: faqat sintetik data · manba-asoslangan javob · "bilmayman" fallback · kunlik budjet guard.

> Repo (public) + README + AI disclosure tayyor.

> [Speaker notes] "Bu prototip emas — ishlaydigan, qat'iy tiplangan, multi-tenant MVP. Repo public, README to'liq, AI'ni mas'uliyatli ishlatamiz: faqat sintetik ma'lumot, manba-asoslangan, va AI bilmasa — halol aytadi."

---

## SLIDE 9 — Yopilish (3:55–4:00)

**CorpMind**
*Tajriba — kompaniyaning eng qimmatli aktivi. Biz uni yo'qotmaymiz.*

🔗 Repo: github.com/Behruz01/corporate-edu · Demo: localhost (jonli)
[Jamoa nomi · a'zolar]

> [Speaker notes] "Aziz uch oy oldin ketdi. Lekin uning tajribasi shu yerda. CorpMind — bilim hech qachon eshikdan chiqib ketmaydigan kompaniya. Rahmat." (Kuchli, qisqa to'xtam bilan tugating.)

---

## Backup slaydlar (oxiriga, demo buzilsa)
- KB chat javob skrinshoti (manba chip bilan)
- Simulator score radar + feedback skrinshoti
- Aziz persona javob skrinshoti
- Manager dashboard / reports skrinshoti

## Pitch maslahatlari (guide §7)
- 4 daqiqa: demo'ga eng ko'p vaqt. Slayd kam — gap kuchli.
- Hook (Aziz hikoyasi) bilan boshlab, hook bilan tugating — esda qoladi.
- Har bir judging mezoniga teging: **Innovation** (persona memory), **Problem-fit** (bank og'riqlari), **Completeness** (jonli demo), **Technical** (hybrid RAG + stack).
- Q&A (1 daqiqa) uchun tayyor javoblar: "AI xato qilsa?" → fallback + manba; "Maxfiy data?" → sintetik, redaction; "Boshqa soha?" → settings'da industry switch.
