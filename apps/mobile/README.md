# vCalendar Mobile

Offline-first Flutter app for the Gaudiya Vaishnava calendar.

## Current Status

This is the first mobile scaffold:

- Flutter Android/iOS project.
- Bundled SQLite seed database.
- Seed database generated from the current repository data.
- Basic repository layer for locations and content counts.
- Initial settings/style UI skeleton.

## Data Flow

```text
repo JSON / Markdown / docs
  -> scripts/build-mobile-db.mjs
  -> apps/mobile/assets/db/vcalendar_seed.sqlite
  -> copied to app storage on first launch
  -> runtime reads SQLite
```

## Build Seed Database

From the repository root:

```sh
apps/mobile/scripts/build-seed-db.sh
```

The generated file is:

```text
apps/mobile/assets/db/vcalendar_seed.sqlite
```

## Flutter Checks

From `apps/mobile`:

```sh
flutter analyze
flutter test
```

## Run on a Device

From the repository root:

```sh
apps/mobile/scripts/run-device.sh "iPhone 17 Pro"
```

If no device is provided, the script prints available Flutter devices.

## Build APK

From the repository root:

```sh
apps/mobile/scripts/build-apk.sh
```

The script increments the Flutter build number in `pubspec.yaml`, builds a
release APK, and copies it to `~/Downloads`.

To set a specific version:

```sh
apps/mobile/scripts/build-apk.sh 0.1.1+1
```

To build another mode:

```sh
apps/mobile/scripts/build-apk.sh debug
```

## Architecture Direction

- `data/local`: database access.
- `data/repositories`: app-facing data repositories.
- `domain/models`: plain data models.
- `features`: UI features.
- calculation engine will be ported into a separate domain/service layer.

Keep UI, storage, sync, and calculations independent from each other.
