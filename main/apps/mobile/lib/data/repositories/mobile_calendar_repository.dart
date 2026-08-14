import 'package:sqflite/sqflite.dart';

import '../../domain/models/calendar_location.dart';
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

  Future<List<MobileEvent>> loadRuleEvents({required String lang}) async {
    final db = await _database.open();
    final rows = await db.rawQuery(
      '''
      select e.id, e.category, e.event_type, e.masa, e.paksha, e.tithi,
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
       order by e.priority, name
      ''',
      [lang],
    );
    return rows.map(MobileEvent.fromMap).toList(growable: false);
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
