import '../services/panchanga_calculator.dart';

/// Generic tithi-boundary root-finding primitives. Each is a direct,
/// line-cited port of one JS helper that is duplicated (with slightly
/// different search directions) across js/ekadashi-engine.js and
/// js/parana-engine.js. Pure numeric search over
/// [PanchangaCalculator.tithiInfo] - no Vaishnava domain knowledge lives
/// here, only "when does tithi N start/end relative to a reference time".
class TithiBoundarySearch {
  const TithiBoundarySearch(this._calculator);

  final PanchangaCalculator _calculator;

  static const _hourMs = 60 * 60 * 1000;
  static const _bisectionSteps = 40;

  /// Searching BACKWARD from [reference], finds the moment [target] most
  /// recently began (its entry boundary). Mirrors:
  /// - js/ekadashi-engine.js:140-157 `findTithiStartBefore`
  /// - js/parana-engine.js:25-44 `findTithiBoundaryBefore`
  DateTime? tithiStartBefore(
    DateTime reference,
    int target, {
    int maxHours = 72,
  }) {
    var right = reference;
    var left = right.subtract(const Duration(hours: 1));
    final min = reference.millisecondsSinceEpoch - maxHours * _hourMs;
    while (left.millisecondsSinceEpoch >= min) {
      final rightNumber = _calculator.tithiInfo(right).number;
      final leftNumber = _calculator.tithiInfo(left).number;
      if (rightNumber == target && leftNumber != target) {
        return _bisect(left, right, target, moveRightWhenTarget: true);
      }
      right = left;
      left = left.subtract(const Duration(hours: 1));
    }
    return null;
  }

  /// Searching FORWARD from [reference] (assumed to already be inside
  /// [target]), finds when [target] ends. Mirrors:
  /// - js/ekadashi-engine.js:83-100 `findTithiEndAfter`
  /// - js/parana-engine.js:4-23 `findTithiBoundaryAfter`
  DateTime? tithiEndAfter(
    DateTime reference,
    int target, {
    int maxHours = 48,
  }) {
    var left = reference;
    var right = left.add(const Duration(hours: 1));
    final max = reference.millisecondsSinceEpoch + maxHours * _hourMs;
    while (right.millisecondsSinceEpoch <= max) {
      final leftNumber = _calculator.tithiInfo(left).number;
      final rightNumber = _calculator.tithiInfo(right).number;
      if (leftNumber == target && rightNumber != target) {
        return _bisect(left, right, target, moveRightWhenTarget: false);
      }
      left = right;
      right = right.add(const Duration(hours: 1));
    }
    return null;
  }

  /// Searching BACKWARD from [reference], finds the most recent moment
  /// [target] ended (a past exit boundary - [target] has already finished
  /// by [reference]). Mirrors js/parana-engine.js:46-65 `findTithiEndBefore`.
  DateTime? tithiEndBefore(
    DateTime reference,
    int target, {
    int maxHours = 48,
  }) {
    var right = reference;
    var left = right.subtract(const Duration(hours: 1));
    final min = reference.millisecondsSinceEpoch - maxHours * _hourMs;
    while (left.millisecondsSinceEpoch >= min) {
      final rightNumber = _calculator.tithiInfo(right).number;
      final leftNumber = _calculator.tithiInfo(left).number;
      if (leftNumber == target && rightNumber != target) {
        return _bisect(left, right, target, moveRightWhenTarget: false);
      }
      right = left;
      left = left.subtract(const Duration(hours: 1));
    }
    return null;
  }

  /// Shared 40-step bisection, matching every JS boundary-search helper's
  /// inner loop exactly. [moveRightWhenTarget] selects which JS variant
  /// this mirrors: true = "if midIsTarget, right=mid" (findTithiBoundaryBefore
  /// / findTithiStartBefore); false = "if midIsTarget, left=mid" (the other
  /// three). Both variants return the converged `right` endpoint.
  DateTime _bisect(
    DateTime left,
    DateTime right,
    int target, {
    required bool moveRightWhenTarget,
  }) {
    var a = left;
    var b = right;
    for (var i = 0; i < _bisectionSteps; i += 1) {
      final midMs =
          ((a.millisecondsSinceEpoch + b.millisecondsSinceEpoch) / 2).round();
      final mid = DateTime.fromMillisecondsSinceEpoch(midMs, isUtc: true);
      final midIsTarget = _calculator.tithiInfo(mid).number == target;
      if (moveRightWhenTarget) {
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
}
