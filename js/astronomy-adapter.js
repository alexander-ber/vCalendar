import { Body, EclipticGeoMoon, Observer, SearchRiseSet, SunPosition } from "../vendor/astronomy-engine.js";
import { MS_PER_DAY, MS_PER_MINUTE, addDaysToLocalDate, localDateParts, zonedDateToUtc } from "./date-utils.js";

const DEG = Math.PI / 180;
const J2000 = 2451545.0;
const SURYA_SIDDHANTA_CIVIL_DAYS_PER_MAHAYUGA = 1577917800;
const SURYA_SIDDHANTA_SUN_REVS_PER_MAHAYUGA = 4320000;
const SURYA_SIDDHANTA_MOON_REVS_PER_MAHAYUGA = 57753336;
const KALI_YUGA_EPOCH_JD = 588465.5;

export const NAKSHATRA_NAMES = [
  "Ashvini",
  "Bharani",
  "Krittika",
  "Rohini",
  "Mrigashirsha",
  "Ardra",
  "Punarvasu",
  "Pushya",
  "Ashlesha",
  "Magha",
  "Purva Phalguni",
  "Uttara Phalguni",
  "Hasta",
  "Chitra",
  "Swati",
  "Vishakha",
  "Anuradha",
  "Jyeshtha",
  "Mula",
  "Purva Ashadha",
  "Uttara Ashadha",
  "Shravana",
  "Dhanishtha",
  "Shatabhisha",
  "Purva Bhadrapada",
  "Uttara Bhadrapada",
  "Revati"
];

export const YOGA_NAMES = [
  "Vishkambha",
  "Priti",
  "Ayushman",
  "Saubhagya",
  "Shobhana",
  "Atiganda",
  "Sukarma",
  "Dhriti",
  "Shula",
  "Ganda",
  "Vriddhi",
  "Dhruva",
  "Vyaghata",
  "Harshana",
  "Vajra",
  "Siddhi",
  "Vyatipata",
  "Variyan",
  "Parigha",
  "Shiva",
  "Siddha",
  "Sadhya",
  "Shubha",
  "Shukla",
  "Brahma",
  "Indra",
  "Vaidhriti"
];

export const TITHI_NAMES = [
  "Gaura Pratipat",
  "Gaura Dvitiya",
  "Gaura Tritiya",
  "Gaura Chaturthi",
  "Gaura Panchami",
  "Gaura Shashthi",
  "Gaura Saptami",
  "Gaura Ashtami",
  "Gaura Navami",
  "Gaura Dashami",
  "Gaura Ekadashi",
  "Gaura Dvadashi",
  "Gaura Trayodashi",
  "Gaura Chaturdashi",
  "Purnima",
  "Krishna Pratipat",
  "Krishna Dvitiya",
  "Krishna Tritiya",
  "Krishna Chaturthi",
  "Krishna Panchami",
  "Krishna Shashthi",
  "Krishna Saptami",
  "Krishna Ashtami",
  "Krishna Navami",
  "Krishna Dashami",
  "Krishna Ekadashi",
  "Krishna Dvadashi",
  "Krishna Trayodashi",
  "Krishna Chaturdashi",
  "Amavasya"
];

export function normalizeDegrees(value) {
  return ((value % 360) + 360) % 360;
}

function julianDay(date) {
  return date.getTime() / MS_PER_DAY + 2440587.5;
}

function daysSinceJ2000(date) {
  return julianDay(date) - J2000;
}

export function ayanamsha(date) {
  const yearsFrom2000 = (julianDay(date) - J2000) / 365.2422;
  return 23.8531 + 0.013968 * yearsFrom2000;
}

export function approximateSunLongitude(date) {
  const d = daysSinceJ2000(date);
  const g = normalizeDegrees(357.529 + 0.98560028 * d);
  const q = normalizeDegrees(280.459 + 0.98564736 * d);
  return normalizeDegrees(q + 1.915 * Math.sin(g * DEG) + 0.020 * Math.sin(2 * g * DEG));
}

export function approximateMoonLongitude(date) {
  const d = daysSinceJ2000(date);
  const l0 = normalizeDegrees(218.316 + 13.176396 * d);
  const mMoon = normalizeDegrees(134.963 + 13.064993 * d);
  const mSun = normalizeDegrees(357.529 + 0.98560028 * d);
  const dMoon = normalizeDegrees(297.850 + 12.190749 * d);
  const f = normalizeDegrees(93.272 + 13.229350 * d);

  return normalizeDegrees(
    l0 +
      6.289 * Math.sin(mMoon * DEG) +
      1.274 * Math.sin((2 * dMoon - mMoon) * DEG) +
      0.658 * Math.sin(2 * dMoon * DEG) +
      0.214 * Math.sin(2 * mMoon * DEG) -
      0.186 * Math.sin(mSun * DEG) -
      0.114 * Math.sin(2 * f * DEG)
  );
}

export function sunLongitude(date) {
  return approximateSunLongitude(date);
}

export function moonLongitude(date) {
  return approximateMoonLongitude(date);
}

export function ephemerisSunLongitude(date) {
  return normalizeDegrees(SunPosition(date).elon);
}

export function ephemerisMoonLongitude(date) {
  return normalizeDegrees(EclipticGeoMoon(date).lon);
}

export function ephemerisTithiAngle(date) {
  return normalizeDegrees(ephemerisMoonLongitude(date) - ephemerisSunLongitude(date));
}

export function suryaSiddhantaMeanTithiAngle(date) {
  const ahargana = julianDay(date) - KALI_YUGA_EPOCH_JD;
  const relativeRevolutions =
    SURYA_SIDDHANTA_MOON_REVS_PER_MAHAYUGA - SURYA_SIDDHANTA_SUN_REVS_PER_MAHAYUGA;
  return normalizeDegrees((ahargana * relativeRevolutions * 360) / SURYA_SIDDHANTA_CIVIL_DAYS_PER_MAHAYUGA);
}

export function sunSiderealLongitude(date) {
  return normalizeDegrees(sunLongitude(date) - ayanamsha(date));
}

export function tithiAngle(date) {
  return normalizeDegrees(moonLongitude(date) - sunLongitude(date));
}

export function tithiInfo(date) {
  const angle = tithiAngle(date);
  const number = Math.floor(angle / 12) + 1;
  const paksha = number <= 15 ? "Gaura" : "Krishna";
  const name = TITHI_NAMES[number - 1];
  return { number, name, paksha, angle };
}

export function nakshatraInfo(date) {
  const longitude = normalizeDegrees(moonLongitude(date) - ayanamsha(date));
  const span = 360 / 27;
  const number = Math.floor(longitude / span) + 1;
  return {
    number,
    name: NAKSHATRA_NAMES[number - 1],
    longitude,
    pada: Math.floor((longitude % span) / (span / 4)) + 1
  };
}

export function yogaInfo(date) {
  const sum = normalizeDegrees(sunSiderealLongitude(date) + normalizeDegrees(moonLongitude(date) - ayanamsha(date)));
  const span = 360 / 27;
  const number = Math.floor(sum / span) + 1;
  return {
    number,
    name: YOGA_NAMES[number - 1],
    angle: sum
  };
}

function astroDate(value) {
  if (!value) return null;
  return value.date instanceof Date ? value.date : new Date(value);
}

function observerForLocation(location) {
  return new Observer(location.lat, location.lon, Number(location.elevation_m || 0));
}

function localDayBounds(isoDate, timezone) {
  const { year, month, day } = localDateParts(isoDate);
  const start = zonedDateToUtc(year, month, day, 0, 0, 0, timezone);
  const end = zonedDateToUtc(year, month, day, 23, 59, 59, timezone);
  return { start, end };
}

function localRiseSet(body, location, isoDate, direction) {
  const observer = observerForLocation(location);
  const { start, end } = localDayBounds(isoDate, location.timezone);
  const found = astroDate(SearchRiseSet(body, observer, direction, start, 1.2));
  return found && found >= start && found <= end ? found : null;
}

function nextRiseSetAfter(body, location, isoDate, direction, after) {
  if (!after) return null;
  for (let offset = 0; offset <= 2; offset += 1) {
    const found = localRiseSet(body, location, addDaysToLocalDate(isoDate, offset), direction);
    if (found && found > after) return found;
  }
  return null;
}

export function arunodayaForDay(isoDate, location, sunrise, rules) {
  if (!sunrise) return null;
  const ekadashiRules = rules?.ekadashi || {};
  const mode = ekadashiRules.arunodaya_mode || "fixed_offset";

  if (mode === "previous_night_fraction") {
    const previousSunset = localRiseSet(Body.Sun, location, addDaysToLocalDate(isoDate, -1), -1);
    if (previousSunset) {
      const fraction = Number(ekadashiRules.arunodaya_night_fraction || 1 / 15);
      return new Date(sunrise.getTime() - (sunrise.getTime() - previousSunset.getTime()) * fraction);
    }
  }

  return new Date(sunrise.getTime() - (ekadashiRules.arunodaya_offset_minutes || 96) * MS_PER_MINUTE);
}

export function dayAstronomy(isoDate, location, rules) {
  const sunrise = localRiseSet(Body.Sun, location, isoDate, +1);
  const sunset = localRiseSet(Body.Sun, location, isoDate, -1);
  const arunodaya = arunodayaForDay(isoDate, location, sunrise, rules);
  const moonrise = localRiseSet(Body.Moon, location, isoDate, +1);
  const moonset = localRiseSet(Body.Moon, location, isoDate, -1);
  const moonsetAfterMoonrise = moonrise ? nextRiseSetAfter(Body.Moon, location, isoDate, -1, moonrise) : moonset;
  return {
    sunrise,
    sunset,
    arunodaya,
    moonrise,
    moonset,
    moonset_after_moonrise: moonsetAfterMoonrise
  };
}
