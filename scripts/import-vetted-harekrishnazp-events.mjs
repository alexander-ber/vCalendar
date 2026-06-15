import fs from "node:fs/promises";
import path from "node:path";

const IMPORT_PATH = "data/imports/harekrishnazp-events-2026.json";
const CACHE_DIR = "/private/tmp/harekrishnazp-event-pages";
const USER_AGENT = "Mozilla/5.0";
const DISTRIBUTION_NOTE =
  "Source footer says: Распространение материалов сайта горячо приветствуется! При использовании информации на других сайтах, пожалуйста, ставьте ссылку на цитируемый материал.";

const VETTED_EVENTS = [
  {
    title: "Шри Кришна Пушья Абхишека",
    id: "SHRI_KRISHNA_PUSHYA_ABHISHEKA",
    folder: "festival",
    type: "festival",
    category: "festival",
    subject: "Sri Krishna Pushya Abhisheka",
    enName: "Sri Krishna Pushya Abhisheka",
    rule: { gaudiya_masa: "Narayana", paksha: "Gaura", tithi: "Purnima" }
  },
  {
    title: "День ухода Джаядевы Госвами",
    id: "DISAPPEARANCE_OF_SRILA_JAYADEVA_GOSWAMI",
    folder: "vaishnava-disappearance",
    type: "vaishnava_disappearance",
    category: "vaishnava_disappearance",
    subject: "Disappearance of Srila Jayadeva Goswami",
    enName: "Disappearance of Srila Jayadeva Goswami",
    rule: { gaudiya_masa: "Madhava", paksha: "Krishna", tithi: "Shashthi" }
  },
  {
    title: "День ухода Лочаны Даса Тхакура",
    id: "DISAPPEARANCE_OF_SRILA_LOCHANA_DASA_THAKUR",
    folder: "vaishnava-disappearance",
    type: "vaishnava_disappearance",
    category: "vaishnava_disappearance",
    subject: "Disappearance of Srila Lochana Dasa Thakur",
    enName: "Disappearance of Srila Lochana Dasa Thakur",
    rule: { gaudiya_masa: "Madhava", paksha: "Krishna", tithi: "Ashtami" }
  },
  {
    title: "Махашиваратри (Шиваратри) - ночь Шивы",
    id: "MAHA_SHIVARATRI",
    folder: "festival",
    type: "festival",
    category: "festival",
    subject: "Maha Shivaratri",
    enName: "Maha Shivaratri",
    rule: { gaudiya_masa: "Govinda", paksha: "Krishna", tithi: "Chaturdashi" }
  },
  {
    title: "Шри Баларама Расаятра",
    id: "SRI_BALARAMA_RASAYATRA",
    folder: "festival",
    type: "festival",
    category: "festival",
    subject: "Sri Balarama Rasa-yatra",
    enName: "Sri Balarama Rasa-yatra",
    rule: { gaudiya_masa: "Vishnu", paksha: "Gaura", tithi: "Purnima" }
  },
  {
    title: "Шри Кришна Васанта Раса",
    id: "SRI_KRISHNA_VASANTA_RASA",
    folder: "festival",
    type: "festival",
    category: "festival",
    subject: "Sri Krishna Vasanta Rasa",
    enName: "Sri Krishna Vasanta Rasa",
    rule: { gaudiya_masa: "Vishnu", paksha: "Gaura", tithi: "Purnima" }
  },
  {
    title: "День явления Вамшиваданы Тхакура",
    id: "APPEARANCE_OF_VAMSHIVADANA_THAKUR",
    folder: "vaishnava-appearance",
    type: "vaishnava_appearance",
    category: "vaishnava_appearance",
    subject: "Appearance of Srila Vamshivadana Thakur",
    enName: "Appearance of Srila Vamshivadana Thakur",
    rule: { gaudiya_masa: "Vishnu", paksha: "Gaura", tithi: "Purnima" }
  },
  {
    title: "День явления Шанкарачарьи",
    id: "APPEARANCE_OF_SHANKARACHARYA",
    folder: "vaishnava-appearance",
    type: "vaishnava_appearance",
    category: "vaishnava_appearance",
    subject: "Appearance of Shankaracharya",
    enName: "Appearance of Shankaracharya",
    rule: { gaudiya_masa: "Madhusudana", paksha: "Gaura", tithi: "Panchami" }
  },
  {
    title: "День ухода Рамананды Рая",
    id: "DISAPPEARANCE_OF_RAMANANDA_RAYA",
    folder: "vaishnava-disappearance",
    type: "vaishnava_disappearance",
    category: "vaishnava_disappearance",
    subject: "Disappearance of Ramananda Raya",
    enName: "Disappearance of Ramananda Raya",
    rule: { gaudiya_masa: "Trivikrama", paksha: "Krishna", tithi: "Panchami" }
  },
  {
    title: "Кришна Пхула Дола, Шалила Вихара",
    id: "KRISHNA_PHULA_DOLA_SALILA_VIHARA",
    folder: "festival",
    type: "festival",
    category: "festival",
    subject: "Krishna Phula Dola and Salila Vihara",
    enName: "Krishna Phula Dola and Salila Vihara",
    rule: { gaudiya_masa: "Madhusudana", paksha: "Gaura", tithi: "Purnima" }
  },
  {
    title: "Панихати Чида Дахи Утсава",
    id: "PANIHATI_CHIDA_DAHI_UTSAVA",
    folder: "festival",
    type: "festival",
    category: "festival",
    subject: "Panihati Chida Dahi Utsava",
    enName: "Panihati Chida Dahi Utsava",
    rule: { gaudiya_masa: "Trivikrama", paksha: "Gaura", tithi: "Trayodashi" }
  },
  {
    title: "Дипавали (Дипа Дана)",
    id: "DIPAVALI_DIPA_DANA",
    folder: "festival",
    type: "festival",
    category: "festival",
    subject: "Dipavali / Dipa Dana",
    enName: "Dipavali / Dipa Dana",
    rule: { gaudiya_masa: "Damodara", paksha: "Krishna", tithi: "Amavasya" }
  }
];

function stripTags(value) {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<li[^>]*>/gi, "\n- ")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<img[^>]*>/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function articleHtml(html) {
  const match = html.match(/<div class="item-page">([\s\S]*?)<div id="jc">/);
  return match?.[1] || "";
}

function articleDescription(html) {
  const body = articleHtml(html)
    .replace(/<h2[\s\S]*?<\/h2>/i, "")
    .replace(/<div class="jcomments-links">[\s\S]*?<\/div>/gi, "");
  return stripTags(body);
}

function cacheFileForUrl(url) {
  const slug = url
    .replace(/^https?:\/\//, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return path.join(CACHE_DIR, `${slug}.html`);
}

async function readCachedOrFetch(url) {
  const cachePath = cacheFileForUrl(url);
  try {
    return await fs.readFile(cachePath, "utf8");
  } catch {
    const response = await fetch(url, { headers: { "user-agent": USER_AGENT } });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    const html = await response.text();
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(cachePath, html);
    return html;
  }
}

function shortDescription(text) {
  const paragraph = text
    .split(/\n\s*\n/)
    .map((item) => item.trim())
    .find((item) => item.length > 80);
  if (!paragraph) return text.slice(0, 420);
  return paragraph.length > 620 ? `${paragraph.slice(0, 617).trim()}...` : paragraph;
}

function englishFallback(name) {
  return `Detailed Russian source text has been imported for ${name}. English editorial translation is pending.`;
}

async function main() {
  const imported = JSON.parse(await fs.readFile(IMPORT_PATH, "utf8")).events;
  let created = 0;
  const skipped = [];

  for (const item of VETTED_EVENTS) {
    const source = imported.find((event) => event.title === item.title);
    if (!source) {
      skipped.push({ id: item.id, reason: "source event not found" });
      continue;
    }
    const file = path.join("data/events", item.folder, `${item.id}.json`);
    try {
      await fs.access(file);
      skipped.push({ id: item.id, reason: "file already exists" });
      continue;
    } catch {
      // New file.
    }

    const html = await readCachedOrFetch(source.source_url);
    const fullDescription = articleDescription(html) || source.i18n?.ru?.description || "";
    const ruShort = shortDescription(fullDescription || source.i18n?.ru?.description || source.title);
    const content = {
      id: item.id,
      type: item.type,
      category: item.category,
      scope: "matched_harekrishnazp_vaishnavacalendar",
      subject: item.subject,
      rules: {
        ...item.rule,
        timing_rule: "sunrise_based",
        allow_in_adhika: false
      },
      priority: "medium",
      source_status: "matched_by_name_type_tithi",
      sources: [
        {
          type: "description",
          url: source.source_url,
          attribution_required: true
        }
      ],
      translations: [
        {
          lang: "en",
          name: item.enName,
          short_description: englishFallback(item.enName),
          full_description: ""
        },
        {
          lang: "ru",
          name: source.title,
          short_description: ruShort,
          full_description: fullDescription
        }
      ],
      content_license_note: DISTRIBUTION_NOTE
    };
    await fs.writeFile(file, `${JSON.stringify(content, null, 2)}\n`);
    created += 1;
  }

  console.log(JSON.stringify({ vetted: VETTED_EVENTS.length, created, skipped }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
