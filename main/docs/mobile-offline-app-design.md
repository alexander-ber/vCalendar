# vCalendar Mobile Offline App Design

## Goal

Build an offline-first Android/iOS app from the current vCalendar data and calculation engine.

The app must work without internet for the built-in languages and data. Internet is used only to update optional language/content packs and, later, to resolve unknown GPS locations.

## Core Principles

- Calendar calculations are local and deterministic.
- The source of truth is astronomy, place coordinates, timezone, and local rules.
- Russian and English are always bundled with the app.
- Additional languages can be downloaded from GitHub as content packs.
- A language pack includes UI labels, event names, short descriptions, full biographies, Ekadashi texts, glossary terms, and document labels.
- If a translation is missing, the app falls back to English.
- Downloaded content is cached in SQLite and remains available offline.
- No event should be tied to a Gregorian date unless the event is explicitly a Gregorian-only metadata item. Vaishnava calendar events remain rule/tithi based.

## Engineering Principles

- SOLID first: keep UI, storage, sync, and calculation logic separated.
- Code reuse: current web data and rules should feed both web and mobile builds.
- Flexibility: new languages, themes, locations, and event content should not require changing UI code.
- Replaceable layers: SQLite, sync, GPS, and the calculation engine should be behind interfaces/repositories.
- Deterministic calculation: the same coordinates, timezone, date, and rule version should produce the same result on every platform.
- Testable core: calculation and data import should be testable without Flutter widgets.
- No hidden overrides: validation data can explain differences, but should not silently replace formula-based calculations.

## Data Packaging

The repository can keep JSON and Markdown as editable source files, but the mobile app should not depend on JSON files at runtime.

Build flow:

```text
source JSON / Markdown / docs
  -> validation scripts
  -> vcalendar_seed.sqlite
  -> bundled APK / IPA asset
```

Runtime flow:

```text
bundled vcalendar_seed.sqlite
  -> first app launch copies DB to app storage
  -> app reads and writes SQLite only
  -> online language/content updates are imported into SQLite
```

This keeps the app simple offline: no JSON parsing layer is needed on the device for normal use.

## Suggested Project Layout

```text
vCalendar/
  apps/
    mobile/
      lib/
      assets/
        db/
          vcalendar_seed.sqlite
        docs/
  data/
    events/
    ekadashi.json
    rules.json
  i18n/
    en/
      manifest.json
      ui.json
      events.json
      ekadashi.json
      glossary.json
    ru/
      manifest.json
      ui.json
      events.json
      ekadashi.json
      glossary.json
  scripts/
    build-mobile-db.mjs
    validate-language-pack.mjs
```

## Language Pack Sync

The app checks a GitHub folder from time to time:

```text
https://raw.githubusercontent.com/alexander-ber/vCalendar/main/i18n/manifest.json
```

The root manifest lists available languages and versions.

```json
{
  "schema_version": 1,
  "updated_at": "2026-08-14T00:00:00Z",
  "languages": [
    {
      "lang": "en",
      "version": 12,
      "required_app_schema": 1,
      "files": {
        "ui": "i18n/en/ui.json",
        "events": "i18n/en/events.json",
        "ekadashi": "i18n/en/ekadashi.json",
        "glossary": "i18n/en/glossary.json"
      }
    },
    {
      "lang": "ru",
      "version": 12,
      "required_app_schema": 1,
      "files": {
        "ui": "i18n/ru/ui.json",
        "events": "i18n/ru/events.json",
        "ekadashi": "i18n/ru/ekadashi.json",
        "glossary": "i18n/ru/glossary.json"
      }
    }
  ]
}
```

Sync flow:

1. App starts with bundled `vcalendar_seed.sqlite`.
2. Every configured interval, app downloads the root language manifest.
3. App compares remote language versions with local `content_packs`.
4. If a new language or newer version exists, app downloads the pack files.
5. Files are validated before import.
6. Import runs inside a SQLite transaction.
7. If import fails, the previous local content remains active.

Recommended sync intervals:

- Manual "Check updates" button.
- Automatic check every 24 hours when online.
- Skip automatic check on low battery/mobile data if the user disables it.

## SQLite Schema

### App Metadata

```sql
create table app_meta (
  key text primary key,
  value text not null
);
```

### User Preferences

Persistent user settings. On mobile this can be backed by SQLite or platform preferences; keeping the shape explicit helps migration and backup.

```sql
create table user_preferences (
  key text primary key,
  value text not null,
  updated_at text not null
);
```

Important keys:

- `lang`
- `theme`
- `font_scale`
- `reading_font`
- `display_mode`
- `location_id`
- `user_place_id`
- `event_filters`
- `language_auto_update`
- `language_update_interval_hours`

### Content Packs

Tracks bundled and downloaded language/content versions.

```sql
create table content_packs (
  lang text not null,
  pack_kind text not null,
  version integer not null,
  source text not null,
  source_url text,
  checksum text,
  installed_at text not null,
  is_builtin integer not null default 0,
  is_active integer not null default 1,
  primary key (lang, pack_kind)
);
```

`pack_kind` examples:

- `ui`
- `events`
- `ekadashi`
- `glossary`
- `docs`

### Locations

Locations are not the calculation source of truth by themselves. They are named presets for coordinates, timezone, and regional display rules.

```sql
create table locations (
  id text primary key,
  country_code text not null,
  timezone text not null,
  latitude real not null,
  longitude real not null,
  altitude_m real,
  week_start integer not null default 1,
  sort_order integer not null default 1000,
  is_builtin integer not null default 1,
  is_active integer not null default 1
);

create table location_i18n (
  location_id text not null references locations(id) on delete cascade,
  lang text not null,
  name text not null,
  country_name text,
  region_name text,
  primary key (location_id, lang)
);
```

`week_start`: `0` for Sunday, `1` for Monday.

India and Israel should use Sunday in the calendar display.

### User Places

For GPS-selected or online-resolved places.

```sql
create table user_places (
  id text primary key,
  label text not null,
  timezone text not null,
  latitude real not null,
  longitude real not null,
  source text not null,
  nearest_location_id text references locations(id),
  created_at text not null,
  updated_at text not null
);
```

`source` examples:

- `gps`
- `manual`
- `online_geocode`
- `nearest_builtin`

### Events

Base event identity and tithi/rule matching are language-neutral.

```sql
create table events (
  id text primary key,
  category text not null,
  event_type text not null,
  scope text,
  subject text,
  masa text,
  paksha text,
  tithi text,
  naksatra text,
  timing_rule text,
  fasting_rule text,
  allow_in_adhika integer not null default 0,
  priority integer not null default 100,
  source_status text not null default 'confirmed',
  source_url text,
  source_note text,
  created_at text,
  updated_at text
);
```

Examples:

- `category`: `festival`, `vaishnava_appearance`, `vaishnava_disappearance`, `avatar`, `deity_temple`, `ekadashi`, `parana`
- `event_type`: `appearance`, `disappearance`, `festival`, `period_start`, `period_end`, `restriction`, `fast`

### Event Translations

```sql
create table event_i18n (
  event_id text not null references events(id) on delete cascade,
  lang text not null,
  name text not null,
  short_description text,
  full_description text,
  source_url text,
  translator_note text,
  updated_at text,
  primary key (event_id, lang)
);
```

### Vaishnava Persons

This makes the Vaishnava search more reliable than extracting names from event titles.

```sql
create table vaishnavas (
  id text primary key,
  normalized_name text not null,
  appearance_event_id text references events(id),
  disappearance_event_id text references events(id),
  source_url text,
  created_at text,
  updated_at text
);

create table vaishnava_i18n (
  vaishnava_id text not null references vaishnavas(id) on delete cascade,
  lang text not null,
  nominative_name text not null,
  display_name text not null,
  short_bio text,
  full_bio text,
  primary key (vaishnava_id, lang)
);
```

### Ekadashi Texts

Ekadashi names and stories are content, but the fast/parana calculation remains engine logic.

```sql
create table ekadashi (
  id text primary key,
  masa text not null,
  paksha text not null,
  source_url text
);

create table ekadashi_i18n (
  ekadashi_id text not null references ekadashi(id) on delete cascade,
  lang text not null,
  name text not null,
  benefits text,
  story text,
  full_description text,
  primary key (ekadashi_id, lang)
);
```

### Glossary

For the `i` block.

```sql
create table glossary_terms (
  id text primary key,
  category text not null,
  sort_order integer not null default 1000
);

create table glossary_i18n (
  term_id text not null references glossary_terms(id) on delete cascade,
  lang text not null,
  title text not null,
  short_description text not null,
  full_description text,
  primary key (term_id, lang)
);
```

Examples:

- `tithi`
- `paksha`
- `masa`
- `pratipad`
- `amavasya`
- `naksatra`
- `amrita_yoga`
- `mahendra_yoga`
- `vakra_yoga`
- `shunya_yoga`

### Localized UI Strings

```sql
create table ui_strings (
  lang text not null,
  key text not null,
  value text not null,
  updated_at text,
  primary key (lang, key)
);
```

### Panjika / Docs

For offline HTML docs inside the app.

```sql
create table documents (
  id text primary key,
  doc_type text not null,
  lang text not null,
  title text not null,
  asset_path text,
  local_path text,
  source_url text,
  version integer not null default 1,
  updated_at text
);
```

### Calculation Cache

Optional. This speeds up the UI but must be rebuildable from the engine.

```sql
create table calendar_day_cache (
  location_key text not null,
  date_iso text not null,
  engine_version text not null,
  lang text not null,
  payload_json text not null,
  created_at text not null,
  primary key (location_key, date_iso, engine_version, lang)
);
```

`location_key` can be:

- built-in location id, for example `nabadwip`
- GPS coordinate bucket, for example `gps:23.407:88.367:Asia/Kolkata`

## GPS Location Logic

The calendar should calculate by coordinates and timezone, not by city name.

Flow:

```text
GPS coordinates
  -> find nearest built-in location
  -> if close enough, suggest/use it
  -> if far:
       if timezone can be resolved offline, calculate by GPS point
       else if online, resolve timezone/city and cache as user_place
       else ask user to choose a location manually
```

Recommended thresholds:

- Within 50 km: use nearest built-in location silently or with a small confirmation.
- 50-200 km: suggest nearest built-in location.
- More than 200 km: ask user or use online lookup.

## Online Language Pack Rules

Language packs must never change calculation rules directly.

Allowed in language packs:

- UI strings
- names
- descriptions
- biographies
- glossary texts
- source labels
- document HTML/text

Not allowed in language packs:

- tithi calculation formula
- parana formula
- Ekadashi transfer rules
- event rule identity
- location coordinates

If rules need updates, they should ship as app data/rules version with validation, not as a translation pack.

## Responsive UI

The app should not use one layout for every screen size.

Phone default:

- compact month calendar by default;
- large tap targets;
- selected day details below the calendar;
- settings opened as a sheet or separate screen;
- filters/search collapsed unless the user opens them.

Tablet default:

- full calendar view can be used by default;
- selected day details can be shown beside or below the calendar;
- event list and details can use a wider two-column layout;
- filters/search can be easier to reach without consuming the whole screen.

Large screen default:

- two-panel layout: calendar on one side, details/search on the other;
- settings can open as a side panel.

Display mode values:

- `auto`: choose compact/full by screen width;
- `compact`: force compact view;
- `full`: force full view.

If the user changes the mode manually, that explicit preference wins over the automatic default.

## Settings and Style System

Settings must include both functional and visual controls.

Main settings:

- language;
- theme;
- font size;
- reading font;
- compact/full/auto view;
- selected location;
- GPS location;
- event filters;
- show only days with events;
- language auto-update;
- offline-only mode.

Themes:

- `day`;
- `night`;
- `sepia`.

The Russian UI label for `sepia` remains `Серпия` if we keep the current naming.

Font sizes:

- `normal`;
- `large`;
- `extra_large`.

Reading fonts:

- UI/default sans font for controls and calendar;
- optional serif font for long biographies, Ekadashi stories, Panjika docs, and reading-heavy screens.

Recommended fonts:

- `Noto Sans` for UI and calendar;
- `Noto Serif` or `Literata` for long reading.

Accessibility requirements:

- font scale must affect calendar, event details, biographies, glossary, search, settings, and documents;
- line height for long texts must be comfortable;
- themes must be checked separately for contrast;
- event colors must remain distinguishable in day, night, and sepia themes;
- tap targets should stay comfortable for older users.

Event color roles should be tokenized instead of hardcoded in widgets:

- `today_marker`;
- `selected_day`;
- `ekadashi_border`;
- `fast_event`;
- `parana_event`;
- `festival_event`;
- `vaishnava_appearance`;
- `vaishnava_disappearance`;
- `deity_temple_event`;
- `period_event`;
- `neutral_event`.

## First Mobile MVP

1. Create Flutter app under `apps/mobile`.
2. Build `vcalendar_seed.sqlite` from current JSON files.
3. Bundle RU and EN in the seed database.
4. Implement settings/style system.
5. Implement location selector and GPS nearest-location suggestion.
6. Implement compact month calendar and selected day details.
7. Implement event/Vaishnava search from SQLite.
8. Implement language pack update from GitHub.
9. Port current calculation engine to Dart.
10. Add cache table for generated days.

## Current Implementation Status

Implemented:

- Flutter app scaffold under `apps/mobile`.
- Bundled SQLite seed at `apps/mobile/assets/db/vcalendar_seed.sqlite`.
- SQLite seed builder: `scripts/build-mobile-db.mjs`.
- Built-in RU/EN content imported into SQLite.
- Location selector backed by SQLite.
- Persistent settings for language, theme, font scale, compact mode, and location.
- Phone-first compact month calendar.
- Selected-day panel with local sunrise, sunset, arunodaya, tithi at sunrise, tithi angle, and tithi boundary times.
- A replaceable Dart panchanga calculation service.

Important limitation:

- The first Dart panchanga service is a scaffolded calculation layer. It already separates UI from calculation logic, but its Moon/Sun longitude model must be replaced or validated against the production ephemeris layer before event matching and Ekadashi rules are treated as authoritative.

Next implementation order:

1. Port the production ephemeris tithi angle to Dart.
2. Add masa, paksha, adhika/Purushottama, and year assignment.
3. Add Ekadashi transfer and parana rules.
4. Match tithi-based events from SQLite.
5. Add event search and Vaishnava search.
6. Add GPS nearest-location flow.
7. Add GitHub language/content pack sync.

## Open Decisions

- App folder inside this repo (`apps/mobile`) or a separate repository.
- SQLite package: `sqlite3` is close to the neighboring library app style; `sqflite` is also common for Flutter mobile.
- Whether to include offline timezone polygons in v1 or start with nearest saved location plus online fallback.
- Whether downloaded language packs should update immediately or after app restart.
