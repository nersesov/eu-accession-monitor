// Демонстраційні новини та сторінка. Усі тексти — демонстраційні дані.
const text = (t: string) => ({ type: 'text', text: t, detail: 0, format: 0, mode: 'normal', style: '', version: 1 })
const para = (t: string) => ({ type: 'paragraph', children: [text(t)], direction: 'ltr', format: '', indent: 0, version: 1, textFormat: 0, textStyle: '' })
export const rich = (...paragraphs: string[]) => ({
  root: { type: 'root', children: paragraphs.map(para), direction: 'ltr', format: '', indent: 0, version: 1 },
})
const textBlock = (...paragraphs: string[]) => ({ blockType: 'text', content: rich(...paragraphs) })

const DEMO_UK = 'Це демонстраційна новина: текст створено для показу можливостей платформи і не описує реальних подій.'
const DEMO_EN = 'This is a demonstration news item: the text was written to showcase the platform and does not describe real events.'

export const demoNews = [
  {
    slug: 'zapusk-monitora',
    date: '2026-11-20T09:00:00.000Z',
    uk: {
      title: 'Запущено демонстраційну версію Монітора реформ',
      excerpt: 'Платформа показує прогрес виконання заходів за главами 23 і 24 у розрізі напрямів та проміжних орієнтирів.',
      tags: ['платформа'],
      blocks: [
        textBlock(
          DEMO_UK,
          'Монітор обʼєднує глави, напрями реформ, проміжні орієнтири та заходи в одну структуру. Прогрес обчислюється автоматично: виконаний захід дає 1 бал, частково виконаний — 0,5.',
          'Дані можна оновлювати в адміністративній панелі або імпортувати з таблиці Google Sheets — повторний імпорт не створює дублікатів.',
        ),
        { blockType: 'cta', heading: 'Як рахується прогрес', text: 'Формула, джерела даних і дата останньої синхронізації — на сторінці методології.', buttonLabel: 'Методологія', buttonUrl: '/metodolohiia' },
      ],
    },
    en: {
      title: 'Demo version of the Reform Monitor launched',
      excerpt: 'The platform shows progress on measures under Chapters 23 and 24 by reform direction and interim benchmark.',
      tags: ['platform'],
      blocks: [
        textBlock(
          DEMO_EN,
          'The monitor brings chapters, reform directions, interim benchmarks and measures into one structure. Progress is calculated automatically: a completed measure scores 1 point, a partially completed one scores 0.5.',
          'Data can be updated in the admin panel or imported from a Google Sheets spreadsheet — repeated imports do not create duplicates.',
        ),
        { blockType: 'cta', heading: 'How progress is calculated', text: 'The formula, data sources and last synchronisation date are on the methodology page.', buttonLabel: 'Methodology', buttonUrl: '/en/metodolohiia' },
      ],
    },
  },
  {
    slug: 'vidkrytyi-api',
    date: '2026-11-21T10:00:00.000Z',
    uk: {
      title: 'Дані монітора доступні через відкритий API',
      excerpt: 'Прогрес, глави, напрями, заходи та оновлення статусів можна отримати у форматі JSON; специфікація — OpenAPI 3.1.',
      tags: ['API', 'відкриті дані'],
      blocks: [
        textBlock(DEMO_UK, 'Відкритий API версії 1 повертає загальний прогрес, перелік глав і напрямів, заходи з фільтрами за статусом і напрямом, а також стрічку оновлень статусів.'),
        {
          blockType: 'accordion',
          items: [
            { title: 'Чи потрібен ключ доступу?', content: rich('Ні. API публічний і доступний лише для читання. Діє обмеження частоти запитів.') },
            { title: 'Де знайти специфікацію?', content: rich('Специфікація OpenAPI 3.1 доступна за адресою /api/v1/openapi.json, інтерактивна документація — /api/v1/docs.') },
          ],
        },
      ],
    },
    en: {
      title: 'Monitor data is available through an open API',
      excerpt: 'Progress, chapters, directions, measures and status updates are available as JSON; the specification is OpenAPI 3.1.',
      tags: ['API', 'open data'],
      blocks: [
        textBlock(DEMO_EN, 'Open API version 1 returns overall progress, the list of chapters and directions, measures filtered by status and direction, and a feed of status updates.'),
        {
          blockType: 'accordion',
          items: [
            { title: 'Is an access key required?', content: rich('No. The API is public and read-only. Rate limiting applies.') },
            { title: 'Where is the specification?', content: rich('The OpenAPI 3.1 specification is at /api/v1/openapi.json; interactive documentation is at /api/v1/docs.') },
          ],
        },
      ],
    },
  },
  {
    slug: 'dostupnist-wcag',
    date: '2026-11-22T08:00:00.000Z',
    uk: {
      title: 'Інтерфейс перевірено на відповідність WCAG 2.1 AA',
      excerpt: 'Клавіатурна навігація, видимий фокус, статуси з іконкою і текстом, автоматична перевірка axe-core у кожній збірці.',
      tags: ['доступність', 'платформа'],
      blocks: [
        textBlock(DEMO_UK, 'Доступність реалізовано у власному коді, без накладних віджетів: семантична розмітка, посилання «Перейти до вмісту», акордеон з атрибутами ARIA, контраст тексту не менше 4,5:1.', 'Автоматичні тести axe-core запускаються в Playwright і блокують розгортання, якщо знайдено порушення.'),
      ],
    },
    en: {
      title: 'Interface checked against WCAG 2.1 AA',
      excerpt: 'Keyboard navigation, visible focus, statuses with icon and text, automated axe-core checks in every build.',
      tags: ['accessibility', 'platform'],
      blocks: [
        textBlock(DEMO_EN, 'Accessibility is implemented in our own code, without overlay widgets: semantic markup, a “Skip to content” link, an accordion with ARIA attributes, and text contrast of at least 4.5:1.', 'Automated axe-core tests run in Playwright and block deployment if violations are found.'),
      ],
    },
  },
]

export const demoPages = [
  {
    slug: 'dzherela',
    uk: {
      title: 'Офіційні джерела',
      meta: { description: 'Де шукати офіційну інформацію про переговори щодо вступу України до ЄС.' },
      blocks: [
        textBlock(
          'Ця сторінка створена в адміністративній панелі з блоків (текст, акордеон, заклик до дії) і демонструє роботу колекції «Сторінки».',
          'Монітор є незалежним демонстраційним проєктом. Офіційну інформацію про переговорний процес публікують органи влади України та інституції ЄС.',
        ),
        {
          blockType: 'accordion',
          items: [
            { title: 'Європейська комісія', content: rich('Матеріали щодо політики розширення публікує Генеральний директорат Європейської комісії з питань розширення: enlargement.ec.europa.eu.') },
            { title: 'Уряд України', content: rich('Інформацію про європейську інтеграцію публікує Урядовий портал: kmu.gov.ua.') },
          ],
        },
      ],
    },
    en: {
      title: 'Official sources',
      meta: { description: 'Where to find official information on Ukraine’s EU accession negotiations.' },
      blocks: [
        textBlock(
          'This page was built in the admin panel from blocks (text, accordion, call to action) and demonstrates the “Pages” collection.',
          'The monitor is an independent demonstration project. Official information on the negotiation process is published by the Ukrainian authorities and EU institutions.',
        ),
        {
          blockType: 'accordion',
          items: [
            { title: 'European Commission', content: rich('Enlargement policy materials are published by the European Commission’s Directorate-General for Enlargement: enlargement.ec.europa.eu.') },
            { title: 'Government of Ukraine', content: rich('Information on European integration is published on the Government Portal: kmu.gov.ua.') },
          ],
        },
      ],
    },
  },
]
