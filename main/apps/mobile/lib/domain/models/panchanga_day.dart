class PanchangaDay {
  const PanchangaDay({
    required this.date,
    required this.sunrise,
    required this.sunset,
    required this.arunodaya,
    required this.tithiAtSunrise,
    required this.tithiStart,
    required this.tithiEnd,
    required this.nakshatraAtSunrise,
    required this.masa,
    required this.masaType,
    required this.normalMasaName,
    required this.masaSankrantiCount,
    required this.engineNote,
  });

  final DateTime date;
  final DateTime sunrise;
  final DateTime sunset;
  final DateTime arunodaya;
  final TithiInfo tithiAtSunrise;
  final DateTime? tithiStart;
  final DateTime? tithiEnd;
  final NakshatraInfo nakshatraAtSunrise;
  final String masa;
  final String masaType;
  final String normalMasaName;
  final int? masaSankrantiCount;
  final String engineNote;
}

class NakshatraInfo {
  const NakshatraInfo({
    required this.number,
    required this.name,
    required this.longitude,
    required this.pada,
  });

  final int number;
  final String name;
  final double longitude;
  final int pada;
}

class TithiInfo {
  const TithiInfo({
    required this.number,
    required this.name,
    required this.paksha,
    required this.shortName,
    required this.angle,
  });

  final int number;
  final String name;
  final String paksha;
  final String shortName;
  final double angle;
}
