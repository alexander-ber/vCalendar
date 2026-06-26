import { generateCalendarRange } from "../js/calendar-engine.js";
import { EVENTS } from "../js/events-data.js";
import { LOCATIONS } from "../js/locations-data.js";
import { RULES } from "../js/rules-data.js";

const SCS_NABADWIP_541_SHIFT_CASES = [
  {
    label: "Nirjala Ekadashi / Nabadwip witness",
    range: ["2026-06-23", "2026-07-02"],
    witness: [
      { date: "2026-06-25", expectation: "fast", name: "Nirjala Ekadashi" },
      { date: "2026-06-26", expectation: "parana" },
      { date: "2026-06-26", expectation: "no_fast_event" },
      { date: "2026-06-27", expectation: "no_parana" }
    ]
  },
  {
    label: "Yogini Ekadashi dashami-viddha",
    range: ["2026-07-09", "2026-07-12"],
    witness: [
      { date: "2026-07-10", expectation: "no_fast", reason: "dashami_viddha_at_dawn" },
      { date: "2026-07-11", expectation: "fast", name: "Yogini Ekadashi" },
      { date: "2026-07-12", expectation: "parana" }
    ]
  },
  {
    label: "Pavitropana / Vyanjuli Mahadvadashi",
    range: ["2026-08-22", "2026-08-25"],
    witness: [
      { date: "2026-08-23", expectation: "no_fast", reason: "next_day_is_mahadvadashi" },
      { date: "2026-08-24", expectation: "fast", name: "Vyanjuli Mahadvadashi" },
      { date: "2026-08-25", expectation: "parana" }
    ]
  },
  {
    label: "Putrada Ekadashi dashami-viddha",
    range: ["2027-01-17", "2027-01-20"],
    witness: [
      { date: "2027-01-18", expectation: "no_fast", reason: "dashami_viddha_at_dawn" },
      { date: "2027-01-19", expectation: "fast", name: "Putrada Ekadashi" },
      { date: "2027-01-20", expectation: "parana" }
    ]
  },
  {
    label: "Vijaya Ekadashi double Ekadashi",
    range: ["2027-03-02", "2027-03-05"],
    witness: [
      { date: "2027-03-03", expectation: "no_fast_or_plain_ekadashi" },
      { date: "2027-03-04", expectation: "fast", name: "Vijaya Ekadashi" },
      { date: "2027-03-05", expectation: "parana" }
    ]
  },
  {
    label: "Amalaki Ekadashi",
    range: ["2027-03-17", "2027-03-20"],
    witness: [
      { date: "2027-03-18", expectation: "fast", name: "Amalaki Ekadashi" },
      { date: "2027-03-19", expectation: "parana" }
    ]
  }
];

const WITNESS_SOURCES = [
  "https://www.scsmath.com/events/calendar/index.html",
  "https://vaishnavacalendar.org/nabadwip/541/en/"
];

const VIRTUAL_LOCATIONS = [
  {
    id: "kolkata",
    name: "Kolkata, India",
    lat: 22.5726,
    lon: 88.3639,
    timezone: "Asia/Kolkata"
  }
];

function argValue(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1] || fallback;
}

function dayFacts(day) {
  const ekadashiEvents = day.events.filter((event) => event.type === "ekadashi");
  const notices = day.events.filter((event) => event.type === "ekadashi_notice");
  const paranas = day.events.filter((event) => event.type === "parana");
  return {
    date: day.date,
    tithi_arunodaya: day.lunar.tithi_at_arunodaya.name,
    tithi_sunrise: day.lunar.tithi_at_sunrise.name,
    fast: ekadashiEvents.map((event) => `${event.name} (${event.classification}; parana ${event.parana_type})`),
    no_fast: notices.map((event) => event.candidate_no_fast_reason || event.name),
    parana: paranas.map((event) => `${event.name}: ${event.parana.start}-${event.parana.preferred_end}`)
  };
}

function satisfies(facts, witness) {
  if (witness.expectation === "fast") return facts.fast.length > 0;
  if (witness.expectation === "no_fast") return facts.no_fast.length > 0;
  if (witness.expectation === "parana") return facts.parana.length > 0;
  if (witness.expectation === "no_fast_event") return facts.fast.length === 0;
  if (witness.expectation === "no_parana") return facts.parana.length === 0;
  if (witness.expectation === "no_fast_or_plain_ekadashi") return facts.no_fast.length > 0 || facts.tithi_sunrise.includes("Ekadashi");
  return false;
}

const locationId = argValue("--location", "mayapur");
const location = LOCATIONS.find((item) => item.id === locationId) || VIRTUAL_LOCATIONS.find((item) => item.id === locationId);
if (!location) throw new Error(`Unknown location: ${locationId}`);

let failures = 0;
console.log(`Witness sources:\n- ${WITNESS_SOURCES.join("\n- ")}`);
for (const testCase of SCS_NABADWIP_541_SHIFT_CASES) {
  const calendar = generateCalendarRange(testCase.range[0], testCase.range[1], location, RULES, EVENTS);
  const factsByDate = new Map(calendar.days.map((day) => [day.date, dayFacts(day)]));
  console.log(`\n# ${testCase.label} (${location.id})`);
  for (const witness of testCase.witness) {
    const facts = factsByDate.get(witness.date);
    const ok = facts ? satisfies(facts, witness) : false;
    if (!ok) failures += 1;
    console.log(`${ok ? "OK" : "MISMATCH"} ${witness.date} expected ${witness.expectation}`);
    if (facts) {
      console.log(`  tithi: arunodaya ${facts.tithi_arunodaya}; sunrise ${facts.tithi_sunrise}`);
      if (facts.fast.length) console.log(`  fast: ${facts.fast.join(" | ")}`);
      if (facts.no_fast.length) console.log(`  no-fast: ${facts.no_fast.join(" | ")}`);
      if (facts.parana.length) console.log(`  parana: ${facts.parana.join(" | ")}`);
    }
  }
}

if (process.argv.includes("--strict") && failures > 0) process.exitCode = 1;
