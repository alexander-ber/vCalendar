import assert from "node:assert/strict";
import { calculateAmritaMahendra } from "../js/amrita-mahendra-engine.js";

function utcDate(time) {
  return new Date(`2026-07-04T${time}Z`);
}

function secondsOfDay(date) {
  return Math.round((date.getUTCHours() * 60 * 60 + date.getUTCMinutes() * 60 + date.getUTCSeconds()) + date.getUTCMilliseconds() / 1000);
}

function expectedSeconds(value) {
  const [hour, minute, second] = value.split(":").map(Number);
  return hour * 60 * 60 + minute * 60 + second;
}

function assertNearTime(actual, expected, toleranceSeconds = 1) {
  const actualSeconds = secondsOfDay(actual);
  const target = expectedSeconds(expected);
  const delta = Math.min(Math.abs(actualSeconds - target), Math.abs(actualSeconds + 24 * 60 * 60 - target), Math.abs(actualSeconds - (target + 24 * 60 * 60)));
  assert(delta <= toleranceSeconds, `${actual.toISOString()} should be within ${toleranceSeconds}s of ${expected}`);
}

const sunrise = utcDate("04:59:28");
const sunset = utcDate("18:22:34");
const nextSunrise = new Date("2026-07-05T04:59:28Z");
const template = {
  amritaDay: [{ from: 12, to: 15 }],
  amritaNight: [
    { from: 1, to: 2 },
    { from: 7, to: 10 },
    { from: 12, to: 15 }
  ],
  mahendraDay: [
    { from: 0, to: 1 },
    { from: 5, to: 8 }
  ],
  mahendraNight: []
};

const result = calculateAmritaMahendra(sunrise, sunset, nextSunrise, template);

assertNearTime(result.dayBoundaries[0], "04:59:28");
assertNearTime(result.dayBoundaries[1], "05:53:00");
assertNearTime(result.dayBoundaries[5], "09:27:10");
assertNearTime(result.dayBoundaries[8], "12:07:47");
assertNearTime(result.dayBoundaries[12], "15:41:57");
assertNearTime(result.dayBoundaries[15], "18:22:34");

assertNearTime(result.nightBoundaries[1], "19:05:01");
assertNearTime(result.nightBoundaries[2], "19:47:29");
assertNearTime(result.nightBoundaries[7], "23:19:47");
assertNearTime(result.nightBoundaries[10], "01:27:10");
assertNearTime(result.nightBoundaries[12], "02:52:05");
assertNearTime(result.nightBoundaries[15], "04:59:28");

assertNearTime(result.amritaDay[0].start, "15:41:57");
assertNearTime(result.amritaDay[0].end, "18:22:34");
assertNearTime(result.mahendraDay[0].start, "04:59:28");
assertNearTime(result.mahendraDay[1].end, "12:07:47");

console.log("Amrita/Mahendra boundary checks passed.");
