import 'dart:convert';

import 'mobile_event.dart';
import 'panchanga_day.dart';

class CachedCalendarDay {
  const CachedCalendarDay({required this.panchanga, required this.events});

  final PanchangaDay panchanga;
  final List<MobileEvent> events;

  factory CachedCalendarDay.fromJson(String source) {
    final json = jsonDecode(source) as Map<String, Object?>;
    final astronomy = json['astronomy']! as Map<String, Object?>;
    final masa = json['masa']! as Map<String, Object?>;
    final lunar = json['lunar']! as Map<String, Object?>;
    final tithi = lunar['tithi_at_sunrise']! as Map<String, Object?>;
    final nakshatra = lunar['nakshatra_at_sunrise']! as Map<String, Object?>;
    final date = _date(json['date']! as String);
    final panchanga = PanchangaDay(
      date: date,
      sunrise: _utc(astronomy['sunrise']),
      sunset: _utc(astronomy['sunset']),
      arunodaya: _utc(astronomy['arunodaya']),
      tithiAtSunrise: TithiInfo(
        number: _int(tithi['number']),
        name: tithi['name']! as String,
        paksha: tithi['paksha']! as String,
        shortName: _tithiShortName(_int(tithi['number'])),
        angle: _double(tithi['angle']),
      ),
      tithiStart: _utcOrNull(lunar['current_tithi_boundary']),
      tithiEnd: _utcOrNull(lunar['next_tithi_boundary']),
      nakshatraAtSunrise: NakshatraInfo(
        number: _int(nakshatra['number']),
        name: nakshatra['name']! as String,
        longitude: _double(nakshatra['longitude']),
        pada: _int(nakshatra['pada']),
      ),
      masa: masa['name']! as String,
      masaType: masa['type']! as String,
      normalMasaName:
          (masa['normal_masa_name'] as String?) ?? (masa['name']! as String),
      engineNote: 'Bundled web-calendar-engine cache.',
    );
    final eventsJson = (json['events'] as List<Object?>? ?? const []);
    return CachedCalendarDay(
      panchanga: panchanga,
      events: eventsJson
          .whereType<Map<String, Object?>>()
          .map(MobileEvent.fromCache)
          .toList(growable: false),
    );
  }

  static DateTime _date(String value) {
    final parts = value.split('-').map(int.parse).toList(growable: false);
    return DateTime(parts[0], parts[1], parts[2]);
  }

  static DateTime _utc(Object? value) =>
      DateTime.parse(value! as String).toUtc();

  static DateTime? _utcOrNull(Object? value) {
    if (value == null) return null;
    return DateTime.parse(value as String).toUtc();
  }

  static int _int(Object? value) => (value! as num).toInt();

  static double _double(Object? value) => (value! as num).toDouble();

  static String _tithiShortName(int number) {
    const names = [
      'Pratipat',
      'Dvitiya',
      'Tritiya',
      'Chaturthi',
      'Panchami',
      'Shashthi',
      'Saptami',
      'Ashtami',
      'Navami',
      'Dashami',
      'Ekadashi',
      'Dvadashi',
      'Trayodashi',
      'Chaturdashi',
      'Purnima',
      'Pratipat',
      'Dvitiya',
      'Tritiya',
      'Chaturthi',
      'Panchami',
      'Shashthi',
      'Saptami',
      'Ashtami',
      'Navami',
      'Dashami',
      'Ekadashi',
      'Dvadashi',
      'Trayodashi',
      'Chaturdashi',
      'Amavasya',
    ];
    return names[number - 1];
  }
}
