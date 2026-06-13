import { spawnSync } from "node:child_process";
import { dayAstronomy, normalizeDegrees, TITHI_NAMES } from "../js/astronomy-adapter.js";
import { formatDateTime, formatTime } from "../js/date-utils.js";
import { LOCATIONS } from "../js/locations-data.js";
import { RULES } from "../js/rules-data.js";

const DEFAULT_CASES = [
  { location: "maalot", start: "2026-05-26", end: "2026-05-28", note: "Maalot Padmini/Vyanjuli edge case" },
  { location: "mayapur", start: "2026-07-10", end: "2026-07-12", note: "Nabadwip Yogini shifted Ekadashi witness" },
  { location: "mayapur", start: "2027-01-18", end: "2027-01-20", note: "Nabadwip Putrada shifted Ekadashi witness" },
  { location: "mayapur", start: "2027-03-18", end: "2027-03-20", note: "Nabadwip Amalaki witness" },
  { location: "kolkata", start: "2026-07-10", end: "2026-07-12", note: "Kolkata comparison for Nabadwip witness" }
];

const PYTHON = String.raw`
import json
import math
import sys

try:
    import swisseph as swe
except Exception as exc:
    print(json.dumps({"error": f"Cannot import swisseph: {exc}"}))
    sys.exit(2)

payload = json.loads(sys.stdin.read())
flags = swe.FLG_SWIEPH | swe.FLG_SPEED

def julday_from_ms(ms):
    return ms / 86400000.0 + 2440587.5

def norm(value):
    return value % 360.0

def calc_angle(ms, location, topocentric=False):
    if topocentric:
        swe.set_topo(float(location["lon"]), float(location["lat"]), float(location.get("elevation_m", 0) or 0))
        use_flags = flags | swe.FLG_TOPOCTR
    else:
        use_flags = flags
    jd = julday_from_ms(ms)
    moon, moon_flag = swe.calc_ut(jd, swe.MOON, use_flags)
    sun, sun_flag = swe.calc_ut(jd, swe.SUN, use_flags)
    return {
        "angle": norm(moon[0] - sun[0]),
        "moon_lon": norm(moon[0]),
        "sun_lon": norm(sun[0]),
        "moon_retflag": moon_flag,
        "sun_retflag": sun_flag
    }

def tithi_number(angle):
    return int(math.floor(norm(angle) / 12.0)) + 1

def boundary_after(start_ms, location, topocentric=False):
    start_number = tithi_number(calc_angle(start_ms, location, topocentric)["angle"])
    left = start_ms
    right = left + 30 * 60 * 1000
    limit = start_ms + 48 * 60 * 60 * 1000
    while right <= limit:
        if tithi_number(calc_angle(right, location, topocentric)["angle"]) != start_number:
            for _ in range(42):
                mid = int((left + right) / 2)
                if tithi_number(calc_angle(mid, location, topocentric)["angle"]) == start_number:
                    left = mid
                else:
                    right = mid
            return right
        left = right
        right += 30 * 60 * 1000
    return None

results = []
for item in payload["items"]:
    location = item["location"]
    row = {
        "key": item["key"],
        "geocentric": {},
        "topocentric": {}
    }
    for label, topocentric in [("geocentric", False), ("topocentric", True)]:
        sunrise = calc_angle(item["sunrise_ms"], location, topocentric)
        arunodaya = calc_angle(item["arunodaya_ms"], location, topocentric)
        boundary = boundary_after(item["sunrise_ms"], location, topocentric)
        row[label] = {
            "sunrise_angle": sunrise["angle"],
            "sunrise_tithi": tithi_number(sunrise["angle"]),
            "arunodaya_angle": arunodaya["angle"],
            "arunodaya_tithi": tithi_number(arunodaya["angle"]),
            "next_boundary_ms": boundary,
            "moon_retflag": sunrise["moon_retflag"],
            "sun_retflag": sunrise["sun_retflag"]
        }
    results.append(row)

print(json.dumps({
    "swe_version": swe.version,
    "requested_flags": flags,
    "items": results
}))
`;

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1] || null;
}

function addDays(isoDate, days) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function dateRange(start, end) {
  const days = [];
  for (let cursor = start; cursor <= end; cursor = addDays(cursor, 1)) days.push(cursor);
  return days;
}

function selectedCases() {
  const location = argValue("--location");
  const date = argValue("--date");
  const start = argValue("--start");
  const end = argValue("--end");
  if (location && (date || start)) {
    return [{ location, start: date || start, end: date || end || start, note: "custom" }];
  }
  return DEFAULT_CASES;
}

function resolveLocation(id) {
  return LOCATIONS.find((item) => item.id === id);
}

function tithiName(number) {
  return TITHI_NAMES[number - 1] || `Tithi ${number}`;
}

function runSwiss(items) {
  const result = spawnSync("python3", ["-c", PYTHON], {
    input: JSON.stringify({ items }),
    encoding: "utf8",
    env: {
      ...process.env,
      PYTHONPATH: ["/private/tmp/vcalendar-pydeps", process.env.PYTHONPATH].filter(Boolean).join(":")
    }
  });
  if (result.status !== 0) {
    throw new Error(`${result.stderr || result.stdout || "Swiss comparison failed"}`);
  }
  return JSON.parse(result.stdout);
}

const caseRows = [];
const swissItems = [];
for (const testCase of selectedCases()) {
  const location = resolveLocation(testCase.location);
  if (!location) throw new Error(`Unknown location: ${testCase.location}`);
  for (const date of dateRange(testCase.start, testCase.end)) {
    const astronomy = dayAstronomy(date, location, RULES);
    if (!astronomy.sunrise || !astronomy.arunodaya) continue;
    const key = `${testCase.location}:${date}`;
    caseRows.push({ key, date, location, note: testCase.note, sunrise: astronomy.sunrise, arunodaya: astronomy.arunodaya });
    swissItems.push({
      key,
      location,
      sunrise_ms: astronomy.sunrise.getTime(),
      arunodaya_ms: astronomy.arunodaya.getTime()
    });
  }
}

const swiss = runSwiss(swissItems);
const swissByKey = new Map(swiss.items.map((item) => [item.key, item]));

console.log(`Swiss version: ${swiss.swe_version}; requested flags: ${swiss.requested_flags}`);
console.log("Note: retflag 260 means Moshier fallback with speed; 258 means Swiss ephemeris files were used.");

let currentGroup = "";
for (const row of caseRows) {
  const group = `${row.location.id} - ${row.note}`;
  if (group !== currentGroup) {
    currentGroup = group;
    console.log(`\n# ${group}`);
  }
  const item = swissByKey.get(row.key);
  console.log(`\n${row.date} | sunrise ${formatTime(row.sunrise, row.location.timezone)} | arunodaya ${formatTime(row.arunodaya, row.location.timezone)}`);
  for (const type of ["geocentric", "topocentric"]) {
    const data = item[type];
    const boundary = data.next_boundary_ms ? new Date(data.next_boundary_ms) : null;
    console.log(
      [
        `  - swiss_${type}`,
        `sunrise ${tithiName(data.sunrise_tithi)} (${Number(normalizeDegrees(data.sunrise_angle).toFixed(4))})`,
        `arunodaya ${tithiName(data.arunodaya_tithi)}`,
        `next ${formatDateTime(boundary, row.location.timezone)}`,
        `ret ${data.moon_retflag}/${data.sun_retflag}`
      ].join(" | ")
    );
  }
}
