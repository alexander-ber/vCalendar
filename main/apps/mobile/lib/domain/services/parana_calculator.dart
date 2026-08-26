import '../models/panchanga_day.dart';

class ParanaCalculator {
  const ParanaCalculator();

  ParanaWindow? normalEkadashi(PanchangaDay dvadashiDay) {
    final dvadashiStart = dvadashiDay.tithiStart;
    final dvadashiEnd = dvadashiDay.tithiEnd;
    if (dvadashiStart == null || dvadashiEnd == null) return null;

    final daylight = dvadashiDay.sunset.difference(dvadashiDay.sunrise);
    final pratahEnd = dvadashiDay.sunrise.add(
      Duration(milliseconds: (daylight.inMilliseconds / 3).round()),
    );
    final oneFifthEnd = dvadashiDay.sunrise.add(
      Duration(milliseconds: (daylight.inMilliseconds / 5).round()),
    );
    final hariVasaraEnd = dvadashiStart.add(
      Duration(
        milliseconds: (dvadashiEnd.difference(dvadashiStart).inMilliseconds / 4)
            .round(),
      ),
    );

    final start = hariVasaraEnd.isAfter(dvadashiDay.sunrise)
        ? hariVasaraEnd
        : dvadashiDay.sunrise;
    final preferredEnd = dvadashiEnd.isBefore(pratahEnd)
        ? dvadashiEnd
        : pratahEnd;
    if (preferredEnd.isBefore(start)) return null;

    return ParanaWindow(
      start: start,
      preferredEnd: preferredEnd,
      oneThirdEnd: pratahEnd,
      oneFifthEnd: oneFifthEnd,
      hariVasaraEnd: hariVasaraEnd,
    );
  }
}

class ParanaWindow {
  const ParanaWindow({
    required this.start,
    required this.preferredEnd,
    required this.oneThirdEnd,
    required this.oneFifthEnd,
    required this.hariVasaraEnd,
  });

  final DateTime start;
  final DateTime preferredEnd;
  final DateTime oneThirdEnd;
  final DateTime oneFifthEnd;
  final DateTime hariVasaraEnd;
}
