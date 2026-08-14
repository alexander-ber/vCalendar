import fs from "node:fs/promises";
import { generateCalendarRange } from "../js/calendar-engine.js";
import { tithiInfo } from "../js/astronomy-adapter.js";
import { LOCATIONS } from "../js/locations-data.js";
import { EVENTS } from "../js/events-data.js";
import { RULES } from "../js/rules-data.js";
import { formatDateTime, formatTime, zonedDateToUtc } from "../js/date-utils.js";

const PANJIKA_FILE = new URL("../docs/panjika/Ponjika_Sri_Gourabda_540_RU_full.md", import.meta.url);
const REPORT_FILE = new URL("../reports/panjika-md-calendar-discrepancies-2026-2027.md", import.meta.url);
const MONTHS_RU = new Map([
  ["января", "01"],
  ["февраля", "02"],
  ["марта", "03"],
  ["апреля", "04"],
  ["мая", "05"],
  ["июня", "06"],
  ["июля", "07"],
  ["августа", "08"],
  ["сентября", "09"],
  ["октября", "10"],
  ["ноября", "11"],
  ["декабря", "12"]
]);
const TITHI_WORDS = [
  ["пратип", 1],
  ["двит", 2],
  ["трит", 3],
  ["чатуртх", 4],
  ["панч", 5],
  ["шашт", 6],
  ["шаш", 6],
  ["сапт", 7],
  ["ашт", 8],
  ["нав", 9],
  ["дашам", 10],
  ["экадаш", 11],
  ["двадаш", 12],
  ["трайодаш", 13],
  ["трайода", 13],
  ["чатурдаш", 14]
];

function isoFromHeader(value) {
  const match = value.match(/^(\d{1,2})\s+([а-яё]+)\s+(\d{4})/iu);
  if (!match) return null;
  const [, day, month, year] = match;
  const monthNumber = MONTHS_RU.get(month.toLowerCase());
  return monthNumber ? `${year}-${monthNumber}-${String(Number(day)).padStart(2, "0")}` : null;
}

function field(body, label) {
  return body.match(new RegExp(`\\*\\*${label}:\\*\\*\\s*([^\\n]+)`))?.[1]?.trim() || "";
}

function parseBlocks(text) {
  return [...text.matchAll(/^## ([^\n]+)\n\n([\s\S]*?)(?=^## |\z)/gm)]
    .map(([, header, body]) => ({
      header,
      date: isoFromHeader(header),
      sourcePage: body.match(/\*Источник: печатная страница\s+(\d+)/)?.[1] || "",
      tithiRaw: field(body, "Титхи"),
      sunRaw: field(body, "Восход / закат")
    }))
    .filter((row) => row.date);
}

function baseTithiNumber(raw) {
  const text = raw.toLowerCase();
  if (/пурн|полн/.test(text)) return 15;
  if (/амава/.test(text)) return 30;
  for (const [needle, number] of TITHI_WORDS) {
    if (text.includes(needle)) return number;
  }
  return null;
}

function parseTithi(raw, previousNumber = null) {
  if (!raw || /\[|не удалось|неразбор/i.test(raw)) return { number: null, quality: "unparsed" };
  const base = baseTithiNumber(raw);
  if (!base) return { number: null, quality: "unparsed" };
  const text = raw.toLowerCase();
  if (base === 15 || base === 30) return { number: base, quality: "explicit" };
  if (/кришна/.test(text)) return { number: base + 15, quality: "explicit" };
  if (/гаура/.test(text)) return { number: base, quality: "explicit" };
  if (previousNumber) {
    const candidates = [base, base + 15];
    const previousIndex = previousNumber - 1;
    const best = candidates
      .map((number) => ({ number, distance: (number - 1 - previousIndex + 30) % 30 }))
      .sort((left, right) => left.distance - right.distance)[0];
    if (best.distance <= 3) return { number: best.number, quality: "sequence_inferred" };
  }
  return { number: null, quality: "paksha_missing" };
}

function parseTithiEnd(row, timezone) {
  const match = row.tithiRaw.match(/до\s+(\d{1,2}):(\d{2})\s*\((дн[ёе]м|ночью)\)/iu);
  if (!match) return null;
  const [, hourRaw, minuteRaw, periodRaw] = match;
  let hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  const isNight = /^ноч/i.test(periodRaw);
  if (isNight && hour < 12) {
    hour += 24;
  } else if (!isNight && hour < 4) {
    hour += 12;
  }
  const dayOffset = Math.floor(hour / 24);
  const localHour = hour % 24;
  const [year, month, day] = row.date.split("-").map(Number);
  return zonedDateToUtc(year, month, day + dayOffset, localHour, minute, 0, timezone);
}

function tithiName(number) {
  const names = [
    "Gaura Pratipat",
    "Gaura Dvitiya",
    "Gaura Tritiya",
    "Gaura Chaturthi",
    "Gaura Panchami",
    "Gaura Shashthi",
    "Gaura Saptami",
    "Gaura Ashtami",
    "Gaura Navami",
    "Gaura Dashami",
    "Gaura Ekadashi",
    "Gaura Dvadashi",
    "Gaura Trayodashi",
    "Gaura Chaturdashi",
    "Purnima",
    "Krishna Pratipat",
    "Krishna Dvitiya",
    "Krishna Tritiya",
    "Krishna Chaturthi",
    "Krishna Panchami",
    "Krishna Shashthi",
    "Krishna Saptami",
    "Krishna Ashtami",
    "Krishna Navami",
    "Krishna Dashami",
    "Krishna Ekadashi",
    "Krishna Dvadashi",
    "Krishna Trayodashi",
    "Krishna Chaturdashi",
    "Amavasya"
  ];
  return names[number - 1] || `#${number}`;
}

function minutesDelta(left, right) {
  return Math.round((left.getTime() - right.getTime()) / 60000);
}

function findNearestTargetBoundary(sunrise, targetNumber) {
  const stepMs = 15 * 60 * 1000;
  const min = sunrise.getTime() - 36 * 60 * 60 * 1000;
  const max = sunrise.getTime() + 36 * 60 * 60 * 1000;
  let left = new Date(min);
  let leftNumber = tithiInfo(left).number;
  const boundaries = [];
  for (let cursor = min + stepMs; cursor <= max; cursor += stepMs) {
    const right = new Date(cursor);
    const rightNumber = tithiInfo(right).number;
    if (leftNumber !== rightNumber && (leftNumber === targetNumber || rightNumber === targetNumber)) {
      let lo = left;
      let hi = right;
      for (let i = 0; i < 44; i += 1) {
        const mid = new Date((lo.getTime() + hi.getTime()) / 2);
        if (tithiInfo(mid).number === rightNumber) hi = mid;
        else lo = mid;
      }
      boundaries.push({
        at: hi,
        direction: rightNumber === targetNumber ? "enters_panjika_tithi" : "leaves_panjika_tithi",
        deltaMinutes: Math.round((hi.getTime() - sunrise.getTime()) / 60000)
      });
    }
    left = right;
    leftNumber = rightNumber;
  }
  return boundaries.sort((leftItem, rightItem) => Math.abs(leftItem.deltaMinutes) - Math.abs(rightItem.deltaMinutes))[0] || null;
}

const text = await fs.readFile(PANJIKA_FILE, "utf8");
const panjikaRows = parseBlocks(text);
const location = LOCATIONS.find((item) => item.id === "nabadwip");
const calendar = generateCalendarRange("2026-03-04", "2027-03-23", location, RULES, EVENTS);
const days = new Map(calendar.days.map((day) => [day.date, day]));
const comparisons = [];
let previousPanjikaTithi = null;

for (const row of panjikaRows) {
  const parsed = parseTithi(row.tithiRaw, previousPanjikaTithi);
  if (parsed.number) previousPanjikaTithi = parsed.number;
  const day = days.get(row.date);
  if (!day) continue;
  const engineNumber = day.lunar.tithi_at_sunrise.number;
  const panjikaEnd = parseTithiEnd(row, location.timezone);
  const engineEnd = day.lunar.next_tithi_boundary;
  comparisons.push({
    date: row.date,
    page: row.sourcePage,
    parseQuality: parsed.quality,
    panjikaRaw: row.tithiRaw,
    panjikaNumber: parsed.number,
    panjikaTithi: parsed.number ? tithiName(parsed.number) : null,
    engineNumber,
    engineTithi: tithiName(engineNumber),
    engineAngleAtSunrise: Number(day.lunar.tithi_angle_at_sunrise.toFixed(3)),
    tithiDelta: parsed.number ? ((engineNumber - parsed.number + 30) % 30) : null,
    nearestTargetBoundary: parsed.number && parsed.number !== engineNumber ? findNearestTargetBoundary(day.astronomy.sunrise, parsed.number) : null,
    panjikaEnd: panjikaEnd ? formatDateTime(panjikaEnd, location.timezone) : null,
    engineEnd: engineEnd ? formatDateTime(engineEnd, location.timezone) : null,
    endDeltaMinutes: panjikaEnd && engineEnd ? minutesDelta(engineEnd, panjikaEnd) : null
  });
}

const parsedRows = comparisons.filter((row) => row.panjikaNumber);
const unparsedRows = comparisons.filter((row) => !row.panjikaNumber);
const tithiMismatches = parsedRows.filter((row) => row.panjikaNumber !== row.engineNumber);
const endComparable = parsedRows.filter((row) => Number.isFinite(row.endDeltaMinutes));
const endMismatches = endComparable.filter((row) => row.endDeltaMinutes !== 0);
const exactMatches = parsedRows.filter((row) => row.panjikaNumber === row.engineNumber);

const payload = {
  source: PANJIKA_FILE.pathname,
  location: location.id,
  timezone: location.timezone,
  period: { start: "2026-03-04", end: "2027-03-23", rows: comparisons.length },
  summary: {
    parsed_tithi_rows: parsedRows.length,
    unparsed_tithi_rows: unparsedRows.length,
    exact_tithi_name_matches: exactMatches.length,
    tithi_name_mismatches: tithiMismatches.length,
    tithi_end_comparable_rows: endComparable.length,
    tithi_end_time_mismatches_nonzero_minutes: endMismatches.length
  },
  tithiMismatches,
  endMismatches,
  unparsedRows
};

function localDateTime(value, timezone) {
  if (!value) return "";
  return formatDateTime(new Date(value), timezone);
}

function renderMarkdownReport(data) {
  const explicit = data.tithiMismatches.filter((row) => row.parseQuality === "explicit").length;
  const inferred = data.tithiMismatches.filter((row) => row.parseQuality === "sequence_inferred").length;
  const lines = [
    "# Panjika vs vCalendar Tithi Discrepancies, Gaurabda 540",
    "",
    "Source: `docs/panjika/Ponjika_Sri_Gourabda_540_RU_full.md`",
    `Location: \`${data.location}\`, timezone \`${data.timezone}\``,
    `Period: \`${data.period.start}\` - \`${data.period.end}\``,
    "",
    "## Summary",
    "",
    `- parsed tithi rows: ${data.summary.parsed_tithi_rows}`,
    `- unparsed / OCR-unsafe rows: ${data.summary.unparsed_tithi_rows}`,
    `- exact tithi-at-sunrise matches: ${data.summary.exact_tithi_name_matches}`,
    `- tithi-at-sunrise mismatches: ${data.summary.tithi_name_mismatches}`,
    `- explicit mismatches: ${explicit}`,
    `- sequence-inferred mismatches: ${inferred}`,
    "",
    "`Boundary delta` is relative to local sunrise. Positive means our engine enters the Panjika tithi after sunrise; negative means our engine had already left the Panjika tithi before sunrise.",
    "",
    "## Tithi At Sunrise Mismatches",
    "",
    "| Date | Page | Panjika | vCalendar | Angle | Boundary delta | Boundary time | Quality |",
    "|---|---:|---|---|---:|---:|---|---|"
  ];
  for (const row of data.tithiMismatches) {
    const boundary = row.nearestTargetBoundary;
    lines.push(
      `| ${row.date} | ${row.page} | ${row.panjikaTithi} | ${row.engineTithi} | ${row.engineAngleAtSunrise}° | ${boundary ? `${boundary.deltaMinutes} min` : ""} | ${boundary ? localDateTime(boundary.at, data.timezone) : ""} | ${row.parseQuality} |`
    );
  }
  lines.push("", "## Unparsed / OCR-Unsafe Rows", "", "| Date | Page | Raw tithi line |", "|---|---:|---|");
  for (const row of data.unparsedRows) {
    lines.push(`| ${row.date} | ${row.page} | ${String(row.panjikaRaw).replaceAll("|", "\\|")} |`);
  }
  return lines.join("\n") + "\n";
}

if (process.argv.includes("--write-report")) {
  await fs.writeFile(REPORT_FILE, renderMarkdownReport(payload));
  console.log(`Wrote ${REPORT_FILE.pathname}`);
}

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(payload, null, 2));
} else if (!process.argv.includes("--write-report")) {
  console.log(JSON.stringify(payload.summary, null, 2));
  console.log("\nTithi name mismatches:");
  console.table(
    tithiMismatches.map((row) => ({
      date: row.date,
      page: row.page,
      panjika: row.panjikaTithi,
      ours: row.engineTithi,
      delta_tithi: row.tithiDelta,
      angle: row.engineAngleAtSunrise,
      boundary: row.nearestTargetBoundary ? formatDateTime(row.nearestTargetBoundary.at, location.timezone) : "",
      boundary_delta_min: row.nearestTargetBoundary?.deltaMinutes ?? "",
      boundary_direction: row.nearestTargetBoundary?.direction ?? "",
      quality: row.parseQuality,
      raw: row.panjikaRaw
    }))
  );
  console.log("\nTithi end time differences:");
  console.table(
    endMismatches.map((row) => ({
      date: row.date,
      page: row.page,
      tithi: row.panjikaTithi,
      panjika_end: row.panjikaEnd,
      ours_end: row.engineEnd,
      delta_min: row.endDeltaMinutes,
      quality: row.parseQuality
    }))
  );
}
