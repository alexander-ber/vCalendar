# Amrita-yoga and Mahendra-yoga

This document records the current research model for the `Amrita-yoga` and `Mahendra-yoga` intervals printed in the Sri Navadvipa Panjika.

## Runtime Boundary

These intervals must not be imported as fixed daily times from a printed Panjika.

The only acceptable runtime model is:

- local sunrise
- local sunset
- next local sunrise
- a formulaic time division
- a verified traditional selection table

Printed Panjika rows may be used only to validate or reconstruct the formula/table. They are not runtime data and must not become hidden date overrides.

## What They Are Not

`Amrita-yoga` and `Mahendra-yoga` in this Panjika are not the standard 27 astronomical nitya-yogas calculated from `Sun longitude + Moon longitude`.

They are auspicious intra-day and intra-night windows used for practical muhurta purposes, especially travel and beginnings.

## Working Time Formula

The working formula divides day and night independently into 15 equal parts.

For a civil date `D`:

```text
dayStart = sunrise(D)
dayEnd   = sunset(D)
dayBoundary(k) = dayStart + k * (dayEnd - dayStart) / 15
k = 0..15
```

For the night after `D`:

```text
nightStart = sunset(D)
nightEnd   = sunrise(D + 1)
nightBoundary(k) = nightStart + k * (nightEnd - nightStart) / 15
k = 0..15
```

Calculate boundaries from the full interval each time. Do not round one part and repeatedly add it.

## Working Selection Hypothesis

The printed intervals appear to be selected by:

```text
Bengali solar month x weekday
```

The key month is the Bengali solar month, such as `Ashadha`, not the Gaudiya lunar month such as `Vamana`.

Each key should resolve to four lists of boundary ranges:

```text
Amrita day
Amrita night
Mahendra day
Mahendra night
```

Example shape:

```json
{
  "amritaDay": [{ "from": 12, "to": 15 }],
  "amritaNight": [
    { "from": 1, "to": 2 },
    { "from": 7, "to": 10 },
    { "from": 12, "to": 15 }
  ],
  "mahendraDay": [
    { "from": 0, "to": 1 },
    { "from": 5, "to": 8 }
  ],
  "mahendraNight": []
}
```

## Current Verification Status

The `Ashadha + Saturday` sample is a strong pilot witness:

- Amrita day: `B12-B15`
- Amrita night: `N1-N2`, `N7-N10`, `N12-N15`
- Mahendra day: `B0-B1`, `B5-B8`
- Mahendra night: no printed interval

The translated MD Panjika contains enough repeated dates to test most `month x weekday` pairs. However, OCR issues are common in yoga and travel rows, so the MD-derived analysis is exploratory.

## Harness

Run:

```bash
node scripts/analyze-amrita-mahendra.mjs
```

Outputs:

```text
reports/amrita-mahendra-month-weekday-analysis.md
work/amrita-mahendra-index-matches.jsonl
```

The report contains:

- month x weekday coverage
- candidate boundary matches
- low-error repeated groups
- groups requiring manual review

## Required Before Runtime Use

Before exposing Amrita/Mahendra-yoga in the calendar UI:

1. verify candidate rows against the original Bengali scan;
2. document Bengali solar month assignment;
3. recover the full `12 x 7` template matrix or explicitly mark missing keys;
4. keep provenance for every populated template;
5. add source-derived tests;
6. keep runtime calculation based on local sunrise/sunset, not printed clock times.
