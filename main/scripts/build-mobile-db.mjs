#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const outputPath = join(repoRoot, "apps/mobile/assets/db/vcalendar_seed.sqlite");
const tempSqlPath = join(repoRoot, "work/mobile-seed.sql");

function readJson(relativePath) {
  return JSON.parse(readFileSync(join(repoRoot, relativePath), "utf8"));
}

function sql(value) {
  if (value === undefined || value === null) return "NULL";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  if (typeof value === "boolean") return value ? "1" : "0";
  return `'${String(value).replaceAll("'", "''")}'`;
}

function jsonSql(value) {
  return sql(JSON.stringify(value ?? null));
}

function readLocations() {
  const source = readFileSync(join(repoRoot, "js/locations-data.js"), "utf8");
  const match = source.match(/export\s+const\s+LOCATIONS\s*=\s*(\[[\s\S]*?\]);/);
  if (!match) throw new Error("Unable to parse LOCATIONS from js/locations-data.js");
  return Function(`"use strict"; return (${match[1]});`)();
}

function readEventFiles() {
  const find = spawnSync("find", ["data/events", "-type", "f", "-name", "*.json"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  if (find.status !== 0) throw new Error(find.stderr || "Unable to list event files");
  return find.stdout
    .split("\n")
    .filter(Boolean)
    .sort()
    .map((path) => readJson(path));
}

function normalizeEvent(raw) {
  const rules = raw.rules ?? {};
  const i18n = raw.i18n ?? translationsToI18n(raw.translations);
  return {
    id: raw.runtime_id ?? raw.id,
    category: raw.category ?? "event",
    eventType: raw.type ?? raw.event_type ?? "event",
    scope: raw.scope ?? null,
    subject: raw.subject ?? null,
    masa: raw.masa ?? rules.masa ?? raw.gaudiya_masa ?? rules.gaudiya_masa ?? null,
    paksha: raw.paksha ?? rules.paksha ?? null,
    tithi: raw.tithi ?? rules.tithi ?? null,
    naksatra: raw.naksatra ?? raw.nakshatra ?? rules.naksatra ?? rules.nakshatra ?? null,
    timingRule: raw.timing_rule ?? rules.timing_rule ?? null,
    fastingRule: raw.fasting_rule ?? rules.fasting_rule ?? null,
    allowInAdhika: Boolean(raw.allow_in_adhika ?? rules.allow_in_adhika),
    priority: priorityValue(raw.priority),
    sourceStatus: raw.source_status ?? "confirmed",
    sourceUrl: raw.source_url ?? raw.sources?.[0]?.url ?? null,
    sourceNote: raw.source_note ?? null,
    i18n,
    fallbackName: raw.name ?? raw.id,
    fallbackDescription: raw.description ?? null,
    fallbackFullDescription: raw.full_description ?? null,
    raw,
  };
}

function translationsToI18n(translations) {
  if (!Array.isArray(translations)) return {};
  return Object.fromEntries(
    translations
      .filter((item) => item?.lang)
      .map((item) => [
        item.lang,
        {
          name: item.name,
          description: item.description ?? item.short_description,
          full_description: item.full_description,
          source_url: item.source_url,
          translator_note: item.translator_note,
        },
      ])
  );
}

function priorityValue(priority) {
  if (typeof priority === "number") return priority;
  const map = {
    highest: 10,
    high: 25,
    medium: 50,
    low: 75,
  };
  return map[priority] ?? 100;
}

function collectEvents() {
  const byId = new Map();
  for (const raw of readJson("data/events.json")) {
    if (raw?.id) {
      const event = normalizeEvent(raw);
      keepBestEvent(byId, event);
    }
  }
  for (const raw of readEventFiles()) {
    if (raw?.id) {
      const event = normalizeEvent(raw);
      keepBestEvent(byId, event);
    }
  }
  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}

function keepBestEvent(map, event) {
  const key = event.id.toLowerCase();
  const existing = map.get(key);
  if (!existing || eventContentScore(event) >= eventContentScore(existing)) {
    map.set(key, event);
  }
}

function eventContentScore(event) {
  const translations = Object.values(event.i18n || {});
  return translations.reduce((sum, item) => {
    return sum + String(item.full_description || item.description || item.name || "").length;
  }, 0);
}

function statements() {
  const now = new Date().toISOString();
  const locations = readLocations();
  const events = collectEvents();
  const ekadashi = readJson("data/ekadashi.json");
  const rules = readJson("data/rules.json");
  const lines = [];

  lines.push("pragma foreign_keys = on;");
  lines.push("begin transaction;");
  lines.push(`
create table app_meta (
  key text primary key,
  value text not null
);
`);
  lines.push(`
create table user_preferences (
  key text primary key,
  value text not null,
  updated_at text not null
);
`);
  lines.push(`
create table content_packs (
  lang text not null,
  pack_kind text not null,
  version integer not null,
  source text not null,
  source_url text,
  checksum text,
  installed_at text not null,
  is_builtin integer not null default 0,
  is_active integer not null default 1,
  primary key (lang, pack_kind)
);
`);
  lines.push(`
create table locations (
  id text primary key,
  country_code text not null,
  timezone text not null,
  latitude real not null,
  longitude real not null,
  altitude_m real,
  week_start integer not null default 1,
  sort_order integer not null default 1000,
  is_builtin integer not null default 1,
  is_active integer not null default 1
);
`);
  lines.push(`
create table location_i18n (
  location_id text not null references locations(id) on delete cascade,
  lang text not null,
  name text not null,
  country_name text,
  region_name text,
  primary key (location_id, lang)
);
`);
  lines.push(`
create table user_places (
  id text primary key,
  label text not null,
  timezone text not null,
  latitude real not null,
  longitude real not null,
  source text not null,
  nearest_location_id text references locations(id),
  created_at text not null,
  updated_at text not null
);
`);
  lines.push(`
create table events (
  id text primary key,
  category text not null,
  event_type text not null,
  scope text,
  subject text,
  masa text,
  paksha text,
  tithi text,
  naksatra text,
  timing_rule text,
  fasting_rule text,
  allow_in_adhika integer not null default 0,
  priority integer not null default 100,
  source_status text not null default 'confirmed',
  source_url text,
  source_note text,
  raw_json text not null,
  created_at text,
  updated_at text
);
`);
  lines.push(`
create table event_i18n (
  event_id text not null references events(id) on delete cascade,
  lang text not null,
  name text not null,
  short_description text,
  full_description text,
  source_url text,
  translator_note text,
  updated_at text,
  primary key (event_id, lang)
);
`);
  lines.push(`
create table ekadashi (
  id text primary key,
  masa text,
  paksha text,
  masa_type text,
  source_url text,
  raw_json text not null
);
`);
  lines.push(`
create table ekadashi_i18n (
  ekadashi_id text not null references ekadashi(id) on delete cascade,
  lang text not null,
  name text not null,
  benefits text,
  story text,
  full_description text,
  primary key (ekadashi_id, lang)
);
`);
  lines.push(`
create table glossary_terms (
  id text primary key,
  category text not null,
  sort_order integer not null default 1000
);
`);
  lines.push(`
create table glossary_i18n (
  term_id text not null references glossary_terms(id) on delete cascade,
  lang text not null,
  title text not null,
  short_description text not null,
  full_description text,
  primary key (term_id, lang)
);
`);
  lines.push(`
create table ui_strings (
  lang text not null,
  key text not null,
  value text not null,
  updated_at text,
  primary key (lang, key)
);
`);
  lines.push(`
create table documents (
  id text primary key,
  doc_type text not null,
  lang text not null,
  title text not null,
  asset_path text,
  local_path text,
  source_url text,
  version integer not null default 1,
  updated_at text
);
`);
  lines.push(`
create table calendar_day_cache (
  location_key text not null,
  date_iso text not null,
  engine_version text not null,
  lang text not null,
  payload_json text not null,
  created_at text not null,
  primary key (location_key, date_iso, engine_version, lang)
);
`);

  lines.push("create index events_rule_idx on events (masa, paksha, tithi, category);");
  lines.push("create index event_i18n_lang_name_idx on event_i18n (lang, name);");
  lines.push("create index locations_sort_idx on locations (sort_order, id);");

  lines.push(`insert into app_meta (key, value) values ('seed_created_at', ${sql(now)});`);
  lines.push(`insert into app_meta (key, value) values ('rules_json', ${jsonSql(rules)});`);
  lines.push(`insert into app_meta (key, value) values ('seed_schema_version', '1');`);

  for (const lang of ["en", "ru"]) {
    for (const kind of ["ui", "events", "ekadashi", "glossary", "docs"]) {
      lines.push(`insert into content_packs (lang, pack_kind, version, source, installed_at, is_builtin)
values (${sql(lang)}, ${sql(kind)}, 1, 'bundled', ${sql(now)}, 1);`);
    }
  }

  locations.forEach((location, index) => {
    const countryCode = countryCodeFor(location.timezone, location.group);
    lines.push(`insert into locations (id, country_code, timezone, latitude, longitude, week_start, sort_order)
values (${sql(location.id)}, ${sql(countryCode)}, ${sql(location.timezone)}, ${sql(location.lat)}, ${sql(location.lon)}, ${sql(location.week_start ?? 1)}, ${index});`);
    lines.push(`insert into location_i18n (location_id, lang, name, country_name, region_name)
values (${sql(location.id)}, 'en', ${sql(location.name)}, ${sql(countryNameEn(location.group))}, ${sql(location.group)});`);
    lines.push(`insert into location_i18n (location_id, lang, name, country_name, region_name)
values (${sql(location.id)}, 'ru', ${sql(locationNameRu(location))}, ${sql(location.group)}, ${sql(location.group)});`);
  });

  for (const event of events) {
    lines.push(`insert into events (
  id, category, event_type, scope, subject, masa, paksha, tithi, naksatra, timing_rule, fasting_rule,
  allow_in_adhika, priority, source_status, source_url, source_note, raw_json, created_at, updated_at
) values (
  ${sql(event.id)}, ${sql(event.category)}, ${sql(event.eventType)}, ${sql(event.scope)}, ${sql(event.subject)},
  ${sql(event.masa)}, ${sql(event.paksha)}, ${sql(event.tithi)}, ${sql(event.naksatra)}, ${sql(event.timingRule)}, ${sql(event.fastingRule)},
  ${sql(event.allowInAdhika)}, ${sql(event.priority)}, ${sql(event.sourceStatus)}, ${sql(event.sourceUrl)}, ${sql(event.sourceNote)},
  ${jsonSql(event.raw)}, ${sql(now)}, ${sql(now)}
);`);
    for (const lang of ["en", "ru"]) {
      const t = event.i18n?.[lang] ?? {};
      const name = t.name ?? event.fallbackName;
      const description = t.description ?? event.fallbackDescription;
      const fullDescription = t.full_description ?? event.fallbackFullDescription;
      lines.push(`insert into event_i18n (event_id, lang, name, short_description, full_description, source_url, translator_note, updated_at)
values (${sql(event.id)}, ${sql(lang)}, ${sql(name)}, ${sql(description)}, ${sql(fullDescription)}, ${sql(t.source_url ?? event.sourceUrl)}, ${sql(t.translator_note ?? null)}, ${sql(now)});`);
    }
  }

  for (const item of ekadashi) {
    lines.push(`insert into ekadashi (id, masa, paksha, masa_type, source_url, raw_json)
values (${sql(item.id)}, ${sql(item.masa)}, ${sql(item.paksha)}, ${sql(item.masa_type)}, ${sql(item.source_url ?? null)}, ${jsonSql(item)});`);
    for (const lang of ["en", "ru"]) {
      const t = item.i18n?.[lang] ?? {};
      lines.push(`insert into ekadashi_i18n (ekadashi_id, lang, name, benefits, story, full_description)
values (${sql(item.id)}, ${sql(lang)}, ${sql(t.name ?? item.name)}, ${sql(t.benefits ?? null)}, ${sql(t.story ?? item.description ?? null)}, ${sql(t.full_description ?? null)});`);
    }
  }

  seedGlossary(lines);
  seedUi(lines, now);

  lines.push("commit;");
  return lines.join("\n");
}

function countryCodeFor(timezone, group) {
  if (timezone === "Asia/Jerusalem") return "IL";
  if (timezone === "Asia/Kolkata") return "IN";
  if (timezone === "Asia/Kathmandu") return "NP";
  if (group === "Украина") return "UA";
  if (group === "Беларусь") return "BY";
  if (group === "Россия") return "RU";
  if (group === "Европа") return "EU";
  return "XX";
}

function countryNameEn(group) {
  const map = {
    Израиль: "Israel",
    Украина: "Ukraine",
    Беларусь: "Belarus",
    Россия: "Russia",
    Европа: "Europe",
    Индия: "India",
    Непал: "Nepal",
  };
  return map[group] ?? group;
}

function locationNameRu(location) {
  const city = location.name.split(",")[0];
  const map = {
    Maalot: "Маалот",
    "Tel Aviv": "Тель-Авив",
    "Beer Sheva": "Беэр-Шева",
    Eilat: "Эйлат",
    Kyiv: "Киев",
    Mariupol: "Мариуполь",
    Minsk: "Минск",
    Voronezh: "Воронеж",
    Orsk: "Орск",
    Orenburg: "Оренбург",
    Barnaul: "Барнаул",
    Samara: "Самара",
    Paris: "Париж",
    London: "Лондон",
    Bern: "Берн",
    Budapest: "Будапешт",
    Mayapur: "Маяпур",
    Nabadwip: "Навадвип",
    Kolkata: "Калькутта",
    Vrindavan: "Вриндаван",
    Puri: "Пури",
    Kathmandu: "Катманду",
    Moscow: "Москва",
  };
  return `${map[city] ?? city}, ${location.group}`;
}

function seedGlossary(lines) {
  const terms = [
    ["tithi", "panchanga", 10, "Tithi", "Lunar day measured by the angular distance between the Moon and the Sun.", "Титхи", "Лунный день, определяемый угловым расстоянием между Луной и Солнцем."],
    ["paksha", "panchanga", 20, "Paksha", "The bright or dark half of a lunar month.", "Пакша", "Светлая или тёмная половина лунного месяца."],
    ["masa", "panchanga", 30, "Masa", "A lunar month in the Vaishnava calendar.", "Маса", "Лунный месяц в вайшнавском календаре."],
    ["naksatra", "jyotish", 40, "Nakshatra", "One of the 27 lunar mansions used in Jyotish.", "Накшатра", "Одна из 27 лунных стоянок, используемых в Джйотиш."],
    ["amrita_yoga", "muhurta", 50, "Amrita-yoga", "A favorable muhurta window used for journeys and new beginnings.", "Амрита-йога", "Благоприятное мухурта-окно для поездок и новых начинаний."],
    ["mahendra_yoga", "muhurta", 60, "Mahendra-yoga", "A favorable muhurta window printed in the Panjika.", "Махендра-йога", "Благоприятное мухурта-окно, печатаемое в панжике."],
    ["vakra_yoga", "muhurta", 70, "Vakra-yoga", "An unfavorable or cautious time window in the yoga table.", "Вакра-йога", "Неблагоприятное или требующее осторожности окно в таблице йог."],
    ["shunya_yoga", "muhurta", 80, "Shunya-yoga", "A void or unfavorable time window in the yoga table.", "Шунья-йога", "Пустое или неблагоприятное окно в таблице йог."],
  ];
  for (const [id, category, sortOrder, enTitle, enDesc, ruTitle, ruDesc] of terms) {
    lines.push(`insert into glossary_terms (id, category, sort_order) values (${sql(id)}, ${sql(category)}, ${sql(sortOrder)});`);
    lines.push(`insert into glossary_i18n (term_id, lang, title, short_description) values (${sql(id)}, 'en', ${sql(enTitle)}, ${sql(enDesc)});`);
    lines.push(`insert into glossary_i18n (term_id, lang, title, short_description) values (${sql(id)}, 'ru', ${sql(ruTitle)}, ${sql(ruDesc)});`);
  }
}

function seedUi(lines, now) {
  const strings = {
    en: {
      app_title: "Sree Caitanya Sridhar Seva Ashram",
      settings: "Settings",
      language: "Language",
      location: "Location",
      compact_view: "Compact view",
      seed_ready: "Offline database is ready",
    },
    ru: {
      app_title: "Шри Чайтанья Шридхар Сева Ашрам",
      settings: "Настройки",
      language: "Язык",
      location: "Место",
      compact_view: "Компактный вид",
      seed_ready: "Офлайн-база готова",
    },
  };
  for (const [lang, entries] of Object.entries(strings)) {
    for (const [key, value] of Object.entries(entries)) {
      lines.push(`insert into ui_strings (lang, key, value, updated_at) values (${sql(lang)}, ${sql(key)}, ${sql(value)}, ${sql(now)});`);
    }
  }
}

mkdirSync(dirname(outputPath), { recursive: true });
mkdirSync(dirname(tempSqlPath), { recursive: true });
if (existsSync(outputPath)) rmSync(outputPath);
writeFileSync(tempSqlPath, statements(), "utf8");

const sqlite = spawnSync("sqlite3", [outputPath, `.read ${tempSqlPath}`], {
  cwd: repoRoot,
  encoding: "utf8",
});

if (sqlite.status !== 0) {
  process.stderr.write(sqlite.stderr);
  process.exit(sqlite.status ?? 1);
}

const count = spawnSync("sqlite3", [outputPath, "select 'events=' || count(*) from events; select 'locations=' || count(*) from locations; select 'ekadashi=' || count(*) from ekadashi;"], {
  cwd: repoRoot,
  encoding: "utf8",
});
process.stdout.write(count.stdout);
process.stdout.write(`seed=${outputPath}\n`);
rmSync(tempSqlPath, { force: true });
