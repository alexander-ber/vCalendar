import fs from "node:fs/promises";
import path from "node:path";

const INPUT = "data/events.json";
const OUTPUT_ROOT = "data/events";

const CYRILLIC = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "e",
  ж: "zh",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "kh",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "shch",
  ы: "y",
  э: "e",
  ю: "yu",
  я: "ya",
  ъ: "",
  ь: ""
};

function transliterate(value) {
  return [...value].map((char) => CYRILLIC[char.toLowerCase()] ?? char).join("");
}

function constantId(value, fallback) {
  const raw = transliterate(value || fallback || "EVENT")
    .replace(/['’]/g, "")
    .replace(/&/g, " and ");
  const id = raw
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_{2,}/g, "_")
    .toUpperCase();
  return id || "EVENT";
}

function categoryFolder(event) {
  const category = event.category || event.type || "festival";
  if (event.type === "divine_appearance") return "divine-appearance";
  if (event.type === "vaishnava_appearance") return "vaishnava-appearance";
  if (event.type === "vaishnava_disappearance") return "vaishnava-disappearance";
  if (event.category === "deity_temple" || event.type === "deity_installation" || event.type === "temple_opening") return "deity-temple";
  return category.replace(/_/g, "-");
}

function sourceList(event) {
  if (Array.isArray(event.sources) && event.sources.length) return event.sources;
  return event.source_url ? [{ type: "description", url: event.source_url }] : [];
}

function translation(lang, data = {}, fallbackName = "", fallbackDescription = "") {
  return {
    lang,
    name: data.name || (lang === "en" ? fallbackName : ""),
    short_description: data.short_description || data.description || fallbackDescription || "",
    full_description: data.full_description || ""
  };
}

function contentEvent(event, contentId) {
  return {
    id: contentId,
    runtime_id: event.id,
    type: event.type,
    category: event.category,
    scope: event.scope,
    subject: event.subject,
    rules: {
      masa: event.masa,
      gaudiya_masa: event.gaudiya_masa,
      paksha: event.paksha,
      tithi: event.tithi,
      timing_rule: event.timing_rule,
      allow_in_adhika: event.allow_in_adhika
    },
    fasting_rule: event.fasting_rule,
    priority: event.priority,
    source_status: event.source_status,
    observance_offset_days: event.observance_offset_days,
    disabled: event.disabled,
    sources: sourceList(event),
    translations: [
      translation("en", event.i18n?.en, event.name, event.description),
      translation("ru", event.i18n?.ru, "", "")
    ].filter((item) => item.name || item.short_description || item.full_description)
  };
}

async function main() {
  const events = JSON.parse(await fs.readFile(INPUT, "utf8"));
  const usedIds = new Map();
  await fs.rm(OUTPUT_ROOT, { recursive: true, force: true });

  for (const event of events) {
    const baseId = constantId(event.name || event.i18n?.en?.name || event.i18n?.ru?.name, event.id);
    const count = usedIds.get(baseId) || 0;
    usedIds.set(baseId, count + 1);
    const contentId = count ? `${baseId}_${count + 1}` : baseId;
    const folder = path.join(OUTPUT_ROOT, categoryFolder(event));
    await fs.mkdir(folder, { recursive: true });
    await fs.writeFile(path.join(folder, `${contentId}.json`), `${JSON.stringify(contentEvent(event, contentId), null, 2)}\n`);
  }

  console.log(JSON.stringify({ output: OUTPUT_ROOT, events: events.length }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
