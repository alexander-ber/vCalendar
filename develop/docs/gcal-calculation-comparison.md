# GCAL calculation comparison

Source reviewed: `/Users/alexber/Downloads/GCalVaisnavaCalculation.pdf`, 9 pages.

## What GCAL describes

GCAL calculates a date range in phases:

- tithi, paksha, nakshatra, yoga
- masa
- dvadashi and mahadvadashi classification
- ekadashi and ekadashi parana
- built-in appearance days
- dependent appearance days
- fasting-day resolution
- sankranti and events depending on sankranti
- exact time for ksaya tithis
- DST correction for displayed times

## What we already implement

- Range-based calculation in phases: `generateCalendarRange()` builds days, then attaches events.
- Sunrise, sunset, moonrise, moonset, arunodaya. Rise/set is now calculated through the vendored Astronomy Engine library.
- Tithi and paksha from Moon-Sun angular separation.
- Nakshatra and yoga at sunrise.
- Tithi end by boundary search.
- Amanta masa interval from new moon to new moon.
- Adhika/Purushottama detection by sankranti count inside the lunar month.
- Gaudiya display model for masa halves around Purushottama.
- Ekadashi classification for:
  - standard
  - viddha by dashami at arunodaya
  - double sunrise
  - no sunrise
  - vyanjuli mahadvadashi
- Parana window from sunrise, Dvadashi, Hari-vasara and pratah-kala.
- Lunar-rule event matching by masa/paksha/tithi.
- Event offsets through `observance_offset_days`.
- Localized event data and full descriptions.
- Browser-only static app with no runtime dependency on external Panchang data.

## Main differences from GCAL

### Astronomy layer

GCAL assumes a fuller astronomical layer with tithi, paksha, nakshatra and yoga. Our current astronomy adapter now exposes all four at sunrise.

Important validation note: the vendored Astronomy Engine `MoonPhase` result was tested against the known Maalot Padmini Ekadashi 2026 case and moved the Dvadashi boundary before sunrise on May 28. That breaks the already validated Vyanjuli Mahadvadashi case. Because of that, tithi still uses the previous local formula until we validate a full ephemeris against GCAL/vaishnavacalendar. Astronomy Engine is currently used for rise/set calculations.

Validation convention: when local results diverge, compare the rule result against the Navadvip/Mayapur reference first, then inspect the local city shift caused by sunrise, arunodaya and tithi-boundary timing.

Follow-up investigation: `scripts/compare-tithi-engines.mjs` compares the current local formula, Astronomy Engine geocentric models, and an Astronomy Engine topocentric model. For Maalot on 2026-05-28, the geocentric Astronomy Engine models put Trayodashi at sunrise, while the topocentric model keeps Dvadashi at sunrise. That means the issue is not simply a bad Moon position; it is the calendar-model choice for tithi longitude. `vaishnavacalendar.org` is useful as a witness for this edge case, but it must not be treated as the single source of truth.

### Masa calculation

GCAL calculates masa on Pratipat, with special handling when Pratipat is ksaya or vriddhi. Our current implementation derives masa directly from the lunar month interval for any date.

The current model is good for a POC and already handles Purushottama insertion, but it is not yet the same decision procedure described by GCAL.

### Dvadashi and Mahadvadashi

GCAL has a richer Dvadashi decision table:

- nakshatra Mahadvadashi: Vijaya, Jaya, Jayanti, Papanasini
- Vyanjuli Mahadvadashi
- Unmilani / Trisprsa Ekadashi classifications
- Paksavardhini Mahadvadashi
- Dvadashi suitable for Ekadashi fasting

We currently implement Vyanjuli and part of the Dvadashi-shift behavior, plus Unmilani/Trisprsa Ekadashi classification. We do not yet implement nakshatra Mahadvadashi or Paksavardhini.

### Ekadashi classification

GCAL distinguishes:

- Suddha Ekadashi
- Unmilani
- Trisprsa
- Unmilani Trisprsa
- Ekadashi not suitable because tomorrow is Unmilani
- Ekadashi not suitable because some Mahadvadashi applies

We currently implement standard, viddha, no-sunrise, Vyanjuli, Unmilani, Trisprsa and Unmilani Trisprsa. We do not yet fully model suppression by all Mahadvadashi cases.

### Parana

GCAL has seven parana cases:

- Normal
- Viddha
- Unmilani
- Vyanjuli
- Trisprsa
- Jayanti/Vijaya
- Jaya/Papanasini

Our parana model now separates normal, Viddha, no-sunrise, Vyanjuli, Unmilani and Trisprsa branches. It does not yet implement the nakshatra-specific begin/end rules for Jayanti/Vijaya/Jaya/Papanasini.

### Built-in appearance days

GCAL gives special rules for:

- Govardhana Puja
- Sri Krishna Janmashtami
- Ratha Yatra
- Gaura Purnima
- Rama Navami
- generic tithi events

Our event matcher currently handles generic lunar rules and offsets. Some events are present in data, but special GCAL decision tables are not fully encoded yet. Janmashtami, Ratha Yatra, Gaura Purnima and Rama Navami should be promoted from generic rules to dedicated rule modules if we want GCAL-level compatibility.

### Dependent events

GCAL defines dependent events:

- Srila Prabhupada appearance: 1 day after Janmashtami
- Gundicha Marjana: 1 day before Ratha Yatra
- Hera Panchami: 4 days after Ratha Yatra
- Return Ratha: 8 days after Ratha Yatra
- Jagannatha Misra festival: 1 day after Gaura Purnima

We support offsets in data, but dependent-event resolution is not yet centralized around the calculated anchor event. This can create differences when the anchor event needs special GCAL logic.

### Fasting-day resolution

GCAL resolves collisions between Ekadashi fasting and noon-fast festivals with explicit notes. We have event display and parana display, but not the complete textual fasting-resolution layer.

### Sankranti

GCAL supports sankranti notes using one of four day-boundary systems: midnight, sunrise, noon, sunset. Default is noon-to-noon.

We calculate sankrantis internally for masa/Purushottama classification, but we do not yet expose sankranti events or support sankranti-dependent events like Ganga Sagara Mela or Tulasi Jala Dan.

### Ksaya and vriddhi tithi

GCAL marks second day of vriddhi and calculates exact times for ksaya tithis. We detect some skipped/no-sunrise conditions for Ekadashi, but we do not yet provide a general ksaya/vriddhi tithi annotation layer.

### DST correction

GCAL has a final correction phase for parana, sunrise/sunset/noon/arunodaya and moonrise/moonset. Our code formats dates with `Intl.DateTimeFormat` in the location timezone, so modern DST display is delegated to the browser timezone database. We do not have a separate GCAL-style correction phase.

## Suggested next implementation order

1. Extend the validation harness with known Navadvip/Mayapur and local-city reference calendars.
2. Add a day-level tithi status layer: normal, ksaya, vriddhi, exact missing-tithi times.
3. Implement GCAL Dvadashi/Mahadvadashi decision tables for nakshatra Mahadvadashi and Paksavardhini.
4. Add suppression by all Mahadvadashi cases.
5. Complete nakshatra-specific parana for Jayanti/Vijaya/Jaya/Papanasini.
6. Move special festivals into dedicated rule modules: Janmashtami, Ratha Yatra, Gaura Purnima, Rama Navami, Govardhana Puja.
7. Centralize dependent events from anchor events.
8. Add sankranti events and configurable sankranti day-boundary mode.
