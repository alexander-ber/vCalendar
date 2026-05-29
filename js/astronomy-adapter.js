import { MS_PER_DAY, MS_PER_MINUTE, localDateParts, zonedDateToUtc } from "./date-utils.js";

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;
const J2000 = 2451545.0;

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

export function sunLongitude(date) {
  const d = daysSinceJ2000(date);
  const g = normalizeDegrees(357.529 + 0.98560028 * d);
  const q = normalizeDegrees(280.459 + 0.98564736 * d);
  return normalizeDegrees(q + 1.915 * Math.sin(g * DEG) + 0.020 * Math.sin(2 * g * DEG));
}

export function moonLongitude(date) {
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

function solarNoonMinutes(dayOfYear, lon, timezoneOffsetMinutes) {
  const gamma = (2 * Math.PI / 365) * (dayOfYear - 1);
  const equationOfTime =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma));
  return 720 - 4 * lon - equationOfTime + timezoneOffsetMinutes;
}

function dayOfYear(year, month, day) {
  const start = Date.UTC(year, 0, 0);
  const current = Date.UTC(year, month - 1, day);
  return Math.floor((current - start) / MS_PER_DAY);
}

function timezoneOffsetMinutes(date, timezone) {
  const localAsUtc = zonedDateToUtc(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
    timezone
  );
  return (date.getTime() - localAsUtc.getTime()) / MS_PER_MINUTE;
}

function sunEventForDate(isoDate, location, zenithDegrees, isSunrise) {
  const { year, month, day } = localDateParts(isoDate);
  const noonUtc = zonedDateToUtc(year, month, day, 12, 0, 0, location.timezone);
  const tzOffset = timezoneOffsetMinutes(noonUtc, location.timezone);
  const n = dayOfYear(year, month, day);
  const gamma = (2 * Math.PI / 365) * (n - 1);
  const decl =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma);
  const latRad = location.lat * DEG;
  const zenith = zenithDegrees * DEG;
  const cosHourAngle = (Math.cos(zenith) / (Math.cos(latRad) * Math.cos(decl))) - Math.tan(latRad) * Math.tan(decl);
  if (cosHourAngle < -1 || cosHourAngle > 1) return null;
  const hourAngle = Math.acos(cosHourAngle) * RAD;
  const noonMinutes = solarNoonMinutes(n, location.lon, tzOffset);
  const localMinutes = isSunrise ? noonMinutes - 4 * hourAngle : noonMinutes + 4 * hourAngle;
  const hour = Math.floor(localMinutes / 60);
  const minute = Math.floor(localMinutes % 60);
  const second = Math.round((localMinutes - Math.floor(localMinutes)) * 60);
  return zonedDateToUtc(year, month, day, hour, minute, second, location.timezone);
}

export function dayAstronomy(isoDate, location, rules) {
  const sunrise = sunEventForDate(isoDate, location, 90.833, true);
  const sunset = sunEventForDate(isoDate, location, 90.833, false);
  const arunodaya = sunrise ? new Date(sunrise.getTime() - rules.ekadashi.arunodaya_offset_minutes * MS_PER_MINUTE) : null;
  return {
    sunrise,
    sunset,
    arunodaya,
    moonrise: null,
    moonset: null
  };
}
