# Content, Events, Push and APK Workflow

Эта инструкция описывает рабочий путь для добавления события в календарь, обновления мобильной офлайн-базы, публикации изменений в GitHub и сборки APK.

## 1. Где лежат события

Основной источник событий:

```text
data/events/<category>/<EVENT_ID>.json
```

Один JSON-файл = одно событие.

`EVENT_ID` пишется капсом латиницей через `_`, например:

```text
DISAPPEARANCE_OF_SRIVASA_PANDIT
APPEARANCE_OF_SRILA_BHAKTI_PRAMOD_PURI_DEV_GOSWAMI_MAHARAJ
```

Категории лежат папками:

```text
data/events/avatar/
data/events/avatar-associate/
data/events/deity-temple/
data/events/divine-appearance/
data/events/mahaprabhu-parsada/
data/events/vaishnava-appearance/
data/events/vaishnava-disappearance/
```

Если категория новая, сначала проверь, что UI и мобильная аппка умеют её фильтровать. Сейчас основные категории уже заведены в мобильной аппе.

## 2. Как добавить новый ивент

Создай новый файл в подходящей папке, например:

```text
data/events/vaishnava-disappearance/DISAPPEARANCE_OF_EXAMPLE_VAISHNAVA.json
```

Минимальная структура:

```json
{
  "id": "DISAPPEARANCE_OF_EXAMPLE_VAISHNAVA",
  "runtime_id": "example_vaishnava_disappearance",
  "type": "vaishnava_disappearance",
  "category": "vaishnava_disappearance",
  "scope": "tithi",
  "subject": "Example Vaishnava",
  "rules": {
    "gaudiya_masa": "Vamana",
    "paksha": "Krishna",
    "tithi": "Dashami",
    "timing_rule": "sunrise_based",
    "allow_in_adhika": false
  },
  "priority": "medium",
  "source_status": "confirmed",
  "sources": [
    {
      "type": "description",
      "url": "https://example.com/source",
      "attribution_required": true
    }
  ],
  "translations": [
    {
      "lang": "ru",
      "name": "День ухода примерного вайшнава",
      "short_description": "Краткое описание для карточки дня.",
      "full_description": "Полная биография или описание события."
    },
    {
      "lang": "en",
      "name": "Disappearance of Example Vaishnava",
      "short_description": "Short text for the day card.",
      "full_description": "Full biography or event description."
    }
  ]
}
```

Правила привязки всегда задаются по панчангу, не по григорианской дате:

- `gaudiya_masa`: месяц, например `Vamana`, `Sridhar`, `Padmanabha`.
- `paksha`: `Gaura` или `Krishna`.
- `tithi`: например `Dashami`, `Ekadashi`, `Dvadasi`, `Purnima`, `Amavasya`.
- `timing_rule`: обычно `sunrise_based`.
- `allow_in_adhika`: `true`, если событие должно показываться и в дополнительном месяце; иначе `false`.

## 3. Какие секции редактировать в JSON

Основные поля:

- `id`: постоянный технический ID, капсом.
- `runtime_id`: стабильный ID для рантайма и базы.
- `type`: тип события, обычно совпадает с категорией.
- `category`: категория для фильтров и цвета.
- `subject`: имя вайшнава или объекта события в именительном падеже.
- `rules`: привязка к титхи.
- `sources`: ссылки на источники.
- `translations`: все языки события.

Для русского и английского обязательно заполняй:

- `name`
- `short_description`
- `full_description`

Если полного текста ещё нет, лучше честно оставить короткое описание и источник, чем добавлять непроверенный текст.

## 4. Пересборка данных после изменения событий

После добавления или изменения файлов в `data/events/` пересобери агрегированные данные для веба:

```bash
node scripts/build-events-db.mjs
```

Этот скрипт обновляет:

```text
data/events.json
js/events-data.js
```

Потом пересобери офлайн-базу для Flutter:

```bash
apps/mobile/scripts/build-seed-db.sh
```

Этот скрипт обновляет:

```text
apps/mobile/assets/db/vcalendar_seed.sqlite
```

## 5. Удалённые языковые обновления

Мобильная аппка может проверять обновления языков и контента через GitHub raw-файлы.

Главный файл:

```text
i18n/manifest.json
```

В нём для каждого языка указывается версия и список файлов:

```json
{
  "lang": "ru",
  "version": 2,
  "required_app_schema": 1,
  "files": {
    "ui": "i18n/ru/ui.json",
    "events": "i18n/ru/events.json",
    "ekadashi": "i18n/ru/ekadashi.json",
    "glossary": "i18n/ru/glossary.json",
    "locations": "i18n/ru/locations.json"
  }
}
```

Если меняешь язык, события, экадаши, глоссарий или города, увеличь `version` соответствующего языка. Иначе приложение решит, что обновлений нет.

Важно: файлы из `manifest.json` должны реально существовать в репозитории и быть запушены в `main`.

## 6. Проверка перед коммитом

Для мобильной аппки:

```bash
cd apps/mobile
flutter analyze
flutter test
flutter build apk --debug
```

Для сборки офлайн-базы из корня репозитория:

```bash
apps/mobile/scripts/build-seed-db.sh
```

Для сборки APK и копирования в Downloads:

```bash
apps/mobile/scripts/build-apk.sh debug
```

APK появится в:

```text
~/Downloads/vCalendar-debug-<git-hash>.apk
```

Если есть незакоммиченные изменения, в имени будет `dirty`.

## 7. Как закоммитить и пушнуть через CLI

Проверь изменения:

```bash
git status --short
```

Добавь нужные файлы:

```bash
git add data/events data/events.json js/events-data.js apps/mobile/assets/db/vcalendar_seed.sqlite
```

Если менялись мобильные исходники или i18n, добавь их тоже:

```bash
git add apps/mobile/lib apps/mobile/pubspec.yaml apps/mobile/pubspec.lock i18n
```

Не добавляй временную папку:

```text
work/
```

Сделай коммит:

```bash
git commit -m "Update calendar events and mobile data"
```

Запушь в main:

```bash
git push origin main
```

## 8. Быстрый полный цикл

```bash
node scripts/build-events-db.mjs
apps/mobile/scripts/build-seed-db.sh
cd apps/mobile
flutter analyze
flutter test
flutter build apk --debug
cd ../..
git status --short
git add data/events data/events.json js/events-data.js apps/mobile/assets/db/vcalendar_seed.sqlite apps/mobile/lib apps/mobile/pubspec.yaml apps/mobile/pubspec.lock i18n docs
git commit -m "Update calendar content"
git push origin main
apps/mobile/scripts/build-apk.sh debug
```

Перед `git add` всегда проверь `git status --short`, чтобы случайно не добавить временные файлы.
