import '../models/panchanga_day.dart';
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
  /// Finds the [start, end) interval within [start]..[end] where tithi
  /// equals [target], sampling every 30 minutes then reporting whichever
  /// bracket first entered the target. Mirrors
  /// js/ekadashi-engine.js:60-72 `findTithiIntervalBetween` (used to detect
  /// a "no sunrise" Ekadashi that starts and ends between two sunrises).
  ({DateTime start, DateTime end})? tithiIntervalBetween(
    DateTime start,
    DateTime end,
    int target,
  ) {
    const step = Duration(minutes: 30);
    var cursor = start;
    DateTime? insideStart;
    while (!cursor.isAfter(end)) {
      final current = _calculator.tithiInfo(cursor).number;
      if (current == target && insideStart == null) insideStart = cursor;
      if (insideStart != null && current != target) {
        return (start: insideStart, end: cursor);
      }
      cursor = cursor.add(step);
    }
    if (insideStart != null) return (start: insideStart, end: end);
    return null;
  }

  /// Searching FORWARD from [reference] (assumed inside [target]), finds
  /// when nakshatra [target] ends. Mirrors
  /// js/ekadashi-engine.js:102-119 `findNakshatraEndAfter`.
  DateTime? nakshatraEndAfter(
    DateTime reference,
    int target, {
    int maxHours = 48,
  }) {
    var left = reference;
    var right = left.add(const Duration(hours: 1));
    final max = reference.millisecondsSinceEpoch + maxHours * _hourMs;
    while (right.millisecondsSinceEpoch <= max) {
      if (_calculator.nakshatraInfo(left).number == target &&
          _calculator.nakshatraInfo(right).number != target) {
        return _bisectNakshatra(
          left,
          right,
          target,
          moveRightWhenTarget: false,
        );
      }
      left = right;
      right = right.add(const Duration(hours: 1));
    }
    return null;
  }

  /// Searching BACKWARD from [reference], finds when nakshatra [target]
  /// most recently began. Mirrors
  /// js/ekadashi-engine.js:121-138 `findNakshatraStartBefore`.
  DateTime? nakshatraStartBefore(
    DateTime reference,
    int target, {
    int maxHours = 48,
  }) {
    var right = reference;
    var left = right.subtract(const Duration(hours: 1));
    final min = reference.millisecondsSinceEpoch - maxHours * _hourMs;
    while (left.millisecondsSinceEpoch >= min) {
      if (_calculator.nakshatraInfo(right).number == target &&
          _calculator.nakshatraInfo(left).number != target) {
        return _bisectNakshatra(
          left,
          right,
          target,
          moveRightWhenTarget: true,
        );
      }
      right = left;
      left = left.subtract(const Duration(hours: 1));
    }
    return null;
  }

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

  DateTime _bisectNakshatra(
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
      final midIsTarget = _calculator.nakshatraInfo(mid).number == target;
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

/// Result of a Paksavardhini vriddhi (repeated tithi) scan - see
/// [paksavardhiniVriddhiAhead].
class PaksavardhiniVriddhi {
  const PaksavardhiniVriddhi({
    required this.targetTithiNumber,
    required this.firstDay,
    required this.secondDay,
  });

  final int targetTithiNumber;
  final PanchangaDay firstDay;
  final PanchangaDay secondDay;
}

/// Scans FORWARD through [days] starting just after [index], looking for
/// the next Pratipat (16, after a Gaura Dvadashi) or Amavasya (30, after a
/// Krishna Dvadashi) that repeats at two consecutive sunrises (a "vriddhi"
/// day). This is the one genuine array-scan in the web engine - it cannot
/// be expressed as a condition over a fixed D-1/D/D+1 window, unlike every
/// other Ekadashi/Parana rule. Direct port of
/// js/ekadashi-engine.js:184-207 `paksavardhiniVriddhiAhead`.
PaksavardhiniVriddhi? paksavardhiniVriddhiAhead(
  List<PanchangaDay> days,
  int index,
  int dvadashiNumber,
) {
  final targetNumber = dvadashiNumber == 12 ? 16 : 30;
  for (var i = index + 1; i < days.length - 1; i += 1) {
    final current = days[i].tithiAtSunrise.number;
    if (current != targetNumber) continue;
    if (days[i + 1].tithiAtSunrise.number != current) return null;
    return PaksavardhiniVriddhi(
      targetTithiNumber: targetNumber,
      firstDay: days[i],
      secondDay: days[i + 1],
    );
  }
  return null;
}
