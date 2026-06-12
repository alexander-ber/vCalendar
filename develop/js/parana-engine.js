import { addDaysToLocalDate } from "./date-utils.js?v=20260528-8";
import { dayAstronomy } from "./astronomy-adapter.js?v=20260612-1";

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

export function computeParana(fastDate, ekadashiNumber, location, rules, getTithiInfo, fastDayType = "normal_ekadashi") {
  const paranaDate = addDaysToLocalDate(fastDate, 1);
  const astronomy = dayAstronomy(paranaDate, location, rules);
  const dvadashiNumber = ekadashiNumber === 11 ? 12 : 27;
  const trayodashiNumber = ekadashiNumber === 11 ? 13 : 28;
  const paranaTithiNumber = ["viddha", "no_sunrise"].includes(fastDayType) ? trayodashiNumber : dvadashiNumber;
  const dvadashiStart = findTithiBoundaryBefore(astronomy.sunrise, dvadashiNumber, 48, getTithiInfo) || astronomy.sunrise;
  const paranaTithiEnd =
    getTithiInfo(astronomy.sunrise).number === paranaTithiNumber
      ? findTithiBoundaryAfter(astronomy.sunrise, paranaTithiNumber, 48, getTithiInfo)
      : findTithiEndBefore(astronomy.sunrise, paranaTithiNumber, 48, getTithiInfo);
  if (!astronomy.sunrise || !astronomy.sunset || !paranaTithiEnd) {
    return {
      date: paranaDate,
      start: null,
      preferred_end: null,
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
  const pratahEnd = new Date(
    astronomy.sunrise.getTime() +
      rules.parana.pratah_fraction_of_daylight * (astronomy.sunset.getTime() - astronomy.sunrise.getTime())
  );

  const isNormal = fastDayType === "normal_ekadashi";
  const isTrisprsa = fastDayType === "trisprsa" || fastDayType === "unmilani_trisprsa";
  const dvadashiEndedBeforeSunrise = dvadashiEnd ? dvadashiEnd.getTime() < astronomy.sunrise.getTime() : true;
  const start = isNormal ? new Date(Math.max(astronomy.sunrise.getTime(), hariVasaraEnd.getTime())) : astronomy.sunrise;
  const preferredEnd = isTrisprsa
    ? pratahEnd
    : new Date(Math.min(paranaTithiEnd.getTime(), pratahEnd.getTime()));
  const hasPreferredWindow = preferredEnd.getTime() >= start.getTime();
  const absoluteEnd = isTrisprsa || dvadashiEndedBeforeSunrise ? pratahEnd : paranaTithiEnd;
  return {
    date: paranaDate,
    start,
    preferred_end: hasPreferredWindow ? preferredEnd : null,
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
      pratah_end: pratahEnd
    }
  };
}
