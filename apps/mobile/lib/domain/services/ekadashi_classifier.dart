import '../models/calendar_location.dart';
import '../models/panchanga_day.dart';
import '../rules/fact_functions.dart';
import 'panchanga_calculator.dart';
import 'parana_engine.dart';

/// One nakshatra-Mahadvadashi candidate row, transcribed from
/// `data/engine-rules.json`'s `ekadashi.nakshatra_mahadvadashi_candidates`.
class NakshatraMahadvadashiCandidate {
  const NakshatraMahadvadashiCandidate({
    required this.nakshatraNumber,
    required this.classification,
    required this.paranaType,
  });

  factory NakshatraMahadvadashiCandidate.fromJson(Map<String, dynamic> json) {
    return NakshatraMahadvadashiCandidate(
      nakshatraNumber: (json['nakshatra_number'] as num).toInt(),
      classification: json['classification'] as String,
      paranaType: json['parana_type'] as String,
    );
  }

  final int nakshatraNumber;
  final String classification;
  final String paranaType;
}

/// A scheduled Ekadashi fast day, with its Parana window. Mirrors the
/// "ekadashi" event shape built by js/ekadashi-engine.js `buildEkadashiEvent`
/// (lines 267-316) - minus display name/description, which stay a content
/// concern resolved separately from the existing `ekadashi`/`ekadashi_i18n`
/// tables (see [EkadashiClassifier.resolverMasaName] for the masa/paksha key
/// those tables are looked up by).
class EkadashiFast {
  const EkadashiFast({
    required this.targetNumber,
    required this.classification,
    required this.candidateDate,
    required this.candidateNoFastReason,
    required this.fastDate,
    required this.fastDayType,
    required this.paranaType,
    required this.parana,
    required this.masaName,
    required this.masaType,
  });

  /// 11 (Gaura Ekadashi) or 26 (Krishna Ekadashi).
  final int targetNumber;
  final String classification;
  final String candidateDate;
  final String? candidateNoFastReason;
  final String fastDate;
  final String fastDayType;
  final String paranaType;
  final ParanaResult parana;
  final String masaName;
  final String masaType;

  String get paksha => targetNumber == 11 ? 'Gaura' : 'Krishna';
}

/// A day that looked like a candidate Ekadashi but isn't the fasting day -
/// mirrors the `{noFastOnly: true, ...}` shape in
/// js/ekadashi-engine.js and the `ekadashi_notice` event it produces.
class EkadashiNoFast {
  const EkadashiNoFast({
    required this.candidateDate,
    required this.targetNumber,
    required this.reason,
  });

  final String candidateDate;
  final int targetNumber;
  final String reason;
}

/// Result of classifying a full day range: which dates have a scheduled
/// fast, and which "candidate but not suitable" dates need a no-fast
/// notice. Mirrors the `Map<date, events[]>` `buildEkadashiEvents` returns,
/// split into its two constituent parts for a cleaner Dart API.
class EkadashiRangeResult {
  const EkadashiRangeResult({
    required this.fastsByFastDate,
    required this.noFastByCandidateDate,
  });

  final Map<String, EkadashiFast> fastsByFastDate;
  final Map<String, EkadashiNoFast> noFastByCandidateDate;
}

/// Classifies Ekadashi fast days (viddha / double-sunrise / no-sunrise /
/// standard, plus the fuller GCAL Mahadvadashi set: Vyanjuli, Paksavardhini,
/// Unmilani, Trisprsa, and nakshatra Mahadvadashi) and computes their Parana
/// window. A direct, line-cited port of js/ekadashi-engine.js.
///
/// The real algorithm is two-pass and cross-day-referencing (Mahadvadashi
/// results from pass 1 feed the "is tomorrow a Mahadvadashi" check in pass
/// 2), plus one true forward array scan (Paksavardhini) - not a flat
/// priority list - so like [ParanaEngine] this is a hand-ported Dart class
/// rather than a JSON decision table. The only genuinely tabular piece (the
/// nakshatra Mahadvadashi candidates) is loaded from
/// `data/engine-rules.json`.
class EkadashiClassifier {
  EkadashiClassifier(
    Map<String, dynamic> engineRules, {
    required PanchangaCalculator calculator,
  }) : _calculator = calculator,
       _search = TithiBoundarySearch(calculator),
       _paranaEngine = ParanaEngine(engineRules),
       _vijayaPraharFraction =
           (engineRules['ekadashi']?['vijaya_prahar_day_fraction'] as num?)
               ?.toDouble() ??
           0.375,
       _nakshatraCandidates =
           ((engineRules['ekadashi']?['nakshatra_mahadvadashi_candidates']
                       as List?) ??
                   const [])
               .map(
                 (json) => NakshatraMahadvadashiCandidate.fromJson(
                   Map<String, dynamic>.from(json as Map),
                 ),
               )
               .toList(growable: false);

  final PanchangaCalculator _calculator;
  final TithiBoundarySearch _search;
  final ParanaEngine _paranaEngine;
  final double _vijayaPraharFraction;
  final List<NakshatraMahadvadashiCandidate> _nakshatraCandidates;

  /// The traditional Ekadashi name/story tables (`ekadashi`/`ekadashi_i18n`
  /// SQLite tables, from `data/ekadashi.json`) are keyed by masa+paksha, but
  /// for Krishna paksha the lookup key is the *following* amanta masa, not
  /// the current one - mirrors js/ekadashi-engine.js:40-41
  /// `ekadashiRecord`'s `resolverMasa`. Callers resolving a display name
  /// for an [EkadashiFast] must apply this to `masaName`/`paksha` first.
  static String resolverMasaName(
    List<String> masaNamesInOrder,
    String amantaMasaName,
    String paksha,
  ) {
    if (paksha != 'Krishna') return amantaMasaName;
    final index = masaNamesInOrder.indexOf(amantaMasaName);
    if (index == -1) return amantaMasaName;
    return masaNamesInOrder[(index + 1) % masaNamesInOrder.length];
  }

  /// Runs the full two-pass algorithm over [days]. Include a few days of
  /// padding before/after the range you actually need results for -
  /// Paksavardhini's forward scan and the D-1/D+1 lookups need real
  /// neighbor days at the edges, exactly like
  /// js/calendar-engine.js's generateCalendarRange padding. Mirrors
  /// js/ekadashi-engine.js:717-751 `buildEkadashiEvents`.
  EkadashiRangeResult classifyRange(
    List<PanchangaDay> days,
    CalendarLocation location,
  ) {
    final mahadvadashiByDate = <String, EkadashiFast>{};
    for (var i = 1; i < days.length - 1; i += 1) {
      final result = _classifyDvadashiMahadvadashi(days, i, location);
      if (result != null) mahadvadashiByDate[result.fastDate] = result;
    }

    final fastsByFastDate = <String, EkadashiFast>{};
    // Notices actually surfaced so far - mirrors checking `byDate` for an
    // existing `ekadashi_notice` entry on a date (js/ekadashi-engine.js:745).
    final noticesByDate = <String, EkadashiNoFast>{};
    // Notices deferred to the end-of-range pass - mirrors `noFastByDate`
    // (js/ekadashi-engine.js:721, 735, 744-747).
    final deferredNoFast = <String, EkadashiNoFast>{};
    final scheduledFastDates = <String>{};

    for (var i = 0; i < days.length - 1; i += 1) {
      final day = days[i];
      final dayKey = _dateKey(day.date);
      final fast =
          mahadvadashiByDate[dayKey] ??
          _classifyEkadashiDay(days, i, location, mahadvadashiByDate);
      final noFast = fast == null
          ? _classifyNoSunriseEkadashi(days, i, location)
          : null;

      if (fast is EkadashiNoFastMarker) {
        deferredNoFast[fast.notice.candidateDate] = fast.notice;
        continue;
      }

      final scheduled = (fast is EkadashiFast) ? fast : noFast;
      if (scheduled == null) continue;
      if (scheduledFastDates.contains(scheduled.fastDate)) continue;
      fastsByFastDate[scheduled.fastDate] = scheduled;
      scheduledFastDates.add(scheduled.fastDate);

      // Mirrors js/ekadashi-engine.js:699-706 `scheduleEkadashi`: a shifted
      // fast (candidate_date != fast_date) also surfaces a no-fast notice
      // on the original candidate date, using the fast's OWN
      // candidate_no_fast_reason - not whatever reason a later/earlier
      // deferred no-fast classification for that same date might carry.
      // This runs immediately, in chronological day order, so it can win
      // over (or be skipped in favor of, if it already exists) a deferred
      // notice for the same date - see the final pass below.
      if (scheduled.candidateDate != scheduled.fastDate) {
        final candidateDay = _dayByKey(days, scheduled.candidateDate);
        if (candidateDay != null &&
            _isEkadashi(candidateDay.tithiAtSunrise.number) &&
            !noticesByDate.containsKey(scheduled.candidateDate)) {
          noticesByDate[scheduled.candidateDate] = EkadashiNoFast(
            candidateDate: scheduled.candidateDate,
            targetNumber: scheduled.targetNumber,
            reason:
                scheduled.candidateNoFastReason ?? 'not_suitable_for_fast',
          );
        }
      }
    }

    // Mirrors js/ekadashi-engine.js:744-747: a deferred notice only
    // surfaces if that date doesn't already have one (from scheduleEkadashi
    // above) and the candidate day's own sunrise tithi is actually Ekadashi.
    for (final entry in deferredNoFast.entries) {
      if (noticesByDate.containsKey(entry.key)) continue;
      final day = _dayByKey(days, entry.key);
      if (day != null && _isEkadashi(day.tithiAtSunrise.number)) {
        noticesByDate[entry.key] = entry.value;
      }
    }

    return EkadashiRangeResult(
      fastsByFastDate: fastsByFastDate,
      noFastByCandidateDate: noticesByDate,
    );
  }

  // ---- classifyDvadashiMahadvadashi (js/ekadashi-engine.js:318-401) ----

  EkadashiFast? _classifyDvadashiMahadvadashi(
    List<PanchangaDay> days,
    int index,
    CalendarLocation location,
  ) {
    final previousDay = days[index - 1];
    final day = days[index];
    final nextDay = days[index + 1];
    if (!_isDvadashi(day.tithiAtSunrise.number)) return null;

    final todayNumber = day.tithiAtSunrise.number;
    final targetNumber = todayNumber == 12 ? 11 : 26;
    final previousAtArunodaya = _calculator
        .tithiInfo(previousDay.arunodaya)
        .number;
    final previousAtSunrise = previousDay.tithiAtSunrise.number;
    final nextAtSunrise = nextDay.tithiAtSunrise.number;
    final candidateDate = _dateKey(previousDay.date);

    if (!_isDvadashiTestCandidate(previousAtSunrise, todayNumber)) {
      return null;
    }

    if (todayNumber == 12) {
      final nakshatraType = _nakshatraMahadvadashiType(day, nextDay);
      if (nakshatraType != null) {
        return _buildFast(
          day: day,
          location: location,
          targetNumber: targetNumber,
          classification: nakshatraType.classification,
          candidateDate: candidateDate,
          fastDate: _dateKey(day.date),
          fastDayType: nakshatraType.classification,
          paranaType: nakshatraType.paranaType,
          candidateNoFastReason: 'nakshatra_mahadvadashi',
          nakshatraMahadvadashi: nakshatraType,
        );
      }
    }

    if (nextAtSunrise == todayNumber &&
        _isEkadashi(previousAtSunrise) &&
        _calculator.tithiInfo(previousDay.arunodaya).number ==
            previousAtSunrise) {
      return _buildFast(
        day: day,
        location: location,
        targetNumber: targetNumber,
        classification: 'vyanjuli_mahadvadashi',
        candidateDate: candidateDate,
        fastDate: _dateKey(day.date),
        fastDayType: 'vyanjuli_mahadvadashi',
        paranaType: 'vyanjuli_mahadvadashi',
        candidateNoFastReason: 'next_day_is_vyanjuli_mahadvadashi',
      );
    }

    final paksavardhini = paksavardhiniVriddhiAhead(days, index, todayNumber);
    if (paksavardhini != null) {
      final paranaType = nextAtSunrise == _nextTithiNumber(todayNumber)
          ? 'viddha'
          : 'vyanjuli_mahadvadashi';
      return _buildFast(
        day: day,
        location: location,
        targetNumber: targetNumber,
        classification: 'paksavardhini_mahadvadashi',
        candidateDate: candidateDate,
        fastDate: _dateKey(day.date),
        fastDayType: 'paksavardhini_mahadvadashi',
        paranaType: paranaType,
        candidateNoFastReason: 'next_full_or_new_moon_is_vriddhi',
      );
    }

    if (_isLessThanEkadashiInPaksha(previousAtArunodaya, targetNumber)) {
      final paranaType = nextAtSunrise == _nextTithiNumber(todayNumber)
          ? 'viddha'
          : 'vyanjuli_mahadvadashi';
      return _buildFast(
        day: day,
        location: location,
        targetNumber: targetNumber,
        classification: 'dvadashi_suitable_for_ekadashi_fasting',
        candidateDate: candidateDate,
        fastDate: _dateKey(day.date),
        fastDayType: 'dvadashi_suitable_for_ekadashi_fasting',
        paranaType: paranaType,
        candidateNoFastReason: 'dashami_viddha_at_arunodaya',
      );
    }

    return null;
  }

  // ---- classifyEkadashiDay (js/ekadashi-engine.js:403-527) ----

  /// Returns [EkadashiFast], an [EkadashiNoFastMarker] wrapper, or null.
  dynamic _classifyEkadashiDay(
    List<PanchangaDay> days,
    int index,
    CalendarLocation location,
    Map<String, EkadashiFast> mahadvadashiByDate,
  ) {
    final previousDay = index > 0 ? days[index - 1] : null;
    final day = days[index];
    final nextDay = index + 1 < days.length ? days[index + 1] : null;
    if (nextDay == null || !_isEkadashi(day.tithiAtSunrise.number)) {
      return null;
    }

    final targetNumber = day.tithiAtSunrise.number;
    final trayodashiNumber = targetNumber == 11 ? 13 : 28;
    final dvadashiNumber = targetNumber == 11 ? 12 : 27;
    final previousAtArunodaya = previousDay == null
        ? null
        : _calculator.tithiInfo(previousDay.arunodaya).number;
    final previousAtSunrise = previousDay?.tithiAtSunrise.number;
    final atArunodaya = _calculator.tithiInfo(day.arunodaya).number;
    final atSunrise = day.tithiAtSunrise.number;
    final nextAtSunrise = nextDay.tithiAtSunrise.number;
    final tomorrowMahadvadashi = mahadvadashiByDate[_dateKey(nextDay.date)];
    final previousDayHasPostSunriseEkadashi =
        _isDashamiSunriseBeforePostSunriseEkadashi(
          previousDay,
          day,
          targetNumber,
        );
    final shiftedCandidateDate = previousDayHasPostSunriseEkadashi
        ? _dateKey(previousDay!.date)
        : _dateKey(day.date);
    final shiftedNoFastReason = previousDayHasPostSunriseEkadashi
        ? 'dashami_viddha_at_sunrise'
        : null;

    if (_isDashamiBeforeEkadashi(atArunodaya, atSunrise)) {
      return EkadashiNoFastMarker(
        EkadashiNoFast(
          candidateDate: _dateKey(day.date),
          targetNumber: targetNumber,
          reason: 'dashami_viddha_at_arunodaya',
        ),
      );
    }

    if (previousAtSunrise == targetNumber &&
        previousAtArunodaya != targetNumber &&
        atArunodaya == targetNumber) {
      final classification = nextAtSunrise == trayodashiNumber
          ? 'trisprsa_after_dashami_viddha'
          : 'suddha_after_dashami_viddha';
      final paranaType = nextAtSunrise == trayodashiNumber
          ? 'trisprsa'
          : 'normal_ekadashi';
      return _buildFast(
        day: day,
        location: location,
        targetNumber: targetNumber,
        classification: classification,
        candidateDate: _dateKey(previousDay!.date),
        fastDate: _dateKey(day.date),
        fastDayType: classification,
        paranaType: paranaType,
        candidateNoFastReason: 'dashami_viddha_at_arunodaya',
      );
    }

    if (previousAtArunodaya == targetNumber &&
        previousAtSunrise == targetNumber &&
        atArunodaya == targetNumber &&
        nextAtSunrise == trayodashiNumber) {
      return _buildFast(
        day: day,
        location: location,
        targetNumber: targetNumber,
        classification: 'unmilani_trisprsa',
        candidateDate: _dateKey(previousDay!.date),
        fastDate: _dateKey(day.date),
        fastDayType: 'unmilani_trisprsa',
        paranaType: 'unmilani_trisprsa',
        candidateNoFastReason: 'today_is_unmilani_trisprsa',
      );
    }

    if (previousAtArunodaya == targetNumber &&
        previousAtSunrise == targetNumber &&
        atArunodaya == targetNumber &&
        nextAtSunrise == dvadashiNumber) {
      return _buildFast(
        day: day,
        location: location,
        targetNumber: targetNumber,
        classification: 'unmilani',
        candidateDate: _dateKey(previousDay!.date),
        fastDate: _dateKey(day.date),
        fastDayType: 'unmilani',
        paranaType: 'unmilani',
        candidateNoFastReason: 'today_is_unmilani',
      );
    }

    if (previousAtSunrise != targetNumber &&
        atArunodaya == targetNumber &&
        nextAtSunrise == trayodashiNumber) {
      final classification = previousDayHasPostSunriseEkadashi
          ? 'trisprsa_after_dashami_sunrise'
          : 'trisprsa';
      return _buildFast(
        day: day,
        location: location,
        targetNumber: targetNumber,
        classification: classification,
        candidateDate: shiftedCandidateDate,
        fastDate: _dateKey(day.date),
        fastDayType: classification,
        paranaType: 'trisprsa',
        candidateNoFastReason: shiftedNoFastReason,
      );
    }

    if (nextAtSunrise == targetNumber) {
      return EkadashiNoFastMarker(
        EkadashiNoFast(
          candidateDate: _dateKey(day.date),
          targetNumber: targetNumber,
          reason: 'tomorrow_is_unmilani',
        ),
      );
    }

    if (tomorrowMahadvadashi != null) {
      return EkadashiNoFastMarker(
        EkadashiNoFast(
          candidateDate: _dateKey(day.date),
          targetNumber: targetNumber,
          reason: tomorrowMahadvadashi.classification,
        ),
      );
    }

    if (previousAtSunrise != targetNumber &&
        atArunodaya == targetNumber &&
        nextAtSunrise == dvadashiNumber) {
      final classification = previousDayHasPostSunriseEkadashi
          ? 'suddha_after_dashami_sunrise'
          : 'suddha_ekadashi';
      final fastDayType = previousDayHasPostSunriseEkadashi
          ? 'suddha_after_dashami_sunrise'
          : 'normal_ekadashi';
      return _buildFast(
        day: day,
        location: location,
        targetNumber: targetNumber,
        classification: classification,
        candidateDate: shiftedCandidateDate,
        fastDate: _dateKey(day.date),
        fastDayType: fastDayType,
        paranaType: 'normal_ekadashi',
        candidateNoFastReason: shiftedNoFastReason,
      );
    }

    return null;
  }

  // ---- classifyNoSunriseEkadashi (js/ekadashi-engine.js:529-552) ----

  EkadashiFast? _classifyNoSunriseEkadashi(
    List<PanchangaDay> days,
    int index,
    CalendarLocation location,
  ) {
    final day = days[index];
    if (index + 1 >= days.length) return null;
    final nextDay = days[index + 1];
    if (_isEkadashi(day.tithiAtSunrise.number) ||
        _isEkadashi(nextDay.tithiAtSunrise.number)) {
      return null;
    }

    final gauraInterval = _search.tithiIntervalBetween(
      day.sunrise,
      nextDay.sunrise,
      11,
    );
    final krishnaInterval = _search.tithiIntervalBetween(
      day.sunrise,
      nextDay.sunrise,
      26,
    );
    final targetNumber = gauraInterval != null
        ? 11
        : (krishnaInterval != null ? 26 : null);
    if (targetNumber == null) return null;

    return _buildFast(
      day: day,
      location: location,
      targetNumber: targetNumber,
      classification: 'no_sunrise',
      candidateDate: _dateKey(day.date),
      fastDate: _dateKey(nextDay.date),
      fastDayType: 'no_sunrise',
      paranaType: 'no_sunrise',
      candidateNoFastReason: 'ekadashi_has_no_sunrise',
    );
  }

  // ---- shared assembly (js/ekadashi-engine.js:267-316 buildEkadashiEvent) ----

  EkadashiFast _buildFast({
    required PanchangaDay day,
    required CalendarLocation location,
    required int targetNumber,
    required String classification,
    required String candidateDate,
    required String fastDate,
    required String fastDayType,
    required String paranaType,
    String? candidateNoFastReason,
    NakshatraMahadvadashiCandidate? nakshatraMahadvadashi,
  }) {
    final fastDateTime = DateTime.utc(
      int.parse(fastDate.substring(0, 4)),
      int.parse(fastDate.substring(5, 7)),
      int.parse(fastDate.substring(8, 10)),
    );
    final isNakshatraParana =
        nakshatraMahadvadashi != null &&
        (nakshatraMahadvadashi.paranaType == 'jayanti_vijaya' ||
            nakshatraMahadvadashi.paranaType == 'jaya_papanasini');
    final parana = isNakshatraParana
        ? _paranaForNakshatraMahadvadashi(
            fastDateTime: fastDateTime,
            targetNumber: targetNumber,
            location: location,
            day: day,
            mahadvadashiType: nakshatraMahadvadashi,
          )
        : _paranaEngine.compute(
            fastDate: fastDateTime,
            ekadashiNumber: targetNumber,
            fastDayType: paranaType,
            location: location,
            calculator: _calculator,
          );

    return EkadashiFast(
      targetNumber: targetNumber,
      classification: classification,
      candidateDate: candidateDate,
      candidateNoFastReason: candidateNoFastReason,
      fastDate: fastDate,
      fastDayType: fastDayType,
      paranaType: paranaType,
      parana: parana,
      masaName: day.masa,
      masaType: day.masaType,
    );
  }

  // ---- nakshatra Mahadvadashi (js/ekadashi-engine.js:159-265) ----

  NakshatraMahadvadashiCandidate? _nakshatraMahadvadashiType(
    PanchangaDay day,
    PanchangaDay nextDay,
  ) {
    if (day.tithiAtSunrise.number != 12) return null;
    for (final candidate in _nakshatraCandidates) {
      if (_nakshatraPresenceQualifies(day, nextDay, candidate) &&
          _dvadashiDurationQualifiesForNakshatra(day, candidate)) {
        return candidate;
      }
    }
    return null;
  }

  bool _nakshatraPresenceQualifies(
    PanchangaDay day,
    PanchangaDay nextDay,
    NakshatraMahadvadashiCandidate candidate,
  ) {
    final todayNakshatra = day.nakshatraAtSunrise;
    if (todayNakshatra.number != candidate.nakshatraNumber) return false;

    final start = _search.nakshatraStartBefore(
      day.sunrise,
      candidate.nakshatraNumber,
    );
    if (start == null) return true;

    final startsAtSunrise =
        start.difference(day.sunrise).abs() <= const Duration(minutes: 1);
    if (startsAtSunrise) return true;

    return nextDay.nakshatraAtSunrise.number == candidate.nakshatraNumber;
  }

  bool _dvadashiDurationQualifiesForNakshatra(
    PanchangaDay day,
    NakshatraMahadvadashiCandidate candidate,
  ) {
    // Always tithi 12 (Gaura Dvadashi) here, not `dvadashiNumber` - this
    // branch of the web engine only ever runs when today's sunrise tithi
    // is already 12 (see the `todayNumber == 12` guard above it), and
    // nakshatra Mahadvadashi is Gaura-paksha only. Matches
    // js/ekadashi-engine.js:164-169 exactly (hardcoded `12`, not a variable).
    final dvadashiEnd = _search.tithiEndAfter(day.sunrise, 12);
    if (dvadashiEnd == null) return false;
    if (candidate.nakshatraNumber == 22) {
      final oneAndHalfPrahar = day.sunrise.add(
        Duration(
          milliseconds:
              (_vijayaPraharFraction *
                      day.sunset.difference(day.sunrise).inMilliseconds)
                  .round(),
        ),
      );
      return !dvadashiEnd.isBefore(oneAndHalfPrahar);
    }
    return !dvadashiEnd.isBefore(day.sunset);
  }

  ParanaResult _paranaForNakshatraMahadvadashi({
    required DateTime fastDateTime,
    required int targetNumber,
    required CalendarLocation location,
    required PanchangaDay day,
    required NakshatraMahadvadashiCandidate mahadvadashiType,
  }) {
    final base = _paranaEngine.compute(
      fastDate: fastDateTime,
      ekadashiNumber: targetNumber,
      fastDayType: mahadvadashiType.paranaType,
      location: location,
      calculator: _calculator,
    );
    if (base.start == null || base.preferredEnd == null) return base;

    final nakshatraNumber = day.nakshatraAtSunrise.number;
    final nakshatraEnd = _search.nakshatraEndAfter(
      day.sunrise,
      nakshatraNumber,
    );
    final dvadashiEnd = _search.tithiEndAfter(day.sunrise, 12);
    if (nakshatraEnd == null || dvadashiEnd == null) return base;

    final daylightThird = base.preferredEnd!;
    var start = day.sunrise;
    DateTime? preferredEnd = _earlier(dvadashiEnd, daylightThird);
    var preferredWindowStatus = 'available';

    if (nakshatraEnd.isBefore(dvadashiEnd) &&
        nakshatraEnd.isBefore(daylightThird)) {
      start = nakshatraEnd;
      preferredEnd = _earlier(dvadashiEnd, daylightThird);
    } else if (nakshatraEnd.isBefore(dvadashiEnd) &&
        !nakshatraEnd.isBefore(daylightThird)) {
      start = nakshatraEnd;
      preferredEnd = dvadashiEnd;
    } else if (day.tithiAtSunrise.number != 12 &&
        nakshatraEnd.isBefore(daylightThird)) {
      start = nakshatraEnd;
      preferredEnd = daylightThird;
    } else if (day.tithiAtSunrise.number != 12) {
      start = nakshatraEnd;
      preferredEnd = null;
      preferredWindowStatus = 'after_nakshatra';
    }

    return ParanaResult(
      date: base.date,
      start: start,
      preferredEnd: preferredEnd,
      oneFifthEnd: base.oneFifthEnd,
      absoluteEnd: preferredEnd ?? base.absoluteEnd,
      preferredWindowStatus: preferredWindowStatus,
      fastDayType: base.fastDayType,
    );
  }

  DateTime _earlier(DateTime a, DateTime b) => a.isBefore(b) ? a : b;

  String _dateKey(DateTime date) {
    final y = date.year.toString().padLeft(4, '0');
    final m = date.month.toString().padLeft(2, '0');
    final d = date.day.toString().padLeft(2, '0');
    return '$y-$m-$d';
  }

  PanchangaDay? _dayByKey(List<PanchangaDay> days, String key) {
    for (final day in days) {
      if (_dateKey(day.date) == key) return day;
    }
    return null;
  }

  // ---- shifted-candidate-date detection (js/ekadashi-engine.js:74-81) ----

  /// True when the civil day *before* [day] began with Dashami at sunrise
  /// and Ekadashi started later that same sunrise-to-sunrise interval (so
  /// the fast is properly attributed to [day], not the earlier civil date
  /// that first showed Ekadashi at its own sunrise-to-arunodaya reading).
  /// Mirrors `isDashamiSunriseBeforePostSunriseEkadashi`
  /// (js/ekadashi-engine.js:79-81) + `hasTargetTithiBetweenSunrises`
  /// (js/ekadashi-engine.js:74-77).
  bool _isDashamiSunriseBeforePostSunriseEkadashi(
    PanchangaDay? previousDay,
    PanchangaDay day,
    int targetNumber,
  ) {
    if (previousDay == null) return false;
    if (previousDay.tithiAtSunrise.number !=
        _previousTithiNumber(targetNumber)) {
      return false;
    }
    return _search.tithiIntervalBetween(
          previousDay.sunrise,
          day.sunrise,
          targetNumber,
        ) !=
        null;
  }
}

/// Internal marker so [EkadashiClassifier._classifyEkadashiDay] can return
/// either an [EkadashiFast] or a "not suitable for fast" notice through one
/// dynamic return type without a sealed hierarchy that would leak into the
/// public two-case API of [EkadashiRangeResult].
class EkadashiNoFastMarker {
  const EkadashiNoFastMarker(this.notice);
  final EkadashiNoFast notice;
}

bool _isEkadashi(int number) => number == 11 || number == 26;

bool _isDvadashi(int number) => number == 12 || number == 27;

bool _isDashamiBeforeEkadashi(int arunodayaNumber, int sunriseNumber) {
  return (arunodayaNumber == 10 && sunriseNumber == 11) ||
      (arunodayaNumber == 25 && sunriseNumber == 26);
}

int _nextTithiNumber(int number) => number == 30 ? 1 : number + 1;

bool _isLessThanEkadashiInPaksha(int? number, int ekadashiNumber) {
  if (number == null) return false;
  return ekadashiNumber == 11
      ? (number >= 1 && number < 11)
      : (number >= 16 && number < 26);
}

bool _isDvadashiTestCandidate(int? previousNumber, int dvadashiNumber) {
  if (previousNumber == null) return false;
  return dvadashiNumber == 12
      ? (previousNumber == 10 || previousNumber == 11)
      : (previousNumber == 25 || previousNumber == 26);
}

int _previousTithiNumber(int number) => number == 1 ? 30 : number - 1;
