import '../models/calendar_location.dart';
import '../models/mobile_event.dart';
import '../models/panchanga_day.dart';
import 'ekadashi_classifier.dart';
import 'event_matcher.dart';
import 'generated_calendar_events.dart';
import 'panchanga_calculator.dart';
import 'panchanga_formatter.dart';

/// Assembles the final per-day event list mobile should display, mirroring
/// js/calendar-engine.js's `attachEvents` orchestration: Ekadashi fast/
/// no-fast/parana entries, generic rule-matched events (including the
/// `observance_offset_days` shift), `anchor_event_id`-dependent events, and
/// the Purushottama/Bhishma Panchaka generated notices.
///
/// NOT yet ported: Sankranti + dependent notices (Ganga Sagara Mela, Tulasi
/// Jala Dan) - these need a precise sankranti-crossing-moment bisection
/// that `PanchangaCalculator` doesn't expose yet (it only exposes a
/// sankranti *count*, not the crossing instants). See
/// generated_calendar_events.dart for the text-generation half, already
/// prepared for when that's built.
class CalendarEventEngine {
  CalendarEventEngine(
    Map<String, dynamic> engineRules, {
    required PanchangaCalculator calculator,
  }) : _classifier = EkadashiClassifier(engineRules, calculator: calculator),
       _matcher = EventMatcher(calculator: calculator),
       _generated = const GeneratedCalendarEvents(),
       _formatter = const PanchangaFormatter();

  final EkadashiClassifier _classifier;
  final EventMatcher _matcher;
  final GeneratedCalendarEvents _generated;
  final PanchangaFormatter _formatter;

  /// [days] should include padding before/after the dates you actually need
  /// results for (Ekadashi/event matching read D-1/D+1 neighbors, and
  /// shifted/anchored events can land outside the requested range's edges
  /// if padding is too thin) - mirrors js/calendar-engine.js's own
  /// generateCalendarRange padding (10 days each side).
  Map<String, List<MobileEvent>> attachEvents({
    required List<PanchangaDay> days,
    required CalendarLocation location,
    required List<MobileEvent> eventRules,
    required bool isRu,
  }) {
    final ekadashi = _classifier.classifyRange(days, location);
    final byDate = <String, List<MobileEvent>>{};
    final shiftedByDate = <String, List<MobileEvent>>{};
    // The `ekadashi` category rows exist for name/content lookup only
    // (mirrors js/ekadashi-data.js EKADASHI_DB, which js/ekadashi-engine.js
    // reads separately from js/events-data.js's EVENTS) - they must never
    // reach EventMatcher.matchEventsForDay, which web only ever calls with
    // EVENTS, not EKADASHI_DB.
    final ekadashiRecords = eventRules
        .where((e) => e.category == 'ekadashi')
        .toList(growable: false);
    final genericEventRules = eventRules
        .where((e) => e.category != 'ekadashi')
        .toList(growable: false);

    for (var i = 0; i < days.length; i += 1) {
      final day = days[i];
      final key = _dateKey(day.date);
      final nextDay = i + 1 < days.length ? days[i + 1] : null;
      final previousDay = i > 0 ? days[i - 1] : null;

      final matched = _matcher.matchEventsForDay(
        day: day,
        events: genericEventRules,
        timezone: location.timezone,
        nextDay: nextDay,
        previousDay: previousDay,
        ekadashiFastsByDate: ekadashi.fastsByFastDate,
      );

      // Mirrors js/calendar-engine.js:410-428 `attachEvents`'s per-day
      // shift: a matched event with observance_offset_days != 0 moves to
      // a different day instead of showing where it matched.
      final currentGenerated = <MobileEvent>[];
      for (final event in matched) {
        final offset = event.observanceOffsetDays;
        if (offset == 0) {
          currentGenerated.add(event);
          continue;
        }
        final targetIndex = i + offset;
        if (targetIndex < 0 || targetIndex >= days.length) continue;
        final targetKey = _dateKey(days[targetIndex].date);
        shiftedByDate.putIfAbsent(targetKey, () => []).add(event);
      }

      final vrataEvents = _vrataEventsForDay(
        key: key,
        ekadashi: ekadashi,
        ekadashiRecords: ekadashiRecords,
        location: location,
        isRu: isRu,
      );

      byDate[key] = [
        ...vrataEvents,
        ...currentGenerated,
        ...(shiftedByDate[key] ?? const []),
      ];
    }

    _addAnchorDependentEvents(days, byDate, genericEventRules);
    _addBoundaryAndBhishmaEvents(days, byDate, isRu);

    return byDate;
  }

  // ---- Ekadashi fast / no-fast / parana entries ----

  List<MobileEvent> _vrataEventsForDay({
    required String key,
    required EkadashiRangeResult ekadashi,
    required List<MobileEvent> ekadashiRecords,
    required CalendarLocation location,
    required bool isRu,
  }) {
    final events = <MobileEvent>[];

    final fast = ekadashi.fastsByFastDate[key];
    if (fast != null) {
      events.add(_ekadashiFastEvent(fast, ekadashiRecords, isRu));
    }

    final notice = ekadashi.noFastByCandidateDate[key];
    if (notice != null) {
      events.add(_ekadashiNoFastEvent(notice, isRu));
    }

    // Parana entry is shown on fast_date + 1 - find any fast whose parana
    // date matches this day (mirrors js/ekadashi-engine.js `paranaEventForDate`
    // / `scheduleEkadashi`'s addDaysToLocalDate(fast_date, 1)).
    for (final candidateFast in ekadashi.fastsByFastDate.values) {
      if (_dateKey(candidateFast.parana.date) == key) {
        events.add(
          _paranaDisplayEvent(candidateFast, ekadashiRecords, location, isRu),
        );
      }
    }

    return events;
  }

  MobileEvent _ekadashiFastEvent(
    EkadashiFast fast,
    List<MobileEvent> ekadashiRecords,
    bool isRu,
  ) {
    final record = _resolveEkadashiRecord(fast, ekadashiRecords);
    return MobileEvent(
      id: 'ekadashi_${fast.fastDate}',
      category: 'ekadashi',
      eventType: 'ekadashi',
      masa: fast.masaName,
      masaType: fast.masaType,
      paksha: fast.paksha,
      tithi: 'Ekadashi',
      naksatra: null,
      timingRule: null,
      gaudiyaMasa: null,
      anchorEventId: null,
      observanceOffsetDays: 0,
      disabled: false,
      allowInAdhika: true,
      priority: 10,
      name: record?.name ?? '${fast.paksha} Ekadashi',
      shortDescription: record?.shortDescription,
      fullDescription: record?.fullDescription,
    );
  }

  MobileEvent _ekadashiNoFastEvent(EkadashiNoFast notice, bool isRu) {
    final paksha = notice.targetNumber == 11 ? 'Gaura' : 'Krishna';
    final label = isRu
        ? (paksha == 'Gaura' ? 'Гаура Экадаши' : 'Кришна Экадаши')
        : '$paksha Ekadashi';
    return MobileEvent(
      id: 'ekadashi_no_fast_${notice.candidateDate}_${notice.reason}',
      category: 'vrata',
      eventType: 'ekadashi_notice',
      masa: '',
      masaType: null,
      paksha: paksha,
      tithi: 'Ekadashi',
      naksatra: null,
      timingRule: null,
      gaudiyaMasa: null,
      anchorEventId: null,
      observanceOffsetDays: 0,
      disabled: false,
      allowInAdhika: true,
      priority: 10,
      name: isRu ? '$label — без поста' : '$label - no fast',
      shortDescription: null,
      fullDescription: null,
    );
  }

  MobileEvent _paranaDisplayEvent(
    EkadashiFast fast,
    List<MobileEvent> ekadashiRecords,
    CalendarLocation location,
    bool isRu,
  ) {
    final record = _resolveEkadashiRecord(fast, ekadashiRecords);
    final name = record?.name ?? '${fast.paksha} Ekadashi';
    final tz = location.timezone;
    final start = fast.parana.start != null
        ? _formatter.time(fast.parana.start!, tz)
        : (isRu ? 'недоступно' : 'not available');
    final preferredEnd = fast.parana.preferredEnd != null
        ? _formatter.time(fast.parana.preferredEnd!, tz)
        : (isRu ? 'недоступно' : 'not available');
    return MobileEvent(
      id: 'parana_ekadashi_${fast.fastDate}',
      category: 'vrata',
      eventType: 'parana',
      masa: '',
      masaType: null,
      paksha: fast.paksha,
      tithi: 'Dvadashi',
      naksatra: null,
      timingRule: null,
      gaudiyaMasa: null,
      anchorEventId: null,
      observanceOffsetDays: 0,
      disabled: false,
      allowInAdhika: true,
      priority: 10,
      name: isRu ? 'Паран для $name' : 'Parana for $name',
      shortDescription: '$start–$preferredEnd',
      fullDescription: null,
    );
  }

  /// Mirrors js/ekadashi-engine.js:40-58 `ekadashiRecord`: this is a
  /// masa+paksha field MATCH against the `ekadashi` rule table, not an id
  /// lookup - `data/ekadashi.json`'s ids (e.g. `utpanna`) don't encode
  /// masa/paksha at all.
  MobileEvent? _resolveEkadashiRecord(
    EkadashiFast fast,
    List<MobileEvent> ekadashiRecords,
  ) {
    if (fast.masaType == 'adhika') {
      for (final record in ekadashiRecords) {
        if (record.masaType == 'adhika' && record.paksha == fast.paksha) {
          return record;
        }
      }
      return null;
    }
    final resolverMasa = EkadashiClassifier.resolverMasaName(
      fast.masaName,
      fast.paksha,
    );
    for (final record in ekadashiRecords) {
      if (record.masaType == 'normal' &&
          record.masa == resolverMasa &&
          record.paksha == fast.paksha) {
        return record;
      }
    }
    return null;
  }

  // ---- anchor-dependent events (js/calendar-engine.js:321-344) ----

  void _addAnchorDependentEvents(
    List<PanchangaDay> days,
    Map<String, List<MobileEvent>> byDate,
    List<MobileEvent> eventRules,
  ) {
    final dependents = eventRules
        .where((e) => !e.disabled && e.anchorEventId != null)
        .toList(growable: false);
    if (dependents.isEmpty) return;
    final dayKeys = days.map((d) => _dateKey(d.date)).toList(growable: false);
    final keyIndex = {for (var i = 0; i < dayKeys.length; i++) dayKeys[i]: i};

    for (var i = 0; i < days.length; i += 1) {
      final anchorKey = dayKeys[i];
      final anchorEvents = byDate[anchorKey] ?? const [];
      for (final anchorEvent in anchorEvents) {
        for (final dependent in dependents) {
          if (dependent.anchorEventId != anchorEvent.id) continue;
          final targetIndex = keyIndex[anchorKey]! + dependent.observanceOffsetDays;
          if (targetIndex < 0 || targetIndex >= days.length) continue;
          final targetKey = dayKeys[targetIndex];
          final list = byDate.putIfAbsent(targetKey, () => []);
          if (list.any((e) => e.id == dependent.id)) continue;
          list.add(dependent);
        }
      }
    }
  }

  // ---- Purushottama boundary + Bhishma Panchaka ----

  void _addBoundaryAndBhishmaEvents(
    List<PanchangaDay> days,
    Map<String, List<MobileEvent>> byDate,
    bool isRu,
  ) {
    for (var i = 0; i < days.length; i += 1) {
      final day = days[i];
      final key = _dateKey(day.date);
      final previousDay = i > 0 ? days[i - 1] : null;
      final nextDay = i + 1 < days.length ? days[i + 1] : null;
      final list = byDate.putIfAbsent(key, () => []);

      for (final event in _generated.boundaryEventsFor(
        day: day,
        previousDay: previousDay,
        nextDay: nextDay,
        isRu: isRu,
      )) {
        if (!list.any((e) => e.id == event.id)) list.add(event);
      }

      if (_generated.isBhishmaPanchakaDay(day) &&
          !list.any(
            (e) => RegExp(
              'bhishma|bkhishma|бхишма',
              caseSensitive: false,
            ).hasMatch('${e.id} ${e.name}'),
          )) {
        list.add(_generated.bhishmaPanchakaActiveEvent(day: day, isRu: isRu));
      }
    }
  }

  /// Looks up the [EkadashiFast] whose Parana falls on [paranaDate] within
  /// [days] (should include enough padding before [paranaDate] to cover a
  /// full lunar month, since Ekadashi classification is a range scan, not
  /// a single-day computation). Used by UI that wants the raw window
  /// (start/preferred_end/diagnostics) rather than the pre-formatted
  /// display string already in the day's event list.
  EkadashiFast? findFastByParanaDate({
    required List<PanchangaDay> days,
    required CalendarLocation location,
    required DateTime paranaDate,
  }) {
    final result = _classifier.classifyRange(days, location);
    final key = _dateKey(paranaDate);
    for (final fast in result.fastsByFastDate.values) {
      if (_dateKey(fast.parana.date) == key) return fast;
    }
    return null;
  }

  String _dateKey(DateTime date) {
    final y = date.year.toString().padLeft(4, '0');
    final m = date.month.toString().padLeft(2, '0');
    final d = date.day.toString().padLeft(2, '0');
    return '$y-$m-$d';
  }
}
