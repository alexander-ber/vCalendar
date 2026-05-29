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
