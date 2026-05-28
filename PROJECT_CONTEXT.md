# Panchang POC — Project Context for Codex

## 0. Project Goal

Build a static-browser POC for a Gaudiya Vaishnava Panchang generator in the style required by the user, with strict calculation logic for:

- Ekadashi
- Parana
- Adhika / Purushottama Masa
- Avatar appearance days
- Vaishnava appearance/disappearance days
- General Hindu calendar events as optional secondary scope

The project should initially run without a backend and without a database:

```text
index.html
styles.css
js/app.js
js/calendar-engine.js
js/providers.js
js/masa-engine.js
data/events.json
data/rules.json
```

The long-term goal is to later reuse the same calculation engine for:

- Telegram bot notifications
- weekly event summaries
- daily reminders
- generated monthly/yearly calendars
- possible backend implementation with Neon PostgreSQL

For now, the source of truth must be the local calculation engine and local JSON event definitions. External calendars are allowed only for validation, not as runtime data sources.

---

## 1. Core Architecture

### 1.1 Static POC

```text
Browser UI
  ↓
city search API → coordinates + timezone
  ↓
local astronomy library
  ↓
local calendar engine
  ↓
local events.json
  ↓
render calendar
```

No server and no database at this stage.

### 1.2 External APIs

Allowed external APIs:

1. City search / geocoding
2. Timezone lookup if not provided by geocoding
3. Optional sunrise/sunset API only for cross-checking

Do **not** use external Panchang or Vaishnava calendars as the calculation source.

### 1.3 Local Libraries

The browser POC may use:

- `astronomy-engine` in browser for Moon/Sun calculations and rise/set
- later this may be replaced by a stricter ephemeris layer

The current POC uses `Astronomy.MoonPhase(date)` to derive the Sun-Moon elongation angle. This is acceptable for POC validation, but production should validate geocentric/topocentric assumptions, ayanamsha, and sidereal conversion.

---

## 2. Important Conceptual Distinctions

### 2.1 Sunrise/Sunset Are Not Enough for Tithi

Coordinates + UTC + sunrise/sunset do **not** determine tithi.

Tithi requires the angular difference between Moon and Sun:

```text
angle = (moon_longitude - sun_longitude) mod 360
tithi = floor(angle / 12°) + 1
```

Sunrise/sunset are used only to anchor local calendar days and to evaluate `tithi_at_sunrise` and `tithi_at_arunodaya`.

### 2.2 Tithi Is Global, Application Is Local

The Sun-Moon angular difference is global or near-global, depending on geocentric/topocentric model.

Local application needs:

- timezone
- sunrise
- sunset
- arunodaya
- civil date

### 2.3 Coordinates Are Required For

Coordinates are required for:

- sunrise
- sunset
- moonrise/moonset display
- arunodaya
- Ekadashi classification
- Parana
- event rules based on sunrise/noon/midnight

Coordinates are not directly required for the mathematical definition of geocentric tithi.

---

## 3. Tithi Formula

### 3.1 Basic Formula

Let:

```text
λ_sun(t)  = sidereal longitude of the Sun at time t
λ_moon(t) = sidereal longitude of the Moon at time t
```

Then:

```text
angle(t) = (λ_moon(t) - λ_sun(t)) mod 360°
tithi_number = floor(angle(t) / 12°) + 1
```

There are 30 tithis:

```text
1  = Gaura Pratipat
2  = Gaura Dvitiya
3  = Gaura Tritiya
4  = Gaura Chaturthi
5  = Gaura Panchami
6  = Gaura Shashthi
7  = Gaura Saptami
8  = Gaura Ashtami
9  = Gaura Navami
10 = Gaura Dashami
11 = Gaura Ekadashi
12 = Gaura Dvadashi
13 = Gaura Trayodashi
14 = Gaura Chaturdashi
15 = Purnima

16 = Krishna Pratipat
17 = Krishna Dvitiya
18 = Krishna Tritiya
19 = Krishna Chaturthi
20 = Krishna Panchami
21 = Krishna Shashthi
22 = Krishna Saptami
23 = Krishna Ashtami
24 = Krishna Navami
25 = Krishna Dashami
26 = Krishna Ekadashi
27 = Krishna Dvadashi
28 = Krishna Trayodashi
29 = Krishna Chaturdashi
30 = Amavasya
```

### 3.2 Boundary of Tithi

A tithi boundary occurs when:

```text
angle(t) = N * 12°
```

where `N = 0..29`.

Tithi start/end times are essential for:

- Ekadashi edge cases
- Dvadashi start/end
- Hari-vasara
- Parana end
- no-sunrise Ekadashi detection

---

## 4. Paksha

Use this naming convention:

```json
{
  "Gaura": "waxing moon, Shukla Paksha",
  "Krishna": "waning moon, Krishna Paksha"
}
```

Do not use the word `Prakash` for paksha. The correct technical term is `paksha`.

---

## 5. Ekadashi Rules

These are the user's strict rules, saved for future calculations.

### 5.1 Arunodaya

```text
arunodaya = local_sunrise - 96 minutes
```

This is mandatory.

### 5.2 Inputs For Ekadashi Classification

For candidate day `D`:

```json
{
  "sunrise_D": "timestamp",
  "arunodaya_D": "sunrise_D - 96 minutes",
  "tithi_at_arunodaya_D": "Dashami/Ekadashi/etc",
  "tithi_at_sunrise_D": "Dashami/Ekadashi/etc",
  "tithi_at_sunrise_D_plus_1": "Ekadashi/Dvadashi/etc",
  "ekadashi_start": "timestamp",
  "ekadashi_end": "timestamp"
}
```

### 5.3 Rule Priority

Apply in this order:

```text
1. viddha
2. double_sunrise
3. no_sunrise
4. standard
```

### 5.4 Viddha Rule

If Dashami is present at arunodaya and Ekadashi is present at sunrise:

```text
IF tithi_at_arunodaya(D) == Dashami
AND tithi_at_sunrise(D) == Ekadashi
THEN Ekadashi is viddha
AND fast_date = D + 1
```

This means the fast moves to Dvadashi / Mahadvadashi.

### 5.5 Double Sunrise Rule

If Ekadashi is present at two consecutive sunrises:

```text
IF tithi_at_sunrise(D) == Ekadashi
AND tithi_at_sunrise(D+1) == Ekadashi
THEN fast_date = D + 1
```

### 5.6 No-Sunrise Rule

If Ekadashi occurs between two sunrises and is not present at either sunrise:

```text
IF tithi_at_sunrise(D) != Ekadashi
AND tithi_at_sunrise(D+1) != Ekadashi
AND ekadashi_interval overlaps (sunrise(D), sunrise(D+1))
THEN fast_date = D + 1
```

This was confirmed by validation against Tel Aviv March 2026 and is required for cases like Kamada Ekadashi 2026.

### 5.7 Standard Rule

If Ekadashi is present at sunrise and is not viddha and not double-sunrise:

```text
IF tithi_at_sunrise(D) == Ekadashi
AND NOT viddha
AND NOT double_sunrise
THEN fast_date = D
```

### 5.8 Ekadashi Output Shape

```json
{
  "id": "ekadashi_YYYY-MM-DD",
  "name": "Mohini Ekadashi",
  "type": "ekadashi",
  "category": "vrata",
  "classification": "standard | viddha | double_sunrise | no_sunrise",
  "candidate_date": "YYYY-MM-DD",
  "fast_date": "YYYY-MM-DD",
  "parana": {
    "date": "YYYY-MM-DD",
    "start": "HH:MM",
    "preferred_end": "HH:MM",
    "absolute_end": "HH:MM"
  },
  "diagnostics": {
    "sunrise": "HH:MM",
    "arunodaya": "HH:MM",
    "tithi_at_arunodaya": "string",
    "tithi_at_sunrise": "string",
    "next_sunrise_tithi": "string",
    "rule_applied": "string"
  }
}
```

---

## 6. Parana Rules

### 6.1 Required Data

To compute Parana accurately, the engine needs:

- sunrise on Dvadashi day
- sunset on Dvadashi day
- Dvadashi start
- Dvadashi end

Do not estimate Dvadashi as exactly 24 hours.

### 6.2 Hari-vasara

Hari-vasara is the first quarter of Dvadashi:

```text
hari_vasara_end = dvadashi_start + 0.25 * (dvadashi_end - dvadashi_start)
```

### 6.3 Parana Start

```text
parana_start = max(sunrise_dvadashi, hari_vasara_end)
```

Parana cannot be before sunrise and cannot be during Hari-vasara.

### 6.4 Pratah-kala End

Preferred parana is in Pratah-kala, the first third of daylight:

```text
daylight_duration = sunset_dvadashi - sunrise_dvadashi
pratah_end = sunrise_dvadashi + (1/3) * daylight_duration
```

### 6.5 Preferred Parana End

```text
preferred_parana_end = min(dvadashi_end, pratah_end)
```

### 6.6 Absolute Latest End

```text
absolute_parana_end = dvadashi_end
```

### 6.7 Output Model

Use separate fields:

```json
{
  "parana": {
    "start": "max(sunrise_dvadashi, hari_vasara_end)",
    "preferred_end": "min(dvadashi_end, pratah_end)",
    "absolute_end": "dvadashi_end"
  }
}
```

### 6.8 Validated Cases

Tel Aviv March 2026:

1. Papamochani:
   - fast date: 15 March 2026
   - parana: 16 March
   - site showed 05:50–06:13
   - Formula matches because Dvadashi ended early at 06:13

2. Kamada:
   - fast date: 29 March 2026
   - parana: 30 March
   - site showed 05:32–09:41 without DST
   - With DST correction: 06:32–10:41
   - Formula matches because end is `pratah_end`

---

## 7. 24 Ekadashi Name Resolver

Use masa + paksha.

```json
{
  "Agrahayana": { "Krishna": "Utpanna", "Gaura": "Mokshada" },
  "Pausha": { "Krishna": "Saphala", "Gaura": "Putrada" },
  "Magha": { "Krishna": "Shat-tila", "Gaura": "Jaya" },
  "Phalguna": { "Krishna": "Vijaya", "Gaura": "Amalaki" },
  "Chaitra": { "Krishna": "Papamochani", "Gaura": "Kamada" },
  "Vaishakha": { "Krishna": "Varuthini", "Gaura": "Mohini" },
  "Jyeshtha": { "Krishna": "Apara", "Gaura": "Nirjala" },
  "Ashadha": { "Krishna": "Yogini", "Gaura": "Devashayani" },
  "Shravana": { "Krishna": "Kamika", "Gaura": "Pavitropana" },
  "Bhadrapada": { "Krishna": "Annada", "Gaura": "Parivartini" },
  "Ashvina": { "Krishna": "Indira", "Gaura": "Pasankusha" },
  "Kartika": { "Krishna": "Rama", "Gaura": "Prabodhini" }
}
```

Aliases:

```json
{
  "Margashirsha": "Agrahayana",
  "Bhadra": "Bhadrapada",
  "Ashwin": "Ashvina"
}
```

In Adhika/Purushottama Masa, there will be two additional Ekadashis, so the year has 26 Ekadashis instead of 24.

Recommended display:

```text
Adhika {masa} {paksha} Ekadashi ({base_name})
```

Example:

```text
Adhika Jyeshtha Gaura Ekadashi (Nirjala)
```

Naming convention can be changed later without changing calculation logic.

---

## 8. Lunar Month / Masa Rules

### 8.1 Month List

```json
[
  "Chaitra",
  "Vaishakha",
  "Jyeshtha",
  "Ashadha",
  "Shravana",
  "Bhadrapada",
  "Ashvina",
  "Kartika",
  "Agrahayana",
  "Pausha",
  "Magha",
  "Phalguna"
]
```

Aliases:

```json
{
  "Agrahayana": ["Margashirsha"],
  "Bhadrapada": ["Bhadra"],
  "Ashvina": ["Ashwin"]
}
```

### 8.2 Boundary

For the current project, use the amanta/amavasyanta model:

```text
lunar_month = interval between consecutive Amavasyas
```

### 8.3 Amavasya

Amavasya occurs when:

```text
angle = (moon_longitude - sun_longitude) mod 360 = 0°
```

or when the Moon phase angle reaches 0°.

### 8.4 Sankranti

Sankranti occurs when the sidereal solar longitude crosses a multiple of 30°:

```text
sankranti occurs when floor(sun_sidereal_longitude / 30°) changes
```

Each rashi covers 30°:

```text
Mesha       0°–30°
Vrishabha   30°–60°
Mithuna     60°–90°
Karka       90°–120°
Simha       120°–150°
Kanya       150°–180°
Tula        180°–210°
Vrishchika  210°–240°
Dhanu       240°–270°
Makara      270°–300°
Kumbha      300°–330°
Mina        330°–360°
```

### 8.5 Adhika / Purushottama Formula

For each lunar month interval:

```text
M = interval between consecutive Amavasyas
S = number of Sankrantis inside M
```

Classification:

```text
S == 0 → adhika masa / Purushottama masa
S == 1 → normal masa
S == 2 → kshaya masa
```

This is the core formula.

### 8.6 Why Adhika Occurs

Average durations:

```text
lunar month ≈ 29.53 days
solar rashi transition ≈ 30.44 days
```

Sometimes a lunar month fits entirely between two solar rashi transitions. Then there is no Sankranti in that Amavasya-to-Amavasya interval, so it is Adhika.

### 8.7 Average Interval Between Adhika Months

Adhika/Purushottama appears approximately every:

```text
32 months 16 days
```

or around:

```text
2 years 8–9 months
```

But do not calculate it by interval. Always compute by the Sankranti rule.

### 8.8 Output Shape

```json
{
  "masa": {
    "name": "Jyeshtha",
    "type": "adhika | normal | kshaya",
    "display_name": "Purushottama / Adhika Jyeshtha",
    "start_new_moon_utc": "timestamp",
    "end_new_moon_utc": "timestamp",
    "sankranti_count": 0,
    "sankrantis": []
  }
}
```

### 8.9 Event Rule In Adhika Masa

In Adhika/Purushottama:

- Ekadashi stays
- regular tithis stay
- major avatar/festival observances should not be generated in Adhika month unless explicitly allowed
- festivals usually belong to Nija/Shuddha month, not Adhika month

Recommended field:

```json
{
  "allow_in_adhika": true
}
```

If `allow_in_adhika` is absent and event is an avatar/festival, skip it in Adhika month.

---

## 9. Timing Rules For Events

Events do not store Gregorian dates as their primary identity. They store lunar conditions.

### 9.1 Event Definition

Example:

```json
{
  "id": "nrsimha_chaturdashi",
  "name": "Sri Nrsimha Chaturdashi",
  "type": "appearance",
  "category": "avatar",
  "scope": "core_gaudiya",
  "subject": "Lord Nrsimhadev",
  "masa": "Vaishakha",
  "paksha": "Gaura",
  "tithi": "Chaturdashi",
  "timing_rule": "sunrise_based",
  "fasting_rule": "fast_until_sunset",
  "priority": "highest",
  "content": {
    "short": "Appearance of Lord Nrsimhadev",
    "full": "Observed on Vaishakha Gaura Chaturdashi.",
    "tags": ["avatar", "nrsimha"]
  }
}
```

### 9.2 Date Is Generated

The event definition stores:

```text
masa + paksha + tithi + timing_rule
```

The generated calendar day stores:

```text
Gregorian date + matched events
```

Do not hard-code date in `event_definitions`, except temporary POC fixed observances when the lunar rule is not yet finalized.

### 9.3 Timing Rule Types

```json
{
  "sunrise_based": "event date is the civil day where target tithi is present at local sunrise",
  "noon_based": "event date is the civil day where target tithi is present at local noon",
  "midnight_based": "event date is the civil day where target tithi is present at local midnight",
  "arunodaya_based": "used for Ekadashi classification"
}
```

### 9.4 Multiple Events On One Tithi

One lunar day can have many events.

Generated day shape:

```json
{
  "date": "YYYY-MM-DD",
  "lunar": {
    "masa": "Vaishakha",
    "masa_type": "normal",
    "paksha": "Gaura",
    "tithi_at_sunrise": "Chaturdashi"
  },
  "events": [
    {
      "id": "nrsimha_chaturdashi",
      "name": "Sri Nrsimha Chaturdashi"
    },
    {
      "id": "some_vaishnava_appearance",
      "name": "Appearance of ..."
    }
  ]
}
```

---

## 10. Event Scopes

Use scopes to separate essential Gaudiya events from extended Hindu calendar items.

```text
core_gaudiya
extended_hindu
local_custom
validation_only
```

Examples:

- `Nrsimha Chaturdashi` → `core_gaudiya`
- `Ekadashi` → `core_gaudiya`
- `Akshaya Tritiya` → possibly `extended_hindu` unless user wants it promoted
- `Parashurama Jayanti` → `extended_hindu`
- `Ganga Saptami` → `extended_hindu`

---

## 11. Core Avatar Events

### 11.1 Event Definitions

```json
[
  {
    "id": "gaura_purnima",
    "name": "Sri Gaura Purnima",
    "type": "appearance",
    "category": "avatar",
    "scope": "core_gaudiya",
    "subject": "Sri Chaitanya Mahaprabhu",
    "masa": "Phalguna",
    "paksha": "Gaura",
    "tithi": "Purnima",
    "timing_rule": "sunrise_based",
    "fasting_rule": "fast_until_moonrise",
    "priority": "highest"
  },
  {
    "id": "rama_navami",
    "name": "Sri Rama Navami",
    "type": "appearance",
    "category": "avatar",
    "scope": "core_gaudiya",
    "subject": "Lord Ramachandra",
    "masa": "Chaitra",
    "paksha": "Gaura",
    "tithi": "Navami",
    "timing_rule": "noon_based",
    "fasting_rule": "fast_until_noon",
    "priority": "highest"
  },
  {
    "id": "nrsimha_chaturdashi",
    "name": "Sri Nrsimha Chaturdashi",
    "type": "appearance",
    "category": "avatar",
    "scope": "core_gaudiya",
    "subject": "Lord Nrsimhadev",
    "masa": "Vaishakha",
    "paksha": "Gaura",
    "tithi": "Chaturdashi",
    "timing_rule": "sunrise_based",
    "fasting_rule": "fast_until_sunset",
    "priority": "highest"
  },
  {
    "id": "varaha_dvadashi",
    "name": "Sri Varaha Dvadashi",
    "type": "appearance",
    "category": "avatar",
    "scope": "core_gaudiya",
    "subject": "Lord Varahadev",
    "masa": "Magha",
    "paksha": "Gaura",
    "tithi": "Dvadashi",
    "timing_rule": "sunrise_based",
    "parana_rule": "after_worship_of_varahadev",
    "priority": "high"
  },
  {
    "id": "balarama_purnima",
    "name": "Sri Balarama Purnima",
    "type": "appearance",
    "category": "avatar",
    "scope": "core_gaudiya",
    "subject": "Lord Balarama",
    "masa": "Shravana",
    "paksha": "Gaura",
    "tithi": "Purnima",
    "timing_rule": "sunrise_based",
    "priority": "highest"
  },
  {
    "id": "janmashtami",
    "name": "Sri Krishna Janmashtami",
    "type": "appearance",
    "category": "avatar",
    "scope": "core_gaudiya",
    "subject": "Lord Krishna",
    "masa": "Bhadrapada",
    "paksha": "Krishna",
    "tithi": "Ashtami",
    "timing_rule": "midnight_based",
    "fasting_rule": "fast_until_midnight",
    "priority": "highest"
  },
  {
    "id": "vamana_dvadashi",
    "name": "Sri Vamana Dvadashi",
    "type": "appearance",
    "category": "avatar",
    "scope": "core_gaudiya",
    "subject": "Lord Vamanadev",
    "masa": "Bhadrapada",
    "paksha": "Gaura",
    "tithi": "Dvadashi",
    "timing_rule": "sunrise_based",
    "parana_rule": "after_worship_of_vamanadev",
    "priority": "high"
  }
]
```

---

## 12. Additional Vaishakha Events

Patch definitions added during conversation:

```json
[
  {
    "id": "akshaya_tritiya",
    "name": "Akshaya Tritiya",
    "type": "festival",
    "category": "festival",
    "scope": "extended_hindu",
    "subject": "Akshaya Tritiya",
    "masa": "Vaishakha",
    "paksha": "Gaura",
    "tithi": "Tritiya",
    "timing_rule": "sunrise_based",
    "priority": "high"
  },
  {
    "id": "parashurama_jayanti",
    "name": "Parashurama Jayanti",
    "type": "appearance",
    "category": "avatar",
    "scope": "extended_hindu",
    "subject": "Lord Parashurama",
    "masa": "Vaishakha",
    "paksha": "Gaura",
    "tithi": "Tritiya",
    "timing_rule": "sunrise_based",
    "priority": "medium"
  },
  {
    "id": "ganga_saptami",
    "name": "Ganga Saptami",
    "type": "festival",
    "category": "festival",
    "scope": "extended_hindu",
    "subject": "Sri Ganga / Jahnavi",
    "masa": "Vaishakha",
    "paksha": "Gaura",
    "tithi": "Saptami",
    "timing_rule": "sunrise_based",
    "priority": "medium"
  },
  {
    "id": "sita_navami",
    "name": "Sita Navami",
    "type": "appearance",
    "category": "avatar_associate",
    "scope": "extended_hindu",
    "subject": "Sri Sita Devi",
    "masa": "Vaishakha",
    "paksha": "Gaura",
    "tithi": "Navami",
    "timing_rule": "noon_based",
    "priority": "medium"
  }
]
```

---

## 13. Mahaprabhu Parsada Events

Known/added POC definitions:

```json
[
  {
    "id": "nityananda_prabhu_appearance",
    "name": "Sri Nityananda Prabhu Appearance",
    "subject": "Sri Nityananda Prabhu",
    "type": "appearance",
    "category": "mahaprabhu_parsada",
    "timing_rule": "noon_based",
    "masa": "Magha",
    "paksha": "Gaura",
    "tithi": "Trayodashi",
    "priority": "highest"
  },
  {
    "id": "advaita_acharya_appearance",
    "name": "Sri Advaita Acharya Appearance",
    "subject": "Sri Advaita Acharya",
    "type": "appearance",
    "category": "mahaprabhu_parsada",
    "timing_rule": "sunrise_based",
    "masa": "Magha",
    "paksha": "Krishna",
    "tithi": "Saptami",
    "priority": "highest"
  },
  {
    "id": "gadadhara_pandit_appearance",
    "name": "Srila Gadadhara Pandit Appearance",
    "subject": "Srila Gadadhara Pandit",
    "type": "appearance",
    "category": "mahaprabhu_parsada",
    "timing_rule": "sunrise_based",
    "priority": "highest"
  },
  {
    "id": "srivasa_pandit_appearance",
    "name": "Srivasa Pandit Appearance",
    "subject": "Srivasa Pandit",
    "type": "appearance",
    "category": "mahaprabhu_parsada",
    "timing_rule": "sunrise_based",
    "priority": "high"
  },
  {
    "id": "jahnava_devi_appearance",
    "name": "Sri Jahnava Devi Appearance",
    "subject": "Sri Jahnava Devi",
    "type": "appearance",
    "category": "mahaprabhu_parsada",
    "timing_rule": "sunrise_based",
    "priority": "high"
  },
  {
    "id": "sita_devi_appearance",
    "name": "Sri Sita Devi Appearance",
    "subject": "Sri Sita Devi",
    "type": "appearance",
    "category": "mahaprabhu_parsada",
    "timing_rule": "sunrise_based",
    "priority": "medium"
  },
  {
    "id": "haridasa_thakur_disappearance",
    "name": "Srila Haridasa Thakur Disappearance",
    "subject": "Srila Haridasa Thakur",
    "type": "disappearance",
    "category": "mahaprabhu_parsada",
    "timing_rule": "sunrise_based",
    "priority": "highest"
  },
  {
    "id": "vakreshvara_pandit_appearance",
    "name": "Vakreshvara Pandit Appearance",
    "subject": "Vakreshvara Pandit",
    "type": "appearance",
    "category": "mahaprabhu_parsada",
    "timing_rule": "sunrise_based",
    "priority": "medium"
  },
  {
    "id": "murari_gupta_appearance",
    "name": "Murari Gupta Appearance",
    "subject": "Murari Gupta",
    "type": "appearance",
    "category": "mahaprabhu_parsada",
    "timing_rule": "sunrise_based",
    "priority": "medium"
  }
]
```

Some of these still need exact `masa/paksha/tithi` extraction. Until then they should either be excluded from production matching or stored with `source_status: "needs_exact_lunar_rule"`.

---

## 14. Important Known Dates / Test Cases

### 14.1 April 2026, Maalot

Expected important events:

```text
2026-04-13 Varuthini Ekadashi
2026-04-14 Parana
2026-04-17 Gadadhara Pandit Appearance + Amavasya
2026-04-19 or 2026-04-20 Akshaya Tritiya needs strict local validation
2026-04-27 Mohini Ekadashi
2026-04-28 Parana
2026-04-30 Nrsimha Chaturdashi
```

### 14.2 Nrsimha Chaturdashi 2026, Maalot

Expected:

```text
date: 2026-04-30
event: Sri Nrsimha Chaturdashi
fasting_rule: fast_until_sunset
sunrise approx: 05:52
sunset approx: 19:20
```

The official "sunset" is the standard astronomical sunset, not the full disappearance of the lower limb. If user asks "lower limb", it is roughly 2–3 minutes after official sunset.

### 14.3 March 2026, Tel Aviv

Validated against vcalendar.ru Tel Aviv March 2026.

Papamochani:

```text
14 Mar: Ekadashi not for fasting
15 Mar: fast
16 Mar: parana 05:50–06:13
```

Kamada:

```text
28 Mar: Ekadashi not for fasting
29 Mar: fast
30 Mar: parana 05:32–09:41 without DST
after DST correction: 06:32–10:41
```

### 14.4 March 2026, Maalot / Moscow / Nabadwip

Expected by current logic after corrections:

```text
Papamochani fast: 2026-03-15
Kamada fast: 2026-03-29
```

This was used to validate:

- viddha
- no-sunrise
- location-sensitive sunrise/arunodaya handling

---

## 15. Generated Calendar Day Model

Recommended output shape:

```json
{
  "date": "YYYY-MM-DD",
  "location": {
    "name": "Maalot, Israel",
    "lat": 33.016,
    "lon": 35.277,
    "timezone": "Asia/Jerusalem"
  },
  "astronomy": {
    "sunrise": "HH:MM",
    "sunset": "HH:MM",
    "moonrise": "HH:MM",
    "moonset": "HH:MM",
    "arunodaya": "HH:MM"
  },
  "lunar": {
    "masa": "Vaishakha",
    "masa_type": "normal",
    "is_purushottama": false,
    "paksha": "Gaura",
    "tithi_at_sunrise": "Chaturdashi",
    "tithi_at_arunodaya": "Trayodashi",
    "tithi_angle_at_sunrise": 156.42,
    "previous_tithi_boundary": "timestamp",
    "next_tithi_boundary": "timestamp"
  },
  "events": [
    {
      "id": "nrsimha_chaturdashi",
      "name": "Sri Nrsimha Chaturdashi",
      "type": "appearance",
      "category": "avatar"
    }
  ],
  "diagnostics": {
    "rules_version": "v1",
    "engine_version": "poc"
  }
}
```

---

## 16. File Structure Recommended For Codex

```text
/
  index.html
  styles.css
  README.md
  PROJECT_CONTEXT.md
  js/
    app.js
    providers.js
    astronomy-adapter.js
    calendar-engine.js
    masa-engine.js
    ekadashi-engine.js
    parana-engine.js
    event-matcher.js
    events-data.js
    rules-data.js
  data/
    events.json
    rules.json
    locations.json
    overrides.json
  tests/
    march-2026-tel-aviv.json
    march-2026-maalot.json
    april-2026-maalot.json
    purushottama-2026.json
```

Recommended split:

- `providers.js`: city search, timezone API wrappers
- `astronomy-adapter.js`: all calls to Astronomy Engine or future ephemeris library
- `calendar-engine.js`: orchestration
- `masa-engine.js`: amavasya/sankranti/adhika
- `ekadashi-engine.js`: classification + naming
- `parana-engine.js`: parana window
- `event-matcher.js`: event definitions → generated day events
- `app.js`: UI only

---

## 17. Data Files

### 17.1 rules.json

Must contain:

```json
{
  "rules_version": "v1",
  "ekadashi": {
    "arunodaya_offset_minutes": 96,
    "classification_priority": [
      "viddha",
      "double_sunrise",
      "no_sunrise",
      "standard"
    ]
  },
  "parana": {
    "hari_vasara_fraction": 0.25,
    "pratah_fraction_of_daylight": 0.3333333333333333
  },
  "masa": {
    "boundary": "amavasya_to_amavasya",
    "sankranti_definition": "sidereal_sun_rashi_change",
    "adhika_if_sankranti_count": 0,
    "normal_if_sankranti_count": 1,
    "kshaya_if_sankranti_count": 2
  }
}
```

### 17.2 events.json

Must be a local event database with fields:

```json
{
  "id": "string",
  "name": "string",
  "type": "appearance | disappearance | ekadashi | mahadvadashi | festival | lila",
  "category": "avatar | mahaprabhu_parsada | vaishnava | acharya | vrata | festival | avatar_associate",
  "scope": "core_gaudiya | extended_hindu | local_custom",
  "subject": "string",
  "masa": "string | null",
  "paksha": "Gaura | Krishna | null",
  "tithi": "string | null",
  "timing_rule": "sunrise_based | noon_based | midnight_based | arunodaya_based",
  "fasting_rule": "string | object | null",
  "parana_rule": "string | object | null",
  "allow_in_adhika": "boolean",
  "priority": "low | medium | high | highest",
  "content": {
    "short": "string",
    "full": "string",
    "tags": ["string"]
  },
  "source_status": "confirmed | needs_exact_lunar_rule | validation_only"
}
```

---

## 18. POC Limitations To Preserve In README

Be explicit about these:

1. This is a POC, not final production Panchang.
2. Current astronomy layer may use approximate ayanamsha and geocentric calculations.
3. Masa naming must be validated against formal Gaudiya rules.
4. Some events are temporarily fixed to 2026 observance dates until lunar rules are confirmed.
5. External calendars are validation-only and must not override engine output.
6. Browser direct-file mode cannot reliably `fetch()` local JSON, so mirrored JS data files are used.
7. Production should move JSON loading to static server/backend or bundle step.

---

## 19. Validation Philosophy

Never silently mix external calendar data into generated output.

Correct separation:

```text
Engine output = source of truth
External calendar = validation/comparison only
Manual override = explicit, versioned, documented
```

If using overrides:

```json
{
  "overrides": [
    {
      "date": "YYYY-MM-DD",
      "location": "Maalot",
      "reason": "validated CSM special observance",
      "change": {
        "add_event": "..."
      },
      "source": "..."
    }
  ]
}
```

But avoid overrides until necessary.

---

## 20. First Codex Tasks

Recommended next tasks for Codex:

1. Refactor the existing POC into modules:
   - `astronomy-adapter.js`
   - `masa-engine.js`
   - `ekadashi-engine.js`
   - `parana-engine.js`
   - `event-matcher.js`

2. Add `PROJECT_CONTEXT.md` to repo root.

3. Add tests:
   - March 2026 Tel Aviv
   - March 2026 Maalot
   - April 2026 Maalot
   - Purushottama 2026 interval

4. Make UI show:
   - tithi at sunrise
   - tithi at arunodaya
   - masa type
   - is_purushottama
   - Ekadashi classification
   - parana start/preferred_end/absolute_end

5. Add strict internal mode:

```js
const ENGINE_MODE = {
  STRICT_INTERNAL: true,
  EXTERNAL_VALIDATION: false
};
```

6. Add validation panel separately, not mixed with output.

---

## 21. User Preferences / Requirements

The user wants:

- precise, verifiable calculations
- no invented data
- clear separation of engine output and validation data
- strict CSM-style Ekadashi logic
- support for Gaudiya Vaishnava events
- later Telegram bot notifications:
  - one day before event
  - weekly summary at beginning of week
- eventually use Neon PostgreSQL, but not yet
- currently: static POC first

The user rejects using official calendars blindly as source of truth because formulas may differ or be wrong for the intended use. The engine must calculate independently.

---

## 22. Current High-Priority Open Questions

These must be resolved before production:

1. Exact ayanamsha:
   - Lahiri?
   - CSM-specific?
   - configurable?

2. Geocentric vs topocentric Moon:
   - POC may use geocentric
   - production should evaluate topocentric impact

3. Full event database:
   - exact lunar rules for all Vaishnavas
   - source status per event

4. Adhika/Purushottama:
   - validate 2026 interval by engine, not by hard-coded dates
   - ensure festivals are skipped in Adhika unless explicitly allowed

5. Noon/midnight event rules:
   - Rama Navami
   - Janmashtami
   - Nityananda Trayodashi
   - any other non-sunrise observance

6. Mahadvadashi labels:
   - viddha → Mahadvadashi-like observance?
   - no-sunrise → Shuddha/Mahadvadashi label?
   - label should be separate from calculation result

---

## 23. Minimal Prompt To Give Codex

Use this prompt after adding this file to the repo:

```text
Read PROJECT_CONTEXT.md first. Refactor the current static Panchang POC according to the architecture described there. Keep all calculations local in browser JS. Do not use external Panchang calendars as runtime data sources. Implement strict Ekadashi, Parana, and Adhika/Purushottama logic. Add regression fixtures for March 2026 Tel Aviv/Maalot and April 2026 Maalot.
```

---

## 24. Safety Rule For Future Development

If a value is not known or not yet implemented, do not fake it.

Use:

```json
{
  "source_status": "needs_exact_lunar_rule"
}
```

or:

```json
{
  "calculation_status": "not_implemented"
}
```

rather than silently returning a guessed result.
