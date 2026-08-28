import 'package:timezone/timezone.dart' as tz;

import '../models/mobile_event.dart';
import '../models/panchanga_day.dart';
import '../rules/fact_functions.dart';
import 'ekadashi_classifier.dart';
import 'panchanga_calculator.dart';

const _tithiShortNumbers = <String, int>{
  'Pratipat': 1,
  'Dvitiya': 2,
  'Tritiya': 3,
  'Chaturthi': 4,
  'Panchami': 5,
  'Shashthi': 6,
  'Saptami': 7,
  'Ashtami': 8,
  'Navami': 9,
  'Dashami': 10,
  'Ekadashi': 11,
  'Dvadashi': 12,
  'Trayodashi': 13,
  'Chaturdashi': 14,
  'Purnima': 15,
  'Amavasya': 30,
};

/// Matches event rule definitions (masa/paksha/tithi templates, from the
/// `events`/`ekadashi` tables) against a specific day. A direct, line-cited
/// port of js/event-matcher.js `matchEventsForDay`, covering:
/// - the generic GCAL ksaya/vriddhi decision table
/// - 5 bespoke festival day-selection procedures (Janmashtami, Govardhana
///   Puja, Gaura Purnima, Rama Navami, Ratha Yatra)
/// - noon/midnight-based timing rules (requires `tz.initializeTimeZones()`
///   to have been called - the app already does this in main.dart)
///
/// Requires [EventMatcher.classifyRange]'s day list to include the same
/// padding neighbors js/calendar-engine.js's day-range builders use (D-1/D+1
/// access), since several rules read `previousDay`/`nextDay`.
class EventMatcher {
  EventMatcher({required PanchangaCalculator calculator})
    : _calculator = calculator,
      _search = TithiBoundarySearch(calculator);

  final PanchangaCalculator _calculator;
  final TithiBoundarySearch _search;

  /// Mirrors js/event-matcher.js:213-229 `matchEventsForDay`.
  ///
  /// [ekadashiFastsByDate] should be [EkadashiRangeResult.fastsByFastDate]
  /// from [EkadashiClassifier.classifyRange] over the same day range - only
  /// needed for the Rama Navami rule's "does tomorrow already have an
  /// Ekadashi fast" check.
  List<MobileEvent> matchEventsForDay({
    required PanchangaDay day,
    required List<MobileEvent> events,
    required String timezone,
    PanchangaDay? nextDay,
    PanchangaDay? previousDay,
    Map<String, EkadashiFast>? ekadashiFastsByDate,
  }) {
    return events
        .where(
          (event) => _matches(
            day,
            event,
            timezone,
            nextDay,
            previousDay,
            ekadashiFastsByDate,
          ),
        )
        .toList(growable: false);
  }

  bool _matches(
    PanchangaDay day,
    MobileEvent event,
    String timezone,
    PanchangaDay? nextDay,
    PanchangaDay? previousDay,
    Map<String, EkadashiFast>? ekadashiFastsByDate,
  ) {
    if (event.disabled) return false;
    if (event.anchorEventId != null) return false;
    if (event.masa.isEmpty && (event.gaudiyaMasa == null)) return false;
    if (event.paksha.isEmpty || event.tithi.isEmpty) return false;

    final special = _matchSpecialEvent(
      day,
      event,
      timezone,
      nextDay,
      previousDay,
      ekadashiFastsByDate,
    );
    if (special != null) return special;

    if (!_masaMatches(day, event)) return false;
    if (day.masaType == 'adhika' && !event.allowInAdhika) return false;

    final genericGcal = _matchGenericGcalTithiEvent(
      day,
      event,
      nextDay,
      previousDay,
    );
    if (genericGcal != null) return genericGcal;

    final ruleTithi = _tithiAtRuleTime(day, event, timezone);
    return _tithiMatches(ruleTithi, event);
  }

  // ---- masa / tithi matching primitives ----

  bool _masaMatches(PanchangaDay day, MobileEvent event) {
    if (event.gaudiyaMasa != null) return day.normalMasaName == event.gaudiyaMasa;
    return day.masa == event.masa;
  }

  ({int number, String name, String paksha}) _tithiAtRuleTime(
    PanchangaDay day,
    MobileEvent event,
    String timezone,
  ) {
    if (event.timingRule == 'sunrise_based' || event.timingRule == null) {
      return (
        number: day.tithiAtSunrise.number,
        name: day.tithiAtSunrise.name,
        paksha: day.tithiAtSunrise.paksha,
      );
    }
    final hour = event.timingRule == 'noon_based'
        ? 12
        : event.timingRule == 'midnight_based'
        ? 0
        : null;
    if (hour == null) {
      return (
        number: day.tithiAtSunrise.number,
        name: day.tithiAtSunrise.name,
        paksha: day.tithiAtSunrise.paksha,
      );
    }
    final at = _zonedDateToUtc(day.date, hour, timezone);
    final tithi = _calculator.tithiInfo(at);
    return (number: tithi.number, name: tithi.name, paksha: tithi.paksha);
  }

  bool _tithiMatches(
    ({int number, String name, String paksha}) info,
    MobileEvent event,
  ) {
    return info.paksha == event.paksha &&
        _tithiShortName(info.name) == event.tithi;
  }

  String _tithiShortName(String fullName) {
    if (fullName == 'Purnima' || fullName == 'Amavasya') return fullName;
    return fullName.replaceFirst('Gaura ', '').replaceFirst('Krishna ', '');
  }

  int? _targetTithiNumber(MobileEvent event) {
    if (event.tithi == 'Purnima') return 15;
    if (event.tithi == 'Amavasya') return 30;
    final base = _tithiShortNumbers[event.tithi];
    if (base == null) return null;
    return event.paksha == 'Krishna' ? base + 15 : base;
  }

  int _previousTithiNumber(int number) => number == 1 ? 30 : number - 1;
  int _nextTithiNumber(int number) => number == 30 ? 1 : number + 1;

  bool _isPreviousOrEarlierInPaksha(int? previous, int target) {
    if (previous == null) return false;
    if (target == 1) return previous == 30;
    if (target == 16) return previous == 15;
    if (target > 1 && target <= 15) return previous >= 1 && previous < target;
    return previous >= 16 && previous < target;
  }

  int _tithiNumber(PanchangaDay day) => day.tithiAtSunrise.number;

  // ---- generic GCAL ksaya/vriddhi table (js/event-matcher.js:194-211) ----

  bool? _matchGenericGcalTithiEvent(
    PanchangaDay day,
    MobileEvent event,
    PanchangaDay? nextDay,
    PanchangaDay? previousDay,
  ) {
    if (event.timingRule != null && event.timingRule != 'sunrise_based') {
      return null;
    }
    if (nextDay == null || previousDay == null) return null;
    final target = _targetTithiNumber(event);
    if (target == null) return null;

    final previous = previousDay.tithiAtSunrise.number;
    final today = day.tithiAtSunrise.number;
    final tomorrow = nextDay.tithiAtSunrise.number;
    final beforeTarget = _previousTithiNumber(target);
    final afterTarget = _nextTithiNumber(target);

    if (today == target && previous != target) return true;
    if (today == target && tomorrow == target) return true;
    if (previous == beforeTarget && today == afterTarget) return true;
    if (_isPreviousOrEarlierInPaksha(previous, target) &&
        today == target &&
        tomorrow == afterTarget) {
      return true;
    }
    return false;
  }

  // ---- bespoke festival procedures (js/event-matcher.js:87-192) ----

  bool? _matchSpecialEvent(
    PanchangaDay day,
    MobileEvent event,
    String timezone,
    PanchangaDay? nextDay,
    PanchangaDay? previousDay,
    Map<String, EkadashiFast>? ekadashiFastsByDate,
  ) {
    if (event.id == 'janmashtami') {
      return _matchJanmashtami(day, event, timezone, previousDay, nextDay);
    }
    if (event.id == 'gaura_purnima') {
      return _matchGauraPurnima(day, event, previousDay);
    }
    if (event.id == 'rama_navami') {
      return _matchRamaNavami(
        day,
        event,
        previousDay,
        nextDay,
        ekadashiFastsByDate,
      );
    }
    if (event.id.contains('govardhana') || event.id.contains('говардхана')) {
      return _matchGovardhanaPuja(day, event, previousDay, nextDay);
    }
    if (_isRathaYatraEvent(event)) {
      return _matchRathaYatra(day, event, previousDay);
    }
    return null;
  }

  bool _matchJanmashtami(
    PanchangaDay day,
    MobileEvent event,
    String timezone,
    PanchangaDay? previousDay,
    PanchangaDay? nextDay,
  ) {
    if (!_masaMatches(day, event) || day.masaType == 'adhika') return false;
    final previous = previousDay == null ? null : _tithiNumber(previousDay);
    final today = _tithiNumber(day);
    final tomorrow = nextDay == null ? null : _tithiNumber(nextDay);
    const saptami = 22;
    const astami = 23;
    const navami = 24;

    if (today == astami && tomorrow == astami && nextDay != null) {
      return _selectJanmashtamiDoubleAstami(day, nextDay, timezone).date ==
          day.date;
    }
    if (previous == astami && today == astami && previousDay != null) {
      return _selectJanmashtamiDoubleAstami(previousDay, day, timezone).date ==
          day.date;
    }
    if (today == astami) return true;
    if (previous == saptami && today == navami) return true;
    return false;
  }

  PanchangaDay _selectJanmashtamiDoubleAstami(
    PanchangaDay day1,
    PanchangaDay day2,
    String timezone,
  ) {
    final day1MidnightRohini = _midnightNakshatraNumber(day1, timezone) == 4;
    final day2MidnightRohini = _midnightNakshatraNumber(day2, timezone) == 4;
    if (day1MidnightRohini && !day2MidnightRohini) return day1;
    if (!day1MidnightRohini && day2MidnightRohini) return day2;

    final day1Rohini = day1.nakshatraAtSunrise.number == 4;
    final day2Rohini = day2.nakshatraAtSunrise.number == 4;
    if (day1Rohini && !day2Rohini) return day1;
    if (!day1Rohini && day2Rohini) return day2;

    return day1;
  }

  int _midnightNakshatraNumber(PanchangaDay day, String timezone) {
    final at = _zonedDateToUtc(day.date, 0, timezone);
    return _calculator.nakshatraInfo(at).number;
  }

  bool _matchGovardhanaPuja(
    PanchangaDay day,
    MobileEvent event,
    PanchangaDay? previousDay,
    PanchangaDay? nextDay,
  ) {
    if (!_masaMatches(day, event) ||
        day.tithiAtSunrise.paksha != 'Gaura' ||
        day.masaType == 'adhika') {
      return false;
    }
    final previous = previousDay == null ? null : _tithiNumber(previousDay);
    final today = _tithiNumber(day);
    final tomorrow = nextDay == null ? null : _tithiNumber(nextDay);
    const pratipat = 1;
    const dvitiya = 2;
    const amavasya = 30;

    if (previous == pratipat && today == pratipat) return true;
    if (today == pratipat && tomorrow == pratipat && nextDay != null) {
      return false;
    }
    if (today == pratipat) return true;
    return previous == amavasya && today == dvitiya;
  }

  bool _matchGauraPurnima(
    PanchangaDay day,
    MobileEvent event,
    PanchangaDay? previousDay,
  ) {
    if (previousDay == null || day.masaType == 'adhika') return false;
    final previous = _tithiNumber(previousDay);
    final today = _tithiNumber(day);
    final previousInGovinda =
        previousDay.normalMasaName == 'Govinda' ||
        previousDay.masa == event.masa;
    final todayInGovinda =
        day.normalMasaName == 'Govinda' || day.masa == event.masa;
    final todayInVishnu = day.normalMasaName == 'Vishnu';
    if (previous < 15 && today == 15 && todayInGovinda) return true;
    if (previous < 15 &&
        today == 16 &&
        previousInGovinda &&
        todayInVishnu) {
      return true;
    }
    if (previous == 15 && today == 15 && previousInGovinda) return false;
    return false;
  }

  bool _tomorrowHasEkadashiFast(
    PanchangaDay? nextDay,
    Map<String, EkadashiFast>? ekadashiFastsByDate,
  ) {
    if (nextDay == null || ekadashiFastsByDate == null) return false;
    final key = _dateKey(nextDay.date);
    final fast = ekadashiFastsByDate[key];
    return fast != null && fast.fastDate == key;
  }

  bool _matchRamaNavami(
    PanchangaDay day,
    MobileEvent event,
    PanchangaDay? previousDay,
    PanchangaDay? nextDay,
    Map<String, EkadashiFast>? ekadashiFastsByDate,
  ) {
    if (previousDay == null ||
        nextDay == null ||
        !_masaMatches(day, event) ||
        day.tithiAtSunrise.paksha != 'Gaura' ||
        day.masaType == 'adhika') {
      return false;
    }
    final previous = _tithiNumber(previousDay);
    final today = _tithiNumber(day);
    final tomorrow = _tithiNumber(nextDay);
    if (today == 9 && previous != 9) return true;

    final hasNavami =
        _search.tithiIntervalBetween(day.sunrise, nextDay.sunrise, 9) != null;
    final hasDashami =
        _search.tithiIntervalBetween(day.sunrise, nextDay.sunrise, 10) !=
        null;
    final nextHasEkadashiFast = _tomorrowHasEkadashiFast(
      nextDay,
      ekadashiFastsByDate,
    );
    if (today == 8 &&
        hasNavami &&
        hasDashami &&
        tomorrow == 11 &&
        nextHasEkadashiFast) {
      return true;
    }
    return false;
  }

  bool _matchRathaYatra(
    PanchangaDay day,
    MobileEvent event,
    PanchangaDay? previousDay,
  ) {
    if (previousDay == null ||
        !_masaMatches(day, event) ||
        day.tithiAtSunrise.paksha != 'Gaura' ||
        day.masaType == 'adhika') {
      return false;
    }
    final previous = _tithiNumber(previousDay);
    final today = _tithiNumber(day);
    if (previous < 2 && today == 2) return true;
    if (previous == 1 && today == 3) return true;
    if (previous == 2 && today == 2) return false;
    return false;
  }

  bool _isRathaYatraEvent(MobileEvent event) {
    final id = event.id;
    final name = event.name;
    return id == 'ratha_yatra' ||
        id.contains('ratha_yatra') ||
        id.contains('ратха_ятра') ||
        RegExp('ratha yatra', caseSensitive: false).hasMatch(name);
  }

  // ---- shared helpers ----

  String _dateKey(DateTime date) {
    final y = date.year.toString().padLeft(4, '0');
    final m = date.month.toString().padLeft(2, '0');
    final d = date.day.toString().padLeft(2, '0');
    return '$y-$m-$d';
  }

  DateTime _zonedDateToUtc(DateTime civilDate, int hour, String timezone) {
    final local = tz.TZDateTime(
      tz.getLocation(timezone),
      civilDate.year,
      civilDate.month,
      civilDate.day,
      hour,
    );
    return local.toUtc();
  }
}
