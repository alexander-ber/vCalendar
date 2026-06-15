# vCalendar Panchang POC

Static browser POC for a Gaudiya Vaishnava Panchang generator.

The current app runs without a backend and without a database. It calculates locally in browser JavaScript and keeps external Panchang calendars out of the runtime path.

## Run

```bash
python3 -m http.server 8090
```

Open:

```text
http://localhost:8090
```

## Branch and GitHub Pages Structure

Repository branches:

- `main` - stable public build
- `develop` - integration build
- `feature-*` or other feature branches - work in progress
- `gh-pages` - generated GitHub Pages branch

GitHub Pages should be configured as:

- Branch: `gh-pages`
- Folder: `/`

Every pushed branch is deployed by GitHub Actions into a folder inside `gh-pages`.
Branch slashes are normalized to hyphens, for example `feature/calendar-ui` becomes `feature-calendar-ui`.

Published URLs:

```text
https://alexander-ber.github.io/vCalendar/main/
https://alexander-ber.github.io/vCalendar/develop/
https://alexander-ber.github.io/vCalendar/codex-events-content-db/
```

Example structure in `gh-pages`:

```text
gh-pages/
├── main/
├── develop/
└── codex-events-content-db/
```

## Current Scope

- Local fixed locations: Maalot, Tel Aviv, Mayapur, Moscow and selected cities
- Astronomy Engine for rise/set, local angular model for tithi until full ephemeris validation is complete
- Sunrise, sunset, arunodaya
- Tithi at sunrise and arunodaya
- Amanta masa approximation
- Adhika/Purushottama detection by Sankranti count
- Ekadashi classification: viddha, double sunrise, no sunrise, standard
- Parana window model with 1/3-day and 1/5-day daylight markers
- Local event matching from lunar rules
- Chaturmasya and Karttik period markers from lunar/tithi rules, not Gregorian dates
- Karttik / Damodara vrata starts on `Padmanabha Gaura Purnima` and ends on `Damodara Gaura Purnima`
- Karttik restrictions event is attached to the same opening Purnima as Karttik / Damodara vrata
- Chaturmasya month 1, 2, and 3 start markers, each with a restrictions event description
- Bhishma Panchaka period marker from `Damodara/Kartika Gaura Ekadashi` through `Damodara/Kartika Gaura Purnima`
- ICS export for the selected period and active event filters
- Period navigation preserves the active range shape: week shifts by 7 days, month by calendar month, year by calendar year, and custom ranges by their own length.
- The status line reports Gregorian calendar days for an unfiltered range, or shown days when the event-only filter is active.

## Important POC Limits

This is not a production Panchang yet.

- Astronomy formulas are approximate and must be validated against a stricter ephemeris layer.
- Ayanamsha and geocentric/topocentric assumptions are not final.
- Masa naming and event rules need formal Gaudiya validation.
- External calendars may be used for comparison only, not as runtime source data.
- Unknown values must stay explicit rather than guessed.

## Quick Regression Check

```bash
node tests/regression.mjs
```

## Astronomy Validation Harness

Print calculated astronomy/panchang values for known edge cases:

```bash
node scripts/validate-astronomy.mjs
```

Default validation cases include a Navadvip/Mayapur reference window. When local calendars disagree, use that reference first, then compare the local-city shift rules.

Custom window:

```bash
node scripts/validate-astronomy.mjs --location maalot --start 2026-05-26 --end 2026-05-28
```

Machine-readable output:

```bash
node scripts/validate-astronomy.mjs --json --location maalot --date 2026-09-04
```

Compare tithi engines for boundary-sensitive dates:

```bash
node scripts/compare-tithi-engines.mjs --location maalot --start 2026-05-26 --end 2026-05-28
```

Compare against Swiss Ephemeris / Moshier fallback after installing `pyswisseph` into a temporary path:

```bash
PYTHONPATH=/private/tmp/vcalendar-pydeps node scripts/compare-swiss-tithi.mjs --location mayapur --start 2027-03-18 --end 2027-03-20
```
