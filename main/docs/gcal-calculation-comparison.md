# GCAL calculation comparison

Source reviewed: `/Users/alexber/Documents/GCalVaisnavaCalculation.pdf`, 9 pages.

Important scope note: this PDF describes the Vaishnava event decision logic used by GCAL. It explicitly delegates the raw astronomical calculations for tithi, paksha, nakshatra, yoga and masa to a separate document, `Astronomical Calculations in GCAL`. Therefore this file is a rule-map reference, not a complete ephemeris specification.

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

## Rule map extracted from the PDF

### Dvadashi and Mahadvadashi decision table

GCAL tests Dvadashi only when today's sunrise tithi is Dvadashi and yesterday's sunrise tithi is less than Dvadashi.

Implementation note: in this project that outer guard is explicit. For Gaura Dvadashi the previous sunrise must be Gaura Dashami or Gaura Ekadashi; for Krishna Dvadashi it must be Krishna Dashami or Krishna Ekadashi. Only then are the Dvadashi tests 1.3.1-1.3.4 evaluated.

The PDF then applies these checks in order:

1. If today is Gaura Dvadashi and the nakshatra test succeeds, today is a nakshatra Mahadvadashi.
2. If today and tomorrow are Dvadashi, and yesterday was Suddha Ekadashi, today is Vyanjuli Mahadvadashi.
3. If today is Dvadashi and the next Pratipat or Amavasya is vriddhi on the last two days, today is Paksavardhini Mahadvadashi.
4. If today is Dvadashi and yesterday's arunodaya tithi was less than Ekadashi, today is a Dvadashi suitable for Ekadashi fasting.

Nakshatra Mahadvadashi mapping:

- Sravana on Gaura Dvadashi: Vijaya
- Punarvasu on Gaura Dvadashi: Jaya
- Rohini on Gaura Dvadashi: Jayanti
- Pusyami on Gaura Dvadashi: Papanasini

### Ekadashi suitability decision table

GCAL tests only days whose sunrise tithi is Ekadashi.

The PDF decision table says:

- If today's arunodaya is Dashami and today's sunrise is Ekadashi, today is not suitable for fast.
- If yesterday's arunodaya and sunrise were Ekadashi, today's arunodaya and sunrise are Ekadashi, and tomorrow's sunrise is Trayodashi, today is Unmilani Trisprsa Mahadvadashi.
- If yesterday's arunodaya and sunrise were Ekadashi, today's arunodaya and sunrise are Ekadashi, and tomorrow's sunrise is Dvadashi, today is Unmilani Mahadvadashi.
- If yesterday was not Ekadashi, today's arunodaya and sunrise are Ekadashi, and tomorrow's sunrise is Trayodashi, today is Trisprsa Mahadvadashi.
- If today's arunodaya and sunrise are Ekadashi and tomorrow's sunrise is also Ekadashi, today is not suitable because tomorrow is Unmilani.
- If today's arunodaya and sunrise are Ekadashi and tomorrow is some Mahadvadashi, today is not suitable.
- If yesterday was not Ekadashi, today's arunodaya and sunrise are Ekadashi, and tomorrow's sunrise is Dvadashi, today is Suddha Ekadashi.

This table is the main reference for shifted Ekadashi validation. It means a correct implementation must track both the no-fast candidate day and the fasting day selected by the Dvadashi/Mahadvadashi table.

Additional witness-derived candidate-day rule:

- If a sunrise-to-sunrise day starts with Dashami at sunrise, Ekadashi begins later before the next sunrise, and the next sunrise is Ekadashi, SCS/Nabadwip labels the first civil row as Ekadashi with no fast because of Dashami at dawn/sunrise. The fast is observed on the next day. This is represented as `dashami_viddha_at_sunrise`.

### Ekadashi parana cases

The PDF defines seven parana types:

1. Normal: fasting day has Ekadashi at sunrise and Dvadashi at next sunrise.
2. Viddha: fasting day has Dvadashi at sunrise and Trayodashi at next sunrise, and it is not a nakshatra Mahadvadashi.
3. Unmilani: fasting day and previous day both have Ekadashi at sunrise.
4. Vyanjuli: fasting day has Dvadashi at both sunrises, and it is not a nakshatra Mahadvadashi.
5. Trisprsa: fasting day has Ekadashi at sunrise and Trayodashi at next sunrise.
6. Jayanti/Vijaya: fasting day has Gaura Dvadashi plus Rohini/Sravana nakshatra at sunrise and the same nakshatra at next sunrise.
7. Jaya/Papanasini: fasting day has Gaura Dvadashi plus Punarvasu/Pusyami nakshatra at sunrise and the same nakshatra at next sunrise.

Normal parana starts at sunrise or after the first quarter of Dvadashi, whichever is later. Its preferred end is the earlier of Dvadashi end and one third of daylight.

Viddha, Unmilani, Vyanjuli and Trisprsa start at sunrise. Viddha uses Trayodashi end or one third of daylight. Unmilani and Vyanjuli use Dvadashi end or one third of daylight. Trisprsa ends at one third of daylight.

Jayanti/Vijaya and Jaya/Papanasini have extra nakshatra-dependent begin/end rules. These are not implemented yet.

### Built-in appearance day rules

The PDF defines dedicated decision procedures for several festivals. These should not be treated as ordinary masa/paksha/tithi events when exact GCAL compatibility is required.

Govardhana Puja:

- Tested in Damodara masa, Gaura paksha.
- If today and yesterday are Gaura Pratipat, do nothing because yesterday already resolved it.
- If today and tomorrow are Gaura Pratipat, choose today only when the Moon rises between today's sunrise and tomorrow's sunrise; otherwise choose tomorrow.
- If only today is Gaura Pratipat, choose today.
- If yesterday was Amavasya and today is Gaura Dvitiya, choose today.

Sri Krishna Janmashtami:

- Tested in Hrsikesa masa.
- The basic tithi table chooses today for Saptami/Astami/Navami, for Saptami/Navami ksaya, and otherwise sends double-Astami cases to nakshatra tests.
- Rohini at sunrise decides between the two candidate days when only one day has Rohini.
- If neither candidate day has Rohini at sunrise, weekday priority decides.
- If both days have Rohini at sunrise, Rohini at midnight is checked; if still unresolved, weekday priority decides.

Ratha Yatra:

- Tested in Vamana masa.
- If yesterday is less than Dvitiya and today is Gaura Dvitiya, choose today.
- If yesterday is Gaura Pratipat and today is Gaura Tritiya, choose today.
- If yesterday and today are both Gaura Dvitiya, choose yesterday.

Gaura Purnima:

- Tested when yesterday is in Govinda masa.
- If yesterday is less than Purnima and today is Purnima in Govinda masa, choose today.
- If yesterday is less than Purnima in Govinda masa and today is Krishna Pratipat in Vishnu masa, choose today.
- If yesterday and today are both Purnima in Govinda masa, choose yesterday.

Rama Navami:

- Tested in Vishnu masa, Gaura paksha.
- Astami/Navami/Dasami and Astami/Navami/Navami choose today.
- Astami/Dasami/Dasami chooses today.
- If the sequence is Astami/Dasami and tomorrow is not suitable for Ekadashi fasting, choose today.
- If the sequence is Astami/Dasami and tomorrow is suitable for Ekadashi fasting, choose yesterday.

Generic tithi events:

- If yesterday is previous tithi or less, today is target tithi, and tomorrow is next tithi, choose today.
- If yesterday is previous tithi and today is next tithi, the target tithi was ksaya, so choose today.
- If today and tomorrow are both target tithi, choose today.

### Dependent events

The PDF defines these event offsets:

- Srila Prabhupada appearance: 1 day after Janmashtami.
- Gundicha Marjana: 1 day before Ratha Yatra.
- Hera Panchami: 4 days after Ratha Yatra.
- Return Ratha: 8 days after Ratha Yatra.
- Jagannatha Misra festival: 1 day after Gaura Purnima.

These should be resolved from calculated anchor events, not from independent static tithi matching.

### Fasting-day resolution

GCAL adds text notes when Ekadashi fasting intersects with noon-fast festivals:

- If today is an Ekadashi fasting day and an event also requires fasting until noon, write that today's fast is until noon for that event and feast is tomorrow.
- If yesterday was an Ekadashi fasting day and today has a noon-fast event, write that the event is observed today and fasting was done yesterday.
- The procedure is repeated per festival, so two noon-fast festivals on the same shifted Ekadashi cycle produce separate notes.

### Sankranti and dependent sankranti events

The PDF supports four sankranti day-boundary systems:

- midnight to midnight
- sunrise to sunrise
- noon to noon
- sunset to sunset

The default is noon to noon. For a given day, GCAL calculates the selected boundary value. If sankranti occurs before that value, the note belongs to the current day; otherwise it belongs to the next day.

Sankranti-dependent events in the PDF:

- Ganga Sagara Mela: on Makara Sankranti.
- Tulasi Jala Dan begins: on Mesha Sankranti.
- Tulasi Jala Dan ends: one day before Vrsabha Sankranti.

### Ksaya and vriddhi tithi notes

The PDF defines a general day-level status pass:

- If yesterday has the same tithi as today, today is marked as the second day of vriddhi.
- If today's tithi is more than one tithi after yesterday's tithi, one tithi is missing and ksaya times are calculated.

### DST correction pass

The final GCAL phase applies DST/time corrections to:

- Ekadashi parana time.
- Sunrise, sunset, noon and arunodaya.
- Moonrise and moonset.

## What we already implement

- Range-based calculation in phases: `generateCalendarRange()` builds days, then attaches events.
- Sunrise, sunset, moonrise, moonset, arunodaya. Rise/set is now calculated through the vendored Astronomy Engine library.
- Arunodaya now defaults to the verified Panjika rule: fixed 96 minutes before sunrise. The earlier `1/15` previous-night model is retained only in comparison scripts.
- Tithi and paksha from Moon-Sun angular separation, using the current local approximation layer.
- Nakshatra and yoga at sunrise.
- Tithi end by boundary search.
- Amanta masa interval from new moon to new moon.
- Adhika/Purushottama detection by sankranti count inside the lunar month.
- Gaudiya display model for masa halves around Purushottama.
- Ekadashi classification for:
  - standard
- viddha by Dashami at arunodaya or by Dashami at sunrise when Ekadashi begins later in the same sunrise-to-sunrise day
  - double sunrise
  - no sunrise
  - vyanjuli mahadvadashi
- Unmilani and Trisprsa classification.
- A first-pass GCAL Dvadashi/Mahadvadashi rule layer, including Dvadashi suitable for fasting, Vyanjuli, Paksavardhini and nakshatra Mahadvadashi.
- Separate `candidate_no_fast_reason`, `fast_day_type` and `parana_type` for shifted Ekadashi cases.
- Parana window from sunrise, Dvadashi, Hari-vasara and pratah-kala, including Viddha, Vyanjuli, Unmilani, Trisprsa and a first-pass nakshatra Mahadvadashi branch.
- Parana display exposes both the practical `1/3` daylight marker and an additional `1/5` daylight marker. The verified Panjika rules confirm Hari-vasara as the first quarter of Dvadashi, but do not print a universal 1/3 or 1/5 upper-bound formula.
- Day-level tithi status: normal, ksaya and second day of vriddhi.
- Lunar-rule event matching by masa/paksha/tithi.
- Generic tithi event matching using the GCAL vriddhi/ksaya decision table, so repeated tithis do not duplicate events on both days.
- Dedicated first-pass rules for Govardhana Puja, Sri Krishna Janmashtami, Ratha Yatra, Gaura Purnima and Rama Navami.
- Anchor-based event offsets through `anchor_event_id` plus `observance_offset_days`.
- Tithi-level period markers for Chaturmasya and Karttik/Damodara, with no Gregorian-date anchors.
- Karttik / Damodara vrata begins on Padmanabha Gaura Purnima and ends on Damodara Gaura Purnima.
- Karttik restrictions are represented as a separate event on the same opening Purnima.
- Chaturmasya month 1, 2, and 3 start markers are also tithi-level events and include the month-specific restriction text in event details.
- Bhishma Panchaka is treated as a tithi-level period: Damodara/Kartika Gaura Ekadashi through Damodara/Kartika Gaura Purnima, inclusive.
- ICS export for the selected period using the current UI event filters.
- Sankranti notes with GCAL's default noon-to-noon placement, plus Ganga Sagara Mela and Tulasi Jala Dan begin/end.
- Localized event data and full descriptions.
- Browser-only static app with no runtime dependency on external Panchang data.

## Main differences from GCAL

### Astronomy layer

GCAL assumes a fuller astronomical layer with tithi, paksha, nakshatra and yoga, but that astronomy is specified in a separate GCAL document. Our current astronomy adapter exposes all four at sunrise, but tithi and nakshatra/yoga still come from our local approximation layer.

Important validation note: the vendored Astronomy Engine apparent geocentric result was tested against the known Maalot Padmini Ekadashi 2026 case and moved the Dvadashi boundary before sunrise on May 28. A Swiss Ephemeris validation run without local ephemeris files (therefore using Moshier fallback) agrees with Astronomy Engine to about one minute. That breaks the already validated Vyanjuli Mahadvadashi witness case if used as the production default. Because of that, tithi still uses the previous local formula, while the stronger ephemeris backends are kept as validation candidates until we resolve the exact GCAL/mission astronomy model. Astronomy Engine is currently used for rise/set calculations.

Validation convention: when local results diverge, compare the rule result against the Navadvip/Mayapur reference first, then inspect the local city shift caused by sunrise, arunodaya and tithi-boundary timing.

Follow-up investigation: `scripts/compare-tithi-engines.mjs` compares the current local formula, Astronomy Engine geocentric models, and an Astronomy Engine topocentric model. `scripts/compare-swiss-tithi.mjs` compares Swiss/Moshier geocentric and topocentric results against the same sunrise/arunodaya anchors. For Maalot on 2026-05-28, the geocentric high-precision candidates put Trayodashi at sunrise, while the topocentric candidates keep Dvadashi at sunrise. That means the issue is not simply a bad Moon position; it is the calendar-model choice for tithi longitude. `vaishnavacalendar.org` and SCS Math are useful witnesses for these edge cases, but neither should be treated as the single source of truth.

The same harness now includes a `surya_siddhanta_mean` diagnostic engine. It uses the classical Surya Siddhanta mahayuga mean revolution counts for the Sun and Moon from the Kali Yuga epoch, so it is useful as a siddhantic baseline when comparing against Saraswat Math-style witnesses. It is not yet the full true Surya Siddhanta model with manda corrections, so it must not be promoted to production tithi calculation without further validation.

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

We now implement the Dvadashi-shift table as a first pass: Vyanjuli, Paksavardhini, Dvadashi suitable for Ekadashi fasting, and nakshatra Mahadvadashi. Paksavardhini must be checked against the next Pratipat after Gaura paksha or Amavasya after Krishna paksha, not against a repeated Purnima itself. The Nabadwip Nirjala 2026 witness catches this distinction: Purnima repeats on 29-30 June, but the Ekadashi fast remains on 25 June with parana on 26 June.

Nabadwip Nirjala 2026 also exposes a separate astronomy-model discrepancy. The Saraswat Math panjika lists 29 June as Purnima and 30 June as Krishna Pratipad, while the current local formula and modern apparent geocentric candidates can keep Purnima present at the 30 June sunrise. That discrepancy must be investigated as a tithi engine/model question, not as a Paksavardhini Ekadashi-shift rule. The immediate rule fix is to avoid moving Nirjala because of repeated Purnima alone.

Known validation issue: this rule layer still depends on the current approximate tithi/nakshatra astronomy. Some Nabadwip/SCS Math witness cases diverge because our sunrise/arunodaya tithi differs before the rule table is applied.

### Ekadashi classification

GCAL distinguishes:

- Suddha Ekadashi
- Unmilani
- Trisprsa
- Unmilani Trisprsa
- Ekadashi not suitable because tomorrow is Unmilani
- Ekadashi not suitable because some Mahadvadashi applies

We currently implement Suddha, Viddha/no-fast, no-sunrise, Vyanjuli, Unmilani, Trisprsa, Unmilani Trisprsa, Paksavardhini and nakshatra Mahadvadashi branches. Nakshatra Mahadvadashi is restricted to Gaura Dvadashi and now also checks the Dvadashi-duration condition from the verified Panjika rules.

Validation note: the earlier `1/15` previous-night arunodaya model matched several shifted Ekadashi witnesses, but the verified Panjika rules explicitly define arunodaya as 96 minutes before sunrise. Current production follows the verified rule; witness differences should be analyzed with the comparison harness instead of silently changing the rule.

### Parana

GCAL has seven parana cases:

- Normal
- Viddha
- Unmilani
- Vyanjuli
- Trisprsa
- Jayanti/Vijaya
- Jaya/Papanasini

Our parana model now separates normal, Viddha, no-sunrise, Vyanjuli, Unmilani and Trisprsa branches. It also has a first-pass nakshatra-specific branch for Jayanti/Vijaya/Jaya/Papanasini. That branch still needs real-world validation cases.

UI convention:

- `End by 1/3 day` is the primary pratah-kala marker: `sunrise + 1/3 * daylight`.
- `End by 1/5 day` is an additional comparison marker: `sunrise + 1/5 * daylight`.
- The old generic `latest end` label is not shown in the day details panel, although `absolute_end` remains available internally for diagnostics and fallback text.

### Built-in appearance days

GCAL gives special rules for:

- Govardhana Puja
- Sri Krishna Janmashtami
- Ratha Yatra
- Gaura Purnima
- Rama Navami
- generic tithi events

Our event matcher now handles generic lunar rules with the GCAL vriddhi/ksaya table, including the `tithi-1 or less -> tithi -> tithi+1` branch used when an earlier tithi was skipped. It also has dedicated first-pass rules for Govardhana Puja, Janmashtami, Ratha Yatra, Gaura Purnima and Rama Navami. For Janmashtami double-Ashtami cases the matcher checks Rohini at midnight first, then Rohini at sunrise; if both are still equivalent, the verified Panjika rule chooses the first day.

### Dependent events

GCAL defines dependent events:

- Srila Prabhupada appearance: 1 day after Janmashtami
- Gundicha Marjana: 1 day before Ratha Yatra
- Hera Panchami: 4 days after Ratha Yatra
- Return Ratha: 8 days after Ratha Yatra
- Jagannatha Misra festival: 1 day after Gaura Purnima

Dependent events can now be tied to the calculated anchor event with `anchor_event_id` plus `observance_offset_days`. This is used for:

- Gundicha Marjana: anchored to `ratha_yatra_begin`, offset -1.
- Return Ratha / Punar Yatra: anchored to `ratha_yatra_begin`, offset +8.
- Jagannatha Misra festival: anchored to `gaura_purnima`, offset +1.

Srila Prabhupada appearance and Hera Panchami still need dedicated event records before the anchor resolver can place them.

### Fasting-day resolution

GCAL resolves collisions between Ekadashi fasting and noon-fast festivals with explicit notes. We have event display and parana display, but not the complete textual fasting-resolution layer.

### Sankranti

GCAL supports sankranti notes using one of four day-boundary systems: midnight, sunrise, noon, sunset. Default is noon-to-noon.

We calculate sankrantis internally for masa/Purushottama classification and now expose sankranti notes using the GCAL default noon-to-noon placement. Ganga Sagara Mela and Tulasi Jala Dan begin/end are generated from sankranti anchors. Configurable midnight/sunrise/noon/sunset modes are not wired into UI/rules yet.

### Ksaya and vriddhi tithi

GCAL marks second day of vriddhi and calculates exact times for ksaya tithis. We now provide a general day-level ksaya/vriddhi annotation layer. The ksaya interval finder is still based on the current approximate tithi layer.

### DST correction

GCAL has a final correction phase for parana, sunrise/sunset/noon/arunodaya and moonrise/moonset. Our code formats dates with `Intl.DateTimeFormat` in the location timezone, so modern DST display is delegated to the browser timezone database. We do not have a separate GCAL-style correction phase.

## Suggested next implementation order

1. Replace/validate the raw tithi/nakshatra/yoga astronomy layer against a stronger ephemeris and independent Navadvip references.
2. Add more witness calendars to `scripts/compare-scsmath-shifted-ekadashi.mjs`, including Kolkata/Nabadwip and local-city edge cases.
3. Add dedicated Ratha Yatra data and centralize dependent events from calculated anchors.
4. Add UI/rules support for configurable sankranti day-boundary mode.
5. Add real-world validation cases for nakshatra Mahadvadashi and Paksavardhini.
6. Add fasting-resolution notes for collisions between Ekadashi and noon-fast festivals.
