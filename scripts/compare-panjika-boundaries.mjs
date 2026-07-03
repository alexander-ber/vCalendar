import fs from "node:fs/promises";
import { Body, Ecliptic, Equator, Observer } from "../vendor/astronomy-engine.js";
import {
  ephemerisTithiAngle,
  moonLongitude,
  normalizeDegrees,
  sunLongitude,
  suryaSiddhantaMeanTithiAngle,
  suryaSiddhantaTrueTithiAngleCandidate,
  TITHI_NAMES
} from "../js/astronomy-adapter.js";
import { LOCATIONS } from "../js/locations-data.js";
import { formatDateTime, zonedDateToUtc } from "../js/date-utils.js";

const DATA_FILE = new URL("../data/validation/panjika-boundaries-gaurabda-540.json", import.meta.url);

function localDateTimeToUtc(value, timezone) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})$/);
  if (!match) throw new Error(`Invalid local datetime: ${value}`);
  const [, year, month, day, hour, minute] = match.map(Number);
  return zonedDateToUtc(year, month, day, hour, minute, 0, timezone);
}

function tithiNumber(angle) {
  return Math.floor(normalizeDegrees(angle) / 12) + 1;
}

function tithiName(number) {
  return TITHI_NAMES[number - 1] || `#${number}`;
}

function transitionAt(engine, date) {
  const before = tithiNumber(engine.angle(new Date(date.getTime() - 1000)));
  const after = tithiNumber(engine.angle(new Date(date.getTime() + 1000)));
  return `${tithiName(before)} -> ${tithiName(after)}`;
}

function findBoundaryNear(engine, printedUtc, afterNumber, maxHours = 36) {
  const stepMs = 15 * 60 * 1000;
  const min = printedUtc.getTime() - maxHours * 60 * 60 * 1000;
  const max = printedUtc.getTime() + maxHours * 60 * 60 * 1000;
  let left = new Date(min);
  let leftNumber = tithiNumber(engine.angle(left));

  for (let cursor = min + stepMs; cursor <= max; cursor += stepMs) {
    const right = new Date(cursor);
    const rightNumber = tithiNumber(engine.angle(right));
    if (rightNumber === afterNumber && leftNumber !== afterNumber) {
      let lo = left;
      let hi = right;
      for (let i = 0; i < 45; i += 1) {
        const mid = new Date((lo.getTime() + hi.getTime()) / 2);
        if (tithiNumber(engine.angle(mid)) === afterNumber) hi = mid;
        else lo = mid;
      }
      return hi;
    }
    left = right;
    leftNumber = rightNumber;
  }

  return null;
}

function enginesForLocation(location) {
  const observer = new Observer(location.lat, location.lon, Number(location.elevation_m || 0));
  return [
    {
      id: "current_ephemeris",
      label: "Current apparent geocentric ephemeris",
      angle: ephemerisTithiAngle
    },
    {
      id: "old_approx",
      label: "Old truncated approximation",
      angle: (date) => normalizeDegrees(moonLongitude(date) - sunLongitude(date))
    },
    {
      id: "topocentric",
      label: "Apparent topocentric candidate",
      angle: (date) => {
        const moon = Ecliptic(Equator(Body.Moon, date, observer, true, false).vec);
        const sun = Ecliptic(Equator(Body.Sun, date, observer, true, false).vec);
        return normalizeDegrees(moon.elon - sun.elon);
      }
    },
    {
      id: "surya_siddhanta_mean",
      label: "Surya Siddhanta mean baseline",
      angle: suryaSiddhantaMeanTithiAngle
    },
    {
      id: "surya_siddhanta_true_minus",
      label: "Surya Siddhanta true candidate, manda sign -1",
      angle: (date) => suryaSiddhantaTrueTithiAngleCandidate(date, -1)
    },
    {
      id: "surya_siddhanta_true_plus",
      label: "Surya Siddhanta true candidate, manda sign +1",
      angle: (date) => suryaSiddhantaTrueTithiAngleCandidate(date, 1)
    }
  ];
}

function summarize(rows) {
  const byEngine = new Map();
  for (const row of rows) {
    if (!byEngine.has(row.engine)) byEngine.set(row.engine, []);
    byEngine.get(row.engine).push(row);
  }
  return [...byEngine.entries()]
    .map(([engine, items]) => {
      const comparable = items.filter((item) => Number.isFinite(item.delta_minutes));
      const abs = comparable.map((item) => Math.abs(item.delta_minutes));
      const mae = abs.reduce((sum, item) => sum + item, 0) / abs.length;
      const max = Math.max(...abs);
      return {
        engine,
        rows: items.length,
        comparable: comparable.length,
        mean_abs_delta_minutes: Number(mae.toFixed(1)),
        max_abs_delta_minutes: max
      };
    })
    .sort((left, right) => left.mean_abs_delta_minutes - right.mean_abs_delta_minutes);
}

const data = JSON.parse(await fs.readFile(DATA_FILE, "utf8"));
const location = LOCATIONS.find((item) => item.id === data.location);
if (!location) throw new Error(`Unknown location in validation data: ${data.location}`);
const engines = enginesForLocation(location);
const rows = [];

for (const boundary of data.boundaries) {
  const printedUtc = localDateTimeToUtc(boundary.printed_boundary, data.timezone);
  for (const engine of engines) {
    const calc = findBoundaryNear(engine, printedUtc, boundary.after_tithi_number);
    rows.push({
      id: boundary.id,
      source_page: boundary.source_page,
      panjika_boundary: boundary.printed_boundary,
      transition: `${boundary.before_tithi_name} -> ${boundary.after_tithi_name}`,
      engine: engine.id,
      calculated_boundary: calc ? formatDateTime(calc, data.timezone) : null,
      delta_minutes: calc ? Math.round((calc.getTime() - printedUtc.getTime()) / 60000) : null,
      angle_at_panjika: Number(engine.angle(printedUtc).toFixed(3)),
      calculated_transition: calc ? transitionAt(engine, calc) : null
    });
  }
}

if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ data: data.id, source: data.source, summary: summarize(rows), rows }, null, 2));
} else {
  console.log(`# Panjika boundary model comparison: ${data.id}`);
  console.log(`Location: ${data.location}; timezone: ${data.timezone}`);
  console.table(summarize(rows));
  console.table(
    rows.map((row) => ({
      boundary: row.id,
      engine: row.engine,
      panjika: row.panjika_boundary,
      calculated: row.calculated_boundary,
      delta_min: row.delta_minutes,
      angle_at_panjika: row.angle_at_panjika
    }))
  );
}
