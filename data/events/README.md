# Events Content Database

Each JSON file is one calendar event. Folders group events by category.

## File Shape

```json
{
  "id": "SRIMATI_GANGAMATA_GOSVAMINI",
  "runtime_id": "hkzp_541_...",
  "type": "vaishnava_appearance",
  "category": "vaishnava_appearance",
  "rules": {
    "gaudiya_masa": "Trivikrama",
    "paksha": "Gaura",
    "tithi": "Dashami",
    "timing_rule": "sunrise_based",
    "allow_in_adhika": false
  },
  "sources": [
    {
      "type": "description",
      "url": "http://harekrishnazp.info/...",
      "attribution_required": true
    }
  ],
  "translations": [
    {
      "lang": "ru",
      "name": "День явления ...",
      "short_description": "Short text for compact surfaces.",
      "full_description": "Full article text for day details."
    }
  ]
}
```

Run `node scripts/build-events-db.mjs` after editing content files. It regenerates `data/events.json` and `js/events-data.js` for the current browser UI.
