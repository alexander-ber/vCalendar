import { dayAstronomy, tithiInfo } from "./astronomy-adapter.js?v=20260530-2";
import { addDaysToLocalDate, daysInMonth, formatDateTime, formatTime, monthLabel, toIsoDate, weekdayOfIsoDate } from "./date-utils.js?v=20260528-8";
import { masaForDate } from "./masa-engine.js?v=20260528-18";
import { buildEkadashiEvents } from "./ekadashi-engine.js?v=20260530-3";
import { matchEventsForDay } from "./event-matcher.js?v=20260530-1";

function buildDay(isoDate, location, rules) {
  const astronomy = dayAstronomy(isoDate, location, rules);
  const sunriseTithi = tithiInfo(astronomy.sunrise);
  const arunodayaTithi = tithiInfo(astronomy.arunodaya);
  const nextTithiBoundary = findTithiEndAfter(astronomy.sunrise, sunriseTithi.number);
  const masa = masaForDate(astronomy.sunrise);
  return {
    date: isoDate,
    location,
    astronomy,
    masa,
    lunar: {
      masa: masa.name,
      masa_display: masa.display_name,
      masa_type: masa.type,
      is_purushottama: masa.is_purushottama,
      paksha: sunriseTithi.paksha,
      tithi_at_sunrise: sunriseTithi,
      tithi_at_arunodaya: arunodayaTithi,
      tithi_angle_at_sunrise: sunriseTithi.angle,
      next_tithi_boundary: nextTithiBoundary
    },
    events: [],
    diagnostics: {
      rules_version: rules.rules_version,
      engine_version: "poc-approximate-local-js",
      calculation_note:
        "POC astronomy uses approximate browser formulas. External Panchang data is not used as runtime source."
    }
  };
}

function findTithiEndAfter(start, tithiNumber) {
  let left = new Date(start);
  let right = new Date(left.getTime() + 60 * 60 * 1000);
  const max = start.getTime() + 48 * 60 * 60 * 1000;
  while (right.getTime() <= max) {
    if (tithiInfo(left).number === tithiNumber && tithiInfo(right).number !== tithiNumber) {
      for (let i = 0; i < 42; i += 1) {
        const mid = new Date((left.getTime() + right.getTime()) / 2);
        if (tithiInfo(mid).number === tithiNumber) left = mid;
        else right = mid;
      }
      return right;
    }
    left = right;
    right = new Date(right.getTime() + 60 * 60 * 1000);
  }
  return null;
}

function addPurushottamaBoundaryEvents(days) {
  for (let i = 0; i < days.length; i += 1) {
    const previous = days[i - 1];
    const current = days[i];
    const next = days[i + 1];
    if (current.lunar.masa_type === "adhika" && previous?.lunar.masa_type !== "adhika") {
      current.events.push({
        id: `purushottama_start_${current.date}`,
        name: "Start of Purushottama Masa",
        type: "purushottama_boundary",
        category: "masa",
        description: "Purushottama Masa begins according to the local sunrise-based calendar display.",
        i18n: {
          ru: {
            name: "Начало Пурушоттама",
            description: "Пурушоттама маса начинается по локальному календарному дню на восходе."
          }
        }
      });
    }
    if (current.lunar.masa_type === "adhika" && next?.lunar.masa_type !== "adhika") {
      current.events.push({
        id: `purushottama_end_${current.date}`,
        name: "End of Purushottama Masa",
        type: "purushottama_boundary",
        category: "masa",
        description: "Purushottama Masa ends after this local calendar day.",
        i18n: {
          ru: {
            name: "Окончание Пурушоттама",
            description: "Пурушоттама маса заканчивается после этого локального календарного дня."
          }
        }
      });
    }
  }
}

function attachEvents(days, location, rules, events) {
  const ekadashiByDate = buildEkadashiEvents(days, location, rules);
  for (let i = 0; i < days.length; i += 1) {
    const day = days[i];
    const generatedEvents = matchEventsForDay(day, events, location.timezone, days[i + 1] || null);
    const vrataEvents = ekadashiByDate.get(day.date) || [];
    day.events = [...vrataEvents, ...generatedEvents];
  }
  addPurushottamaBoundaryEvents(days);
}

export function generateCalendar(year, month, location, rules, events) {
  const first = `${year}-${String(month).padStart(2, "0")}-01`;
  const startOffset = weekdayOfIsoDate(first);
  const visibleStart = addDaysToLocalDate(first, -startOffset);
  const total = Math.ceil((startOffset + daysInMonth(year, month)) / 7) * 7;
  const days = [];

  for (let i = -2; i < total + 3; i += 1) {
    days.push(buildDay(addDaysToLocalDate(visibleStart, i), location, rules));
  }

  attachEvents(days, location, rules, events);

  return {
    title: monthLabel(year, month),
    days: days.slice(2, total + 2),
    location,
    meta: {
      year,
      month,
      visibleStart,
      timezone: location.timezone
    }
  };
}

export function generateCalendarRange(startDate, endDate, location, rules, events) {
  const days = [];
  let cursor = addDaysToLocalDate(startDate, -2);
  const last = addDaysToLocalDate(endDate, 2);
  while (cursor <= last) {
    days.push(buildDay(cursor, location, rules));
    cursor = addDaysToLocalDate(cursor, 1);
  }

  attachEvents(days, location, rules, events);
  const visibleDays = days.filter((day) => day.date >= startDate && day.date <= endDate);
  return {
    title: `${startDate} - ${endDate}`,
    days: visibleDays,
    location,
    meta: {
      startDate,
      endDate,
      timezone: location.timezone
    }
  };
}

export function viewModelForDay(day) {
  const tithiEnd = day.lunar.next_tithi_boundary;
  return {
    date: day.date,
    gregorian: new Intl.DateTimeFormat("en", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC"
    }).format(new Date(`${day.date}T12:00:00Z`)),
    sunrise: formatTime(day.astronomy.sunrise, day.location.timezone),
    sunset: formatTime(day.astronomy.sunset, day.location.timezone),
    moonrise: formatTime(day.astronomy.moonrise, day.location.timezone),
    moonset: formatTime(day.astronomy.moonset, day.location.timezone),
    moonAngle: day.lunar.tithi_angle_at_sunrise.toFixed(2),
    arunodaya: formatTime(day.astronomy.arunodaya, day.location.timezone),
    masa: day.masa.display_name,
    tithi: day.lunar.tithi_at_sunrise.name,
    tithiEnd: tithiEnd ? formatBoundary(tithiEnd, day.date, day.location.timezone) : "not implemented",
    arunodayaTithi: day.lunar.tithi_at_arunodaya.name,
    paksha: day.lunar.paksha,
    angle: day.lunar.tithi_angle_at_sunrise.toFixed(2),
    events: day.events
  };
}

function formatBoundary(date, isoDate, timezone) {
  return toIsoDate(date, timezone) === isoDate ? formatTime(date, timezone) : formatDateTime(date, timezone);
}
