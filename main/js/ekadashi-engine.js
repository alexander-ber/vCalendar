import { addDaysToLocalDate, formatDateTime, formatTime, toIsoDate } from "./date-utils.js?v=20260528-8";
import { nakshatraInfo, tithiInfo } from "./astronomy-adapter.js?v=20260613-2";
import { computeParana } from "./parana-engine.js?v=20260613-2";
import { EKADASHI_DB } from "./ekadashi-data.js?v=20260615-1";
import { MASA_NAMES } from "./masa-engine.js?v=20260528-8";

function isEkadashi(number) {
  return number === 11 || number === 26;
}

function isDvadashi(number) {
  return number === 12 || number === 27;
}

function isDashamiBeforeEkadashi(arunodayaNumber, sunriseNumber) {
  return (arunodayaNumber === 10 && sunriseNumber === 11) || (arunodayaNumber === 25 && sunriseNumber === 26);
}

function previousTithiNumber(number) {
  return number === 1 ? 30 : number - 1;
}

function nextTithiNumber(number) {
  return number === 30 ? 1 : number + 1;
}

function isLessThanEkadashiInPaksha(number, ekadashiNumber) {
  return ekadashiNumber === 11 ? number >= 1 && number < 11 : number >= 16 && number < 26;
}

function tithiShortName(fullName) {
  if (fullName === "Purnima" || fullName === "Amavasya") return fullName;
  return fullName.replace("Gaura ", "").replace("Krishna ", "");
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

function hasTargetTithiBetweenSunrises(day, nextDay, targetNumber) {
  if (!day || !nextDay) return false;
  return Boolean(findTithiIntervalBetween(day.astronomy.sunrise, nextDay.astronomy.sunrise, targetNumber));
}

function isDashamiSunriseBeforePostSunriseEkadashi(day, nextDay, targetNumber) {
  return day?.lunar.tithi_at_sunrise.number === previousTithiNumber(targetNumber) && hasTargetTithiBetweenSunrises(day, nextDay, targetNumber);
}

function findTithiEndAfter(start, targetNumber, maxHours = 48) {
  let left = new Date(start);
  let right = new Date(left.getTime() + 60 * 60 * 1000);
  const max = start.getTime() + maxHours * 60 * 60 * 1000;
  while (right.getTime() <= max) {
    if (tithiInfo(left).number === targetNumber && tithiInfo(right).number !== targetNumber) {
      for (let i = 0; i < 40; i += 1) {
        const mid = new Date((left.getTime() + right.getTime()) / 2);
        if (tithiInfo(mid).number === targetNumber) left = mid;
        else right = mid;
      }
      return right;
    }
    left = right;
    right = new Date(right.getTime() + 60 * 60 * 1000);
  }
  return null;
}

function findNakshatraEndAfter(start, targetNumber, maxHours = 48) {
  let left = new Date(start);
  let right = new Date(left.getTime() + 60 * 60 * 1000);
  const max = start.getTime() + maxHours * 60 * 60 * 1000;
  while (right.getTime() <= max) {
    if (nakshatraInfo(left).number === targetNumber && nakshatraInfo(right).number !== targetNumber) {
      for (let i = 0; i < 40; i += 1) {
        const mid = new Date((left.getTime() + right.getTime()) / 2);
        if (nakshatraInfo(mid).number === targetNumber) left = mid;
        else right = mid;
      }
      return right;
    }
    left = right;
    right = new Date(right.getTime() + 60 * 60 * 1000);
  }
  return null;
}

function hasVriddhiFullOrNewMoonAhead(days, index) {
  for (let i = index + 1; i < days.length - 1; i += 1) {
    const current = days[i].lunar.tithi_at_sunrise.number;
    if (current !== 15 && current !== 30) continue;
    return days[i + 1]?.lunar.tithi_at_sunrise.number === current;
  }
  return false;
}

function nakshatraMahadvadashiType(day, nextDay) {
  if (day.lunar.tithi_at_sunrise.number !== 12) return null;
  const todayNakshatra = day.lunar.nakshatra_at_sunrise;
  const nextNakshatra = nextDay?.lunar.nakshatra_at_sunrise;
  const candidates = [
    { number: 22, classification: "vijaya_mahadvadashi", paranaType: "jayanti_vijaya" },
    { number: 7, classification: "jaya_mahadvadashi", paranaType: "jaya_papanasini" },
    { number: 4, classification: "jayanti_mahadvadashi", paranaType: "jayanti_vijaya" },
    { number: 8, classification: "papanasini_mahadvadashi", paranaType: "jaya_papanasini" }
  ];
  return candidates.find((candidate) => todayNakshatra.number === candidate.number && nextNakshatra?.number === candidate.number) || null;
}

function paranaForNakshatraMahadvadashi(fastDate, ekadashiNumber, location, rules, day, mahadvadashiType) {
  const base = computeParana(fastDate, ekadashiNumber, location, rules, tithiInfo, mahadvadashiType.paranaType);
  if (!base.start || !base.preferred_end) return base;

  const nakshatraNumber = day.lunar.nakshatra_at_sunrise.number;
  const nakshatraEnd = findNakshatraEndAfter(day.astronomy.sunrise, nakshatraNumber);
  const dvadashiEnd = findTithiEndAfter(day.astronomy.sunrise, 12);
  if (!nakshatraEnd || !dvadashiEnd) return base;

  const daylightThird = base.diagnostics?.pratah_end || base.preferred_end;
  let start = day.astronomy.sunrise;
  let preferredEnd = new Date(Math.min(dvadashiEnd.getTime(), daylightThird.getTime()));
  let preferredWindowStatus = "available";

  if (nakshatraEnd.getTime() < dvadashiEnd.getTime() && nakshatraEnd.getTime() < daylightThird.getTime()) {
    start = nakshatraEnd;
    preferredEnd = new Date(Math.min(dvadashiEnd.getTime(), daylightThird.getTime()));
  } else if (nakshatraEnd.getTime() < dvadashiEnd.getTime() && nakshatraEnd.getTime() >= daylightThird.getTime()) {
    start = nakshatraEnd;
    preferredEnd = dvadashiEnd;
  } else if (day.lunar.tithi_at_sunrise.number !== 12 && nakshatraEnd.getTime() < daylightThird.getTime()) {
    start = nakshatraEnd;
    preferredEnd = daylightThird;
  } else if (day.lunar.tithi_at_sunrise.number !== 12) {
    start = nakshatraEnd;
    preferredEnd = null;
    preferredWindowStatus = "after_nakshatra";
  }

  return {
    ...base,
    start,
    preferred_end: preferredEnd,
    absolute_end: preferredEnd || base.absolute_end,
    preferred_window_status: preferredWindowStatus,
    diagnostics: {
      ...base.diagnostics,
      nakshatra_end: nakshatraEnd,
      nakshatra_parana_type: mahadvadashiType.paranaType
    }
  };
}

function buildEkadashiEvent({
  day,
  location,
  rules,
  targetNumber,
  classification,
  candidateDate,
  fastDate,
  fastDayType,
  paranaType,
  noFastReason = null,
  mahadvadashiType = null
}) {
  const paksha = targetNumber === 11 ? "Gaura" : "Krishna";
  const record = ekadashiRecord(day.masa, paksha);
  const parana =
    mahadvadashiType && (mahadvadashiType.paranaType === "jayanti_vijaya" || mahadvadashiType.paranaType === "jaya_papanasini")
      ? paranaForNakshatraMahadvadashi(fastDate, targetNumber, location, rules, day, mahadvadashiType)
      : computeParana(fastDate, targetNumber, location, rules, tithiInfo, paranaType || fastDayType);

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
    target_number: targetNumber,
    classification,
    candidate_date: candidateDate,
    candidate_no_fast_reason: noFastReason,
    fast_date: fastDate,
    fast_day_type: fastDayType,
    parana_type: paranaType || fastDayType,
    parana,
    diagnostics: {
      sunrise: formatTime(day.astronomy.sunrise, location.timezone),
      arunodaya: formatTime(day.astronomy.arunodaya, location.timezone),
      tithi_at_arunodaya: day.lunar.tithi_at_arunodaya.name,
      tithi_at_sunrise: day.lunar.tithi_at_sunrise.name,
      rule_applied: classification
    }
  };
}

function classifyDvadashiMahadvadashi(days, index, location, rules) {
  const previousDay = days[index - 1];
  const day = days[index];
  const nextDay = days[index + 1];
  if (!previousDay || !nextDay || !isDvadashi(day.lunar.tithi_at_sunrise.number)) return null;

  const todayNumber = day.lunar.tithi_at_sunrise.number;
  const targetNumber = todayNumber === 12 ? 11 : 26;
  const previousAtArunodaya = previousDay.lunar.tithi_at_arunodaya.number;
  const previousAtSunrise = previousDay.lunar.tithi_at_sunrise.number;
  const nextAtSunrise = nextDay.lunar.tithi_at_sunrise.number;
  const candidateDate = previousDay.date;

  if (todayNumber === 12) {
    const nakshatraType = nakshatraMahadvadashiType(day, nextDay);
    if (nakshatraType) {
      return buildEkadashiEvent({
        day,
        location,
        rules,
        targetNumber,
        classification: nakshatraType.classification,
        candidateDate,
        fastDate: day.date,
        fastDayType: nakshatraType.classification,
        paranaType: nakshatraType.paranaType,
        noFastReason: "nakshatra_mahadvadashi",
        mahadvadashiType: nakshatraType
      });
    }
  }

  if (nextAtSunrise === todayNumber && isEkadashi(previousAtSunrise) && previousDay.lunar.tithi_at_arunodaya.number === previousAtSunrise) {
    return buildEkadashiEvent({
      day,
      location,
      rules,
      targetNumber,
      classification: "vyanjuli_mahadvadashi",
      candidateDate,
      fastDate: day.date,
      fastDayType: "vyanjuli_mahadvadashi",
      paranaType: "vyanjuli_mahadvadashi",
      noFastReason: "next_day_is_vyanjuli_mahadvadashi"
    });
  }

  if (hasVriddhiFullOrNewMoonAhead(days, index)) {
    return buildEkadashiEvent({
      day,
      location,
      rules,
      targetNumber,
      classification: "paksavardhini_mahadvadashi",
      candidateDate,
      fastDate: day.date,
      fastDayType: "paksavardhini_mahadvadashi",
      paranaType: nextAtSunrise === nextTithiNumber(todayNumber) ? "viddha" : "vyanjuli_mahadvadashi",
      noFastReason: "next_full_or_new_moon_is_vriddhi"
    });
  }

  if (isLessThanEkadashiInPaksha(previousAtArunodaya, targetNumber)) {
    const paranaType = nextAtSunrise === nextTithiNumber(todayNumber) ? "viddha" : "vyanjuli_mahadvadashi";
    return buildEkadashiEvent({
      day,
      location,
      rules,
      targetNumber,
      classification: "dvadashi_suitable_for_ekadashi_fasting",
      candidateDate,
      fastDate: day.date,
      fastDayType: "dvadashi_suitable_for_ekadashi_fasting",
      paranaType,
      noFastReason: "dashami_viddha_at_arunodaya"
    });
  }

  return null;
}

function classifyEkadashiDay(days, index, location, rules, mahadvadashiByDate) {
  const previousDay = days[index - 1];
  const day = days[index];
  const nextDay = days[index + 1];
  if (!nextDay || !isEkadashi(day.lunar.tithi_at_sunrise.number)) return null;

  const targetNumber = day.lunar.tithi_at_sunrise.number;
  const trayodashiNumber = targetNumber === 11 ? 13 : 28;
  const dvadashiNumber = targetNumber === 11 ? 12 : 27;
  const previousAtArunodaya = previousDay?.lunar.tithi_at_arunodaya.number;
  const previousAtSunrise = previousDay?.lunar.tithi_at_sunrise.number;
  const atArunodaya = day.lunar.tithi_at_arunodaya.number;
  const atSunrise = day.lunar.tithi_at_sunrise.number;
  const nextAtSunrise = nextDay.lunar.tithi_at_sunrise.number;
  const tomorrowMahadvadashi = mahadvadashiByDate.get(nextDay.date);
  const previousDayHasPostSunriseEkadashi = isDashamiSunriseBeforePostSunriseEkadashi(previousDay, day, targetNumber);
  const shiftedCandidateDate = previousDayHasPostSunriseEkadashi ? previousDay.date : day.date;
  const shiftedNoFastReason = previousDayHasPostSunriseEkadashi ? "dashami_viddha_at_sunrise" : null;

  if (isDashamiBeforeEkadashi(atArunodaya, atSunrise)) {
    return {
      noFastOnly: true,
      candidateDate: day.date,
      targetNumber,
      reason: "dashami_viddha_at_arunodaya"
    };
  }

  if (previousAtSunrise === targetNumber && previousAtArunodaya !== targetNumber && atArunodaya === targetNumber) {
    const classification = nextAtSunrise === trayodashiNumber ? "trisprsa_after_dashami_viddha" : "suddha_after_dashami_viddha";
    const paranaType = nextAtSunrise === trayodashiNumber ? "trisprsa" : "normal_ekadashi";
    return buildEkadashiEvent({
      day,
      location,
      rules,
      targetNumber,
      classification,
      candidateDate: previousDay.date,
      fastDate: day.date,
      fastDayType: classification,
      paranaType,
      noFastReason: "dashami_viddha_at_arunodaya"
    });
  }

  if (previousAtArunodaya === targetNumber && previousAtSunrise === targetNumber && atArunodaya === targetNumber && nextAtSunrise === trayodashiNumber) {
    return buildEkadashiEvent({
      day,
      location,
      rules,
      targetNumber,
      classification: "unmilani_trisprsa",
      candidateDate: previousDay.date,
      fastDate: day.date,
      fastDayType: "unmilani_trisprsa",
      paranaType: "unmilani_trisprsa",
      noFastReason: "today_is_unmilani_trisprsa"
    });
  }

  if (previousAtArunodaya === targetNumber && previousAtSunrise === targetNumber && atArunodaya === targetNumber && nextAtSunrise === dvadashiNumber) {
    return buildEkadashiEvent({
      day,
      location,
      rules,
      targetNumber,
      classification: "unmilani",
      candidateDate: previousDay.date,
      fastDate: day.date,
      fastDayType: "unmilani",
      paranaType: "unmilani",
      noFastReason: "today_is_unmilani"
    });
  }

  if (previousAtSunrise !== targetNumber && atArunodaya === targetNumber && nextAtSunrise === trayodashiNumber) {
    return buildEkadashiEvent({
      day,
      location,
      rules,
      targetNumber,
      classification: previousDayHasPostSunriseEkadashi ? "trisprsa_after_dashami_sunrise" : "trisprsa",
      candidateDate: shiftedCandidateDate,
      fastDate: day.date,
      fastDayType: previousDayHasPostSunriseEkadashi ? "trisprsa_after_dashami_sunrise" : "trisprsa",
      paranaType: "trisprsa",
      noFastReason: shiftedNoFastReason
    });
  }

  if (nextAtSunrise === targetNumber) {
    return {
      noFastOnly: true,
      candidateDate: day.date,
      targetNumber,
      reason: "tomorrow_is_unmilani"
    };
  }

  if (tomorrowMahadvadashi) {
    return {
      noFastOnly: true,
      candidateDate: day.date,
      targetNumber,
      reason: tomorrowMahadvadashi.classification
    };
  }

  if (previousAtSunrise !== targetNumber && atArunodaya === targetNumber && nextAtSunrise === dvadashiNumber) {
    return buildEkadashiEvent({
      day,
      location,
      rules,
      targetNumber,
      classification: previousDayHasPostSunriseEkadashi ? "suddha_after_dashami_sunrise" : "suddha_ekadashi",
      candidateDate: shiftedCandidateDate,
      fastDate: day.date,
      fastDayType: previousDayHasPostSunriseEkadashi ? "suddha_after_dashami_sunrise" : "normal_ekadashi",
      paranaType: "normal_ekadashi",
      noFastReason: shiftedNoFastReason
    });
  }

  return null;
}

function classifyNoSunriseEkadashi(days, index, location, rules) {
  const day = days[index];
  const nextDay = days[index + 1];
  if (!nextDay) return null;
  if (isEkadashi(day.lunar.tithi_at_sunrise.number) || isEkadashi(nextDay.lunar.tithi_at_sunrise.number)) return null;

  const gauraInterval = findTithiIntervalBetween(day.astronomy.sunrise, nextDay.astronomy.sunrise, 11);
  const krishnaInterval = findTithiIntervalBetween(day.astronomy.sunrise, nextDay.astronomy.sunrise, 26);
  const targetNumber = gauraInterval ? 11 : krishnaInterval ? 26 : null;
  if (!targetNumber) return null;

  return buildEkadashiEvent({
    day,
    location,
    rules,
    targetNumber,
    classification: "no_sunrise",
    candidateDate: day.date,
    fastDate: nextDay.date,
    fastDayType: "no_sunrise",
    paranaType: "no_sunrise",
    noFastReason: "ekadashi_has_no_sunrise"
  });
}

function noFastNoticeForEkadashiDay(day, ekadashiOrReason, targetNumber = null) {
  const ekadashi = ekadashiOrReason?.type === "ekadashi" ? ekadashiOrReason : null;
  const reason = ekadashi?.candidate_no_fast_reason || ekadashiOrReason?.reason || "not_suitable_for_fast";
  const reasonDetails = {
    dashami_viddha_at_arunodaya: {
      en: "Dashami is still present at arunodaya, so this Ekadashi is Dashami-viddha and is not accepted as the fasting day. The fast is observed on the next suitable solar day.",
      ru: "На арунодае ещё присутствует Дашами, поэтому эта Экадаши считается Дашами-виддха и не принимается как день поста. Пост соблюдается в следующий подходящий солнечный день."
    },
    dashami_viddha_at_sunrise: {
      en: "The solar day begins with Dashami at sunrise and Ekadashi starts later. Therefore this civil date is not the fasting day; the fast is observed on the next suitable sunrise day.",
      ru: "Солнечный день начинается с Дашами на восходе, а Экадаши наступает позже. Поэтому эта гражданская дата не является днём поста; пост соблюдается в следующий подходящий день на восходе."
    },
    tomorrow_is_unmilani: {
      en: "Ekadashi is present at two consecutive sunrises. By the Unmilani Mahadvadashi rule, the first solar day is observed without fasting and the fast is kept on the second day.",
      ru: "Экадаши присутствует на двух восходах подряд. По правилу Унмилани Махадвадаши первый солнечный день проходит без поста, а пост соблюдается во второй день."
    },
    today_is_unmilani: {
      en: "Ekadashi extends across two consecutive sunrises, so by the Unmilani Mahadvadashi rule the fast is observed on the second solar day.",
      ru: "Экадаши растягивается на два восхода подряд, поэтому по правилу Унмилани Махадвадаши пост соблюдается во второй солнечный день."
    },
    today_is_unmilani_trisprsa: {
      en: "Ekadashi is present at two consecutive sunrises and Trayodashi is present at the following sunrise. This combination forms Unmilani Trisprsa Mahadvadashi, so the fast is observed on the second Ekadashi sunrise.",
      ru: "Экадаши присутствует на двух восходах подряд, а на следующем восходе уже наступает Трайодаши. Такое сочетание образует Унмилани Триспрша Махадвадаши, поэтому пост соблюдается во второй день Экадаши."
    },
    next_day_is_vyanjuli_mahadvadashi: {
      en: "Dvadashi extends across two consecutive sunrises after a pure Ekadashi. By the Vyanjuli Mahadvadashi rule, the fast is observed on the first Dvadashi sunrise instead of the preceding Ekadashi day.",
      ru: "После чистой Экадаши Двадаши растягивается на два восхода подряд. По правилу Вьянджули Махадвадаши пост соблюдается в первый день Двадаши, а не в предшествующий день Экадаши."
    },
    next_full_or_new_moon_is_vriddhi: {
      en: "By the Paksavardhini Mahadvadashi rule, when the Purnima or Amavasya at the end of the paksha extends across two solar days, the Ekadashi fast is observed on the following Dvadashi.",
      ru: "По правилу Пакшавардхини Махадвадаши, если в конце этой пакши Пурнима или Амавасья растягивается на два солнечных дня, пост переносится с Экадаши на следующую Двадаши."
    },
    paksavardhini_mahadvadashi: {
      en: "Purnima or Amavasya at the end of this paksha extends across two solar days. By the Paksavardhini Mahadvadashi rule, the fast is observed on Dvadashi.",
      ru: "Пурнима или Амавасья в конце этой пакши растягивается на два солнечных дня. По правилу Пакшавардхини Махадвадаши пост соблюдается на Двадаши."
    },
    vyanjuli_mahadvadashi: {
      en: "Dvadashi extends across two consecutive sunrises after a pure Ekadashi. By the Vyanjuli Mahadvadashi rule, the fast is observed on the first Dvadashi sunrise.",
      ru: "После чистой Экадаши Двадаши растягивается на два восхода подряд. По правилу Вьянджули Махадвадаши пост соблюдается в первый день Двадаши."
    },
    nakshatra_mahadvadashi: {
      en: "The Dvadashi sunrise and its nakshatra satisfy one of the special Jaya, Vijaya, Jayanti, or Papanasini Mahadvadashi combinations. Therefore the fast is observed on this Dvadashi.",
      ru: "Двадаши на восходе и её накшатра образуют одно из особых сочетаний Джая, Виджая, Джаянти или Папанашини Махадвадаши. Поэтому пост соблюдается в эту Двадаши."
    },
    jaya_mahadvadashi: {
      en: "Gaura Dvadashi and the required Punarvasu nakshatra combination form Jaya Mahadvadashi, so the fast is observed on this Dvadashi.",
      ru: "Гаура Двадаши и требуемое сочетание с накшатрой Пунарвасу образуют Джая Махадвадаши, поэтому пост соблюдается в эту Двадаши."
    },
    vijaya_mahadvadashi: {
      en: "Gaura Dvadashi and the required Shravana nakshatra combination form Vijaya Mahadvadashi, so the fast is observed on this Dvadashi.",
      ru: "Гаура Двадаши и требуемое сочетание с накшатрой Шравана образуют Виджая Махадвадаши, поэтому пост соблюдается в эту Двадаши."
    },
    jayanti_mahadvadashi: {
      en: "Gaura Dvadashi and the required Rohini nakshatra combination form Jayanti Mahadvadashi, so the fast is observed on this Dvadashi.",
      ru: "Гаура Двадаши и требуемое сочетание с накшатрой Рохини образуют Джаянти Махадвадаши, поэтому пост соблюдается в эту Двадаши."
    },
    papanasini_mahadvadashi: {
      en: "Gaura Dvadashi and the required Pushya nakshatra combination form Papanasini Mahadvadashi, so the fast is observed on this Dvadashi.",
      ru: "Гаура Двадаши и требуемое сочетание с накшатрой Пушья образуют Папанашини Махадвадаши, поэтому пост соблюдается в эту Двадаши."
    },
    ekadashi_has_no_sunrise: {
      en: "Ekadashi begins after one sunrise and ends before the next, so it does not touch any sunrise. The fast is therefore observed on the next suitable solar day.",
      ru: "Экадаши начинается после одного восхода и заканчивается до следующего, поэтому не попадает ни на один восход. Пост переносится на следующий подходящий солнечный день."
    },
    not_suitable_for_fast: {
      en: "The sunrise and tithi conditions do not satisfy the rules for an Ekadashi fasting day, so the fast is assigned to the next suitable day.",
      ru: "Условия титхи на восходе не соответствуют правилам дня поста Экадаши, поэтому пост назначается на следующий подходящий день."
    }
  }[reason];
  const reasonLabel = reason.replaceAll("_", " ");
  const ekadashiNameRu = ekadashi?.i18n?.ru?.name || ekadashi?.name || "Экадаши";
  const fastDate = ekadashi?.fast_date || ekadashiOrReason?.fastDate || null;
  const tithiName = day.lunar.tithi_at_sunrise.name;
  const resolvedTargetNumber = targetNumber || ekadashi?.target_number || null;
  const targetLabel = resolvedTargetNumber ? (resolvedTargetNumber === 11 ? "Gaura Ekadashi" : "Krishna Ekadashi") : tithiName;
  return {
    id: `ekadashi_no_fast_${day.date}_${reason}`,
    name: `${targetLabel} - no fast`,
    type: "ekadashi_notice",
    category: "vrata",
    candidate_no_fast_reason: reason,
    description: fastDate
      ? `${ekadashi?.name || "Ekadashi"} fast is observed on ${fastDate} because ${reasonLabel} applies.${reasonDetails ? ` ${reasonDetails.en}` : ""}`
      : `Ekadashi is not suitable for fast because ${reasonLabel} applies.${reasonDetails ? ` ${reasonDetails.en}` : ""}`,
    i18n: {
      ru: {
        name: `${targetLabel.replace("Gaura", "Гаура").replace("Krishna", "Кришна").replace("Ekadashi", "Экадаши")} — без поста`,
        description: fastDate
          ? `Пост ${ekadashiNameRu} соблюдается ${fastDate}, потому что применяется правило ${reasonLabel}.${reasonDetails ? ` ${reasonDetails.ru}` : ""}`
          : `Этот день не подходит для поста Экадаши: ${reasonLabel}.${reasonDetails ? ` ${reasonDetails.ru}` : ""}`
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
      one_fifth_end: ekadashi.parana.one_fifth_end ? formatTime(ekadashi.parana.one_fifth_end, timezone) : "not available",
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

function addEvent(byDate, date, event) {
  if (!byDate.has(date)) byDate.set(date, []);
  if (byDate.get(date).some((existing) => existing.id === event.id)) return;
  byDate.get(date).push(event);
}

function scheduleEkadashi(byDate, ekadashi, days, timezone) {
  addEvent(byDate, ekadashi.fast_date, ekadashi);
  if (ekadashi.candidate_date !== ekadashi.fast_date) {
    const candidateDay = days.find((day) => day.date === ekadashi.candidate_date);
    if (shouldShowNoFastNotice(candidateDay)) {
      addEvent(byDate, ekadashi.candidate_date, noFastNoticeForEkadashiDay(candidateDay, ekadashi));
    }
  }

  const paranaDate = addDaysToLocalDate(ekadashi.fast_date, 1);
  const parana = paranaEventForDate(paranaDate, ekadashi, timezone);
  if (parana) addEvent(byDate, paranaDate, parana);
}

function shouldShowNoFastNotice(day) {
  return Boolean(day && isEkadashi(day.lunar.tithi_at_sunrise.number));
}

export function buildEkadashiEvents(days, location, rules) {
  const byDate = new Map();
  const mahadvadashiByDate = new Map();
  const scheduledFastDates = new Set();
  const noFastByDate = new Map();

  for (let i = 1; i < days.length - 1; i += 1) {
    const dvadashiFast = classifyDvadashiMahadvadashi(days, i, location, rules);
    if (!dvadashiFast) continue;
    mahadvadashiByDate.set(dvadashiFast.fast_date, dvadashiFast);
  }

  for (let i = 0; i < days.length - 1; i += 1) {
    const day = days[i];
    const ekadashiFast = mahadvadashiByDate.get(day.date) || classifyEkadashiDay(days, i, location, rules, mahadvadashiByDate) || classifyNoSunriseEkadashi(days, i, location, rules);
    if (!ekadashiFast) continue;

    if (ekadashiFast.noFastOnly) {
      noFastByDate.set(ekadashiFast.candidateDate, ekadashiFast);
      continue;
    }

    if (scheduledFastDates.has(ekadashiFast.fast_date)) continue;
    scheduleEkadashi(byDate, ekadashiFast, days, location.timezone);
    scheduledFastDates.add(ekadashiFast.fast_date);
  }

  for (const [date, notice] of noFastByDate.entries()) {
    if (byDate.get(date)?.some((event) => event.type === "ekadashi_notice")) continue;
    const day = days.find((item) => item.date === date);
    if (shouldShowNoFastNotice(day)) addEvent(byDate, date, noFastNoticeForEkadashiDay(day, notice, notice.targetNumber));
  }

  return byDate;
}

export const __ekadashiTestUtils = {
  isEkadashi,
  isDvadashi,
  tithiShortName
};
