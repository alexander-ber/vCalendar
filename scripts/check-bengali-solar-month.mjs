import assert from "node:assert/strict";
import { generateCalendar } from "../js/calendar-engine.js";
import { EVENTS } from "../js/events-data.js";
import { LOCATIONS } from "../js/locations-data.js";
import { RULES } from "../js/rules-data.js";

const nabadwip = LOCATIONS.find((location) => location.id === "nabadwip");

const fixtures = [
  ["2026-03-04", 2026, 3, "Phalguna"],
  ["2026-06-01", 2026, 6, "Jyeshtha"],
  ["2026-06-16", 2026, 6, "Ashadha"]
];

for (const [date, year, month, expected] of fixtures) {
  const calendar = generateCalendar(year, month, nabadwip, RULES, EVENTS);
  const day = calendar.days.find((item) => item.date === date);
  const actual = day?.masa.bengali_solar_month?.name;
  assert.equal(actual, expected, `${date}: expected ${expected}, got ${actual}`);
  console.log(`${date}: ${actual}`);
}

console.log("Bengali solar month checks passed.");
