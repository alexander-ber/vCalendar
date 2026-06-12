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

- Local fixed locations: Maalot, Tel Aviv, Mayapur, Moscow
- Approximate local astronomy layer
- Sunrise, sunset, arunodaya
- Tithi at sunrise and arunodaya
- Amanta masa approximation
- Adhika/Purushottama detection by Sankranti count
- Ekadashi classification: viddha, double sunrise, no sunrise, standard
- Parana window model
- Local event matching from lunar rules

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
