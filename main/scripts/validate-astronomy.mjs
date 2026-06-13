import { generateCalendarRange } from "../js/calendar-engine.js";
import { EVENTS } from "../js/events-data.js";
import { LOCATIONS } from "../js/locations-data.js";
import { RULES } from "../js/rules-data.js";
import { formatTime } from "../js/date-utils.js";

const DEFAULT_CASES = [
  { location: "mayapur", start: "2026-01-23", end: "2026-01-23", note: "Navadvip/Mayapur reference: Vasanta Panchami event cluster" },
  { location: "mayapur", start: "2026-05-26", end: "2026-05-28", note: "Navadvip/Mayapur reference: Purushottama vyanjuli window" },
  { location: "maalot", start: "2026-05-26", end: "2026-05-28", note: "Padmini Ekadashi / Purushottama vyanjuli case" },
  { location: "maalot", start: "2026-08-28", end: "2026-08-28", note: "Balarama Purnima" },
  { location: "maalot", start: "2026-09-04", end: "2026-09-04", note: "Janmashtami" },
  { location: "maalot", start: "2026-09-19", end: "2026-09-19", note: "Radhastami" },
  { location: "maalot", start: "2026-10-27", end: "2026-10-27", note: "Damodara/Karttik starts in display" },
  { location: "vrindavan", start: "2026-05-26", end: "2026-05-28", note: "Vrindavan secondary comparison window" },
  { location: "puri", start: "2026-03-16", end: "2026-03-17", note: "Ratha Yatra related window" }
];

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1] || null;
}

function selectedCases() {
  const location = argValue("--location");
  const date = argValue("--date");
  const start = argValue("--start");
  const end = argValue("--end");
  if (location && (date || start)) {
    return [
      {
        location,
        start: date || start,
        end: date || end || start,
        note: "custom"
      }
    ];
  }
  return DEFAULT_CASES;
}

function eventSummary(event) {
  const parana =
    event.type === "parana"
      ? ` [${event.parana.start}-${event.parana.preferred_end}; latest ${event.parana.absolute_end}]`
      : "";
  const classification = event.classification ? ` (${event.classification})` : "";
  return `${event.name}${classification}${parana}`;
}

function serializeDay(day) {
  const timezone = day.location.timezone;
  return {
    date: day.date,
    location: day.location.id,
    timezone,
    sunrise: formatTime(day.astronomy.sunrise, timezone),
    sunset: formatTime(day.astronomy.sunset, timezone),
    moonrise: formatTime(day.astronomy.moonrise, timezone),
    moonset: formatTime(day.astronomy.moonset, timezone),
    arunodaya: formatTime(day.astronomy.arunodaya, timezone),
    tithi_sunrise: day.lunar.tithi_at_sunrise.name,
    tithi_arunodaya: day.lunar.tithi_at_arunodaya.name,
    tithi_angle: Number(day.lunar.tithi_angle_at_sunrise.toFixed(4)),
    nakshatra_sunrise: day.lunar.nakshatra_at_sunrise.name,
    nakshatra_pada: day.lunar.nakshatra_at_sunrise.pada,
    yoga_sunrise: day.lunar.yoga_at_sunrise.name,
    masa: day.masa.display_name,
    masa_type: day.masa.type,
    events: day.events.map(eventSummary)
  };
}

function runCase(testCase) {
  const location = LOCATIONS.find((item) => item.id === testCase.location);
  if (!location) throw new Error(`Unknown location: ${testCase.location}`);
  const calendar = generateCalendarRange(testCase.start, testCase.end, location, RULES, EVENTS);
  return {
    note: testCase.note,
    range: `${testCase.start}..${testCase.end}`,
    location: location.id,
    days: calendar.days.map(serializeDay)
  };
}

const result = selectedCases().map(runCase);
if (process.argv.includes("--json")) {
  console.log(JSON.stringify(result, null, 2));
} else {
  for (const group of result) {
    console.log(`\n# ${group.location} ${group.range} - ${group.note}`);
    for (const day of group.days) {
      console.log(
        [
          day.date,
          `sun ${day.sunrise}-${day.sunset}`,
          `moon ${day.moonrise}-${day.moonset}`,
          `arunodaya ${day.arunodaya}`,
          `tithi ${day.tithi_sunrise}`,
          `arunodaya-tithi ${day.tithi_arunodaya}`,
          `nakshatra ${day.nakshatra_sunrise} pada ${day.nakshatra_pada}`,
          `yoga ${day.yoga_sunrise}`,
          `masa ${day.masa}`
        ].join(" | ")
      );
      for (const event of day.events) {
        console.log(`  - ${event}`);
      }
    }
  }
}
