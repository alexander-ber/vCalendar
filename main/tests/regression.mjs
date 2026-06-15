import assert from "node:assert/strict";
import { generateCalendar } from "../js/calendar-engine.js";
import { EVENTS } from "../js/events-data.js";
import { LOCATIONS } from "../js/locations-data.js";
import { RULES } from "../js/rules-data.js";

const maalot = LOCATIONS.find((location) => location.id === "maalot");
const telAviv = LOCATIONS.find((location) => location.id === "tel-aviv");
const mayapur = LOCATIONS.find((location) => location.id === "mayapur");

function eventsByDate(year, month, location) {
  const calendar = generateCalendar(year, month, location, RULES, EVENTS);
  return new Map(calendar.days.map((day) => [day.date, day.events]));
}

function daysByDate(year, month, location) {
  const calendar = generateCalendar(year, month, location, RULES, EVENTS);
  return new Map(calendar.days.map((day) => [day.date, day]));
}

const aprilMaalot = eventsByDate(2026, 4, maalot);
assert(aprilMaalot.get("2026-04-13").some((event) => event.name === "Varuthini Ekadashi"));
assert(aprilMaalot.get("2026-04-27").some((event) => event.name === "Mohini Ekadashi"));
assert(aprilMaalot.get("2026-04-30").some((event) => event.name === "Sri Nrsimha Chaturdashi"));

const mayMaalot = eventsByDate(2026, 5, maalot);
const mayMaalotDays = daysByDate(2026, 5, maalot);
assert.equal(mayMaalotDays.get("2026-05-15").masa.display_name, "Trivikrama masa (1st half)");
assert.equal(mayMaalotDays.get("2026-05-27").masa.display_name, "Purushottama masa");
assert(mayMaalot.get("2026-05-26").some((event) => event.name === "Gaura Ekadashi - no fast"));
assert(mayMaalot.get("2026-05-27").some((event) => event.name === "Padmini Ekadashi" && event.classification === "vyanjuli_mahadvadashi"));
assert(
  mayMaalot
    .get("2026-05-28")
    .some((event) => event.name === "Parana for Padmini Ekadashi" && event.parana.start === "05:32" && event.parana.preferred_end === "05:45")
);

const juneMaalotDays = daysByDate(2026, 6, maalot);
assert.equal(juneMaalotDays.get("2026-06-16").masa.display_name, "Trivikrama masa (2nd half)");
assert.equal(juneMaalotDays.get("2026-06-29").masa.display_name, "Trivikrama masa (2nd half)");
assert.equal(juneMaalotDays.get("2026-06-30").masa.display_name, "Vamana masa");

const purushottamaRange = generateCalendar(2026, 5, maalot, RULES, EVENTS);
assert(purushottamaRange.days.find((day) => day.date === "2026-05-17").events.some((event) => event.name === "Start of Purushottama Masa"));
const juneMaalot = generateCalendar(2026, 6, maalot, RULES, EVENTS);
assert(juneMaalot.days.find((day) => day.date === "2026-06-15").events.some((event) => event.name === "End of Purushottama Masa"));

const julyMaalot = eventsByDate(2026, 7, maalot);
assert(
  julyMaalot
    .get("2026-07-12")
    .some(
      (event) =>
        event.name === "Parana for Yogini Ekadashi" &&
        event.parana.start === "05:39" &&
        event.parana.preferred_end === "10:22" &&
        event.parana.one_fifth_end === "08:29"
    )
);

const augustMaalot = eventsByDate(2026, 8, maalot);
assert(
  augustMaalot
    .get("2026-08-10")
    .some((event) => event.name === "Parana for Kamika Ekadashi" && event.parana.start === "05:58" && event.parana.preferred_end === "10:28")
);
assert(augustMaalot.get("2026-08-28").some((event) => event.name === "Sri Balarama Purnima"));
assert(augustMaalot.get("2026-08-28").some((event) => event.name.includes("Bhakti Prapanna Tirtha")));

const mayMayapur = eventsByDate(2026, 5, mayapur);
assert(mayMayapur.get("2026-05-27").some((event) => event.name === "Padmini Ekadashi"));

const julyMayapur = eventsByDate(2026, 7, mayapur);
assert(julyMayapur.get("2026-07-29").some((event) => event.name === "Beginning of Chaturmasya"));

const octoberMayapur = eventsByDate(2026, 10, mayapur);
assert(octoberMayapur.get("2026-10-26").some((event) => event.name === "Beginning of Karttik"));

const novemberMayapur = eventsByDate(2026, 11, mayapur);
assert(novemberMayapur.get("2026-11-24").some((event) => event.name === "End of Karttik"));
assert(novemberMayapur.get("2026-11-24").some((event) => event.name === "End of Chaturmasya"));

const vrindavan = LOCATIONS.find((location) => location.id === "vrindavan");
const mayVrindavan = eventsByDate(2026, 5, vrindavan);
assert(
  mayVrindavan
    .get("2026-05-27")
    .some((event) => event.name === "Padmini Ekadashi" && event.classification === "suddha_after_dashami_viddha" && event.parana_type === "normal_ekadashi")
);
assert(
  mayVrindavan
    .get("2026-05-28")
    .some((event) => event.name === "Parana for Padmini Ekadashi" && event.parana.start !== "not implemented")
);

const marchTelAviv = eventsByDate(2026, 3, telAviv);
assert(marchTelAviv.get("2026-03-15").some((event) => event.name.includes("Papamochani Ekadashi")));
assert(marchTelAviv.get("2026-03-29").some((event) => event.name.includes("Kamada Ekadashi")));

const marchMaalot = eventsByDate(2026, 3, maalot);
assert.equal(marchMaalot.get("2026-03-15").filter((event) => event.name === "Papamochani Ekadashi").length, 1);
assert.equal(marchMaalot.get("2026-03-16").filter((event) => event.name === "Parana for Papamochani Ekadashi").length, 1);

const januaryMaalot = eventsByDate(2026, 1, maalot);
assert(januaryMaalot.get("2026-01-25").some((event) => event.type === "vaishnava_appearance" && event.name.includes("Advaita")));

const februaryMaalot = eventsByDate(2026, 2, maalot);
assert(februaryMaalot.get("2026-02-18").some((event) => event.type === "vaishnava_disappearance"));

const scsmathTithiEvents = EVENTS.filter((event) => event.source_status === "tithi_rule_from_scsmath_541");
assert.equal(scsmathTithiEvents.filter((event) => event.observed_date).length, 0);
assert(scsmathTithiEvents.every((event) => event.gaudiya_masa && event.paksha && event.tithi));
assert(scsmathTithiEvents.some((event) => event.type === "deity_installation"));

console.log("Regression checks passed.");
