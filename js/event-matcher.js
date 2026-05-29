import { tithiInfo } from "./astronomy-adapter.js?v=20260528-8";
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

export function matchEventsForDay(day, events, timezone) {
  return events.filter((event) => {
    if (event.source_status === "needs_exact_lunar_rule") return false;
    if (!event.masa && !event.gaudiya_masa) return false;
    if (!event.paksha || !event.tithi) return false;
    if (event.gaudiya_masa) {
      if (day.masa.normal_masa_name !== event.gaudiya_masa) return false;
    } else if (day.lunar.masa !== event.masa) {
      return false;
    }
    if (day.lunar.masa_type === "adhika" && !event.allow_in_adhika) return false;
    const ruleTithi = tithiAtRuleTime(day, event, timezone);
    return ruleTithi.paksha === event.paksha && tithiShortName(ruleTithi.name) === event.tithi;
  });
}
