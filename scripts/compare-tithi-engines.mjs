import { Body, Ecliptic, EclipticGeoMoon, Equator, GeoVector, MoonPhase, Observer, PairLongitude, SunPosition } from "../vendor/astronomy-engine.js";
import {
  dayAstronomy,
  ephemerisTithiAngle,
  normalizeDegrees,
  suryaSiddhantaMeanTithiAngle,
  tithiAngle,
  TITHI_NAMES
} from "../js/astronomy-adapter.js";
import { formatDateTime, formatTime } from "../js/date-utils.js";
import { LOCATIONS } from "../js/locations-data.js";
import { RULES } from "../js/rules-data.js";

const DEFAULT_CASES = [
  { location: "mayapur", start: "2026-05-26", end: "2026-05-28", note: "Navadvip/Mayapur Purushottama reference" },
  { location: "kolkata", start: "2026-07-10", end: "2026-07-11", note: "SCS witness: Yogini shifted Ekadashi" },
  { location: "mayapur", start: "2026-07-10", end: "2026-07-11", note: "Mayapur comparison: Yogini shifted Ekadashi" },
  { location: "kolkata", start: "2027-01-18", end: "2027-01-19", note: "SCS witness: Putrada shifted Ekadashi" },
  { location: "mayapur", start: "2027-01-18", end: "2027-01-19", note: "Mayapur comparison: Putrada shifted Ekadashi" },
  { location: "kolkata", start: "2027-03-18", end: "2027-03-19", note: "SCS witness: Amalaki shifted Ekadashi" },
  { location: "mayapur", start: "2027-03-18", end: "2027-03-19", note: "Mayapur comparison: Amalaki shifted Ekadashi" },
  { location: "nabadwip", start: "2026-06-24", end: "2026-06-26", note: "Nabadwip Nirjala witness: VC fast on 25, parana on 26" },
  { location: "maalot", start: "2026-05-26", end: "2026-05-28", note: "Maalot Padmini/Vyanjuli edge case" },
  { location: "vrindavan", start: "2026-05-26", end: "2026-05-28", note: "Vrindavan viddha comparison" },
  { location: "mayapur", start: "2026-01-23", end: "2026-01-23", note: "Navadvip/Mayapur Vasanta Panchami cluster" }
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

const STATIC_ENGINES = [
  {
    id: "app_current",
    label: "app current: legacy compatible formula",
    angle: tithiAngle
  },
  {
    id: "app_ephemeris_candidate",
    label: "candidate: AE apparent geocentric Moon/Sun",
    angle: ephemerisTithiAngle
  },
  {
    id: "surya_siddhanta_mean",
    label: "Surya Siddhanta mean elongation baseline",
    angle: suryaSiddhantaMeanTithiAngle
  },
  {
    id: "astronomy_moonphase",
    label: "Astronomy Engine MoonPhase",
    angle: (date) => MoonPhase(date)
  },
  {
    id: "astronomy_pair_longitude",
    label: "Astronomy Engine PairLongitude",
    angle: (date) => PairLongitude(Body.Moon, Body.Sun, date)
  },
  {
    id: "astronomy_ecliptic_geo",
    label: "Astronomy Engine apparent geocentric Moon - Sun",
    angle: (date) => normalizeDegrees(EclipticGeoMoon(date).lon - SunPosition(date).elon)
  },
  {
    id: "astronomy_geovector",
    label: "Astronomy Engine Ecliptic(GeoVector no aberration)",
    angle: (date) => {
      const moon = Ecliptic(GeoVector(Body.Moon, date, false));
      const sun = Ecliptic(GeoVector(Body.Sun, date, false));
      return normalizeDegrees(moon.elon - sun.elon);
    }
  },
  {
    id: "astronomy_geovector_aberrated",
    label: "Astronomy Engine Ecliptic(GeoVector aberration)",
    angle: (date) => {
      const moon = Ecliptic(GeoVector(Body.Moon, date, true));
      const sun = Ecliptic(GeoVector(Body.Sun, date, true));
      return normalizeDegrees(moon.elon - sun.elon);
    }
  }
];

function enginesForLocation(location) {
  const observer = new Observer(location.lat, location.lon, Number(location.elevation_m || 0));
  return [
    ...STATIC_ENGINES,
    {
      id: "astronomy_topocentric",
      label: "Astronomy Engine topocentric Equator -> Ecliptic no aberration",
      angle: (date) => {
        const moon = Ecliptic(Equator(Body.Moon, date, observer, true, false).vec);
        const sun = Ecliptic(Equator(Body.Sun, date, observer, true, false).vec);
        return normalizeDegrees(moon.elon - sun.elon);
      }
    },
    {
      id: "astronomy_topocentric_aberrated",
      label: "Astronomy Engine topocentric Equator -> Ecliptic aberration",
      angle: (date) => {
        const moon = Ecliptic(Equator(Body.Moon, date, observer, true, true).vec);
        const sun = Ecliptic(Equator(Body.Sun, date, observer, true, true).vec);
        return normalizeDegrees(moon.elon - sun.elon);
      }
    }
  ];
}

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
  for (let cursor = start; cursor <= end; cursor = addDays(cursor, 1)) {
    days.push(cursor);
  }
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
  return LOCATIONS.find((item) => item.id === id) || VIRTUAL_LOCATIONS.find((item) => item.id === id);
}

function tithiFromAngle(angle) {
  const number = Math.floor(normalizeDegrees(angle) / 12) + 1;
  return {
    number,
    name: TITHI_NAMES[number - 1],
    angle: normalizeDegrees(angle)
  };
}

function engineTithi(engine, date) {
  return tithiFromAngle(engine.angle(date));
}

function boundaryAfter(start, engine, maxHours = 48) {
  if (!start) return null;
  let left = new Date(start);
  let right = new Date(left.getTime() + 30 * 60 * 1000);
  const max = start.getTime() + maxHours * 60 * 60 * 1000;
  const startNumber = engineTithi(engine, left).number;

  while (right.getTime() <= max) {
    if (engineTithi(engine, right).number !== startNumber) {
      for (let i = 0; i < 42; i += 1) {
        const mid = new Date((left.getTime() + right.getTime()) / 2);
        if (engineTithi(engine, mid).number === startNumber) left = mid;
        else right = mid;
      }
      return right;
    }
    left = right;
    right = new Date(right.getTime() + 30 * 60 * 1000);
  }
  return null;
}

function minutesDelta(left, right) {
  if (!left || !right) return null;
  return Math.round((left.getTime() - right.getTime()) / 60000);
}

function serializeEngine(engine, astronomy, timezone, referenceBoundary) {
  const sunrise = engineTithi(engine, astronomy.sunrise);
  const arunodaya = engineTithi(engine, astronomy.arunodaya);
  const nextBoundary = boundaryAfter(astronomy.sunrise, engine);
  return {
    id: engine.id,
    label: engine.label,
    sunrise_tithi: sunrise.name,
    sunrise_angle: Number(sunrise.angle.toFixed(4)),
    arunodaya_tithi: arunodaya.name,
    next_boundary: formatDateTime(nextBoundary, timezone),
    boundary_delta_minutes_vs_local: minutesDelta(nextBoundary, referenceBoundary)
  };
}

function runCase(testCase) {
  const location = resolveLocation(testCase.location);
  if (!location) throw new Error(`Unknown location: ${testCase.location}`);
  const engines = enginesForLocation(location);
  return {
    note: testCase.note,
    location: location.id,
    range: `${testCase.start}..${testCase.end}`,
    days: dateRange(testCase.start, testCase.end).map((date) => {
      const astronomy = dayAstronomy(date, location, RULES);
      const localBoundary = boundaryAfter(astronomy.sunrise, engines[0]);
      return {
        date,
        sunrise: formatTime(astronomy.sunrise, location.timezone),
        arunodaya: formatTime(astronomy.arunodaya, location.timezone),
        engines: engines.map((engine) => serializeEngine(engine, astronomy, location.timezone, localBoundary))
      };
    })
  };
}

const result = selectedCases().map(runCase);

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(result, null, 2));
} else {
  for (const group of result) {
    console.log(`\n# ${group.location} ${group.range} - ${group.note}`);
    for (const day of group.days) {
      console.log(`\n${day.date} | sunrise ${day.sunrise} | arunodaya ${day.arunodaya}`);
      for (const engine of day.engines) {
        const delta = engine.boundary_delta_minutes_vs_local === null ? "n/a" : `${engine.boundary_delta_minutes_vs_local}m`;
        console.log(
          [
            `  - ${engine.id}`,
            `sunrise ${engine.sunrise_tithi} (${engine.sunrise_angle})`,
            `arunodaya ${engine.arunodaya_tithi}`,
            `next ${engine.next_boundary}`,
            `delta ${delta}`
          ].join(" | ")
        );
      }
    }
  }
}
