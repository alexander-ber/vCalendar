import { dayAstronomy, nakshatraInfo, tithiInfo, yogaInfo } from "./astronomy-adapter.js?v=20260701-1";
import {
  addDaysToLocalDate,
  daysInMonth,
  formatDateTime,
  formatTime,
  monthLabel,
  partsInTimeZone,
  toIsoDate,
  weekdayOfIsoDate,
  zonedDateToUtc
} from "./date-utils.js?v=20260528-8";
import { masaForDate } from "./masa-engine.js?v=20260701-1";
import { buildEkadashiEvents } from "./ekadashi-engine.js?v=20260703-1";
import { matchEventsForDay } from "./event-matcher.js?v=20260703-1";

function buildDay(isoDate, location, rules) {
  const astronomy = dayAstronomy(isoDate, location, rules);
  const sunriseTithi = tithiInfo(astronomy.sunrise);
  const arunodayaTithi = tithiInfo(astronomy.arunodaya);
  const sunriseNakshatra = nakshatraInfo(astronomy.sunrise);
  const sunriseYoga = yogaInfo(astronomy.sunrise);
  const currentTithiBoundary = findTithiStartBefore(astronomy.sunrise, sunriseTithi.number);
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
      nakshatra_at_sunrise: sunriseNakshatra,
      yoga_at_sunrise: sunriseYoga,
      current_tithi_boundary: currentTithiBoundary,
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

function findTithiStartBefore(start, tithiNumber) {
  let right = new Date(start);
  let left = new Date(right.getTime() - 60 * 60 * 1000);
  const min = start.getTime() - 48 * 60 * 60 * 1000;
  while (left.getTime() >= min) {
    if (tithiInfo(left).number !== tithiNumber && tithiInfo(right).number === tithiNumber) {
      for (let i = 0; i < 42; i += 1) {
        const mid = new Date((left.getTime() + right.getTime()) / 2);
        if (tithiInfo(mid).number === tithiNumber) right = mid;
        else left = mid;
      }
      return right;
    }
    right = left;
    left = new Date(left.getTime() - 60 * 60 * 1000);
  }
  return null;
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

function tithiDistance(previousNumber, currentNumber) {
  return (currentNumber - previousNumber + 30) % 30;
}

function missingTithisBetween(previousNumber, currentNumber) {
  const distance = tithiDistance(previousNumber, currentNumber);
  if (distance <= 1) return [];
  const missing = [];
  let number = previousNumber;
  for (let i = 1; i < distance; i += 1) {
    number = number === 30 ? 1 : number + 1;
    missing.push(number);
  }
  return missing;
}

function findTithiIntervalBetween(start, end, targetNumber) {
  const step = 30 * 60 * 1000;
  let cursor = new Date(start);
  let insideStart = null;
  while (cursor <= end) {
    const current = tithiInfo(cursor);
    if (current.number === targetNumber && !insideStart) insideStart = new Date(cursor);
    if (insideStart && current.number !== targetNumber) return { start: insideStart, end: new Date(cursor) };
    cursor = new Date(cursor.getTime() + step);
  }
  return insideStart ? { start: insideStart, end } : null;
}

function annotateTithiStatuses(days) {
  for (let i = 1; i < days.length; i += 1) {
    const previous = days[i - 1];
    const current = days[i];
    const previousNumber = previous.lunar.tithi_at_sunrise.number;
    const currentNumber = current.lunar.tithi_at_sunrise.number;
    const missing = missingTithisBetween(previousNumber, currentNumber);
    const vriddhi = previousNumber === currentNumber;
    const ksaya = missing.length > 0;
    current.lunar.tithi_status = {
      type: vriddhi ? "vriddhi_second_day" : ksaya ? "ksaya" : "normal",
      is_vriddhi_second_day: vriddhi,
      is_ksaya: ksaya,
      missing_tithi_numbers: missing,
      missing_tithi_intervals: missing
        .map((number) => {
          const interval = findTithiIntervalBetween(previous.astronomy.sunrise, current.astronomy.sunrise, number);
          return interval ? { number, start: interval.start, end: interval.end } : { number, start: null, end: null };
        })
        .filter(Boolean)
    };
  }
  if (days[0]) {
    days[0].lunar.tithi_status = {
      type: "unknown",
      is_vriddhi_second_day: false,
      is_ksaya: false,
      missing_tithi_numbers: [],
      missing_tithi_intervals: []
    };
  }
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

const RASHI_NAMES = [
  "Mesha",
  "Vrishabha",
  "Mithuna",
  "Karka",
  "Simha",
  "Kanya",
  "Tula",
  "Vrischika",
  "Dhanus",
  "Makara",
  "Kumbha",
  "Mina"
];

function sankrantiDisplayDate(sankranti, timezone, mode = "noon") {
  const date = toIsoDate(sankranti.at, timezone);
  const parts = partsInTimeZone(sankranti.at, timezone);
  const boundaryHour = mode === "midnight" ? 0 : mode === "sunrise" ? 6 : mode === "sunset" ? 18 : 12;
  const boundary = zonedDateToUtc(parts.year, parts.month, parts.day, boundaryHour, 0, 0, timezone);
  return sankranti.at <= boundary ? date : addDaysToLocalDate(date, 1);
}

function sankrantiEvent(sankranti, date, timezone) {
  const rashi = RASHI_NAMES[sankranti.to] || `Rashi ${sankranti.to + 1}`;
  return {
    id: `sankranti_${rashi.toLowerCase()}_${date}`,
    name: `${rashi} Sankranti`,
    type: "sankranti",
    category: "sankranti",
    description: `${rashi} Sankranti occurs at ${formatDateTime(sankranti.at, timezone)}. Display date uses GCAL noon-to-noon default.`,
    i18n: {
      ru: {
        name: `${rashi} санкранти`,
        description: `${rashi} санкранти наступает ${formatDateTime(sankranti.at, timezone)}. Дата показа рассчитана по GCAL-режиму noon-to-noon.`
      }
    }
  };
}

function sankrantiDependentEvent(kind, date) {
  const eventMap = {
    ganga_sagara: {
      name: "Ganga Sagara Mela",
      ruName: "Ганга Сагара Мела",
      description: "Observed on Makara Sankranti."
    },
    tulasi_begin: {
      name: "Tulasi Jala Dan begins",
      ruName: "Начало Туласи Джала Дан",
      description: "Begins on Mesha Sankranti."
    },
    tulasi_end: {
      name: "Tulasi Jala Dan ends",
      ruName: "Окончание Туласи Джала Дан",
      description: "Ends one day before Vrishabha Sankranti."
    }
  };
  const item = eventMap[kind];
  return {
    id: `sankranti_dependent_${kind}_${date}`,
    name: item.name,
    type: "sankranti_dependent",
    category: "sankranti",
    description: item.description,
    i18n: {
      ru: {
        name: item.ruName,
        description: item.description
      }
    }
  };
}

function addEventOnce(day, event) {
  if (!day || day.events.some((existing) => existing.id === event.id)) return;
  day.events.push(event);
}

function cloneAnchoredEvent(event, anchorDay) {
  return {
    ...event,
    calculated_from_event_id: event.anchor_event_id,
    anchor_date: anchorDay.date
  };
}

function addAnchorDependentEvents(days, events) {
  const byDate = new Map(days.map((day) => [day.date, day]));
  const dependentEvents = events.filter((event) => !event.disabled && event.anchor_event_id);
  if (!dependentEvents.length) return;

  for (const anchorDay of days) {
    for (const anchorEvent of anchorDay.events) {
      for (const dependent of dependentEvents) {
        if (dependent.anchor_event_id !== anchorEvent.id) continue;
        const offset = Number(dependent.observance_offset_days || 0);
        const targetDay = byDate.get(addDaysToLocalDate(anchorDay.date, offset));
        addEventOnce(targetDay, cloneAnchoredEvent(dependent, anchorDay));
      }
    }
  }
}

function isBhishmaPanchakaDay(day) {
  const tithi = day.lunar.tithi_at_sunrise.number;
  return day.masa.normal_masa_name === "Damodara" && day.lunar.paksha === "Gaura" && tithi >= 11 && tithi <= 15;
}

function hasBhishmaPanchakaEvent(day) {
  return day.events.some((event) => {
    const haystack = [event.id, event.name, event.subject, event.i18n?.en?.name, event.i18n?.ru?.name].filter(Boolean).join(" ");
    return /bhishma|bkhishma|бхишма/i.test(haystack);
  });
}

function bhishmaPanchakaActiveEvent(day) {
  return {
    id: `bhishma_panchaka_active_${day.date}`,
    name: "Bhishma Panchaka",
    type: "festival",
    category: "festival",
    description: "Bhishma Panchaka is active: the five-day observance from Damodara/Kartika Gaura Ekadashi through Damodara Purnima.",
    i18n: {
      en: {
        name: "Bhishma Panchaka",
        description: "Bhishma Panchaka is active: the five-day observance from Damodara/Kartika Gaura Ekadashi through Damodara Purnima.",
        full_description:
          "Bhishma Panchaka is active. These are the final five days of Karttik, observed from Gaura Ekadashi through Purnima in Damodara/Kartika masa. Devotees may take a special vrata with increased chanting, hearing, prayer, worship, and a suitable dietary restriction."
      },
      ru: {
        name: "Бхишма Панчака",
        description: "Идёт Бхишма Панчака: пятидневный обет от Дамодара/Картика Гаура Экадаши до Дамодара Пурнимы.",
        full_description:
          "Идёт Бхишма Панчака. Это последние пять дней Карттика, которые соблюдаются от Гаура Экадаши до Пурнимы в Дамодара/Картика масе. Преданные могут принимать особый обет с усиленным повторением Святого Имени, слушанием, молитвой, поклонением и подходящим ограничением в пище."
      }
    }
  };
}

function addBhishmaPanchakaActiveEvents(days) {
  for (const day of days) {
    if (isBhishmaPanchakaDay(day) && !hasBhishmaPanchakaEvent(day)) {
      addEventOnce(day, bhishmaPanchakaActiveEvent(day));
    }
  }
}

function addSankrantiEvents(days, location) {
  const byDate = new Map(days.map((day) => [day.date, day]));
  const seen = new Set();
  for (const day of days) {
    for (const sankranti of day.masa.sankrantis || []) {
      const key = sankranti.at.toISOString();
      if (seen.has(key)) continue;
      seen.add(key);
      const date = sankrantiDisplayDate(sankranti, location.timezone);
      addEventOnce(byDate.get(date), sankrantiEvent(sankranti, date, location.timezone));
      if (sankranti.to === 9) addEventOnce(byDate.get(date), sankrantiDependentEvent("ganga_sagara", date));
      if (sankranti.to === 0) addEventOnce(byDate.get(date), sankrantiDependentEvent("tulasi_begin", date));
      if (sankranti.to === 1) {
        const previousDate = addDaysToLocalDate(date, -1);
        addEventOnce(byDate.get(previousDate), sankrantiDependentEvent("tulasi_end", previousDate));
      }
    }
  }
}

function attachEvents(days, location, rules, events) {
  const ekadashiByDate = buildEkadashiEvents(days, location, rules);
  const shiftedEventsByDate = new Map();
  for (let i = 0; i < days.length; i += 1) {
    const day = days[i];
    const generatedEvents = matchEventsForDay(day, events, location.timezone, days[i + 1] || null, days[i - 1] || null, ekadashiByDate);
    const vrataEvents = ekadashiByDate.get(day.date) || [];
    const currentShiftedEvents = shiftedEventsByDate.get(day.date) || [];
    const currentGeneratedEvents = generatedEvents.filter((event) => {
      const offset = Number(event.observance_offset_days || 0);
      if (!offset) return true;
      const targetDay = days[i + offset];
      if (!targetDay) return false;
      if (!shiftedEventsByDate.has(targetDay.date)) shiftedEventsByDate.set(targetDay.date, []);
      shiftedEventsByDate.get(targetDay.date).push(event);
      return false;
    });
    day.events = [...vrataEvents, ...currentGeneratedEvents, ...currentShiftedEvents];
  }
  addAnchorDependentEvents(days, events);
  addPurushottamaBoundaryEvents(days);
  addBhishmaPanchakaActiveEvents(days);
  addSankrantiEvents(days, location);
}

export function generateCalendar(year, month, location, rules, events) {
  const first = `${year}-${String(month).padStart(2, "0")}-01`;
  const startOffset = weekdayOfIsoDate(first);
  const visibleStart = addDaysToLocalDate(first, -startOffset);
  const total = Math.ceil((startOffset + daysInMonth(year, month)) / 7) * 7;
  const days = [];

  for (let i = -10; i < total + 10; i += 1) {
    days.push(buildDay(addDaysToLocalDate(visibleStart, i), location, rules));
  }

  annotateTithiStatuses(days);
  attachEvents(days, location, rules, events);

  return {
    title: monthLabel(year, month),
    days: days.slice(10, total + 10),
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
  let cursor = addDaysToLocalDate(startDate, -10);
  const last = addDaysToLocalDate(endDate, 10);
  while (cursor <= last) {
    days.push(buildDay(cursor, location, rules));
    cursor = addDaysToLocalDate(cursor, 1);
  }

  annotateTithiStatuses(days);
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
  const tithiStart = day.lunar.current_tithi_boundary;
  const tithiEnd = day.lunar.next_tithi_boundary;
  const moonset = day.astronomy.moonset_after_moonrise || day.astronomy.moonset;
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
    moonset: formatTime(moonset, day.location.timezone),
    moonriseFull: formatDateTime(day.astronomy.moonrise, day.location.timezone),
    moonsetFull: formatDateTime(moonset, day.location.timezone),
    moonAngle: day.lunar.tithi_angle_at_sunrise.toFixed(2),
    arunodaya: formatTime(day.astronomy.arunodaya, day.location.timezone),
    masa: day.masa.display_name,
    tithi: day.lunar.tithi_at_sunrise.name,
    tithiStart: tithiStart ? formatBoundary(tithiStart, day.date, day.location.timezone) : "not implemented",
    tithiStartFull: tithiStart ? formatDateTime(tithiStart, day.location.timezone) : "not implemented",
    tithiEnd: tithiEnd ? formatBoundary(tithiEnd, day.date, day.location.timezone) : "not implemented",
    tithiEndFull: tithiEnd ? formatDateTime(tithiEnd, day.location.timezone) : "not implemented",
    arunodayaTithi: day.lunar.tithi_at_arunodaya.name,
    paksha: day.lunar.paksha,
    angle: day.lunar.tithi_angle_at_sunrise.toFixed(2),
    events: day.events
  };
}

function formatBoundary(date, isoDate, timezone) {
  return toIsoDate(date, timezone) === isoDate ? formatTime(date, timezone) : formatDateTime(date, timezone);
}
