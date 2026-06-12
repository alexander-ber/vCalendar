import { addDaysToLocalDate, formatDateTime, formatTime, toIsoDate } from "./date-utils.js?v=20260528-8";
import { dayAstronomy, tithiInfo } from "./astronomy-adapter.js?v=20260612-1";
import { computeParana } from "./parana-engine.js?v=20260612-1";
import { EKADASHI_DB } from "./ekadashi-data.js?v=20260530-2";
import { MASA_NAMES } from "./masa-engine.js?v=20260528-8";

function isEkadashi(number) {
  return number === 11 || number === 26;
}

function ekadashiRecord(masa, paksha) {
  const resolverMasa = paksha === "Krishna" ? MASA_NAMES[(MASA_NAMES.indexOf(masa.name) + 1) % MASA_NAMES.length] : masa.name;
  if (masa.type === "adhika") {
    return (
      EKADASHI_DB.find((entry) => entry.masa_type === "adhika" && entry.paksha === paksha) || {
        id: `adhika_${paksha.toLowerCase()}`,
        name: `Adhika ${paksha} Ekadashi`,
        description: "Adhika or Purushottama Masa Ekadashi."
      }
    );
  }
  return (
    EKADASHI_DB.find((entry) => entry.masa_type === "normal" && entry.masa === resolverMasa && entry.paksha === paksha) || {
      id: `${resolverMasa.toLowerCase()}_${paksha.toLowerCase()}`,
      name: `${resolverMasa} ${paksha} Ekadashi`,
      description: "Ekadashi name is not yet confirmed in the local database."
    }
  );
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
  if (insideStart) return { start: insideStart, end };
  return null;
}

export function classifyEkadashi(day, nextDay, location, rules, previousDay = null) {
  const previousAtSunrise = previousDay ? tithiInfo(previousDay.astronomy.sunrise) : null;
  const atArunodaya = tithiInfo(day.astronomy.arunodaya);
  const atSunrise = tithiInfo(day.astronomy.sunrise);
  const nextAtSunrise = tithiInfo(nextDay.astronomy.sunrise);
  const candidateDate = day.date;
  let classification = null;
  let fastDate = null;
  let targetNumber = null;

  if (atArunodaya.number === 10 && atSunrise.number === 11) {
    classification = "viddha";
    fastDate = nextDay.date;
    targetNumber = 11;
  } else if (atArunodaya.number === 25 && atSunrise.number === 26) {
    classification = "viddha";
    fastDate = nextDay.date;
    targetNumber = 26;
  } else if (previousAtSunrise?.number === atSunrise.number && isEkadashi(atSunrise.number)) {
    const trayodashiNumber = atSunrise.number === 11 ? 13 : 28;
    classification = nextAtSunrise.number === trayodashiNumber ? "unmilani_trisprsa" : "unmilani";
    fastDate = candidateDate;
    targetNumber = atSunrise.number;
  } else if (isEkadashi(atSunrise.number) && nextAtSunrise.number === atSunrise.number) {
    return null;
  } else if (isEkadashi(atSunrise.number) && nextAtSunrise.number === (atSunrise.number === 11 ? 13 : 28)) {
    classification = "trisprsa";
    fastDate = candidateDate;
    targetNumber = atSunrise.number;
  } else if (!isEkadashi(atSunrise.number) && !isEkadashi(nextAtSunrise.number)) {
    const gauraInterval = findTithiIntervalBetween(day.astronomy.sunrise, nextDay.astronomy.sunrise, 11);
    const krishnaInterval = findTithiIntervalBetween(day.astronomy.sunrise, nextDay.astronomy.sunrise, 26);
    const interval = gauraInterval || krishnaInterval;
    if (interval) {
      classification = "no_sunrise";
      fastDate = nextDay.date;
      targetNumber = gauraInterval ? 11 : 26;
    }
  } else if (isEkadashi(atSunrise.number)) {
    classification = "standard";
    fastDate = candidateDate;
    targetNumber = atSunrise.number;
  }

  if (!classification) return null;
  const paksha = targetNumber === 11 ? "Gaura" : "Krishna";
  const record = ekadashiRecord(day.masa, paksha);
  const fastDayType = classification === "standard" ? "normal_ekadashi" : classification;
  const parana = computeParana(fastDate, targetNumber, location, rules, tithiInfo, fastDayType);
  return {
    id: `ekadashi_${fastDate}`,
    name: record.name,
    ekadashi_id: record.id,
    description: record.description,
    benefits: record.benefits,
    story: record.story,
    source_url: record.source_url,
    i18n: record.i18n,
    type: "ekadashi",
    category: "vrata",
    classification,
    candidate_date: previousAtSunrise?.number === targetNumber && classification.startsWith("unmilani") ? previousDay.date : candidateDate,
    fast_date: fastDate,
    fast_day_type: fastDayType,
    parana,
    diagnostics: {
      sunrise: formatTime(day.astronomy.sunrise, location.timezone),
      arunodaya: formatTime(day.astronomy.arunodaya, location.timezone),
      tithi_at_arunodaya: atArunodaya.name,
      tithi_at_sunrise: atSunrise.name,
      next_sunrise_tithi: nextAtSunrise.name,
      rule_applied: classification
    }
  };
}

function classifyVyanjuliMahadvadashi(previousDay, day, nextDay, location, rules) {
  const previousAtSunrise = tithiInfo(previousDay.astronomy.sunrise);
  const todayAtSunrise = tithiInfo(day.astronomy.sunrise);
  const nextAtSunrise = tithiInfo(nextDay.astronomy.sunrise);
  const isGaura = previousAtSunrise.number === 11 && todayAtSunrise.number === 12 && nextAtSunrise.number === 12;
  const isKrishna = previousAtSunrise.number === 26 && todayAtSunrise.number === 27 && nextAtSunrise.number === 27;
  if (!isGaura && !isKrishna) return null;

  const targetNumber = isGaura ? 11 : 26;
  const paksha = isGaura ? "Gaura" : "Krishna";
  const record = ekadashiRecord(previousDay.masa, paksha);
  const parana = computeParana(day.date, targetNumber, location, rules, tithiInfo, "vyanjuli_mahadvadashi");
  return {
    id: `ekadashi_${day.date}`,
    name: record.name,
    ekadashi_id: record.id,
    description: record.description,
    benefits: record.benefits,
    story: record.story,
    source_url: record.source_url,
    i18n: record.i18n,
    type: "ekadashi",
    category: "vrata",
    classification: "vyanjuli_mahadvadashi",
    candidate_date: previousDay.date,
    fast_date: day.date,
    fast_day_type: "vyanjuli_mahadvadashi",
    parana,
    diagnostics: {
      previous_sunrise_tithi: previousAtSunrise?.name || null,
      tithi_at_sunrise: todayAtSunrise.name,
      next_sunrise_tithi: nextAtSunrise.name,
      rule_applied: "vyanjuli_mahadvadashi"
    }
  };
}

function noFastNoticeForEkadashiDay(day, ekadashi) {
  const ekadashiNameRu = ekadashi.i18n?.ru?.name || ekadashi.name;
  return {
    id: `ekadashi_no_fast_${day.date}`,
    name: `${day.lunar.tithi_at_sunrise.name} - no fast`,
    type: "ekadashi_notice",
    category: "vrata",
    description: `${ekadashi.name} fast is observed on ${ekadashi.fast_date} because ${ekadashi.classification.replaceAll("_", " ")} applies.`,
    i18n: {
      ru: {
        name: `${day.lunar.tithi_at_sunrise.name.replace("Gaura", "Гаура").replace("Krishna", "Кришна").replace("Ekadashi", "Экадаши")} — без поста`,
        description: `Пост ${ekadashiNameRu} соблюдается ${ekadashi.fast_date}, потому что применяется правило ${ekadashi.classification.replaceAll("_", " ")}.`
      }
    }
  };
}

export function paranaEventForDate(date, ekadashi, timezone) {
  if (ekadashi.parana.date !== date) return null;
  const absoluteEnd = ekadashi.parana.absolute_end;
  const absoluteEndLabel =
    absoluteEnd && toIsoDate(absoluteEnd, timezone) === date ? formatTime(absoluteEnd, timezone) : formatDateTime(absoluteEnd, timezone);
  const ekadashiNameRu = ekadashi.i18n?.ru?.name || ekadashi.name;
  const description =
    ekadashi.parana.preferred_window_status === "unavailable_after_hari_vasara"
      ? "Preferred pratah-kala window is unavailable because Hari-vasara ends after it."
      : "Parana window calculated from Dvadashi, sunrise, and Hari-vasara.";
  return {
    id: `parana_${ekadashi.id}`,
    name: `Parana for ${ekadashi.name}`,
    type: "parana",
    category: "vrata",
    parana: {
      start: formatTime(ekadashi.parana.start, timezone),
      preferred_end: ekadashi.parana.preferred_end ? formatTime(ekadashi.parana.preferred_end, timezone) : "not available",
      absolute_end: absoluteEndLabel,
      preferred_window_status: ekadashi.parana.preferred_window_status || "available"
    },
    description,
    i18n: {
      ru: {
        name: `Паран для ${ekadashiNameRu}`,
        description:
          ekadashi.parana.preferred_window_status === "unavailable_after_hari_vasara"
            ? "Желательное окно пратах-калы недоступно, потому что Хари-васара заканчивается позже."
            : "Окно парана рассчитано по Двадаши, восходу и Хари-васаре."
      }
    }
  };
}

export function buildEkadashiEvents(days, location, rules) {
  const byDate = new Map();
  const suppressedCandidateDates = new Set();
  const scheduledFastDates = new Set();

  for (let i = 1; i < days.length - 1; i += 1) {
    const mahadvadashi = classifyVyanjuliMahadvadashi(days[i - 1], days[i], days[i + 1], location, rules);
    if (!mahadvadashi) continue;
    suppressedCandidateDates.add(mahadvadashi.candidate_date);
    if (!byDate.has(mahadvadashi.fast_date)) byDate.set(mahadvadashi.fast_date, []);
    byDate.get(mahadvadashi.fast_date).push(mahadvadashi);
    scheduledFastDates.add(mahadvadashi.fast_date);

    if (!byDate.has(mahadvadashi.candidate_date)) byDate.set(mahadvadashi.candidate_date, []);
    byDate.get(mahadvadashi.candidate_date).push(noFastNoticeForEkadashiDay(days[i - 1], mahadvadashi));

    const paranaDate = addDaysToLocalDate(mahadvadashi.fast_date, 1);
    const parana = paranaEventForDate(paranaDate, mahadvadashi, location.timezone);
    if (parana) {
      if (!byDate.has(paranaDate)) byDate.set(paranaDate, []);
      byDate.get(paranaDate).push(parana);
    }
  }

  for (let i = 0; i < days.length - 1; i += 1) {
    if (suppressedCandidateDates.has(days[i].date)) continue;
    const ekadashi = classifyEkadashi(days[i], days[i + 1], location, rules, days[i - 1] || null);
    if (!ekadashi) continue;
    if (scheduledFastDates.has(ekadashi.fast_date)) continue;
    if (!byDate.has(ekadashi.fast_date)) byDate.set(ekadashi.fast_date, []);
    byDate.get(ekadashi.fast_date).push(ekadashi);
    scheduledFastDates.add(ekadashi.fast_date);

    if (ekadashi.candidate_date !== ekadashi.fast_date) {
      const candidateDay = days.find((day) => day.date === ekadashi.candidate_date);
      if (candidateDay) {
        if (!byDate.has(ekadashi.candidate_date)) byDate.set(ekadashi.candidate_date, []);
        byDate.get(ekadashi.candidate_date).push(noFastNoticeForEkadashiDay(candidateDay, ekadashi));
      }
    }

    const paranaDate = addDaysToLocalDate(ekadashi.fast_date, 1);
    const parana = paranaEventForDate(paranaDate, ekadashi, location.timezone);
    if (parana) {
      if (!byDate.has(paranaDate)) byDate.set(paranaDate, []);
      byDate.get(paranaDate).push(parana);
    }
  }
  return byDate;
}
