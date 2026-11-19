import { addDaysToLocalDate, toIsoDate } from "./date-utils.js?v=20260528-8";
import { dayAstronomy } from "./astronomy-adapter.js?v=20260701-1";

function findTithiBoundaryAfter(start, targetNumber, maxHours, getTithiInfo) {
  let left = new Date(start);
  let right = new Date(left.getTime() + 60 * 60 * 1000);
  const max = start.getTime() + maxHours * 60 * 60 * 1000;
  while (right.getTime() <= max) {
    const leftNumber = getTithiInfo(left).number;
    const rightNumber = getTithiInfo(right).number;
    if (leftNumber === targetNumber && rightNumber !== targetNumber) {
      for (let i = 0; i < 40; i += 1) {
        const mid = new Date((left.getTime() + right.getTime()) / 2);
        if (getTithiInfo(mid).number === targetNumber) left = mid;
        else right = mid;
      }
      return right;
    }
    left = right;
    right = new Date(right.getTime() + 60 * 60 * 1000);
  }
  return null;
}

// Mirrors findTithiBoundaryAfter's forward hour-stepping, but looks for the
// START of an upcoming occurrence of targetNumber (not-target -> target)
// instead of its end - needed when the target tithi hasn't begun yet at
// `start` (e.g. Dvadashi starting shortly after the parana day's own
// sunrise, rather than already being underway).
function findTithiStartAfter(start, targetNumber, maxHours, getTithiInfo) {
  let left = new Date(start);
  let right = new Date(left.getTime() + 60 * 60 * 1000);
  const max = start.getTime() + maxHours * 60 * 60 * 1000;
  while (right.getTime() <= max) {
    const leftNumber = getTithiInfo(left).number;
    const rightNumber = getTithiInfo(right).number;
    if (leftNumber !== targetNumber && rightNumber === targetNumber) {
      for (let i = 0; i < 40; i += 1) {
        const mid = new Date((left.getTime() + right.getTime()) / 2);
        if (getTithiInfo(mid).number === targetNumber) right = mid;
        else left = mid;
      }
      return right;
    }
    left = right;
    right = new Date(right.getTime() + 60 * 60 * 1000);
  }
  return null;
}

function findTithiBoundaryBefore(start, targetNumber, maxHours, getTithiInfo) {
  let right = new Date(start);
  let left = new Date(right.getTime() - 60 * 60 * 1000);
  const min = start.getTime() - maxHours * 60 * 60 * 1000;
  while (left.getTime() >= min) {
    const rightNumber = getTithiInfo(right).number;
    const leftNumber = getTithiInfo(left).number;
    if (rightNumber === targetNumber && leftNumber !== targetNumber) {
      for (let i = 0; i < 40; i += 1) {
        const mid = new Date((left.getTime() + right.getTime()) / 2);
        if (getTithiInfo(mid).number === targetNumber) right = mid;
        else left = mid;
      }
      return right;
    }
    right = left;
    left = new Date(left.getTime() - 60 * 60 * 1000);
  }
  return null;
}

function findTithiEndBefore(start, targetNumber, maxHours, getTithiInfo) {
  let right = new Date(start);
  let left = new Date(right.getTime() - 60 * 60 * 1000);
  const min = start.getTime() - maxHours * 60 * 60 * 1000;
  while (left.getTime() >= min) {
    const rightNumber = getTithiInfo(right).number;
    const leftNumber = getTithiInfo(left).number;
    if (leftNumber === targetNumber && rightNumber !== targetNumber) {
      for (let i = 0; i < 40; i += 1) {
        const mid = new Date((left.getTime() + right.getTime()) / 2);
        if (getTithiInfo(mid).number === targetNumber) left = mid;
        else right = mid;
      }
      return right;
    }
    right = left;
    left = new Date(left.getTime() - 60 * 60 * 1000);
  }
  return null;
}

// Generic single-day-fast parana: sunrise to min(next tithi's end, 1/3 of
// daylight), no Ekadashi-specific Hari-vasara/Trisprsa refinement - for
// fasts like Sri Krishna Janmashtami's Ashtami, which are not Ekadashi but
// use the identical fraction-based parana formula (same rules.parana
// constants as computeParana above).
export function computeSimpleTithiParana(fastDate, paranaTithiNumber, location, rules, getTithiInfo) {
  const paranaDate = addDaysToLocalDate(fastDate, 1);
  const astronomy = dayAstronomy(paranaDate, location, rules);
  if (!astronomy.sunrise || !astronomy.sunset) {
    return { date: paranaDate, start: null, preferred_end: null, one_fifth_end: null, absolute_end: null, preferred_window_status: null };
  }

  const paranaTithiEnd =
    getTithiInfo(astronomy.sunrise).number === paranaTithiNumber
      ? findTithiBoundaryAfter(astronomy.sunrise, paranaTithiNumber, 48, getTithiInfo)
      : findTithiEndBefore(astronomy.sunrise, paranaTithiNumber, 48, getTithiInfo);
  if (!paranaTithiEnd) {
    return { date: paranaDate, start: astronomy.sunrise, preferred_end: null, one_fifth_end: null, absolute_end: null, preferred_window_status: null };
  }

  const pratahEnd = new Date(
    astronomy.sunrise.getTime() +
      rules.parana.pratah_fraction_of_daylight * (astronomy.sunset.getTime() - astronomy.sunrise.getTime())
  );
  const oneFifthEnd = new Date(
    astronomy.sunrise.getTime() +
      (rules.parana.one_fifth_fraction_of_daylight || 1 / 5) * (astronomy.sunset.getTime() - astronomy.sunrise.getTime())
  );
  const tithiEndedBeforeSunrise = paranaTithiEnd.getTime() < astronomy.sunrise.getTime();
  return {
    date: paranaDate,
    start: astronomy.sunrise,
    preferred_end: tithiEndedBeforeSunrise ? null : new Date(Math.min(paranaTithiEnd.getTime(), pratahEnd.getTime())),
    one_fifth_end: oneFifthEnd,
    absolute_end: tithiEndedBeforeSunrise ? pratahEnd : paranaTithiEnd,
    preferred_window_status: tithiEndedBeforeSunrise ? "tithi_ended_before_sunrise" : "available"
  };
}

export function computeParana(fastDate, ekadashiNumber, location, rules, getTithiInfo, fastDayType = "normal_ekadashi") {
  const paranaDate = addDaysToLocalDate(fastDate, 1);
  const astronomy = dayAstronomy(paranaDate, location, rules);
  const dvadashiNumber = ekadashiNumber === 11 ? 12 : 27;
  const trayodashiNumber = ekadashiNumber === 11 ? 13 : 28;
  const paranaTithiNumber = fastDayType === "no_sunrise" || fastDayType === "viddha" ? trayodashiNumber : dvadashiNumber;
  // Dvadashi can start shortly after the parana day's own sunrise rather
  // than already being underway (e.g. when the fast was shifted a day
  // earlier because Ekadashi itself began after the previous day's
  // sunrise) - try backward (already started) before forward (about to
  // start) so dvadashiStart reflects its real start either way.
  const dvadashiStart =
    findTithiBoundaryBefore(astronomy.sunrise, dvadashiNumber, 48, getTithiInfo) ||
    findTithiStartAfter(astronomy.sunrise, dvadashiNumber, 48, getTithiInfo) ||
    astronomy.sunrise;
  // Same reasoning as dvadashiStart above: the parana tithi may be about to
  // start (forward search) rather than already underway or already over
  // (backward search) - try forward first since it subsumes the
  // already-underway case too, then fall back to backward.
  const paranaTithiEnd =
    findTithiBoundaryAfter(astronomy.sunrise, paranaTithiNumber, 48, getTithiInfo) ||
    findTithiEndBefore(astronomy.sunrise, paranaTithiNumber, 48, getTithiInfo);
  if (!astronomy.sunrise || !astronomy.sunset || !paranaTithiEnd) {
    return {
      date: paranaDate,
      start: null,
      preferred_end: null,
      one_fifth_end: null,
      absolute_end: paranaTithiEnd,
      calculation_status: "not_implemented"
    };
  }

  const dvadashiEnd = paranaTithiNumber === dvadashiNumber ? paranaTithiEnd : findTithiEndBefore(astronomy.sunrise, dvadashiNumber, 48, getTithiInfo);
  const hariVasaraEnd = new Date(
    dvadashiEnd
      ? dvadashiStart.getTime() + rules.parana.hari_vasara_fraction * (dvadashiEnd.getTime() - dvadashiStart.getTime())
      : astronomy.sunrise.getTime()
  );

  const isNormal = fastDayType === "normal_ekadashi";
  const isTrisprsa = fastDayType === "trisprsa" || fastDayType === "unmilani_trisprsa";
  const isSunriseBegin = !isNormal;

  // Hari-vasara can end on a later calendar day than paranaDate (fastDate+1) -
  // e.g. a fast shifted a day earlier under the SCS Math Ekadashi convention
  // can leave Dvadashi not yet underway on paranaDate's own sunrise. The
  // daylight-fraction limits (pratah/one-fifth) belong to whichever day the
  // parana actually happens on, so re-fetch that day's astronomy instead of
  // assuming it's always paranaDate.
  let dayAstro = astronomy;
  if (!isSunriseBegin && hariVasaraEnd.getTime() > astronomy.sunrise.getTime()) {
    const hariVasaraDate = toIsoDate(hariVasaraEnd, location.timezone);
    if (hariVasaraDate !== paranaDate) {
      const altAstro = dayAstronomy(hariVasaraDate, location, rules);
      if (altAstro.sunrise && altAstro.sunset) dayAstro = altAstro;
    }
  }

  const pratahEnd = new Date(
    dayAstro.sunrise.getTime() +
      rules.parana.pratah_fraction_of_daylight * (dayAstro.sunset.getTime() - dayAstro.sunrise.getTime())
  );
  const oneFifthEnd = new Date(
    dayAstro.sunrise.getTime() +
      (rules.parana.one_fifth_fraction_of_daylight || 1 / 5) * (dayAstro.sunset.getTime() - dayAstro.sunrise.getTime())
  );

  const dvadashiEndedBeforeSunrise = dvadashiEnd ? dvadashiEnd.getTime() < astronomy.sunrise.getTime() : true;
  const start = isSunriseBegin ? astronomy.sunrise : new Date(Math.max(dayAstro.sunrise.getTime(), hariVasaraEnd.getTime()));
  const preferredEnd = isTrisprsa
    ? pratahEnd
    : new Date(Math.min(paranaTithiEnd.getTime(), pratahEnd.getTime()));
  const hasPreferredWindow = preferredEnd.getTime() >= start.getTime();
  const absoluteEnd = isTrisprsa || dvadashiEndedBeforeSunrise ? pratahEnd : paranaTithiEnd;
  return {
    date: paranaDate,
    start,
    preferred_end: hasPreferredWindow ? preferredEnd : null,
    one_fifth_end: oneFifthEnd,
    absolute_end: absoluteEnd,
    preferred_window_status: dvadashiEndedBeforeSunrise
      ? "dvadashi_ended_before_sunrise"
      : hasPreferredWindow
        ? "available"
        : "unavailable_after_hari_vasara",
    fast_day_type: fastDayType,
    diagnostics: {
      dvadashi_start: dvadashiStart,
      dvadashi_end: dvadashiEnd,
      hari_vasara_end: hariVasaraEnd,
      pratah_end: pratahEnd,
      one_fifth_end: oneFifthEnd
    }
  };
}
