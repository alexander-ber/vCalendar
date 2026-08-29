/// Resolves facts for the generic rule interpreter (see rule_condition.dart).
///
/// A [FactContext] is a small window of per-day fact maps (mirroring the
/// `day.lunar.*` / `day.astronomy.*` / `day.masa.*` paths used in
/// js/calendar-engine.js's `day` object) centered on the day being
/// evaluated, plus rule constants (mirrors data/engine-rules.json /
/// data/rules.json) and a small bag of "external" facts for values computed
/// by a previous evaluation pass (e.g. tomorrow's Mahadvadashi result).
///
/// This class has no domain knowledge - it only knows how to look values up
/// by dotted path and day offset.
class FactContext {
  FactContext({
    required this.dayFacts,
    required this.centerIndex,
    this.ruleConstants = const {},
    this.externalFacts = const {},
  });

  /// Index-aligned day fact maps. `dayFacts[centerIndex]` is "today".
  final List<Map<String, dynamic>> dayFacts;
  final int centerIndex;
  final Map<String, dynamic> ruleConstants;
  final Map<String, dynamic> externalFacts;

  /// Resolves `{"fact": path, "day": offset}` against the day window.
  /// Returns null if the offset is out of range or the path doesn't resolve.
  dynamic factAt(String path, int dayOffset) {
    final index = centerIndex + dayOffset;
    if (index < 0 || index >= dayFacts.length) return null;
    return _lookupPath(dayFacts[index], path);
  }

  /// Resolves `{"rule": path}` against the loaded rule constants.
  dynamic ruleConstant(String path) => _lookupPath(ruleConstants, path);

  /// Resolves an external fact injected by the caller for this evaluation
  /// (e.g. `ekadashi_fast_scheduled_on_day` results from an earlier pass).
  dynamic external(String key) => externalFacts[key];

  static dynamic _lookupPath(Map<String, dynamic> root, String path) {
    dynamic current = root;
    for (final part in path.split('.')) {
      if (current is Map) {
        current = current[part];
      } else {
        return null;
      }
    }
    return current;
  }
}
