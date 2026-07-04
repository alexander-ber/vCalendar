import { MS_PER_DAY } from "./date-utils.js?v=20260528-8";
import { normalizeDegrees, sunSiderealLongitude, tithiAngle } from "./astronomy-adapter.js?v=20260701-1";

export const MASA_NAMES = [
  "Chaitra",
  "Vaishakha",
  "Jyeshtha",
  "Ashadha",
  "Shravana",
  "Bhadrapada",
  "Ashvina",
  "Kartika",
  "Agrahayana",
  "Pausha",
  "Magha",
  "Phalguna"
];

export const GAUDIYA_MASA_NAMES = [
  "Vishnu",
  "Madhusudan",
  "Trivikrama",
  "Vamana",
  "Sridhara",
  "Hrishikesha",
  "Padmanabha",
  "Damodara",
  "Keshava",
  "Narayana",
  "Madhava",
  "Govinda"
];

export const BENGALI_SOLAR_MONTH_NAMES = [
  "Vaishakha",
  "Jyeshtha",
  "Ashadha",
  "Shravana",
  "Bhadra",
  "Ashvina",
  "Kartika",
  "Agrahayana",
  "Pausha",
  "Magha",
  "Phalguna",
  "Chaitra"
];

function signedDistanceToNewMoon(date) {
  const angle = tithiAngle(date);
  return angle > 180 ? angle - 360 : angle;
}

function bisectZero(left, right, fn) {
  let a = left.getTime();
  let b = right.getTime();
  let fa = fn(new Date(a));
  for (let i = 0; i < 48; i += 1) {
    const mid = (a + b) / 2;
    const fm = fn(new Date(mid));
    if (Math.sign(fm) === Math.sign(fa)) {
      a = mid;
      fa = fm;
    } else {
      b = mid;
    }
  }
  return new Date((a + b) / 2);
}

export function findNewMoonBefore(date) {
  let right = new Date(date);
  let left = new Date(right.getTime() - MS_PER_DAY);
  let prev = signedDistanceToNewMoon(right);
  for (let i = 0; i < 45; i += 1) {
    const current = signedDistanceToNewMoon(left);
    if (Math.sign(current) !== Math.sign(prev) && Math.abs(current - prev) < 120) {
      return bisectZero(left, right, signedDistanceToNewMoon);
    }
    right = left;
    prev = current;
    left = new Date(left.getTime() - MS_PER_DAY);
  }
  return null;
}

export function findNewMoonAfter(date) {
  let left = new Date(date);
  let right = new Date(left.getTime() + MS_PER_DAY);
  let prev = signedDistanceToNewMoon(left);
  for (let i = 0; i < 45; i += 1) {
    const current = signedDistanceToNewMoon(right);
    if (Math.sign(current) !== Math.sign(prev) && Math.abs(current - prev) < 120) {
      return bisectZero(left, right, signedDistanceToNewMoon);
    }
    left = right;
    prev = current;
    right = new Date(right.getTime() + MS_PER_DAY);
  }
  return null;
}

function rashiIndex(date) {
  return Math.floor(sunSiderealLongitude(date) / 30);
}

export function bengaliSolarMonthForDate(date) {
  const index = rashiIndex(date);
  return {
    name: BENGALI_SOLAR_MONTH_NAMES[index],
    rashi_index: index,
    solar_longitude: sunSiderealLongitude(date),
    calculation_model: "sidereal_solar_rashi"
  };
}

function sankrantisBetween(start, end) {
  const found = [];
  let cursor = new Date(start.getTime());
  let previous = rashiIndex(cursor);
  while (cursor < end) {
    const next = new Date(Math.min(cursor.getTime() + MS_PER_DAY, end.getTime()));
    const current = rashiIndex(next);
    if (current !== previous) {
      const boundary = bisectZero(cursor, next, (candidate) => {
        const target = current * 30;
        const diff = normalizeDegrees(sunSiderealLongitude(candidate) - target);
        return diff > 180 ? diff - 360 : diff;
      });
      found.push({ at: boundary, from: previous, to: current });
      previous = current;
    }
    cursor = next;
  }
  return found;
}

function classifyMasaInterval(start, end) {
  const sankrantis = sankrantisBetween(start, end);
  return {
    sankrantis,
    type: sankrantis.length === 0 ? "adhika" : sankrantis.length === 2 ? "kshaya" : "normal"
  };
}

function masaNameForStart(start) {
  const signAtStart = rashiIndex(start);
  return MASA_NAMES[(signAtStart + 1) % 12];
}

function gaudiyaMasaName(amantaName, paksha) {
  const index = MASA_NAMES.indexOf(amantaName);
  if (index === -1) return amantaName;
  const displayIndex = paksha === "Krishna" ? (index + 1) % GAUDIYA_MASA_NAMES.length : index;
  return GAUDIYA_MASA_NAMES[displayIndex];
}

function previousMasaType(start) {
  const previousStart = findNewMoonBefore(new Date(start.getTime() - MS_PER_DAY));
  if (!previousStart) return null;
  return classifyMasaInterval(previousStart, start).type;
}

function nextMasaType(end) {
  const nextEnd = findNewMoonAfter(new Date(end.getTime() + MS_PER_DAY));
  if (!nextEnd) return null;
  return classifyMasaInterval(end, nextEnd).type;
}

function displayMasaForInterval(name, type, start, end, paksha) {
  if (type === "adhika") {
    return {
      display_name: "Purushottama masa",
      display_model: "gaudiya_csm",
      display_part: "full",
      normal_masa_name: gaudiyaMasaName(name, "Gaura")
    };
  }

  const normalMasaName = gaudiyaMasaName(name, paksha);
  const followsAdhika = paksha === "Gaura" && previousMasaType(start) === "adhika";
  const precedesAdhika = paksha === "Krishna" && nextMasaType(end) === "adhika";
  const displayPart = followsAdhika ? "second_half" : precedesAdhika ? "first_half" : null;
  const suffix = displayPart === "first_half" ? " (1st half)" : displayPart === "second_half" ? " (2nd half)" : "";

  return {
    display_name: `${normalMasaName} masa${suffix}`,
    display_model: "gaudiya_csm",
    display_part: displayPart,
    normal_masa_name: normalMasaName
  };
}

export function masaForDate(date) {
  const start = findNewMoonBefore(date);
  const end = start ? findNewMoonAfter(new Date(start.getTime() + MS_PER_DAY)) : null;
  if (!start || !end) {
    return {
      name: "not implemented",
      type: "unknown",
      display_name: "not implemented",
      display_model: "gaudiya_csm",
      display_part: null,
      normal_masa_name: null,
      is_purushottama: false,
      sankranti_count: null,
      sankrantis: []
    };
  }

  const { sankrantis, type } = classifyMasaInterval(start, end);
  const name = masaNameForStart(start);
  const paksha = tithiAngle(date) < 180 ? "Gaura" : "Krishna";
  const display = displayMasaForInterval(name, type, start, end, paksha);
  return {
    name,
    type,
    calculation_model: "amavasya_to_amavasya_sankranti_count",
    bengali_solar_month: bengaliSolarMonthForDate(date),
    display_model: display.display_model,
    display_name: display.display_name,
    display_part: display.display_part,
    normal_masa_name: display.normal_masa_name,
    is_purushottama: type === "adhika",
    start_new_moon_utc: start,
    end_new_moon_utc: end,
    sankranti_count: sankrantis.length,
    sankrantis
  };
}
