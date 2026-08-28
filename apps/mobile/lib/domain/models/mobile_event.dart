import 'dart:convert';

class MobileEvent {
  const MobileEvent({
    required this.id,
    required this.category,
    required this.eventType,
    required this.masa,
    required this.masaType,
    required this.paksha,
    required this.tithi,
    required this.naksatra,
    required this.timingRule,
    required this.gaudiyaMasa,
    required this.anchorEventId,
    required this.observanceOffsetDays,
    required this.disabled,
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
  final String? naksatra;
  final String? timingRule;

  /// When set, `masaMatches` should compare against the day's Gaudiya
  /// display masa name (`normalMasaName`), not the amanta `masa` field -
  /// mirrors js/event-matcher.js:63-66 `masaMatches`. Extracted from
  /// `raw_json` since scripts/build-mobile-db.mjs's `events.masa` column
  /// already folds gaudiya_masa into the same field the amanta masa uses,
  /// losing which convention a given event was authored with.
  final String? gaudiyaMasa;
  final String? anchorEventId;
  final int observanceOffsetDays;
  final bool disabled;

  final bool allowInAdhika;
  final int priority;
  final String name;
  final String? shortDescription;
  final String? fullDescription;

  factory MobileEvent.fromMap(Map<String, Object?> map) {
    final raw = _decodeRawJson(map['raw_json'] as String?);
    return MobileEvent(
      id: map['id']! as String,
      category: map['category']! as String,
      eventType: map['event_type']! as String,
      masa: map['masa']! as String,
      masaType: map['masa_type'] as String?,
      paksha: map['paksha']! as String,
      tithi: map['tithi']! as String,
      naksatra: map['naksatra'] as String?,
      timingRule: map['timing_rule'] as String?,
      gaudiyaMasa: _rawString(raw, 'gaudiya_masa'),
      anchorEventId: _rawString(raw, 'anchor_event_id'),
      observanceOffsetDays: _rawInt(raw, 'observance_offset_days') ?? 0,
      disabled: _rawBool(raw, 'disabled'),
      allowInAdhika: (map['allow_in_adhika']! as num).toInt() == 1,
      priority: (map['priority']! as num).toInt(),
      name: map['name']! as String,
      shortDescription: map['short_description'] as String?,
      fullDescription: map['full_description'] as String?,
    );
  }

  factory MobileEvent.fromCache(Map<String, Object?> map) {
    return MobileEvent(
      id: map['id']! as String,
      category: map['category']! as String,
      eventType: map['event_type']! as String,
      masa: map['masa']! as String,
      masaType: map['masa_type'] as String?,
      paksha: map['paksha']! as String,
      tithi: map['tithi']! as String,
      naksatra: null,
      timingRule: null,
      gaudiyaMasa: null,
      anchorEventId: null,
      observanceOffsetDays: 0,
      disabled: false,
      allowInAdhika: map['allow_in_adhika'] == true,
      priority: (map['priority'] as num?)?.toInt() ?? 100,
      name: map['name']! as String,
      shortDescription: map['short_description'] as String?,
      fullDescription: map['full_description'] as String?,
    );
  }

  static Map<String, dynamic>? _decodeRawJson(String? source) {
    if (source == null || source.isEmpty) return null;
    try {
      final decoded = jsonDecode(source);
      return decoded is Map ? Map<String, dynamic>.from(decoded) : null;
    } on FormatException {
      return null;
    }
  }

  /// Mirrors normalizeEvent's own top-level-or-`rules.*` fallback
  /// (scripts/build-mobile-db.mjs:48-74): individual `data/events/*.json`
  /// files nest these under `rules`, the consolidated `data/events.json`
  /// puts them at the top level - both exist in the merged dataset.
  static String? _rawString(Map<String, dynamic>? raw, String key) {
    if (raw == null) return null;
    final direct = raw[key];
    if (direct is String) return direct;
    final rules = raw['rules'];
    if (rules is Map) {
      final nested = rules[key];
      if (nested is String) return nested;
    }
    return null;
  }

  static int? _rawInt(Map<String, dynamic>? raw, String key) {
    if (raw == null) return null;
    final value = raw[key] ?? (raw['rules'] is Map ? raw['rules'][key] : null);
    if (value is num) return value.toInt();
    return null;
  }

  static bool _rawBool(Map<String, dynamic>? raw, String key) {
    if (raw == null) return false;
    final value = raw[key] ?? (raw['rules'] is Map ? raw['rules'][key] : null);
    return value == true;
  }
}
