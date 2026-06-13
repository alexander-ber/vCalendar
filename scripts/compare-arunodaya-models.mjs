import { arunodayaForDay, dayAstronomy, ephemerisTithiAngle, normalizeDegrees, tithiAngle, TITHI_NAMES } from "../js/astronomy-adapter.js";
import { formatDateTime } from "../js/date-utils.js";
import { LOCATIONS } from "../js/locations-data.js";
import { RULES } from "../js/rules-data.js";

const DEFAULT_DATES = ["2026-07-10", "2026-08-23", "2026-08-24", "2027-01-18", "2027-03-18"];

function argValue(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1] || fallback;
}

function tithiAt(date, angleFn) {
  const angle = normalizeDegrees(angleFn(date));
  const number = Math.floor(angle / 12) + 1;
  return {
    number,
    name: TITHI_NAMES[number - 1],
    angle
  };
}

function rulesFor(mode) {
  if (mode === "night15") {
    return {
      ...RULES,
      ekadashi: {
        ...RULES.ekadashi,
        arunodaya_mode: "previous_night_fraction",
        arunodaya_night_fraction: 1 / 15
      }
    };
  }
  if (mode === "night10") {
    return {
      ...RULES,
      ekadashi: {
        ...RULES.ekadashi,
        arunodaya_mode: "previous_night_fraction",
        arunodaya_night_fraction: 1 / 10
      }
    };
  }
  return {
    ...RULES,
    ekadashi: {
      ...RULES.ekadashi,
      arunodaya_mode: "fixed_offset",
      arunodaya_offset_minutes: 96
    }
  };
}

const locationId = argValue("--location", "mayapur");
const location = LOCATIONS.find((item) => item.id === locationId);
if (!location) throw new Error(`Unknown location: ${locationId}`);

const dates = argValue("--date") ? [argValue("--date")] : DEFAULT_DATES;
const modes = ["fixed96", "night15", "night10"];
const engines = [
  ["current", tithiAngle],
  ["ae_geocentric", ephemerisTithiAngle]
];

console.log(`# ${location.id}`);
for (const isoDate of dates) {
  const base = dayAstronomy(isoDate, location, RULES);
  console.log(`\n${isoDate} | sunrise ${formatDateTime(base.sunrise, location.timezone)}`);
  for (const mode of modes) {
    const rules = rulesFor(mode);
    const arunodaya = arunodayaForDay(isoDate, location, base.sunrise, rules);
    const parts = [`  - ${mode}`, formatDateTime(arunodaya, location.timezone)];
    for (const [engineName, angleFn] of engines) {
      const info = tithiAt(arunodaya, angleFn);
      parts.push(`${engineName}: ${info.name} (${info.angle.toFixed(4)})`);
    }
    console.log(parts.join(" | "));
  }
}
