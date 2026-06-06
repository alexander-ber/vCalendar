import fs from "node:fs/promises";
import path from "node:path";

const EVENTS_ROOT = "data/events";
const DATA_OUTPUT = "data/events.json";
const JS_OUTPUT = "js/events-data.js";

async function jsonFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await jsonFiles(fullPath)));
    else if (entry.isFile() && entry.name.endsWith(".json")) files.push(fullPath);
  }
  return files.sort((a, b) => a.localeCompare(b));
}

function translationMap(translations = []) {
  return Object.fromEntries(
    translations
      .filter((item) => item?.lang)
      .map((item) => [
        item.lang,
        {
          name: item.name,
          description: item.short_description || item.description || "",
          full_description: item.full_description || undefined
        }
      ])
  );
}

function eventFromContent(content) {
  const translations = translationMap(content.translations);
  const english = translations.en || {};
  const rules = content.rules || {};
  const event = {
    id: content.runtime_id || content.id.toLowerCase(),
    name: english.name || content.name || content.id,
    type: content.type,
    category: content.category,
    scope: content.scope,
    subject: content.subject,
    ...rules,
    fasting_rule: content.fasting_rule,
    priority: content.priority,
    source_status: content.source_status,
    observance_offset_days: content.observance_offset_days,
    disabled: content.disabled,
    description: english.short_description || english.description || content.description || "",
    source_url: content.sources?.[0]?.url,
    i18n: translations
  };
  return JSON.parse(JSON.stringify(event));
}

async function main() {
  const files = await jsonFiles(EVENTS_ROOT);
  const events = [];
  const ids = new Set();
  for (const file of files) {
    const content = JSON.parse(await fs.readFile(file, "utf8"));
    if (!content.id || !/^[A-Z0-9_]+$/.test(content.id)) {
      throw new Error(`${file}: id must be uppercase latin constant case`);
    }
    if (ids.has(content.id)) throw new Error(`${file}: duplicate id ${content.id}`);
    ids.add(content.id);
    events.push(eventFromContent(content));
  }

  await fs.writeFile(DATA_OUTPUT, `${JSON.stringify(events, null, 2)}\n`);
  await fs.writeFile(JS_OUTPUT, `export const EVENTS = ${JSON.stringify(events, null, 2)};\n`);
  console.log(JSON.stringify({ files: files.length, events: events.length, data: DATA_OUTPUT, js: JS_OUTPUT }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
