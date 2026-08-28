import 'package:sqflite/sqflite.dart';

import '../../domain/models/calendar_location.dart';
import '../../domain/models/cached_calendar_day.dart';
import '../../domain/models/mobile_event.dart';
import '../local/app_database.dart';

class MobileCalendarRepository {
  MobileCalendarRepository(this._database);

  final AppDatabase _database;

  Future<MobileSeedSummary> loadSummary({required String lang}) async {
    final db = await _database.open();
    final eventCount =
        Sqflite.firstIntValue(
          await db.rawQuery('select count(*) from events'),
        ) ??
        0;
    final ekadashiCount =
        Sqflite.firstIntValue(
          await db.rawQuery('select count(*) from ekadashi'),
        ) ??
        0;
    final locationCount =
        Sqflite.firstIntValue(
          await db.rawQuery('select count(*) from locations'),
        ) ??
        0;
    final seedCreatedAt = await _metaValue(db, 'seed_created_at');

    return MobileSeedSummary(
      eventCount: eventCount,
      ekadashiCount: ekadashiCount,
      locationCount: locationCount,
      seedCreatedAt: seedCreatedAt,
    );
  }

  Future<List<CalendarLocation>> loadLocations({required String lang}) async {
    final db = await _database.open();
    final rows = await db.rawQuery(
      '''
      select l.id, coalesce(li.name, fallback.name, l.id) as name,
             coalesce(li.country_name, fallback.country_name, l.country_code) as country_name,
             l.timezone, l.latitude, l.longitude, l.week_start
        from locations l
        left join location_i18n li
          on li.location_id = l.id and li.lang = ?
        left join location_i18n fallback
          on fallback.location_id = l.id and fallback.lang = 'en'
       where l.is_active = 1
       order by l.sort_order, name
      ''',
      [lang],
    );
    return rows.map(CalendarLocation.fromMap).toList(growable: false);
  }

  Future<List<String>> loadAvailableLanguages() async {
    final db = await _database.open();
    final rows = await db.rawQuery('''
      select distinct lang
        from content_packs
       where is_active = 1
       order by case lang when 'ru' then 0 when 'en' then 1 else 2 end, lang
      ''');
    final langs = rows
        .map((row) => row['lang'] as String)
        .where((lang) => lang.trim().isNotEmpty)
        .toList(growable: false);
    if (langs.isEmpty) return const ['ru', 'en'];
    return langs;
  }

  Future<List<MobileEvent>> loadRuleEvents({required String lang}) async {
    final db = await _database.open();
    final rows = await db.rawQuery(
      '''
      select e.id, e.category, e.event_type, e.masa, null as masa_type,
             e.paksha, e.tithi, e.naksatra, e.timing_rule, e.raw_json,
             e.allow_in_adhika, e.priority,
             coalesce(i.name, fallback.name, e.id) as name,
             coalesce(i.short_description, fallback.short_description) as short_description,
             coalesce(i.full_description, fallback.full_description) as full_description
        from events e
        left join event_i18n i
          on i.event_id = e.id and i.lang = ?
        left join event_i18n fallback
          on fallback.event_id = e.id and fallback.lang = 'en'
       where e.masa is not null
         and e.paksha is not null
         and e.tithi is not null
         and e.source_status != 'needs_exact_lunar_rule'
      union all
      select k.id, 'ekadashi' as category, 'ekadashi' as event_type,
             coalesce(k.masa, '*') as masa, k.masa_type,
             k.paksha, 'Ekadashi' as tithi, null as naksatra, null as timing_rule, null as raw_json,
             case when k.masa_type = 'adhika' then 1 else 0 end as allow_in_adhika,
             10 as priority,
             coalesce(ki.name, kfallback.name, k.id) as name,
             nullif(trim(
               coalesce(ki.benefits, kfallback.benefits, '') ||
               case
                 when coalesce(ki.story, kfallback.story, '') = '' then ''
                 else ' ' || coalesce(ki.story, kfallback.story, '')
               end
             ), '') as short_description,
             coalesce(ki.full_description, kfallback.full_description) as full_description
        from ekadashi k
        left join ekadashi_i18n ki
          on ki.ekadashi_id = k.id and ki.lang = ?
        left join ekadashi_i18n kfallback
          on kfallback.ekadashi_id = k.id and kfallback.lang = 'en'
       order by priority, name
      ''',
      [lang, lang],
    );
    return rows.map(MobileEvent.fromMap).toList(growable: false);
  }

  Future<Map<String, CachedCalendarDay>> loadCalendarCache({
    required String locationId,
    required String lang,
    required int startYear,
    required int endYear,
  }) async {
    final db = await _database.open();
    final rows = await db.rawQuery(
      '''
      select date_iso, payload_json
        from calendar_day_cache
       where location_key = ?
         and lang = ?
         and engine_version = 'web-calendar-engine'
         and date_iso between ? and ?
       order by date_iso
      ''',
      [
        locationId,
        lang,
        '${startYear.toString().padLeft(4, '0')}-01-01',
        '${endYear.toString().padLeft(4, '0')}-12-31',
      ],
    );
    return {
      for (final row in rows)
        row['date_iso']! as String: CachedCalendarDay.fromJson(
          row['payload_json']! as String,
        ),
    };
  }

  Future<List<GlossaryTerm>> loadGlossary({required String lang}) async {
    final db = await _database.open();
    final rows = await db.rawQuery(
      '''
      select g.term_id, g.title, g.short_description, g.full_description
        from glossary_i18n g
        join glossary_terms t on t.id = g.term_id
       where g.lang = ?
       order by t.sort_order, g.title
      ''',
      [lang],
    );
    return rows.map(GlossaryTerm.fromMap).toList(growable: false);
  }

  Future<String?> _metaValue(Database db, String key) async {
    final rows = await db.query(
      'app_meta',
      columns: ['value'],
      where: 'key = ?',
      whereArgs: [key],
      limit: 1,
    );
    if (rows.isEmpty) return null;
    return rows.first['value'] as String?;
  }
}

class GlossaryTerm {
  const GlossaryTerm({
    required this.id,
    required this.title,
    required this.shortDescription,
    required this.fullDescription,
  });

  factory GlossaryTerm.fromMap(Map<String, Object?> map) {
    return GlossaryTerm(
      id: map['term_id']! as String,
      title: map['title']! as String,
      shortDescription: map['short_description'] as String? ?? '',
      fullDescription: map['full_description'] as String?,
    );
  }

  final String id;
  final String title;
  final String shortDescription;
  final String? fullDescription;
}

class MobileSeedSummary {
  const MobileSeedSummary({
    required this.eventCount,
    required this.ekadashiCount,
    required this.locationCount,
    required this.seedCreatedAt,
  });

  final int eventCount;
  final int ekadashiCount;
  final int locationCount;
  final String? seedCreatedAt;
}
