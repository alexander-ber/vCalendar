import 'dart:math' as math;

import '../models/calendar_location.dart';
import '../models/panchanga_day.dart';

class PanchangaCalculator {
  const PanchangaCalculator();

  static const _deg = math.pi / 180;
  static const _msPerDay = 86400000;
  static const _j2000 = 2451545.0;

  static const _masaNames = [
    'Chaitra',
    'Vaishakha',
    'Jyeshtha',
    'Ashadha',
    'Shravana',
    'Bhadrapada',
    'Ashvina',
    'Kartika',
    'Agrahayana',
    'Pausha',
    'Magha',
    'Phalguna',
  ];

  static const _gaudiyaMasaNames = [
    'Vishnu',
    'Madhusudan',
    'Trivikrama',
    'Vamana',
    'Sridhara',
    'Hrishikesha',
    'Padmanabha',
    'Damodara',
    'Keshava',
    'Narayana',
    'Madhava',
    'Govinda',
  ];

  static const _bengaliSolarMonthNames = [
    'Vaishakha',
    'Jyeshtha',
    'Ashadha',
    'Shravana',
    'Bhadra',
    'Ashvina',
    'Kartika',
    'Agrahayana',
    'Pausha',
    'Magha',
    'Phalguna',
    'Chaitra',
  ];

  static const _tithiNames = [
    'Gaura Pratipat',
    'Gaura Dvitiya',
    'Gaura Tritiya',
    'Gaura Chaturthi',
    'Gaura Panchami',
    'Gaura Shashthi',
    'Gaura Saptami',
    'Gaura Ashtami',
    'Gaura Navami',
    'Gaura Dashami',
    'Gaura Ekadashi',
    'Gaura Dvadashi',
    'Gaura Trayodashi',
    'Gaura Chaturdashi',
    'Purnima',
    'Krishna Pratipat',
    'Krishna Dvitiya',
    'Krishna Tritiya',
    'Krishna Chaturthi',
    'Krishna Panchami',
    'Krishna Shashthi',
    'Krishna Saptami',
    'Krishna Ashtami',
    'Krishna Navami',
    'Krishna Dashami',
    'Krishna Ekadashi',
    'Krishna Dvadashi',
    'Krishna Trayodashi',
    'Krishna Chaturdashi',
    'Amavasya',
  ];

  static const _tithiShortNames = [
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

  static const _nakshatraNames = [
    'Ashvini',
    'Bharani',
    'Krittika',
    'Rohini',
    'Mrigashirsha',
    'Ardra',
    'Punarvasu',
    'Pushya',
    'Ashlesha',
    'Magha',
    'Purva Phalguni',
    'Uttara Phalguni',
    'Hasta',
    'Chitra',
    'Swati',
    'Vishakha',
    'Anuradha',
    'Jyeshtha',
    'Mula',
    'Purva Ashadha',
    'Uttara Ashadha',
    'Shravana',
    'Dhanishtha',
    'Shatabhisha',
    'Purva Bhadrapada',
    'Uttara Bhadrapada',
    'Revati',
  ];

  PanchangaDay calculateDay({
    required DateTime date,
    required CalendarLocation location,
  }) {
    final civilDate = DateTime.utc(date.year, date.month, date.day);
    final sunrise = _sunEventUtc(civilDate, location, rise: true);
    final sunset = _sunEventUtc(civilDate, location, rise: false);
    final previousSunset = _sunEventUtc(
      civilDate.subtract(const Duration(days: 1)),
      location,
      rise: false,
    );
    final nightLength = sunrise.difference(previousSunset);
    final arunodaya = sunrise.subtract(
      Duration(milliseconds: (nightLength.inMilliseconds / 15).round()),
    );
    final tithi = tithiInfo(sunrise);
    final masa = _masaForDate(sunrise);

    return PanchangaDay(
      date: DateTime(date.year, date.month, date.day),
      sunrise: sunrise,
      sunset: sunset,
      arunodaya: arunodaya,
      tithiAtSunrise: tithi,
      tithiStart: _findTithiStartBefore(sunrise, tithi.number),
      tithiEnd: _findTithiEndAfter(sunrise, tithi.number),
      nakshatraAtSunrise: nakshatraInfo(sunrise),
      masa: masa.name,
      masaType: masa.type,
      normalMasaName: masa.normalMasaName,
      engineNote:
          'Dart POC: local sunrise/sunset + approximate Moon/Sun longitude. Replaceable service layer.',
    );
  }

  NakshatraInfo nakshatraInfo(DateTime utc) {
    final longitude = _normalizeDegrees(_moonLongitude(utc) - _ayanamsha(utc));
    final span = 360 / 27;
    final number = (longitude / span).floor() + 1;
    final pada = ((longitude % span) / (span / 4)).floor() + 1;
    return NakshatraInfo(
      number: number,
      name: _nakshatraNames[number - 1],
      longitude: longitude,
      pada: pada,
    );
  }

  TithiInfo tithiInfo(DateTime utc) {
    final angle = _tithiAngle(utc);
    final number = (angle / 12).floor() + 1;
    return TithiInfo(
      number: number,
      name: _tithiNames[number - 1],
      paksha: number <= 15 ? 'Gaura' : 'Krishna',
      shortName: _tithiShortNames[number - 1],
      angle: angle,
    );
  }

  String bengaliSolarMonth(DateTime utc) {
    return _bengaliSolarMonthNames[_rashiIndex(utc)];
  }

  DateTime? _findTithiStartBefore(DateTime start, int tithiNumber) {
    var right = start;
    var left = right.subtract(const Duration(hours: 1));
    final min = start.subtract(const Duration(hours: 48));
    while (!left.isBefore(min)) {
      if (tithiInfo(left).number != tithiNumber &&
          tithiInfo(right).number == tithiNumber) {
        return _bisectBoundary(
          left: left,
          right: right,
          target: tithiNumber,
          searchStart: true,
        );
      }
      right = left;
      left = left.subtract(const Duration(hours: 1));
    }
    return null;
  }

  DateTime? _findTithiEndAfter(DateTime start, int tithiNumber) {
    var left = start;
    var right = left.add(const Duration(hours: 1));
    final max = start.add(const Duration(hours: 48));
    while (!right.isAfter(max)) {
      if (tithiInfo(left).number == tithiNumber &&
          tithiInfo(right).number != tithiNumber) {
        return _bisectBoundary(
          left: left,
          right: right,
          target: tithiNumber,
          searchStart: false,
        );
      }
      left = right;
      right = right.add(const Duration(hours: 1));
    }
    return null;
  }

  DateTime _bisectBoundary({
    required DateTime left,
    required DateTime right,
    required int target,
    required bool searchStart,
  }) {
    var a = left;
    var b = right;
    for (var i = 0; i < 40; i += 1) {
      final mid = DateTime.fromMillisecondsSinceEpoch(
        ((a.millisecondsSinceEpoch + b.millisecondsSinceEpoch) / 2).round(),
        isUtc: true,
      );
      final midIsTarget = tithiInfo(mid).number == target;
      if (searchStart) {
        if (midIsTarget) {
          b = mid;
        } else {
          a = mid;
        }
      } else {
        if (midIsTarget) {
          a = mid;
        } else {
          b = mid;
        }
      }
    }
    return b;
  }

  DateTime _sunEventUtc(
    DateTime date,
    CalendarLocation location, {
    required bool rise,
  }) {
    final year = date.year;
    final month = date.month;
    final day = date.day;
    final dayOfYear = _dayOfYear(year, month, day);
    final lngHour = location.longitude / 15;
    final baseHour = rise ? 6 : 18;
    final t = dayOfYear + ((baseHour - lngHour) / 24);
    final meanAnomaly = _normalizeDegrees((0.9856 * t) - 3.289);
    final trueLongitude = _normalizeDegrees(
      meanAnomaly +
          (1.916 * math.sin(meanAnomaly * _deg)) +
          (0.020 * math.sin(2 * meanAnomaly * _deg)) +
          282.634,
    );
    var rightAscension =
        math.atan(0.91764 * math.tan(trueLongitude * _deg)) / _deg;
    rightAscension = _normalizeDegrees(rightAscension);
    final longitudeQuadrant = (trueLongitude / 90).floor() * 90;
    final ascensionQuadrant = (rightAscension / 90).floor() * 90;
    rightAscension =
        (rightAscension + longitudeQuadrant - ascensionQuadrant) / 15;
    final sinDec = 0.39782 * math.sin(trueLongitude * _deg);
    final cosDec = math.cos(math.asin(sinDec));
    final cosH =
        (math.cos(90.833 * _deg) -
            (sinDec * math.sin(location.latitude * _deg))) /
        (cosDec * math.cos(location.latitude * _deg));

    if (cosH > 1 || cosH < -1) {
      return DateTime.utc(year, month, day, baseHour);
    }

    final localHourAngle =
        (rise ? 360 - math.acos(cosH) / _deg : math.acos(cosH) / _deg) / 15;
    final localMeanTime =
        localHourAngle + rightAscension - (0.06571 * t) - 6.622;
    final utcHour = _normalizeHours(localMeanTime - lngHour);
    final milliseconds = (utcHour * 3600000).round();
    return DateTime.utc(
      year,
      month,
      day,
    ).add(Duration(milliseconds: milliseconds));
  }

  int _dayOfYear(int year, int month, int day) {
    final start = DateTime.utc(year);
    final current = DateTime.utc(year, month, day);
    return current.difference(start).inDays + 1;
  }

  double _tithiAngle(DateTime date) {
    return _normalizeDegrees(_moonLongitude(date) - _sunLongitude(date));
  }

  _MasaInfo _masaForDate(DateTime utc) {
    final start = _findNewMoonBefore(utc);
    final end = start == null
        ? null
        : _findNewMoonAfter(start.add(const Duration(days: 1)));
    if (start == null || end == null) {
      return const _MasaInfo(
        name: 'unknown',
        type: 'unknown',
        normalMasaName: 'unknown',
      );
    }

    final sankrantiCount = _sankrantiCountBetween(start, end);
    final type = sankrantiCount == 0
        ? 'adhika'
        : sankrantiCount == 2
        ? 'kshaya'
        : 'normal';
    final name = _masaNameForStart(start);
    final paksha = _tithiAngle(utc) < 180 ? 'Gaura' : 'Krishna';
    final normalMasaName = type == 'adhika'
        ? _gaudiyaMasaName(name, 'Gaura')
        : _gaudiyaMasaName(name, paksha);

    return _MasaInfo(name: name, type: type, normalMasaName: normalMasaName);
  }

  DateTime? _findNewMoonBefore(DateTime utc) {
    var right = utc;
    var left = right.subtract(const Duration(days: 1));
    var previous = _signedDistanceToNewMoon(right);
    for (var i = 0; i < 45; i += 1) {
      final current = _signedDistanceToNewMoon(left);
      if (current.sign != previous.sign && (current - previous).abs() < 120) {
        return _bisectNewMoon(left, right);
      }
      right = left;
      previous = current;
      left = left.subtract(const Duration(days: 1));
    }
    return null;
  }

  DateTime? _findNewMoonAfter(DateTime utc) {
    var left = utc;
    var right = left.add(const Duration(days: 1));
    var previous = _signedDistanceToNewMoon(left);
    for (var i = 0; i < 45; i += 1) {
      final current = _signedDistanceToNewMoon(right);
      if (current.sign != previous.sign && (current - previous).abs() < 120) {
        return _bisectNewMoon(left, right);
      }
      left = right;
      previous = current;
      right = right.add(const Duration(days: 1));
    }
    return null;
  }

  DateTime _bisectNewMoon(DateTime left, DateTime right) {
    var a = left;
    var b = right;
    var fa = _signedDistanceToNewMoon(a);
    for (var i = 0; i < 48; i += 1) {
      final mid = DateTime.fromMillisecondsSinceEpoch(
        ((a.millisecondsSinceEpoch + b.millisecondsSinceEpoch) / 2).round(),
        isUtc: true,
      );
      final fm = _signedDistanceToNewMoon(mid);
      if (fm.sign == fa.sign) {
        a = mid;
        fa = fm;
      } else {
        b = mid;
      }
    }
    return DateTime.fromMillisecondsSinceEpoch(
      ((a.millisecondsSinceEpoch + b.millisecondsSinceEpoch) / 2).round(),
      isUtc: true,
    );
  }

  double _signedDistanceToNewMoon(DateTime utc) {
    final angle = _tithiAngle(utc);
    return angle > 180 ? angle - 360 : angle;
  }

  int _sankrantiCountBetween(DateTime start, DateTime end) {
    var count = 0;
    var cursor = start;
    var previous = _rashiIndex(cursor);
    while (cursor.isBefore(end)) {
      final next = cursor.add(const Duration(days: 1)).isAfter(end)
          ? end
          : cursor.add(const Duration(days: 1));
      final current = _rashiIndex(next);
      if (current != previous) {
        count += 1;
        previous = current;
      }
      cursor = next;
    }
    return count;
  }

  String _masaNameForStart(DateTime start) {
    final signAtStart = _rashiIndex(start);
    return _masaNames[(signAtStart + 1) % _masaNames.length];
  }

  String _gaudiyaMasaName(String amantaName, String paksha) {
    final index = _masaNames.indexOf(amantaName);
    if (index == -1) return amantaName;
    final displayIndex = paksha == 'Krishna'
        ? (index + 1) % _gaudiyaMasaNames.length
        : index;
    return _gaudiyaMasaNames[displayIndex];
  }

  int _rashiIndex(DateTime utc) {
    return (_sunSiderealLongitude(utc) / 30).floor();
  }

  double _sunSiderealLongitude(DateTime utc) {
    return _normalizeDegrees(_sunLongitude(utc) - _ayanamsha(utc));
  }

  double _ayanamsha(DateTime utc) {
    final yearsFrom2000 = (_julianDay(utc) - _j2000) / 365.2422;
    return 23.8531 + 0.013968 * yearsFrom2000;
  }

  double _sunLongitude(DateTime date) {
    final d = _daysSinceJ2000(date);
    final g = _normalizeDegrees(357.529 + 0.98560028 * d);
    final q = _normalizeDegrees(280.459 + 0.98564736 * d);
    return _normalizeDegrees(
      q + 1.915 * math.sin(g * _deg) + 0.020 * math.sin(2 * g * _deg),
    );
  }

  double _moonLongitude(DateTime date) {
    final d = _daysSinceJ2000(date);
    final l0 = _normalizeDegrees(218.316 + 13.176396 * d);
    final mMoon = _normalizeDegrees(134.963 + 13.064993 * d);
    final mSun = _normalizeDegrees(357.529 + 0.98560028 * d);
    final dMoon = _normalizeDegrees(297.850 + 12.190749 * d);
    final f = _normalizeDegrees(93.272 + 13.229350 * d);

    return _normalizeDegrees(
      l0 +
          6.289 * math.sin(mMoon * _deg) +
          1.274 * math.sin((2 * dMoon - mMoon) * _deg) +
          0.658 * math.sin(2 * dMoon * _deg) +
          0.214 * math.sin(2 * mMoon * _deg) -
          0.186 * math.sin(mSun * _deg) -
          0.114 * math.sin(2 * f * _deg),
    );
  }

  double _daysSinceJ2000(DateTime date) {
    return _julianDay(date) - _j2000;
  }

  double _julianDay(DateTime date) {
    return date.millisecondsSinceEpoch / _msPerDay + 2440587.5;
  }

  double _normalizeDegrees(double value) {
    return ((value % 360) + 360) % 360;
  }

  double _normalizeHours(double value) {
    return ((value % 24) + 24) % 24;
  }
}

class _MasaInfo {
  const _MasaInfo({
    required this.name,
    required this.type,
    required this.normalMasaName,
  });

  final String name;
  final String type;
  final String normalMasaName;
}
