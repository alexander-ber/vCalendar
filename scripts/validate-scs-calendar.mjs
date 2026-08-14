import fs from "node:fs/promises";
import { Body, Ecliptic, EclipticGeoMoon, Equator, GeoVector, Observer, SunPosition } from "../vendor/astronomy-engine.js";
import { generateCalendarRange } from "../js/calendar-engine.js";
import {
  dayAstronomy,
  ephemerisTithiAngle,
  normalizeDegrees,
  suryaSiddhantaMeanTithiAngle,
  suryaSiddhantaTrueTithiAngleCandidate,
  tithiAngle,
  TITHI_NAMES
} from "../js/astronomy-adapter.js";
import { EVENTS } from "../js/events-data.js";
import { LOCATIONS } from "../js/locations-data.js";
import { RULES } from "../js/rules-data.js";
import { formatDateTime } from "../js/date-utils.js";

const MONTHS = {
  January: 1,
  February: 2,
  March: 3,
  April: 4,
  May: 5,
  June: 6,
  July: 7,
  August: 8,
  September: 9,
  October: 10,
  November: 11,
  December: 12
};

const MONTHS_LOWER = Object.fromEntries(Object.entries(MONTHS).map(([key, value]) => [key.toLowerCase(), value]));

const TITHI_SHORT_NUMBERS = {
  Pratipad: 1,
  Dvitiya: 2,
  Tririya: 3,
  Tritiya: 3,
  Chaturthi: 4,
  Panchami: 5,
  Shashthi: 6,
  Saptami: 7,
  Ashtami: 8,
  Navami: 9,
  Dashami: 10,
  Ekadashi: 11,
  Dvadashi: 12,
  Trayodashi: 13,
  Chaturdashi: 14,
  Purnima: 15,
  Amavasya: 30
};

const TITHI_ALIASES = {
  pratipad: "Pratipad",
  pratipada: "Pratipad",
  dvitiya: "Dvitiya",
  tririya: "Tritiya",
  tritiya: "Tritiya",
  tritya: "Tritiya",
  chaturthi: "Chaturthi",
  panchami: "Panchami",
  shashthi: "Shashthi",
  sasthi: "Shashthi",
  saptami: "Saptami",
  ashtami: "Ashtami",
  astami: "Ashtami",
  navami: "Navami",
  dashami: "Dashami",
  dasami: "Dashami",
  ekadashi: "Ekadashi",
  ekadasi: "Ekadashi",
  dvadashi: "Dvadashi",
  dvadasi: "Dvadashi",
  trayodashi: "Trayodashi",
  trayodasi: "Trayodashi",
  chaturdashi: "Chaturdashi",
  chaturdasi: "Chaturdashi",
  purnima: "Purnima",
  paurnamasi: "Purnima",
  amavasya: "Amavasya"
};

function argValue(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1] || fallback;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function listArg(name) {
  const value = argValue(name);
  return value ? value.split(",").map((item) => item.trim()).filter(Boolean) : [];
}

function stripTags(value) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+([.,;:])/g, "$1")
    .trim();
}

function isoDate(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function scsTithiNumber(paksha, tithi) {
  if (tithi === "Purnima") return 15;
  if (tithi === "Amavasya") return 30;
  const base = TITHI_SHORT_NUMBERS[tithi];
  if (!base) return null;
  return paksha === "Krishna" ? base + 15 : base;
}

function normalizeTime(hour, minute) {
  return `${String(Number(hour)).padStart(2, "0")}:${String(Number(minute)).padStart(2, "0")}`;
}

function timeToMinutes(value) {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) return null;
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function minuteDelta(left, right) {
  const leftMinutes = timeToMinutes(left);
  const rightMinutes = timeToMinutes(right);
  if (leftMinutes === null || rightMinutes === null) return null;
  return rightMinutes - leftMinutes;
}

function parseScsParana(text) {
  const between = text.match(/paran[\s\S]{0,140}?\bbetween\s+(\d{1,2}):(\d{2})\s+(?:and|to|—|-)\s+(\d{1,2}):(\d{2})/i);
  if (between) {
    return {
      type: "between",
      start: normalizeTime(between[1], between[2]),
      end: normalizeTime(between[3], between[4]),
      text: between[0].replace(/\s+/g, " ").trim()
    };
  }

  const by = text.match(/paran[\s\S]{0,100}?\bby\s+(\d{1,2}):(\d{2})/i);
  if (by) {
    return {
      type: "by",
      start: null,
      end: normalizeTime(by[1], by[2]),
      text: by[0].replace(/\s+/g, " ").trim()
    };
  }

  return null;
}

function tithiFromAngle(angle, offset = 0) {
  const shifted = normalizeDegrees(angle + offset);
  const number = Math.floor(shifted / 12) + 1;
  return { number, name: TITHI_NAMES[number - 1], angle: shifted };
}

function tithiAt(engine, date, offset = 0) {
  return tithiFromAngle(engine.angle(date), offset);
}

function signedTithiDelta(expected, actual) {
  const forward = (expected - actual + 30) % 30;
  return forward <= 15 ? forward : forward - 30;
}

function boundaryDistance(angle) {
  const rem = normalizeDegrees(angle) % 12;
  return Math.min(rem, 12 - rem);
}

function parseScsCalendar(html, filterYear) {
  let year = null;
  let month = null;
  const rows = [];
  const tokens =
    html.match(/<!-- scs calendar file break -->|<h2[^>]*>[\s\S]*?<\/h2>|<p[^>]*>[\s\S]*?<\/p>/gi) || [];

  for (const token of tokens) {
    if (token.includes("scs calendar file break")) {
      year = null;
      month = null;
      continue;
    }

    const heading = stripTags(token).match(/^([A-Za-z]+)\s+(20\d{2})$/i);
    if (heading) {
      month = MONTHS_LOWER[heading[1].toLowerCase()];
      year = Number(heading[2]);
      continue;
    }

    if (!year || !month || (filterYear && year !== filterYear)) continue;
    const text = stripTags(token);
    const segments = text.matchAll(/(?:^|\s)(\d{1,2})\.\s*\([^)]+\)\s+([\s\S]*?)(?=\s+\d{1,2}\.\s*\([^)]+\)\s+|$)/g);
    for (const segment of segments) {
      const day = Number(segment[1]);
      const body = segment[2];
      const match = body.match(
        /\b(?:(Gaura|Krishna)[-\s]+(Pratipad(?:a)?|Dvitiya|Tririya|Tritiya|Tritya|Chaturthi|Panchami|Shashthi|Sasthi|Saptami|Ashtami|Astami|Navami|Dashami|Dasami|Ekadashi|Ekadasi|Dvadashi|Dvadasi|Trayodashi|Trayodasi|Chaturdashi|Chaturdasi)|((?:Gaura[-\s]+)?Purnima|Paurnamasi|Amavasya))\b/i
      );
      if (!match) continue;

      const paksha = match[1] || (/amavasya/i.test(match[3] || "") ? "Krishna" : "Gaura");
      const tithiName = TITHI_ALIASES[(match[2] || match[3] || "").replace(/^Gaura[-\s]+/i, "").toLowerCase()];
      const tithiNumber = scsTithiNumber(paksha, tithiName);
      if (!tithiNumber) continue;

      rows.push({
        date: isoDate(year, month, day),
        scsName: `${match[1] ? `${paksha} ` : ""}${tithiName}`,
        scsNumber: tithiNumber,
        scsParana: parseScsParana(body),
        text
      });
    }
  }

  return rows;
}

async function loadHtml() {
  const files = listArg("--files");
  if (files.length) {
    const chunks = await Promise.all(files.map((file) => fs.readFile(file, "utf8")));
    return chunks.join("\n<!-- scs calendar file break -->\n");
  }

  const file = argValue("--file");
  if (file) return fs.readFile(file, "utf8");

  const url = argValue("--url", "https://scsmath.com/events/calendar/index.html");
  const response = await fetch(url, { headers: { "user-agent": "Mozilla/5.0" } });
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);
  return response.text();
}

function dedupeRowsByDate(rows) {
  const seen = new Set();
  const deduped = [];
  for (const row of rows) {
    if (seen.has(row.date)) continue;
    seen.add(row.date);
    deduped.push(row);
  }
  return deduped;
}

function enginesForLocation(location) {
  const observer = new Observer(location.lat, location.lon, Number(location.elevation_m || 0));
  return [
    {
      id: "current",
      label: "Current local formula",
      angle: tithiAngle
    },
    {
      id: "ae_geocentric",
      label: "Astronomy Engine apparent geocentric",
      angle: ephemerisTithiAngle
    },
    {
      id: "surya_siddhanta_mean",
      label: "Surya Siddhanta mean baseline",
      angle: suryaSiddhantaMeanTithiAngle
    },
    {
      id: "surya_siddhanta_true_candidate",
      label: "Surya Siddhanta true candidate (mean + manda correction)",
      angle: (date) => suryaSiddhantaTrueTithiAngleCandidate(date, -1)
    },
    {
      id: "surya_siddhanta_true_candidate_alt",
      label: "Surya Siddhanta true candidate, alternate manda sign",
      angle: (date) => suryaSiddhantaTrueTithiAngleCandidate(date, 1)
    },
    {
      id: "ae_topocentric",
      label: "Astronomy Engine topocentric",
      angle: (date) => {
        const moon = Ecliptic(Equator(Body.Moon, date, observer, true, false).vec);
        const sun = Ecliptic(Equator(Body.Sun, date, observer, true, false).vec);
        return normalizeDegrees(moon.elon - sun.elon);
      }
    },
    {
      id: "ae_geovector",
      label: "Astronomy Engine GeoVector no aberration",
      angle: (date) => {
        const moon = Ecliptic(GeoVector(Body.Moon, date, false));
        const sun = Ecliptic(GeoVector(Body.Sun, date, false));
        return normalizeDegrees(moon.elon - sun.elon);
      }
    },
    {
      id: "ae_ecliptic_geo",
      label: "Astronomy Engine EclipticGeoMoon - SunPosition",
      angle: (date) => normalizeDegrees(EclipticGeoMoon(date).lon - SunPosition(date).elon)
    }
  ];
}

function boundaryAfter(start, engine, offset = 0, maxHours = 48) {
  if (!start) return null;
  let left = new Date(start);
  let right = new Date(left.getTime() + 30 * 60 * 1000);
  const max = start.getTime() + maxHours * 60 * 60 * 1000;
  const startNumber = tithiAt(engine, left, offset).number;

  while (right.getTime() <= max) {
    if (tithiAt(engine, right, offset).number !== startNumber) {
      for (let i = 0; i < 42; i += 1) {
        const mid = new Date((left.getTime() + right.getTime()) / 2);
        if (tithiAt(engine, mid, offset).number === startNumber) left = mid;
        else right = mid;
      }
      return right;
    }
    left = right;
    right = new Date(right.getTime() + 30 * 60 * 1000);
  }
  return null;
}

function boundaryBefore(start, engine, offset = 0, maxHours = 48) {
  if (!start) return null;
  let right = new Date(start);
  let left = new Date(right.getTime() - 30 * 60 * 1000);
  const min = start.getTime() - maxHours * 60 * 60 * 1000;
  const startNumber = tithiAt(engine, right, offset).number;

  while (left.getTime() >= min) {
    if (tithiAt(engine, left, offset).number !== startNumber) {
      for (let i = 0; i < 42; i += 1) {
        const mid = new Date((left.getTime() + right.getTime()) / 2);
        if (tithiAt(engine, mid, offset).number === startNumber) right = mid;
        else left = mid;
      }
      return right;
    }
    right = left;
    left = new Date(left.getTime() - 30 * 60 * 1000);
  }
  return null;
}

function boundaryDiagnostics(day, engine, offset = 0) {
  const sunrise = day.astronomy.sunrise;
  const previous = boundaryBefore(sunrise, engine, offset);
  const next = boundaryAfter(sunrise, engine, offset);
  const previousFrom = previous ? tithiAt(engine, new Date(previous.getTime() - 1000), offset) : null;
  const previousTo = previous ? tithiAt(engine, new Date(previous.getTime() + 1000), offset) : null;
  const nextFrom = next ? tithiAt(engine, new Date(next.getTime() - 1000), offset) : null;
  const nextTo = next ? tithiAt(engine, new Date(next.getTime() + 1000), offset) : null;
  return {
    previousBoundary: previous ? formatDateTime(previous, day.location.timezone) : null,
    previousBoundaryMinutesBeforeSunrise: previous ? Number(((sunrise.getTime() - previous.getTime()) / 60000).toFixed(1)) : null,
    previousBoundaryTransition:
      previousFrom && previousTo ? `${previousFrom.name} (#${previousFrom.number}) -> ${previousTo.name} (#${previousTo.number})` : null,
    nextBoundary: next ? formatDateTime(next, day.location.timezone) : null,
    nextBoundaryMinutesAfterSunrise: next ? Number(((next.getTime() - sunrise.getTime()) / 60000).toFixed(1)) : null,
    nextBoundaryTransition: nextFrom && nextTo ? `${nextFrom.name} (#${nextFrom.number}) -> ${nextTo.name} (#${nextTo.number})` : null,
    closestBoundaryMinutes: Math.min(
      previous ? Math.abs((sunrise.getTime() - previous.getTime()) / 60000) : Number.POSITIVE_INFINITY,
      next ? Math.abs((next.getTime() - sunrise.getTime()) / 60000) : Number.POSITIVE_INFINITY
    )
  };
}

function nextSunrise(day, byDate) {
  const date = new Date(`${day.date}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  const nextIso = date.toISOString().slice(0, 10);
  return byDate.get(nextIso)?.astronomy.sunrise || new Date(day.astronomy.sunrise.getTime() + 24 * 60 * 60 * 1000);
}

function assignedTithi(day, byDate, engine, mode, offset = 0) {
  const sunrise = day.astronomy.sunrise;
  const sunriseTithi = tithiAt(engine, sunrise, offset);
  if (mode === "sunrise") return sunriseTithi;

  const boundary = boundaryAfter(sunrise, engine, offset);
  const next = nextSunrise(day, byDate);
  if (!boundary || boundary >= next) return sunriseTithi;

  const afterBoundary = tithiAt(engine, new Date(boundary.getTime() + 1000), offset);

  if (mode === "next_if_changes_before_next_sunrise") return afterBoundary;

  if (mode === "dominant_between_sunrises") {
    const firstDuration = boundary.getTime() - sunrise.getTime();
    const secondDuration = next.getTime() - boundary.getTime();
    return secondDuration > firstDuration ? afterBoundary : sunriseTithi;
  }

  if (mode === "next_if_current_ends_before_1_5_daylight") {
    const pratahEnd = new Date(sunrise.getTime() + (day.astronomy.sunset.getTime() - sunrise.getTime()) / 5);
    return boundary <= pratahEnd ? afterBoundary : sunriseTithi;
  }

  if (mode === "next_if_current_ends_before_1_3_daylight") {
    const thirdEnd = new Date(sunrise.getTime() + (day.astronomy.sunset.getTime() - sunrise.getTime()) / 3);
    return boundary <= thirdEnd ? afterBoundary : sunriseTithi;
  }

  const tolerance = mode.match(/^nearest_boundary_tolerance_(\d+)m$/);
  if (tolerance) {
    const minutes = Number(tolerance[1]);
    const previous = boundaryBefore(sunrise, engine, offset);
    const nextBoundary = boundaryAfter(sunrise, engine, offset);
    if (previous && (sunrise.getTime() - previous.getTime()) / 60000 <= minutes) {
      return tithiAt(engine, new Date(previous.getTime() - 1000), offset);
    }
    if (nextBoundary && (nextBoundary.getTime() - sunrise.getTime()) / 60000 <= minutes) {
      return tithiAt(engine, new Date(nextBoundary.getTime() + 1000), offset);
    }
  }

  const pakshaBoundaryTolerance = mode.match(/^paksha_boundary_tolerance_(\d+)m$/);
  if (pakshaBoundaryTolerance) {
    const minutes = Number(pakshaBoundaryTolerance[1]);
    const isPakshaEdgePair = (left, right) => {
      const edgeNumbers = new Set([1, 15, 16, 30]);
      return edgeNumbers.has(left?.number) || edgeNumbers.has(right?.number);
    };
    const previous = boundaryBefore(sunrise, engine, offset);
    const nextBoundary = boundaryAfter(sunrise, engine, offset);
    if (previous && (sunrise.getTime() - previous.getTime()) / 60000 <= minutes) {
      const before = tithiAt(engine, new Date(previous.getTime() - 1000), offset);
      const after = tithiAt(engine, new Date(previous.getTime() + 1000), offset);
      if (isPakshaEdgePair(before, after)) return before;
    }
    if (nextBoundary && (nextBoundary.getTime() - sunrise.getTime()) / 60000 <= minutes) {
      const before = tithiAt(engine, new Date(nextBoundary.getTime() - 1000), offset);
      const after = tithiAt(engine, new Date(nextBoundary.getTime() + 1000), offset);
      if (isPakshaEdgePair(before, after)) return after;
    }
  }

  return sunriseTithi;
}

const ASSIGNMENT_MODES = [
  {
    id: "sunrise",
    label: "Tithi at sunrise"
  },
  {
    id: "dominant_between_sunrises",
    label: "Longest tithi between this sunrise and next sunrise"
  },
  {
    id: "next_if_changes_before_next_sunrise",
    label: "Next tithi if a boundary occurs before next sunrise"
  },
  {
    id: "next_if_current_ends_before_1_5_daylight",
    label: "Next tithi if current tithi ends before 1/5 daylight"
  },
  {
    id: "next_if_current_ends_before_1_3_daylight",
    label: "Next tithi if current tithi ends before 1/3 daylight"
  },
  {
    id: "nearest_boundary_tolerance_30m",
    label: "Adjacent tithi if boundary is within 30 minutes of sunrise"
  },
  {
    id: "nearest_boundary_tolerance_60m",
    label: "Adjacent tithi if boundary is within 60 minutes of sunrise"
  },
  {
    id: "nearest_boundary_tolerance_120m",
    label: "Adjacent tithi if boundary is within 120 minutes of sunrise"
  },
  {
    id: "nearest_boundary_tolerance_240m",
    label: "Adjacent tithi if boundary is within 240 minutes of sunrise"
  },
  {
    id: "paksha_boundary_tolerance_30m",
    label: "Adjacent tithi only near paksha boundary, within 30 minutes of sunrise"
  },
  {
    id: "paksha_boundary_tolerance_60m",
    label: "Adjacent tithi only near paksha boundary, within 60 minutes of sunrise"
  },
  {
    id: "paksha_boundary_tolerance_120m",
    label: "Adjacent tithi only near paksha boundary, within 120 minutes of sunrise"
  },
  {
    id: "paksha_boundary_tolerance_240m",
    label: "Adjacent tithi only near paksha boundary, within 240 minutes of sunrise"
  }
];

function scoreEngine(rows, byDate, engine, offset = 0, assignmentMode = "sunrise", includeBoundaryDiagnostics = false) {
  const mismatches = [];
  let matched = 0;
  for (const row of rows) {
    const day = byDate.get(row.date);
    if (!day) continue;
    const tithi = assignedTithi(day, byDate, engine, assignmentMode, offset);
    if (tithi.number === row.scsNumber) {
      matched += 1;
      continue;
    }
    const delta = signedTithiDelta(row.scsNumber, tithi.number);
    const boundary = includeBoundaryDiagnostics ? boundaryDiagnostics(day, engine, offset) : null;
    mismatches.push({
      date: row.date,
      year: Number(row.date.slice(0, 4)),
      scs: row.scsName,
      scsNumber: row.scsNumber,
      ours: tithi.name,
      oursNumber: tithi.number,
      delta,
      angle: Number(tithi.angle.toFixed(3)),
      boundaryDistance: Number(boundaryDistance(tithi.angle).toFixed(3)),
      rawAngle: Number(engine.angle(day.astronomy.sunrise).toFixed(3)),
      sunrise: formatDateTime(day.astronomy.sunrise, day.location.timezone),
      ...(boundary
        ? {
      previousBoundary: boundary.previousBoundary,
      previousBoundaryMinutesBeforeSunrise: boundary.previousBoundaryMinutesBeforeSunrise,
      previousBoundaryTransition: boundary.previousBoundaryTransition,
      nextBoundary: boundary.nextBoundary,
      nextBoundaryMinutesAfterSunrise: boundary.nextBoundaryMinutesAfterSunrise,
      nextBoundaryTransition: boundary.nextBoundaryTransition,
      closestBoundaryMinutes: Number(boundary.closestBoundaryMinutes.toFixed(1))
          }
        : {}),
      text: row.text
    });
  }
  return { matched, mismatches };
}

function increment(map, key) {
  map[key] = (map[key] || 0) + 1;
}

function topEntries(map, limit = 12) {
  return Object.entries(map)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([key, count]) => ({ key, count }));
}

function patternSummary(mismatches) {
  const byDelta = {};
  const byScsTithi = {};
  const byMonth = {};
  const near = {
    le025: 0,
    le050: 0,
    le100: 0,
    le200: 0,
    minutesLe30: 0,
    minutesLe60: 0,
    minutesLe120: 0,
    minutesLe240: 0
  };

  for (const item of mismatches) {
    increment(byDelta, String(item.delta));
    increment(byScsTithi, item.scs);
    increment(byMonth, item.date.slice(0, 7));
    if (item.boundaryDistance <= 0.25) near.le025 += 1;
    if (item.boundaryDistance <= 0.5) near.le050 += 1;
    if (item.boundaryDistance <= 1) near.le100 += 1;
    if (item.boundaryDistance <= 2) near.le200 += 1;
    if (Number.isFinite(item.closestBoundaryMinutes) && item.closestBoundaryMinutes <= 30) near.minutesLe30 += 1;
    if (Number.isFinite(item.closestBoundaryMinutes) && item.closestBoundaryMinutes <= 60) near.minutesLe60 += 1;
    if (Number.isFinite(item.closestBoundaryMinutes) && item.closestBoundaryMinutes <= 120) near.minutesLe120 += 1;
    if (Number.isFinite(item.closestBoundaryMinutes) && item.closestBoundaryMinutes <= 240) near.minutesLe240 += 1;
  }

  return {
    total: mismatches.length,
    byDelta,
    nearBoundary: near,
    topScsTithis: topEntries(byScsTithi),
    topMonths: topEntries(byMonth)
  };
}

function yearSummary(rows, mismatches) {
  const totalByYear = {};
  const mismatchByYear = {};
  for (const row of rows) increment(totalByYear, row.date.slice(0, 4));
  for (const item of mismatches) increment(mismatchByYear, String(item.year));
  return Object.entries(totalByYear)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([year, total]) => ({
      year: Number(year),
      total,
      mismatches: mismatchByYear[year] || 0,
      matches: total - (mismatchByYear[year] || 0)
    }));
}

function dateRange(rows) {
  const dates = rows.map((row) => row.date).sort();
  return { start: dates[0], end: dates[dates.length - 1] };
}

function paranaRowsForCalendar(rows, location) {
  const { start, end } = dateRange(rows);
  const calendar = generateCalendarRange(start, end, location, RULES, EVENTS);
  const byDate = new Map(calendar.days.map((day) => [day.date, day]));
  return rows
    .filter((row) => row.scsParana)
    .map((row) => {
      const day = byDate.get(row.date);
      const ourParanas = day?.events.filter((event) => event.type === "parana") || [];
      const best = ourParanas[0] || null;
      const ourStart = best?.parana?.start || null;
      const ourEnd = best?.parana?.preferred_end || null;
      return {
        date: row.date,
        scsTithi: row.scsName,
        scsStart: row.scsParana.start,
        scsEnd: row.scsParana.end,
        scsText: row.scsParana.text,
        ourEvent: best?.name || null,
        ourStart,
        ourEnd,
        startDeltaMinutes: row.scsParana.start ? minuteDelta(row.scsParana.start, ourStart) : null,
        endDeltaMinutes: minuteDelta(row.scsParana.end, ourEnd),
        ourParanaCount: ourParanas.length
      };
    });
}

function paranaSummary(rows) {
  const withOur = rows.filter((row) => row.ourEvent);
  const missingOur = rows.filter((row) => !row.ourEvent);
  const comparableStart = withOur.filter((row) => row.startDeltaMinutes !== null);
  const comparableEnd = withOur.filter((row) => row.endDeltaMinutes !== null);
  const avg = (items, key) =>
    items.length ? Number((items.reduce((sum, item) => sum + item[key], 0) / items.length).toFixed(1)) : null;
  const maxAbs = (items, key) =>
    items.length ? items.reduce((max, item) => Math.max(max, Math.abs(item[key])), 0) : null;
  return {
    totalScsParanaRows: rows.length,
    withOurParana: withOur.length,
    missingOurParana: missingOur.length,
    comparableStart: comparableStart.length,
    comparableEnd: comparableEnd.length,
    averageStartDeltaMinutes: avg(comparableStart, "startDeltaMinutes"),
    averageEndDeltaMinutes: avg(comparableEnd, "endDeltaMinutes"),
    maxAbsStartDeltaMinutes: maxAbs(comparableStart, "startDeltaMinutes"),
    maxAbsEndDeltaMinutes: maxAbs(comparableEnd, "endDeltaMinutes"),
    missingOurParanaRows: missingOur.slice(0, 20)
  };
}

function isSpecialParanaRow(row) {
  return /worship|varaha|vaman|vamanadev|varahadev/i.test(row.scsText || "");
}

function isNormalComparableParanaRow(row) {
  return (
    row.ourEvent &&
    row.startDeltaMinutes !== null &&
    row.endDeltaMinutes !== null &&
    !isSpecialParanaRow(row) &&
    Math.abs(row.startDeltaMinutes) <= 15 &&
    Math.abs(row.endDeltaMinutes) <= 15
  );
}

function paranaCalibrationScore(rows, startShift, endShift) {
  let squareError = 0;
  let absoluteError = 0;
  let maxAbsoluteError = 0;
  let count = 0;
  for (const row of rows) {
    const startDelta = row.startDeltaMinutes + startShift;
    const endDelta = row.endDeltaMinutes + endShift;
    squareError += startDelta * startDelta + endDelta * endDelta;
    absoluteError += Math.abs(startDelta) + Math.abs(endDelta);
    maxAbsoluteError = Math.max(maxAbsoluteError, Math.abs(startDelta), Math.abs(endDelta));
    count += 2;
  }
  return {
    rmseMinutes: count ? Number(Math.sqrt(squareError / count).toFixed(2)) : null,
    maeMinutes: count ? Number((absoluteError / count).toFixed(2)) : null,
    maxAbsMinutes: count ? maxAbsoluteError : null
  };
}

function bestParanaCalibration(rows, mode) {
  let best = null;
  for (let startShift = -15; startShift <= 15; startShift += 1) {
    const endCandidates = mode === "direct" ? Array.from({ length: 31 }, (_, i) => i - 15) : [startShift];
    for (const rawEndShift of endCandidates) {
      const endShift = mode === "sunrise_like" ? Math.round((startShift * 2) / 3) : rawEndShift;
      const score = paranaCalibrationScore(rows, startShift, endShift);
      const item = { mode, startShiftMinutes: startShift, endShiftMinutes: endShift, ...score };
      if (!best || item.rmseMinutes < best.rmseMinutes) best = item;
    }
  }
  return best;
}

function paranaCalibrationSummary(rows) {
  const normal = rows.filter(isNormalComparableParanaRow);
  return {
    normalComparableRows: normal.length,
    raw: paranaCalibrationScore(normal, 0, 0),
    bestSingleShift: bestParanaCalibration(normal, "single"),
    bestDirectShift: bestParanaCalibration(normal, "direct"),
    bestSunriseLikeShift: bestParanaCalibration(normal, "sunrise_like")
  };
}

function bestFixedOffset(rows, byDate, engine) {
  let best = { offset: 0, matched: -1, mismatches: [] };
  for (let raw = -300; raw <= 300; raw += 1) {
    const offset = raw / 100;
    const score = scoreEngine(rows, byDate, engine, offset);
    if (score.matched > best.matched) best = { offset, ...score };
  }
  return best;
}

function scoreAssignmentModes(rows, byDate, engine) {
  return ASSIGNMENT_MODES.map((mode) => {
    const score = scoreEngine(rows, byDate, engine, 0, mode.id);
    return {
      id: mode.id,
      label: mode.label,
      matches: score.matched,
      mismatches: score.mismatches.length,
      firstMismatches: score.mismatches.slice(0, 8),
      ...(hasFlag("--include-mismatches") ? { mismatchRows: score.mismatches } : {})
    };
  }).sort((left, right) => right.matches - left.matches);
}

function buildDayMap(rows, location) {
  const byDate = new Map();
  for (const row of rows) {
    if (byDate.has(row.date)) continue;
    byDate.set(row.date, {
      date: row.date,
      location,
      astronomy: dayAstronomy(row.date, location, RULES)
    });
  }
  return byDate;
}

const html = await loadHtml();
const yearArg = argValue("--year", "2026");
const year = yearArg === "all" ? null : Number(yearArg);
const locationId = argValue("--location", "nabadwip");
const location = LOCATIONS.find((item) => item.id === locationId);
if (!location) throw new Error(`Unknown location: ${locationId}`);
const includeBestOffset = !hasFlag("--skip-best-offset");
const includeAssignmentModes = !hasFlag("--skip-assignment-modes");
const engineFilter = new Set(listArg("--engines"));

const rows = dedupeRowsByDate(parseScsCalendar(html, year));
const byDate = buildDayMap(rows, location);
const engines = enginesForLocation(location).filter((engine) => !engineFilter.size || engineFilter.has(engine.id));
if (!engines.length) throw new Error(`No engines matched: ${[...engineFilter].join(", ")}`);
const paranaComparison = paranaRowsForCalendar(rows, location);

const result = {
  source:
    listArg("--files").join(", ") || argValue("--file") || argValue("--url", "https://scsmath.com/events/calendar/index.html"),
  location: location.id,
  year: year ?? "all",
  scsRows: rows.length,
  paranaComparisonSummary: paranaSummary(paranaComparison),
  paranaCalibrationSummary: paranaCalibrationSummary(paranaComparison),
  ...(hasFlag("--include-parana") ? { paranaComparison } : {}),
  engines: engines.map((engine) => {
    const raw = scoreEngine(rows, byDate, engine, 0, "sunrise", true);
    const best = includeBestOffset ? bestFixedOffset(rows, byDate, engine) : null;
    const assignmentModes = includeAssignmentModes ? scoreAssignmentModes(rows, byDate, engine) : [];
    return {
      id: engine.id,
      label: engine.label,
      rawMatches: raw.matched,
      rawMismatches: raw.mismatches.length,
      ...(best
        ? {
            bestFixedOffsetDeg: Number(best.offset.toFixed(2)),
            bestFixedOffsetMatches: best.matched,
            bestFixedOffsetMismatches: best.mismatches.length
          }
        : {}),
      rawPattern: patternSummary(raw.mismatches),
      ...(best ? { bestFixedOffsetPattern: patternSummary(best.mismatches) } : {}),
      rawYearSummary: yearSummary(rows, raw.mismatches),
      ...(best ? { bestFixedOffsetYearSummary: yearSummary(rows, best.mismatches) } : {}),
      assignmentModes,
      firstRawMismatches: raw.mismatches.slice(0, 12),
      ...(best ? { firstBestOffsetMismatches: best.mismatches.slice(0, 12) } : {}),
      ...(hasFlag("--include-mismatches")
        ? { rawMismatches: raw.mismatches, ...(best ? { bestOffsetMismatches: best.mismatches } : {}) }
        : {})
    };
  })
};

if (hasFlag("--json")) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`# SCS calendar validation: ${location.name}, ${year ?? "all years"}`);
  console.log(`SCS rows parsed: ${result.scsRows}`);
  for (const engine of result.engines) {
    console.log(
      [
        `\n## ${engine.id}`,
        engine.label,
        `raw: ${engine.rawMatches}/${result.scsRows} matched`,
        engine.bestFixedOffsetDeg === undefined
          ? "best fixed offset: skipped"
          : `best fixed offset: ${engine.bestFixedOffsetDeg} deg -> ${engine.bestFixedOffsetMatches}/${result.scsRows} matched`,
        engine.assignmentModes[0]
          ? `best assignment mode: ${engine.assignmentModes[0].id} -> ${engine.assignmentModes[0].matches}/${result.scsRows} matched`
          : "best assignment mode: skipped",
        `raw delta pattern: ${JSON.stringify(engine.rawPattern.byDelta)}`,
        `near boundary raw: <=0.25° ${engine.rawPattern.nearBoundary.le025}, <=0.5° ${engine.rawPattern.nearBoundary.le050}, <=1° ${engine.rawPattern.nearBoundary.le100}, <=2° ${engine.rawPattern.nearBoundary.le200}`
      ].join("\n")
    );
    for (const mode of engine.assignmentModes) {
      console.log(`  assignment ${mode.id}: ${mode.matches}/${result.scsRows}`);
    }
    for (const item of engine.firstRawMismatches) {
      console.log(`- ${item.date}: SCS ${item.scs}; engine ${item.ours}; angle ${item.angle}; sunrise ${item.sunrise}`);
    }
  }
}
