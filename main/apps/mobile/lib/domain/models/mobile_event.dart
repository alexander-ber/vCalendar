class MobileEvent {
  const MobileEvent({
    required this.id,
    required this.category,
    required this.eventType,
    required this.masa,
    required this.masaType,
    required this.paksha,
    required this.tithi,
    required this.allowInAdhika,
    required this.priority,
    required this.name,
    required this.shortDescription,
    required this.fullDescription,
  });

  final String id;
  final String category;
  final String eventType;
  final String masa;
  final String? masaType;
  final String paksha;
  final String tithi;
  final bool allowInAdhika;
  final int priority;
  final String name;
  final String? shortDescription;
  final String? fullDescription;

  factory MobileEvent.fromMap(Map<String, Object?> map) {
    return MobileEvent(
      id: map['id']! as String,
      category: map['category']! as String,
      eventType: map['event_type']! as String,
      masa: map['masa']! as String,
      masaType: map['masa_type'] as String?,
      paksha: map['paksha']! as String,
      tithi: map['tithi']! as String,
      allowInAdhika: (map['allow_in_adhika']! as num).toInt() == 1,
      priority: (map['priority']! as num).toInt(),
      name: map['name']! as String,
      shortDescription: map['short_description'] as String?,
      fullDescription: map['full_description'] as String?,
    );
  }
}
