#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const repoRoot = path.join(path.dirname(new URL(import.meta.url).pathname), "..");
const outRoot = path.join(repoRoot, "i18n");
const langs = ["ru", "en"];

function readJson(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), "utf8").then(JSON.parse);
}

async function readLocations() {
  const source = await fs.readFile(path.join(repoRoot, "js/locations-data.js"), "utf8");
  const match = source.match(/export\s+const\s+LOCATIONS\s*=\s*(\[[\s\S]*?\]);/);
  if (!match) throw new Error("Unable to parse LOCATIONS from js/locations-data.js");
  return Function(`"use strict"; return (${match[1]});`)();
}

function compactObject(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined && entry !== null)
  );
}

function normalizeEkadashi(item, lang) {
  const translation = item.i18n?.[lang] ?? item.i18n?.en ?? item.i18n?.ru ?? {};
  return compactObject({
    id: item.id,
    lang,
    name: translation.name ?? item.name,
    benefits: translation.benefits ?? item.benefits,
    story: translation.story ?? item.story ?? item.description,
    full_description: translation.full_description,
  });
}

function countryNameEn(group) {
  const map = {
    Израиль: "Israel",
    Украина: "Ukraine",
    Беларусь: "Belarus",
    Россия: "Russia",
    Европа: "Europe",
    США: "United States",
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
    "New York": "Нью-Йорк",
    "Washington": "Вашингтон",
    Seattle: "Сиэтл",
    "San Diego": "Сан-Диего",
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

function normalizeLocation(location, lang) {
  return {
    id: location.id,
    lang,
    name: lang === "ru" ? locationNameRu(location) : location.name,
    country_name: lang === "ru" ? location.group : countryNameEn(location.group),
    region_name: location.group,
  };
}

function glossary(lang) {
  const terms = [
    {
      id: "tithi",
      en: ["Tithi", "Lunar day measured by the angular distance between the Moon and the Sun."],
      ru: ["Титхи", "Лунный день, определяемый угловым расстоянием между Луной и Солнцем."],
    },
    {
      id: "paksha",
      en: ["Paksha", "The bright or dark half of a lunar month."],
      ru: ["Пакша", "Светлая или темная половина лунного месяца."],
    },
    {
      id: "masa",
      en: ["Masa", "A lunar month in the Vaishnava calendar."],
      ru: ["Маса", "Лунный месяц в вайшнавском календаре."],
    },
    {
      id: "naksatra",
      en: ["Nakshatra", "One of the 27 lunar mansions used in Jyotish."],
      ru: ["Накшатра", "Одна из 27 лунных стоянок, используемых в Джйотиш."],
    },
    {
      id: "amrita_yoga",
      en: ["Amrita-yoga", "A favorable muhurta window used for journeys and new beginnings."],
      ru: ["Амрита-йога", "Благоприятное мухурта-окно для поездок и новых начинаний."],
    },
    {
      id: "mahendra_yoga",
      en: ["Mahendra-yoga", "A favorable muhurta window printed in the Panjika."],
      ru: ["Махендра-йога", "Благоприятное мухурта-окно, печатаемое в панжике."],
    },
    {
      id: "vakra_yoga",
      en: ["Vakra-yoga", "An unfavorable or cautious time window in the yoga table."],
      ru: ["Вакра-йога", "Неблагоприятное или требующее осторожности окно в таблице йог."],
    },
    {
      id: "shunya_yoga",
      en: ["Shunya-yoga", "A void or unfavorable time window in the yoga table."],
      ru: ["Шунья-йога", "Пустое или неблагоприятное окно в таблице йог."],
    },
  ];
  return terms.map((term) => {
    const [title, short_description] = term[lang];
    return { id: term.id, lang, title, short_description };
  });
}

function uiStrings(lang) {
  return lang === "ru"
    ? {
        app_title: "Шри Чайтанья Шридхар Сева Ашрам",
        settings: "Настройки",
        language: "Язык",
        location: "Место",
        compact_view: "Компактный вид",
        seed_ready: "Офлайн-база готова",
      }
    : {
        app_title: "Sree Caitanya Sridhar Seva Ashram",
        settings: "Settings",
        language: "Language",
        location: "Location",
        compact_view: "Compact view",
        seed_ready: "Offline database is ready",
      };
}

async function writeJson(relativePath, value) {
  const fullPath = path.join(repoRoot, relativePath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, `${JSON.stringify(value, null, 2)}\n`);
}

async function main() {
  const now = new Date().toISOString();
  const ekadashi = await readJson("data/ekadashi.json");
  const locations = await readLocations();

  for (const lang of langs) {
    await writeJson(`i18n/${lang}/ekadashi.json`, {
      schema_version: 1,
      updated_at: now,
      ekadashi: ekadashi.map((item) => normalizeEkadashi(item, lang)),
    });
    await writeJson(`i18n/${lang}/locations.json`, {
      schema_version: 1,
      updated_at: now,
      locations: locations.map((location) => normalizeLocation(location, lang)),
    });
    await writeJson(`i18n/${lang}/glossary.json`, {
      schema_version: 1,
      updated_at: now,
      terms: glossary(lang),
    });
    await writeJson(`i18n/${lang}/ui.json`, {
      schema_version: 1,
      updated_at: now,
      strings: uiStrings(lang),
    });
  }

  await writeJson("i18n/manifest.json", {
    schema_version: 1,
    updated_at: now,
    // Events are not a per-language pack: data/events.json is the single
    // source of truth (already built by scripts/build-events-db.mjs and
    // consumed as-is, raw_json included, by scripts/build-mobile-db.mjs).
    // The client hashes this file directly instead of syncing a separately
    // normalized (and inevitably drifting) i18n/{lang}/events.json copy.
    events_source: {
      path: "data/events.json",
    },
    languages: langs.map((lang) => ({
      lang,
      version: 2,
      required_app_schema: 1,
      files: {
        ui: `i18n/${lang}/ui.json`,
        ekadashi: `i18n/${lang}/ekadashi.json`,
        glossary: `i18n/${lang}/glossary.json`,
        locations: `i18n/${lang}/locations.json`,
      },
    })),
  });

  console.log(`Wrote i18n packs for ${langs.join(", ")}.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
