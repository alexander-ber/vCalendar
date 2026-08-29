#!/usr/bin/env node
// Generates a golden fixture from the UNTOUCHED web calendar engine (js/*.js),
// for the mobile Dart rule-engine parity tests to compare against.
//
// This script only ever *imports* from js/ (read-only), the same pattern
// scripts/build-mobile-db.mjs already uses. It never modifies js/.
//
// The (location, year, month) combinations below are exactly the ones already
// validated by hand in tests/regression.mjs — reused here rather than invented,
// so every fixture entry is backed by an existing, human-checked assertion.
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generateCalendar } from "../js/calendar-engine.js";
import { EVENTS } from "../js/events-data.js";
import { EKADASHI_DB } from "../js/ekadashi-data.js";
import { LOCATIONS } from "../js/locations-data.js";
import { RULES } from "../js/rules-data.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const outputPath = join(repoRoot, "apps/mobile/test/fixtures/engine_parity.json");

const CASES = [
  { locationId: "maalot", year: 2026, months: [1, 2, 3, 4, 5, 6, 7, 8] },
  { locationId: "tel-aviv", year: 2026, months: [3] },
  { locationId: "mayapur", year: 2026, months: [3, 5, 7, 10, 11] },
  { locationId: "nabadwip", year: 2026, months: [6] },
  { locationId: "kathmandu", year: 2026, months: [6] },
  { locationId: "vrindavan", year: 2026, months: [5] }
];

function locationById(id) {
  const location = LOCATIONS.find((item) => item.id === id);
  if (!location) throw new Error(`Unknown location id: ${id}`);
  return location;
}

function isoOrNull(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  // Some event shapes (the separate "parana" calendar entry produced by
  // paranaEventForDate) already carry pre-formatted "HH:MM" / "not available"
  // strings rather than Date objects - pass those through unchanged.
  return typeof value === "string" ? value : null;
}

function tithiFixture(tithi) {
  if (!tithi) return null;
  return { number: tithi.number, name: tithi.name, paksha: tithi.paksha ?? null };
}

function paranaFixture(parana) {
  if (!parana) return null;
  return {
    start: isoOrNull(parana.start),
    preferred_end: isoOrNull(parana.preferred_end),
    one_fifth_end: isoOrNull(parana.one_fifth_end),
    absolute_end: isoOrNull(parana.absolute_end),
    preferred_window_status: parana.preferred_window_status ?? null,
    fast_day_type: parana.fast_day_type ?? null
  };
}

function eventFixture(event) {
  return {
    id: event.id,
    type: event.type,
    name: event.name,
    classification: event.classification ?? null,
    target_number: event.target_number ?? null,
    candidate_date: event.candidate_date ?? null,
    candidate_no_fast_reason: event.candidate_no_fast_reason ?? null,
    fast_date: event.fast_date ?? null,
    fast_day_type: event.fast_day_type ?? null,
    parana_type: event.parana_type ?? null,
    parana: event.parana ? paranaFixture(event.parana) : null,
    anchor_date: event.anchor_date ?? null
  };
}

function dayFixture(day) {
  return {
    date: day.date,
    astronomy: {
      sunrise: isoOrNull(day.astronomy.sunrise),
      sunset: isoOrNull(day.astronomy.sunset),
      arunodaya: isoOrNull(day.astronomy.arunodaya)
    },
    masa: {
      name: day.masa.name,
      type: day.masa.type,
      display_name: day.masa.display_name,
      display_part: day.masa.display_part ?? null,
      normal_masa_name: day.masa.normal_masa_name,
      is_purushottama: day.masa.is_purushottama,
      sankranti_count: day.masa.sankranti_count ?? null
    },
    lunar: {
      paksha: day.lunar.paksha,
      tithi_at_sunrise: tithiFixture(day.lunar.tithi_at_sunrise),
      tithi_at_arunodaya: tithiFixture(day.lunar.tithi_at_arunodaya),
      nakshatra_at_sunrise: day.lunar.nakshatra_at_sunrise
        ? { number: day.lunar.nakshatra_at_sunrise.number, name: day.lunar.nakshatra_at_sunrise.name }
        : null
    },
    events: day.events.map(eventFixture)
  };
}

function priorityValue(priority) {
  if (typeof priority === "number") return priority;
  const map = { highest: 10, high: 25, medium: 50, low: 75 };
  return map[priority] ?? 100;
}

function eventRuleFixture(event) {
  return {
    id: event.id,
    category: event.category ?? null,
    event_type: event.type ?? event.event_type ?? null,
    masa: event.masa ?? null,
    masa_type: null,
    gaudiya_masa: event.gaudiya_masa ?? null,
    paksha: event.paksha ?? null,
    tithi: event.tithi ?? null,
    naksatra: event.naksatra ?? event.nakshatra ?? null,
    timing_rule: event.timing_rule ?? null,
    allow_in_adhika: Boolean(event.allow_in_adhika),
    priority: priorityValue(event.priority),
    source_status: event.source_status ?? "confirmed",
    anchor_event_id: event.anchor_event_id ?? null,
    observance_offset_days: event.observance_offset_days ?? 0,
    disabled: Boolean(event.disabled),
    name: event.name ?? event.id
  };
}

// Mirrors js/ekadashi-engine.js's ekadashiRecord() lookup table
// (js/ekadashi-data.js EKADASHI_DB): masa+paksha+masa_type fields, matched
// by value, not by id - data/ekadashi.json's ids (e.g. "utpanna") don't
// encode masa/paksha themselves.
function ekadashiRecordFixture(entry) {
  return {
    id: entry.id,
    category: "ekadashi",
    event_type: "ekadashi",
    masa: entry.masa ?? "*",
    masa_type: entry.masa_type ?? "normal",
    gaudiya_masa: null,
    paksha: entry.paksha ?? null,
    tithi: "Ekadashi",
    naksatra: null,
    timing_rule: null,
    allow_in_adhika: entry.masa_type === "adhika",
    priority: 10,
    source_status: "confirmed",
    anchor_event_id: null,
    observance_offset_days: 0,
    disabled: false,
    name: entry.name ?? entry.id
  };
}

function buildEventRules() {
  const generic = EVENTS.filter((event) => event.source_status !== "needs_exact_lunar_rule").map(eventRuleFixture);
  const ekadashiRecords = EKADASHI_DB.map(ekadashiRecordFixture);
  return [...generic, ...ekadashiRecords];
}

function buildFixture() {
  const cases = [];
  for (const { locationId, year, months } of CASES) {
    const location = locationById(locationId);
    for (const month of months) {
      const calendar = generateCalendar(year, month, location, RULES, EVENTS);
      for (const day of calendar.days) {
        // Only keep days that actually belong to the requested month, since
        // generateCalendar pads with leading/trailing visible-grid days.
        const [dayYear, dayMonth] = day.date.split("-").map(Number);
        if (dayYear !== year || dayMonth !== month) continue;
        cases.push({ location_id: locationId, ...dayFixture(day) });
      }
    }
  }
  return cases;
}

function main() {
  const cases = buildFixture();
  const eventRules = buildEventRules();
  const fixture = {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    engine_version: "web-calendar-engine",
    source_note:
      "Generated by scripts/generate-mobile-fixtures.mjs from the untouched js/calendar-engine.js output. " +
      "Location/date coverage mirrors tests/regression.mjs. Used as the oracle for apps/mobile/test/engine_rules_parity_test.dart.",
    case_count: cases.length,
    event_rule_count: eventRules.length,
    event_rules: eventRules,
    cases
  };
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, JSON.stringify(fixture, null, 2));
  console.log(`Wrote ${cases.length} day fixtures and ${eventRules.length} event rules to ${outputPath}`);
}

main();
