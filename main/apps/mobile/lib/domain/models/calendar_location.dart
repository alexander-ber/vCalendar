class CalendarLocation {
  const CalendarLocation({
    required this.id,
    required this.name,
    required this.countryName,
    required this.timezone,
    required this.latitude,
    required this.longitude,
    required this.weekStart,
  });

  final String id;
  final String name;
  final String countryName;
  final String timezone;
  final double latitude;
  final double longitude;
  final int weekStart;

  factory CalendarLocation.fromMap(Map<String, Object?> map) {
    return CalendarLocation(
      id: map['id']! as String,
      name: map['name']! as String,
      countryName: (map['country_name'] as String?) ?? '',
      timezone: map['timezone']! as String,
      latitude: (map['latitude']! as num).toDouble(),
      longitude: (map['longitude']! as num).toDouble(),
      weekStart: (map['week_start']! as num).toInt(),
    );
  }
}
