import { nakshatraInfo, tithiInfo } from "./astronomy-adapter.js?v=20260528-8";
import { zonedDateToUtc } from "./date-utils.js?v=20260528-8";

function tithiShortName(fullName) {
  if (fullName === "Purnima" || fullName === "Amavasya") return fullName;
  return fullName.replace("Gaura ", "").replace("Krishna ", "");
}

function tithiAtRuleTime(day, event, timezone) {
  if (event.timing_rule === "sunrise_based") return day.lunar.tithi_at_sunrise;
  const [year, month, date] = day.date.split("-").map(Number);
  if (event.timing_rule === "noon_based") return tithiInfo(zonedDateToUtc(year, month, date, 12, 0, 0, timezone));
  if (event.timing_rule === "midnight_based") return tithiInfo(zonedDateToUtc(year, month, date, 0, 0, 0, timezone));
  return day.lunar.tithi_at_sunrise;
}

function tithiMatches(info, event) {
  return info.paksha === event.paksha && tithiShortName(info.name) === event.tithi;
}

const TITHI_SHORT_NUMBERS = {
  Pratipat: 1,
  Dvitiya: 2,
  Tritiya: 3,
  Chaturthi: 4,
  Panchami: 5,
  Shashthi: 6,
  Saptami: 7,
  Ashtami: 8,
  Navami: 9,
  Dashami: 10,
  Ekadashi: 11,
  Dvadashi: 12,
  Trayodashi: 13,
  Chaturdashi: 14,
  Purnima: 15,
  Amavasya: 30
};

function targetTithiNumber(event) {
  if (event.tithi === "Purnima") return 15;
  if (event.tithi === "Amavasya") return 30;
  const base = TITHI_SHORT_NUMBERS[event.tithi];
  if (!base) return null;
  return event.paksha === "Krishna" ? base + 15 : base;
}

function previousTithiNumber(number) {
  return number === 1 ? 30 : number - 1;
}

function nextTithiNumber(number) {
  return number === 30 ? 1 : number + 1;
}

function isPreviousOrEarlierInPaksha(previous, target) {
  if (target === 1) return previous === 30;
  if (target === 16) return previous === 15;
  if (target > 1 && target <= 15) return previous >= 1 && previous < target;
  return previous >= 16 && previous < target;
}

function masaMatches(day, event) {
  if (event.gaudiya_masa) return day.masa.normal_masa_name === event.gaudiya_masa;
  return day.lunar.masa === event.masa;
}

function tithiNumber(day) {
  return day.lunar.tithi_at_sunrise.number;
}

function localWeekday(isoDate) {
  return new Date(`${isoDate}T12:00:00Z`).getUTCDay();
}

function midnightNakshatraNumber(day, timezone) {
  const [year, month, date] = day.date.split("-").map(Number);
  return nakshatraInfo(zonedDateToUtc(year, month, date, 0, 0, 0, timezone)).number;
}

function selectJanmashtamiDoubleAstami(day1, day2, timezone) {
  const day1MidnightRohini = midnightNakshatraNumber(day1, timezone) === 4;
  const day2MidnightRohini = midnightNakshatraNumber(day2, timezone) === 4;
  if (day1MidnightRohini && !day2MidnightRohini) return day1;
  if (!day1MidnightRohini && day2MidnightRohini) return day2;

  const day1Rohini = day1.lunar.nakshatra_at_sunrise.number === 4;
  const day2Rohini = day2.lunar.nakshatra_at_sunrise.number === 4;
  if (day1Rohini && !day2Rohini) return day1;
  if (!day1Rohini && day2Rohini) return day2;

  const weekday = localWeekday(day1.date);
  return weekday === 2 || weekday === 0 ? day2 : day1;
}

function matchJanmashtami(day, event, timezone, previousDay, nextDay) {
  if (!masaMatches(day, event) || day.lunar.masa_type === "adhika") return false;
  const previous = previousDay ? tithiNumber(previousDay) : null;
  const today = tithiNumber(day);
  const tomorrow = nextDay ? tithiNumber(nextDay) : null;
  const saptami = 22;
  const astami = 23;
  const navami = 24;

  if (previous === saptami && today === astami && tomorrow === navami) return true;
  if (previous === saptami && today === navami) return true;

  if (today === astami && tomorrow === astami && nextDay) {
    return selectJanmashtamiDoubleAstami(day, nextDay, timezone).date === day.date;
  }
  if (previous === astami && today === astami && previousDay) {
    return selectJanmashtamiDoubleAstami(previousDay, day, timezone).date === day.date;
  }

  return false;
}

function matchGovardhanaPuja(day, event, previousDay, nextDay) {
  if (!masaMatches(day, event) || day.lunar.paksha !== "Gaura" || day.lunar.masa_type === "adhika") return false;
  const previous = previousDay ? tithiNumber(previousDay) : null;
  const today = tithiNumber(day);
  const tomorrow = nextDay ? tithiNumber(nextDay) : null;
  const pratipat = 1;
  const dvitiya = 2;
  const amavasya = 30;

  if (previous === pratipat && today === pratipat) return false;
  if (today === pratipat && tomorrow === pratipat && nextDay) {
    return Boolean(day.astronomy.moonrise && day.astronomy.moonrise > day.astronomy.sunrise && day.astronomy.moonrise < nextDay.astronomy.sunrise);
  }
  if (today === pratipat) return true;
  return previous === amavasya && today === dvitiya;
}

function matchGauraPurnima(day, event, previousDay) {
  if (!previousDay || day.lunar.masa_type === "adhika") return false;
  const previous = tithiNumber(previousDay);
  const today = tithiNumber(day);
  const previousInGovinda = previousDay.masa.normal_masa_name === "Govinda" || previousDay.lunar.masa === event.masa;
  const todayInGovinda = day.masa.normal_masa_name === "Govinda" || day.lunar.masa === event.masa;
  const todayInVishnu = day.masa.normal_masa_name === "Vishnu";
  if (previous < 15 && today === 15 && todayInGovinda) return true;
  if (previous < 15 && today === 16 && previousInGovinda && todayInVishnu) return true;
  if (previous === 15 && today === 15 && previousInGovinda) return false;
  return false;
}

function tomorrowHasEkadashiFast(nextDay, ekadashiByDate) {
  if (!nextDay || !ekadashiByDate) return false;
  return Boolean((ekadashiByDate.get(nextDay.date) || []).some((event) => event.type === "ekadashi" && event.fast_date === nextDay.date));
}

function matchRamaNavami(day, event, previousDay, nextDay, ekadashiByDate) {
  if (!previousDay || !masaMatches(day, event) || day.lunar.paksha !== "Gaura" || day.lunar.masa_type === "adhika") return false;
  const previous = tithiNumber(previousDay);
  const today = tithiNumber(day);
  const tomorrow = nextDay ? tithiNumber(nextDay) : null;
  if (previous === 8 && today === 9 && tomorrow === 10) return true;
  if (previous === 8 && today === 9 && tomorrow === 9) return true;
  if (previous === 8 && today === 10 && tomorrow === 10) return true;
  if (previous === 8 && today === 10 && !tomorrowHasEkadashiFast(nextDay, ekadashiByDate)) return true;
  if (previous === 8 && today === 10 && tomorrowHasEkadashiFast(nextDay, ekadashiByDate)) return false;
  return false;
}

function matchRathaYatra(day, event, previousDay) {
  if (!previousDay || !masaMatches(day, event) || day.lunar.paksha !== "Gaura" || day.lunar.masa_type === "adhika") return false;
  const previous = tithiNumber(previousDay);
  const today = tithiNumber(day);
  if (previous < 2 && today === 2) return true;
  if (previous === 1 && today === 3) return true;
  if (previous === 2 && today === 2) return false;
  return false;
}

function isRathaYatraEvent(event) {
  return event.id === "ratha_yatra" || event.id.includes("ratha_yatra") || event.id.includes("ратха_ятра") || /ratha yatra/i.test(event.name || "");
}

function matchSpecialEvent(day, event, timezone, nextDay, previousDay, ekadashiByDate) {
  if (event.id === "janmashtami") return matchJanmashtami(day, event, timezone, previousDay, nextDay);
  if (event.id === "gaura_purnima") return matchGauraPurnima(day, event, previousDay);
  if (event.id === "rama_navami") return matchRamaNavami(day, event, previousDay, nextDay, ekadashiByDate);
  if (event.id.includes("govardhana") || event.id.includes("говардхана")) return matchGovardhanaPuja(day, event, previousDay, nextDay);
  if (isRathaYatraEvent(event)) return matchRathaYatra(day, event, previousDay);
  return null;
}

function matchGenericGcalTithiEvent(day, event, nextDay, previousDay) {
  if (event.timing_rule && event.timing_rule !== "sunrise_based") return null;
  if (!nextDay || !previousDay) return null;
  const target = targetTithiNumber(event);
  if (!target) return null;

  const previous = previousDay.lunar.tithi_at_sunrise.number;
  const today = day.lunar.tithi_at_sunrise.number;
  const tomorrow = nextDay.lunar.tithi_at_sunrise.number;
  const beforeTarget = previousTithiNumber(target);
  const afterTarget = nextTithiNumber(target);

  if (today === target && tomorrow === target) return true;
  if (previous === beforeTarget && today === afterTarget) return true;
  if (isPreviousOrEarlierInPaksha(previous, target) && today === target && tomorrow === afterTarget) return true;
  return false;
}

export function matchEventsForDay(day, events, timezone, nextDay = null, previousDay = null, ekadashiByDate = null) {
  return events.filter((event) => {
    if (event.disabled) return false;
    if (event.anchor_event_id) return false;
    if (event.source_status === "needs_exact_lunar_rule") return false;
    if (!event.masa && !event.gaudiya_masa) return false;
    if (!event.paksha || !event.tithi) return false;
    const special = matchSpecialEvent(day, event, timezone, nextDay, previousDay, ekadashiByDate);
    if (special !== null) return special;
    if (!masaMatches(day, event)) return false;
    if (day.lunar.masa_type === "adhika" && !event.allow_in_adhika) return false;
    const genericGcal = matchGenericGcalTithiEvent(day, event, nextDay, previousDay);
    if (genericGcal !== null) return genericGcal;
    const ruleTithi = tithiAtRuleTime(day, event, timezone);
    return tithiMatches(ruleTithi, event);
  });
}
