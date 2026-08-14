import fs from "node:fs/promises";

const SOURCE_FILE = new URL("../docs/panjika/Ponjika_Sri_Gourabda_540_RU_full.md", import.meta.url);
const OUT_FILE = new URL("../js/amrita-mahendra-data.js", import.meta.url);

const MAX_BOUNDARY_ERROR_SECONDS = 900;
const MIN_RANGE_WITNESSES = 2;

const WEEKDAYS = {
  "воскресенье": 0,
  "понедельник": 1,
  "вторник": 2,
  "среда": 3,
  "четверг": 4,
  "пятница": 5,
  "суббота": 6
};

const SOLAR_MONTHS = {
  "Чайтра": "Chaitra",
  "Вайшакха": "Vaishakha",
  "Джйештха": "Jyeshtha",
  "Ашадха": "Ashadha",
  "Шравана": "Shravana",
  "Бхадра": "Bhadra",
  "Ашвина": "Ashvina",
  "Картика": "Kartika",
  "Аграхаяна": "Agrahayana",
  "Пауша": "Pausha",
  "Магха": "Magha",
  "Пхалгуна": "Phalguna"
};

const DAY_PERIOD_RE = /(?:дн[ёе]м|время):\s*([^н]*(?:(?!ночью:).)*)/iu;
const NIGHT_PERIOD_RE = /ночью:\s*(.*)$/iu;
const RANGE_RE = /(\d{1,2}):(\d{2})\s*[–-]\s*(\d{1,2}):(\d{2})/gu;

function field(body, label) {
  return body.match(new RegExp(`\\*\\*${label}:\\*\\*\\s*([^\\n]+)`))?.[1]?.trim() || "";
}

function isAmbiguous(value) {
  return /неразборчиво|не распознано|не удалось|OCR|≈|€|\[/.test(value);
}

function solarMonth(body) {
  const line = field(body, "Календарная дата");
  const middlePart = line.split(";").map((item) => item.trim())[1] || "";
  return middlePart.match(/\d+\S*\s+([А-ЯЁа-яё-]+)/)?.[1]?.replace(/[.,].*$/, "") || "UNKNOWN";
}

function parseSun(body) {
  const value = field(body, "Восход / закат");
  if (!value || isAmbiguous(value)) return null;
  const match = value.match(/(\d{1,2}):(\d{2})\s*\/\s*(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const sunrise = Number(match[1]) * 60 + Number(match[2]);
  let sunset = Number(match[3]) * 60 + Number(match[4]);
  if (sunset < sunrise) sunset += 12 * 60;
  if (sunset < sunrise) sunset += 12 * 60;
  return { sunrise, sunset };
}

function parseBlocks(text) {
  return [...text.matchAll(/^## (\d+ [^\n]+?202[67] года), ([^\n]+)\n\n([\s\S]*?)(?=^## |\z)/gm)].map(
    ([, date, weekday, body]) => ({
      date,
      weekday: weekday.trim().toLowerCase(),
      body,
      solarMonth: solarMonth(body),
      sunriseSunset: parseSun(body),
      amrita: field(body, "Амрита-йога"),
      mahendra: field(body, "Махендра-йога")
    })
  );
}

function periodSource(value, period) {
  if (!value || isAmbiguous(value)) return "";
  return period === "day"
    ? value.match(DAY_PERIOD_RE)?.[1]?.split(/ночью:/iu)[0] || (!value.includes("ночью:") ? value : "")
    : value.match(NIGHT_PERIOD_RE)?.[1] || "";
}

function extractRanges(value, period) {
  const source = periodSource(value, period);
  if (!source) return [];
  return [...source.matchAll(RANGE_RE)].map((match) => ({
    start: `${match[1]}:${match[2]}`,
    end: `${match[3]}:${match[4]}`
  }));
}

function timeCandidates(value) {
  const [hour, minute] = value.split(":").map(Number);
  return [hour * 60 + minute, (hour + 12) * 60 + minute, (hour + 24) * 60 + minute];
}

function chooseTime(value, period, sunrise, sunset, nextSunrise) {
  const min = period === "day" ? sunrise - 20 : sunset - 20;
  const max = period === "day" ? sunset + 20 : nextSunrise + 20;
  const candidates = timeCandidates(value).filter((item) => item >= min && item <= max);
  if (!candidates.length) return null;
  const anchor = period === "day" ? sunrise : sunset;
  return candidates.sort((left, right) => Math.abs(left - anchor) - Math.abs(right - anchor))[0];
}

function nearestBoundaryIndex(value, start, end) {
  const part = (end - start) / 15;
  const index = Math.round((value - start) / part);
  const expected = start + index * part;
  return {
    index,
    errorSeconds: Math.round((value - expected) * 60)
  };
}

function matchRange(range, period, currentSun, nextSun) {
  const start = period === "day" ? currentSun.sunrise : currentSun.sunset;
  const end = period === "day" ? currentSun.sunset : nextSun.sunrise + 24 * 60;
  const startMinute = chooseTime(range.start, period, currentSun.sunrise, currentSun.sunset, nextSun.sunrise + 24 * 60);
  const endMinute = chooseTime(range.end, period, currentSun.sunrise, currentSun.sunset, nextSun.sunrise + 24 * 60);
  if (startMinute === null || endMinute === null || endMinute <= startMinute) return null;
  const from = nearestBoundaryIndex(startMinute, start, end);
  const to = nearestBoundaryIndex(endMinute, start, end);
  if (from.index < 0 || to.index > 15 || from.index >= to.index) return null;
  return {
    from: from.index,
    to: to.index,
    maxAbsErrorSeconds: Math.max(Math.abs(from.errorSeconds), Math.abs(to.errorSeconds))
  };
}

function rangeKey(row) {
  return `${row.month}|${row.weekday}|${row.kind}|${row.period}|${row.from}|${row.to}`;
}

function buildCandidateRows(days) {
  const rows = [];
  for (let index = 0; index < days.length - 1; index += 1) {
    const day = days[index];
    const next = days[index + 1];
    const month = SOLAR_MONTHS[day.solarMonth];
    const weekday = WEEKDAYS[day.weekday];
    if (!month || weekday === undefined || !day.sunriseSunset || !next.sunriseSunset) continue;
    for (const [kind, value] of [
      ["amrita", day.amrita],
      ["mahendra", day.mahendra]
    ]) {
      for (const period of ["day", "night"]) {
        for (const range of extractRanges(value, period)) {
          const match = matchRange(range, period, day.sunriseSunset, next.sunriseSunset);
          if (!match || match.maxAbsErrorSeconds > MAX_BOUNDARY_ERROR_SECONDS) continue;
          rows.push({
            month,
            weekday,
            kind,
            period,
            from: match.from,
            to: match.to,
            date: day.date,
            printed: `${range.start}-${range.end}`,
            maxAbsErrorSeconds: match.maxAbsErrorSeconds
          });
        }
      }
    }
  }
  return rows;
}

function pushRange(target, key, row, count) {
  const [month, weekday, kind, period] = key.split("|");
  const weekdayIndex = Number(weekday);
  const property = `${kind}${period[0].toUpperCase()}${period.slice(1)}`;
  target[month] ||= {};
  target[month][weekdayIndex] ||= {
    amritaDay: [],
    amritaNight: [],
    mahendraDay: [],
    mahendraNight: [],
    sourceCounts: {}
  };
  target[month][weekdayIndex][property].push({ from: row.from, to: row.to });
  target[month][weekdayIndex].sourceCounts[property] ||= [];
  target[month][weekdayIndex].sourceCounts[property].push({
    from: row.from,
    to: row.to,
    witnesses: count,
    examples: row.examples.slice(0, 3)
  });
}

function buildMatrix(rows) {
  const rangeGroups = new Map();
  for (const row of rows) {
    const key = rangeKey(row);
    const group = rangeGroups.get(key) || { ...row, count: 0, examples: [], maxAbsErrorSeconds: 0 };
    group.count += 1;
    group.maxAbsErrorSeconds = Math.max(group.maxAbsErrorSeconds, row.maxAbsErrorSeconds);
    if (group.examples.length < 5) group.examples.push(`${row.date}: ${row.printed}`);
    rangeGroups.set(key, group);
  }

  const matrix = {};
  for (const [key, row] of rangeGroups) {
    if (row.count < MIN_RANGE_WITNESSES) continue;
    pushRange(matrix, key, row, row.count);
  }

  for (const month of Object.keys(matrix)) {
    for (const weekday of Object.keys(matrix[month])) {
      for (const property of ["amritaDay", "amritaNight", "mahendraDay", "mahendraNight"]) {
        matrix[month][weekday][property].sort((left, right) => left.from - right.from || left.to - right.to);
      }
    }
  }
  return { matrix, rangeGroups };
}

function renderData(matrix, stats) {
  return `// Generated by scripts/build-amrita-mahendra-runtime-data.mjs from docs/panjika/Ponjika_Sri_Gourabda_540_RU_full.md.
// The Panjika rows are used to recover month x weekday 1/15-part indexes.
// Runtime times are recalculated for every selected location from local sunrise, sunset and next sunrise.
const RANGE = (from, to) => ({ from, to });

const MONTH_WEEKDAY_TEMPLATES = ${JSON.stringify(matrix, null, 2).replace(/\{\s+"from":\s+(\d+),\s+"to":\s+(\d+)\s+\}/g, "RANGE($1, $2)")};

export const AMRITA_MAHENDRA_SOURCE = {
  stats: ${JSON.stringify(stats, null, 2)},
  i18n: {
    en: {
      title: "Amrita / Mahendra-yoga",
      summary:
        "Calculated from the Panjika month-weekday table. For the selected city, the local day and night are divided into 15 equal parts, then the restored traditional parts are shown.",
      status:
        "Runtime uses only verified interval rows from the Sri Navadvipa Panjika MD source; standalone or OCR-uncertain times are not converted into hidden overrides."
    },
    ru: {
      title: "Амрита / Махендра-йога",
      summary:
        "Считается по таблице панжики месяц-день недели. Для выбранного города местный день и ночь делятся на 15 равных частей, затем показываются восстановленные традиционные отрезки.",
      status:
        "В расчёт включены только проверяемые интервалы из MD Шри Навадвипа Панжики; одиночные и OCR-сомнительные времена не превращаются в скрытые переопределения."
    }
  }
};

export function amritaMahendraTemplateForDay(day) {
  const weekday = new Date(\`\${day.date}T12:00:00Z\`).getUTCDay();
  const bengaliSolarMonth = day.masa?.bengali_solar_month?.name || day.lunar?.bengali_solar_month?.name || null;
  const template = bengaliSolarMonth ? MONTH_WEEKDAY_TEMPLATES[bengaliSolarMonth]?.[weekday] : null;
  if (!template) return emptyTemplate(bengaliSolarMonth, weekday);
  return {
    status: "panjika_month_weekday_matrix",
    basis: {
      weekday,
      bengaliSolarMonth,
      source: "Sri Navadvipa Panjika GA540 RU/EN MD",
      model: "local day/night divided into 15 parts"
    },
    amritaDay: template.amritaDay,
    amritaNight: template.amritaNight,
    mahendraDay: template.mahendraDay,
    mahendraNight: template.mahendraNight
  };
}

function emptyTemplate(bengaliSolarMonth, weekday) {
  return {
    status: "panjika_matrix_gap",
    basis: {
      weekday,
      bengaliSolarMonth,
      source: "Sri Navadvipa Panjika GA540 RU/EN MD"
    },
    amritaDay: [],
    amritaNight: [],
    mahendraDay: [],
    mahendraNight: []
  };
}
`;
}

const text = await fs.readFile(SOURCE_FILE, "utf8");
const days = parseBlocks(text);
const rows = buildCandidateRows(days);
const { matrix, rangeGroups } = buildMatrix(rows);
const selectedRanges = [...rangeGroups.values()].filter((row) => row.count >= MIN_RANGE_WITNESSES);
const stats = {
  parsedDays: days.length,
  candidateIntervals: rows.length,
  selectedRanges: selectedRanges.length,
  maxBoundaryErrorSeconds: MAX_BOUNDARY_ERROR_SECONDS,
  minRangeWitnesses: MIN_RANGE_WITNESSES,
  generatedAt: new Date().toISOString()
};

await fs.writeFile(OUT_FILE, renderData(matrix, stats));

console.log(`Parsed ${days.length} Panjika rows.`);
console.log(`Candidate interval rows: ${rows.length}.`);
console.log(`Selected month-weekday ranges: ${selectedRanges.length}.`);
console.log(`Wrote ${OUT_FILE.pathname}.`);
