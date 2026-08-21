import 'package:flutter_test/flutter_test.dart';
import 'package:vcalendar_mobile/domain/models/calendar_location.dart';
import 'package:vcalendar_mobile/domain/services/panchanga_calculator.dart';

void main() {
  const maalot = CalendarLocation(
    id: 'maalot',
    name: 'Maalot, Israel',
    countryName: 'Israel',
    timezone: 'Asia/Jerusalem',
    latitude: 33.0136,
    longitude: 35.2667,
    weekStart: 0,
  );

  test('uses ephemeris tithi boundaries compatible with the web engine', () {
    const calculator = PanchangaCalculator();
    final day = calculator.calculateDay(
      date: DateTime.utc(2026, 8, 20),
      location: maalot,
    );

    expect(day.tithiAtSunrise.name, 'Gaura Ashtami');
    expect(day.tithiAtSunrise.angle, closeTo(90.1464, 0.005));
    expect(
      _minutesFrom(day.tithiStart!, DateTime.utc(2026, 8, 19, 13, 49)),
      lessThanOrEqualTo(2),
    );
    expect(
      _minutesFrom(day.tithiEnd!, DateTime.utc(2026, 8, 20, 15, 48)),
      lessThanOrEqualTo(2),
    );
  });
}

int _minutesFrom(DateTime actual, DateTime expected) {
  return actual.difference(expected).inMinutes.abs();
}
