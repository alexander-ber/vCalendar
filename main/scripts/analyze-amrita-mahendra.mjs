import fs from "node:fs/promises";

const SOURCE_FILE = new URL("../docs/panjika/Ponjika_Sri_Gourabda_540_RU_full.md", import.meta.url);
const REPORT_FILE = new URL("../reports/amrita-mahendra-month-weekday-analysis.md", import.meta.url);
const MATCHES_FILE = new URL("../work/amrita-mahendra-index-matches.jsonl", import.meta.url);

const WEEKDAYS = ["понедельник", "вторник", "среда", "четверг", "пятница", "суббота", "воскресенье"];
const EXPECTED_SOLAR_MONTHS = [
  "Чайтра",
  "Вайшакха",
  "Джйештха",
  "Ашадха",
  "Шравана",
  "Бхадра",
  "Ашвина",
  "Картика",
  "Аграхаяна",
  "Пауша",
  "Магха",
  "Пхалгуна"
];
const DAY_PERIOD_RE = /(?:дн[ёе]м|время):\s*([^н]*(?:(?!ночью:).)*)/iu;
const NIGHT_PERIOD_RE = /ночью:\s*(.*)$/iu;
const RANGE_RE = /(\d{1,2}):(\d{2})\s*[–-]\s*(\d{1,2}):(\d{2})/gu;
const TIME_RE = /\b\d{1,2}:\d{2}\b/gu;

function field(body, label) {
  return body.match(new RegExp(`\\*\\*${label}:\\*\\*\\s*([^\\n]+)`))?.[1]?.trim() || "";
}

function isAmbiguous(value) {
  return /неразборчиво|не распознано|не удалось|OCR|≈|€|\[/.test(value);
}

function solarMonth(body) {
  const line = field(body, "Календарная дата");
  const middlePart = line.split(";").map((item) => item.trim())[1] || "";
  return middlePart.match(/\d+\S*\s+([А-ЯЁа-яё-]+)/)?.[1]?.replace(/[.,].*$/, "") || "UNKNOWN";
}

function parseSun(body) {
  const value = field(body, "Восход / закат");
  if (!value || isAmbiguous(value)) return null;
  const match = value.match(/(\d{1,2}):(\d{2})\s*\/\s*(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const sunrise = Number(match[1]) * 60 + Number(match[2]);
  let sunset = Number(match[3]) * 60 + Number(match[4]);
  if (sunset < sunrise) sunset += 12 * 60;
  if (sunset < sunrise) sunset += 12 * 60;
  return { sunrise, sunset, raw: value };
}

function parseBlocks(text) {
  return [...text.matchAll(/^## (\d+ [^\n]+?202[67] года), ([^\n]+)\n\n([\s\S]*?)(?=^## |\z)/gm)].map(
    ([, date, weekday, body]) => ({
      date,
      weekday,
      body,
      solarMonth: solarMonth(body),
      sunriseSunset: parseSun(body),
      amrita: field(body, "Амрита-йога"),
      mahendra: field(body, "Махендра-йога")
    })
  );
}

function extractRanges(value, period) {
  if (!value || isAmbiguous(value)) return [];
  const source =
    period === "day"
      ? value.match(DAY_PERIOD_RE)?.[1]?.split(/ночью:/iu)[0] || (!value.includes("ночью:") ? value : "")
      : value.match(NIGHT_PERIOD_RE)?.[1] || "";
  return [...source.matchAll(RANGE_RE)].map((match) => ({
    start: `${match[1]}:${match[2]}`,
    end: `${match[3]}:${match[4]}`
  }));
}

function periodSource(value, period) {
  if (!value || isAmbiguous(value)) return "";
  return period === "day"
    ? value.match(DAY_PERIOD_RE)?.[1]?.split(/ночью:/iu)[0] || (!value.includes("ночью:") ? value : "")
    : value.match(NIGHT_PERIOD_RE)?.[1] || "";
}

function extractSingleTimes(value, period) {
  const source = periodSource(value, period);
  if (!source) return [];
  return source
    .split(";")
    .map((item) => item.trim())
    .filter((item) => item && !/[–-]/.test(item))
    .flatMap((item) => [...item.matchAll(TIME_RE)].map((match) => match[0]));
}

function timeCandidates(value) {
  const [hour, minute] = value.split(":").map(Number);
  return [hour * 60 + minute, (hour + 12) * 60 + minute, (hour + 24) * 60 + minute];
}

function chooseTime(value, period, sunrise, sunset, nextSunrise) {
  const min = period === "day" ? sunrise - 20 : sunset - 20;
  const max = period === "day" ? sunset + 20 : nextSunrise + 20;
  const candidates = timeCandidates(value).filter((item) => item >= min && item <= max);
  if (!candidates.length) return null;
  const anchor = period === "day" ? sunrise : sunset;
  return candidates.sort((left, right) => Math.abs(left - anchor) - Math.abs(right - anchor))[0];
}

function nearestBoundaryIndex(value, start, end) {
  const part = (end - start) / 15;
  const index = Math.round((value - start) / part);
  const expected = start + index * part;
  return {
    index,
    errorSeconds: Math.round((value - expected) * 60)
  };
}

function matchRange(range, period, currentSun, nextSun) {
  const start = period === "day" ? currentSun.sunrise : currentSun.sunset;
  const end = period === "day" ? currentSun.sunset : nextSun.sunrise + 24 * 60;
  const startMinute = chooseTime(range.start, period, currentSun.sunrise, currentSun.sunset, nextSun.sunrise + 24 * 60);
  const endMinute = chooseTime(range.end, period, currentSun.sunrise, currentSun.sunset, nextSun.sunrise + 24 * 60);
  if (startMinute === null || endMinute === null || endMinute <= startMinute) return null;
  const from = nearestBoundaryIndex(startMinute, start, end);
  const to = nearestBoundaryIndex(endMinute, start, end);
  if (from.index < 0 || to.index > 15 || from.index >= to.index) return null;
  return {
    printed: `${range.start}-${range.end}`,
    from: from.index,
    to: to.index,
    startErrorSeconds: from.errorSeconds,
    endErrorSeconds: to.errorSeconds
  };
}

function coverageRows(days) {
  const groups = new Map();
  for (const day of days) {
    if (day.solarMonth === "UNKNOWN") continue;
    const key = `${day.solarMonth}|${day.weekday}`;
    const row =
      groups.get(key) ||
      {
        solarMonth: day.solarMonth,
        weekday: day.weekday,
        days: 0,
        cleanSun: 0,
        amrita: 0,
        cleanAmrita: 0,
        mahendra: 0,
        cleanMahendra: 0,
        dates: []
      };
    row.days += 1;
    row.dates.push(day.date.replace(" года", ""));
    if (day.sunriseSunset) row.cleanSun += 1;
    if (day.amrita) row.amrita += 1;
    if (day.amrita && !isAmbiguous(day.amrita)) row.cleanAmrita += 1;
    if (day.mahendra) row.mahendra += 1;
    if (day.mahendra && !isAmbiguous(day.mahendra)) row.cleanMahendra += 1;
    groups.set(key, row);
  }
  return [...groups.values()].sort(
    (left, right) => left.solarMonth.localeCompare(right.solarMonth, "ru") || WEEKDAYS.indexOf(left.weekday) - WEEKDAYS.indexOf(right.weekday)
  );
}

function buildMatches(days) {
  const rows = [];
  for (let index = 0; index < days.length - 1; index += 1) {
    const day = days[index];
    const next = days[index + 1];
    if (!day.sunriseSunset || !next.sunriseSunset || day.solarMonth === "UNKNOWN") continue;
    for (const [kind, value] of [
      ["amrita", day.amrita],
      ["mahendra", day.mahendra]
    ]) {
      for (const period of ["day", "night"]) {
        for (const range of extractRanges(value, period)) {
          const match = matchRange(range, period, day.sunriseSunset, next.sunriseSunset);
          if (!match) continue;
          rows.push({
            date: day.date,
            solarMonth: day.solarMonth,
            weekday: day.weekday,
            kind,
            period,
            ...match,
            maxAbsErrorSeconds: Math.max(Math.abs(match.startErrorSeconds), Math.abs(match.endErrorSeconds))
          });
        }
      }
    }
  }
  return rows;
}

function singleTimeRows(days) {
  const rows = [];
  for (const day of days) {
    if (day.solarMonth === "UNKNOWN") continue;
    for (const [kind, value] of [
      ["amrita", day.amrita],
      ["mahendra", day.mahendra]
    ]) {
      for (const period of ["day", "night"]) {
        const times = extractSingleTimes(value, period);
        if (!times.length) continue;
        rows.push({
          date: day.date,
          solarMonth: day.solarMonth,
          weekday: day.weekday,
          kind,
          period,
          times
        });
      }
    }
  }
  return rows;
}

function groupMatches(matches) {
  const groups = new Map();
  for (const row of matches) {
    const key = `${row.solarMonth}|${row.weekday}|${row.kind}|${row.period}`;
    const group = groups.get(key) || { key, rows: [], indexes: new Set(), maxAbsErrorSeconds: 0 };
    group.rows.push(row);
    group.indexes.add(`${row.from}-${row.to}`);
    group.maxAbsErrorSeconds = Math.max(group.maxAbsErrorSeconds, row.maxAbsErrorSeconds);
    groups.set(key, group);
  }
  return [...groups.values()].sort((left, right) => left.key.localeCompare(right.key, "ru"));
}

function renderCoverage(rows) {
  const lines = ["## Month x Weekday Coverage", "", "| Solar month | Weekday | Days | Clean sun | Amrita | Mahendra | Span |", "|---|---:|---:|---:|---:|---:|---|"];
  for (const row of rows) {
    lines.push(
      `| ${row.solarMonth} | ${row.weekday} | ${row.days} | ${row.cleanSun}/${row.days} | ${row.cleanAmrita}/${row.amrita} | ${row.cleanMahendra}/${row.mahendra} | ${row.dates[0]} - ${row.dates.at(-1)} |`
    );
  }
  return lines.join("\n");
}

function readinessAudit(coverage, groups) {
  const observed = new Map(coverage.map((row) => [`${row.solarMonth}|${row.weekday}`, row]));
  const missingKeys = [];
  const weakSunKeys = [];
  const noCleanAmritaKeys = [];
  const noMahendraWitnessKeys = [];
  for (const month of EXPECTED_SOLAR_MONTHS) {
    for (const weekday of WEEKDAYS) {
      const key = `${month}|${weekday}`;
      const row = observed.get(key);
      if (!row) {
        missingKeys.push(key);
        continue;
      }
      if (row.cleanSun < 2) weakSunKeys.push(`${key} (${row.cleanSun}/${row.days})`);
      if (row.cleanAmrita === 0) noCleanAmritaKeys.push(`${key} (${row.cleanAmrita}/${row.amrita})`);
      if (row.mahendra === 0 || row.cleanMahendra === 0) noMahendraWitnessKeys.push(`${key} (${row.cleanMahendra}/${row.mahendra})`);
    }
  }
  const repeatedGroups = groups.filter((group) => group.rows.length >= 2);
  const stableGroups = repeatedGroups.filter((group) => group.indexes.size === 1);
  const lowErrorGroups = stableGroups.filter((group) => group.maxAbsErrorSeconds <= 90);
  return {
    expectedKeys: EXPECTED_SOLAR_MONTHS.length * WEEKDAYS.length,
    observedKeys: observed.size,
    missingKeys,
    weakSunKeys,
    noCleanAmritaKeys,
    noMahendraWitnessKeys,
    repeatedGroups: repeatedGroups.length,
    stableGroups: stableGroups.length,
    lowErrorGroups: lowErrorGroups.length
  };
}

function renderList(items, emptyText) {
  if (!items.length) return `- ${emptyText}`;
  return items.map((item) => `- ${item}`).join("\n");
}

function renderReadinessAudit(audit) {
  return [
    "## Implementation Readiness Audit",
    "",
    "This section answers what is still missing before Amrita/Mahendra-yoga can be enabled as a calculated UI feature.",
    "",
    `- expected month-weekday keys: ${audit.expectedKeys}`,
    `- observed month-weekday keys in translated MD: ${audit.observedKeys}`,
    `- missing month-weekday keys: ${audit.missingKeys.length}`,
    `- keys with fewer than two clean sunrise/sunset rows: ${audit.weakSunKeys.length}`,
    `- keys with no clean Amrita-yoga witness: ${audit.noCleanAmritaKeys.length}`,
    `- keys with no clean Mahendra-yoga witness: ${audit.noMahendraWitnessKeys.length}`,
    `- repeated candidate groups: ${audit.repeatedGroups}`,
    `- repeated groups with one stable boundary index: ${audit.stableGroups}`,
    `- repeated groups with one stable boundary index and <=90s boundary error: ${audit.lowErrorGroups}`,
    "",
    "### Runtime Blockers",
    "",
    "1. The Bengali solar month calculation is now implemented locally from sidereal solar rashi; boundary dates around Sankranti still need regression checks.",
    "2. The full `12 x 7` month-weekday selection matrix must be recovered as boundary indexes, not printed clock times.",
    "3. OCR-derived yoga rows need manual verification against the Bengali scan before becoming tests or matrix values.",
    "4. Rows where Mahendra-yoga is absent must be confirmed as truly empty, not OCR omission.",
    "5. Regression tests must compare calculated boundary-index times against verified Panjika rows.",
    "",
    "### Missing Month-Weekday Keys",
    "",
    renderList(audit.missingKeys, "None. Every expected month-weekday key appears at least once."),
    "",
    "### Weak Sunrise/Sunset Coverage",
    "",
    renderList(audit.weakSunKeys, "None."),
    "",
    "### No Clean Amrita Witness",
    "",
    renderList(audit.noCleanAmritaKeys, "None."),
    "",
    "### No Clean Mahendra Witness",
    "",
    renderList(audit.noMahendraWitnessKeys, "None."),
    ""
  ].join("\n");
}

function renderGroups(groups) {
  const consistent = groups.filter((group) => group.rows.length >= 2 && group.indexes.size === 1 && group.maxAbsErrorSeconds <= 90);
  const needsReview = groups.filter((group) => group.rows.length >= 2 && (group.indexes.size > 1 || group.maxAbsErrorSeconds > 90));
  const lines = [
    "## Boundary Index Candidates",
    "",
    "These rows are parsed from the translated MD, not manually rechecked against the Bengali scan. They are research hints, not runtime data.",
    "",
    `- matched explicit intervals: ${groups.reduce((sum, group) => sum + group.rows.length, 0)}`,
    `- consistent low-error groups: ${consistent.length}`,
    `- groups requiring review: ${needsReview.length}`,
    "",
    "### Consistent Low-Error Groups",
    "",
    "| Key | Count | Index | Max error | Examples |",
    "|---|---:|---:|---:|---|"
  ];
  for (const group of consistent.slice(0, 80)) {
    const example = group.rows
      .slice(0, 3)
      .map((row) => `${row.date}: ${row.printed}`)
      .join("<br>");
    lines.push(`| ${group.key} | ${group.rows.length} | ${[...group.indexes][0]} | ${group.maxAbsErrorSeconds}s | ${example} |`);
  }
  lines.push("", "### Review Required", "", "| Key | Count | Index candidates | Max error | Examples |", "|---|---:|---|---:|---|");
  for (const group of needsReview.slice(0, 120)) {
    const example = group.rows
      .slice(0, 3)
      .map((row) => `${row.date}: ${row.printed}->${row.from}-${row.to} (${row.startErrorSeconds}s/${row.endErrorSeconds}s)`)
      .join("<br>");
    lines.push(`| ${group.key} | ${group.rows.length} | ${[...group.indexes].join(", ")} | ${group.maxAbsErrorSeconds}s | ${example} |`);
  }
  return lines.join("\n");
}

function renderSingleTimeAudit(rows) {
  const total = rows.reduce((sum, row) => sum + row.times.length, 0);
  const lines = [
    "## Single-Time Tokens Requiring Source Review",
    "",
    "Some translated rows contain standalone times such as `7:14` next to explicit ranges. These are not safe to interpret automatically as full intervals until the Bengali scan is checked.",
    "",
    `- rows with standalone times: ${rows.length}`,
    `- standalone time tokens: ${total}`,
    "",
    "| Date | Key | Standalone times |",
    "|---|---|---|"
  ];
  for (const row of rows.slice(0, 80)) {
    lines.push(`| ${row.date} | ${row.solarMonth} ${row.weekday} ${row.kind} ${row.period} | ${row.times.join(", ")} |`);
  }
  return lines.join("\n");
}

function renderReport(days, coverage, groups, audit, singles) {
  return [
    "# Amrita/Mahendra Yoga Month-Weekday Analysis",
    "",
    "This report tests the working hypothesis that Amrita-yoga and Mahendra-yoga intervals are selected by Bengali solar month plus weekday, then resolved by dividing the local day and night into fifteen equal parts.",
    "",
    "The source here is the translated MD panjika. Because many yoga/travel rows contain OCR uncertainty, this report is exploratory. It must not be used as a runtime template table until the underlying Bengali scan has been manually verified.",
    "",
    `Calendar rows parsed: ${days.length}`,
    "",
    renderReadinessAudit(audit),
    "",
    renderCoverage(coverage),
    "",
    renderSingleTimeAudit(singles),
    "",
    renderGroups(groups),
    ""
  ].join("\n");
}

const text = await fs.readFile(SOURCE_FILE, "utf8");
const days = parseBlocks(text);
const coverage = coverageRows(days);
const matches = buildMatches(days);
const groups = groupMatches(matches);
const audit = readinessAudit(coverage, groups);
const singles = singleTimeRows(days);

await fs.writeFile(MATCHES_FILE, matches.map((row) => JSON.stringify(row)).join("\n") + "\n");
await fs.writeFile(REPORT_FILE, renderReport(days, coverage, groups, audit, singles));

console.log(`Parsed ${days.length} calendar rows.`);
console.log(`Wrote ${matches.length} candidate interval matches to ${MATCHES_FILE.pathname}`);
console.log(`Wrote report to ${REPORT_FILE.pathname}`);
