import 'package:timezone/timezone.dart' as tz;

import '../date_utils.dart';
import '../models/calendar_location.dart';
import '../rules/fact_functions.dart';
import 'panchanga_calculator.dart';

class ParanaResult {
  const ParanaResult({
    required this.date,
    required this.start,
    required this.preferredEnd,
    required this.oneFifthEnd,
    required this.absoluteEnd,
    required this.preferredWindowStatus,
    required this.fastDayType,
    this.hariVasaraEnd,
    this.dvadashiEnd,
    this.pratahEnd,
  });

  final DateTime date;
  final DateTime? start;
  final DateTime? preferredEnd;
  final DateTime? oneFifthEnd;
  final DateTime? absoluteEnd;
  final String? preferredWindowStatus;
  final String fastDayType;

  /// Diagnostic-only fields (mirrors js/parana-engine.js's `diagnostics`
  /// object) - not used by the core computation, only by UI that wants to
  /// show the formula's inputs. Null when [start] is null.
  final DateTime? hariVasaraEnd;
  final DateTime? dvadashiEnd;
  final DateTime? pratahEnd;
}

/// Computes the Ekadashi Parana (fast-breaking) time window. A direct,
/// line-cited port of `computeParana` in js/parana-engine.js (lines 67-134).
///
/// The JS function is one shared formula gated by which "bucket" the
/// classification falls into: which tithi (Dvadashi vs Trayodashi) parana
/// is measured against, whether it's the single normal_ekadashi case, and
/// whether it's one of the Trisprsa-family cases. Those bucket memberships
/// and the three timing fractions are declared as data in
/// `data/engine-rules.json`'s "parana" section and loaded here rather than
/// hardcoded, so widening a bucket is a JSON edit, not a Dart change - but
/// the arithmetic itself is sequential, not branch-table-shaped, so it
/// stays a hand-ported, doc-cited Dart function rather than forced into the
/// generic RuleCondition DSL (see apps/mobile/lib/domain/rules/).
///
/// Note: the JS caller (`buildEkadashiEvent` in js/ekadashi-engine.js) feeds
/// this function the event's `parana_type` (falling back to `fast_day_type`
/// only when `parana_type` is absent) - NOT always the same value as the
/// event's own classification/fast_day_type. Callers of [compute] must pass
/// whichever of those two the caller intends as the parana classification.
class ParanaEngine {
  ParanaEngine(Map<String, dynamic> engineRules)
    : _hariVasaraFraction = (engineRules['parana']['hari_vasara_fraction']
              as num)
          .toDouble(),
      _pratahFraction =
          (engineRules['parana']['pratah_fraction_of_daylight'] as num)
              .toDouble(),
      _oneFifthFraction =
          (engineRules['parana']['one_fifth_fraction_of_daylight'] as num)
              .toDouble(),
      _trayodashiFastDayTypes = Set<String>.from(
        engineRules['parana']['trayodashi_fast_day_types'] as List,
      ),
      _normalFastDayType =
          engineRules['parana']['normal_fast_day_type'] as String,
      _trisprsaFastDayTypes = Set<String>.from(
        engineRules['parana']['trisprsa_fast_day_types'] as List,
      );

  final double _hariVasaraFraction;
  final double _pratahFraction;
  final double _oneFifthFraction;
  final Set<String> _trayodashiFastDayTypes;
  final String _normalFastDayType;
  final Set<String> _trisprsaFastDayTypes;

  /// [fastDate] is the Ekadashi fast day (parana happens the day after).
  /// [ekadashiNumber] is 11 (Gaura Ekadashi) or 26 (Krishna Ekadashi).
  /// [fastDayType] is the parana classification bucket - see class doc.
  ParanaResult compute({
    required DateTime fastDate,
    required int ekadashiNumber,
    required String fastDayType,
    required CalendarLocation location,
    required PanchangaCalculator calculator,
  }) {
    final paranaDate = addCalendarDays(fastDate, 1);
    final astronomy = calculator.calculateDay(
      date: paranaDate,
      location: location,
    );
    final search = TithiBoundarySearch(calculator);

    final dvadashiNumber = ekadashiNumber == 11 ? 12 : 27;
    final trayodashiNumber = ekadashiNumber == 11 ? 13 : 28;
    final paranaTithiNumber = _trayodashiFastDayTypes.contains(fastDayType)
        ? trayodashiNumber
        : dvadashiNumber;

    // Dvadashi can start shortly after the parana day's own sunrise rather
    // than already being underway (e.g. when the fast was shifted a day
    // earlier under the SCS Math Ekadashi convention) - try backward
    // (already started) before forward (about to start).
    final dvadashiStart =
        search.tithiStartBefore(
          astronomy.sunrise,
          dvadashiNumber,
          maxHours: 48,
        ) ??
        search.tithiStartAfter(
          astronomy.sunrise,
          dvadashiNumber,
          maxHours: 48,
        ) ??
        astronomy.sunrise;
    // Same reasoning: the parana tithi may be about to start (forward
    // search) rather than already underway or already over (backward
    // search) - try forward first since it subsumes the already-underway
    // case too, then fall back to backward.
    final paranaTithiEnd =
        search.tithiEndAfter(astronomy.sunrise, paranaTithiNumber, maxHours: 48) ??
        search.tithiEndBefore(
          astronomy.sunrise,
          paranaTithiNumber,
          maxHours: 48,
        );

    if (paranaTithiEnd == null) {
      return ParanaResult(
        date: paranaDate,
        start: null,
        preferredEnd: null,
        oneFifthEnd: null,
        absoluteEnd: null,
        preferredWindowStatus: null,
        fastDayType: fastDayType,
      );
    }

    final dvadashiEnd = paranaTithiNumber == dvadashiNumber
        ? paranaTithiEnd
        : search.tithiEndBefore(
            astronomy.sunrise,
            dvadashiNumber,
            maxHours: 48,
          );

    final hariVasaraEnd = dvadashiEnd != null
        ? dvadashiStart.add(
            Duration(
              milliseconds:
                  (_hariVasaraFraction *
                          dvadashiEnd
                              .difference(dvadashiStart)
                              .inMilliseconds)
                      .round(),
            ),
          )
        : astronomy.sunrise;

    final isNormal = fastDayType == _normalFastDayType;
    final isTrisprsa = _trisprsaFastDayTypes.contains(fastDayType);
    final isSunriseBegin = !isNormal;

    // Hari-vasara can end on a later calendar day than paranaDate
    // (fastDate+1) - e.g. a fast shifted a day earlier under the SCS Math
    // Ekadashi convention can leave Dvadashi not yet underway on
    // paranaDate's own sunrise. The daylight-fraction limits (pratah/
    // one-fifth) belong to whichever day the parana actually happens on,
    // so re-fetch that day's astronomy instead of assuming it's always
    // paranaDate.
    var dayAstro = astronomy;
    if (!isSunriseBegin && hariVasaraEnd.isAfter(astronomy.sunrise)) {
      final hariVasaraLocal = tz.TZDateTime.from(
        hariVasaraEnd,
        tz.getLocation(location.timezone),
      );
      final hariVasaraDate = DateTime.utc(
        hariVasaraLocal.year,
        hariVasaraLocal.month,
        hariVasaraLocal.day,
      );
      if (hariVasaraDate != paranaDate) {
        final altAstro = calculator.calculateDay(
          date: hariVasaraDate,
          location: location,
        );
        dayAstro = altAstro;
      }
    }

    final daylightMs = dayAstro.sunset
        .difference(dayAstro.sunrise)
        .inMilliseconds;
    final pratahEnd = dayAstro.sunrise.add(
      Duration(milliseconds: (_pratahFraction * daylightMs).round()),
    );
    final oneFifthEnd = dayAstro.sunrise.add(
      Duration(milliseconds: (_oneFifthFraction * daylightMs).round()),
    );

    final dvadashiEndedBeforeSunrise = dvadashiEnd != null
        ? dvadashiEnd.isBefore(astronomy.sunrise)
        : true;

    final start = isSunriseBegin
        ? astronomy.sunrise
        : (hariVasaraEnd.isAfter(dayAstro.sunrise)
              ? hariVasaraEnd
              : dayAstro.sunrise);
    final preferredEndCandidate = isTrisprsa
        ? pratahEnd
        : (paranaTithiEnd.isBefore(pratahEnd) ? paranaTithiEnd : pratahEnd);
    final hasPreferredWindow = !preferredEndCandidate.isBefore(start);
    final absoluteEnd = (isTrisprsa || dvadashiEndedBeforeSunrise)
        ? pratahEnd
        : paranaTithiEnd;

    return ParanaResult(
      date: paranaDate,
      start: start,
      preferredEnd: hasPreferredWindow ? preferredEndCandidate : null,
      oneFifthEnd: oneFifthEnd,
      absoluteEnd: absoluteEnd,
      preferredWindowStatus: dvadashiEndedBeforeSunrise
          ? 'dvadashi_ended_before_sunrise'
          : (hasPreferredWindow
                ? 'available'
                : 'unavailable_after_hari_vasara'),
      fastDayType: fastDayType,
      hariVasaraEnd: hariVasaraEnd,
      dvadashiEnd: dvadashiEnd,
      pratahEnd: pratahEnd,
    );
  }

  /// Generic single-day-fast parana: sunrise to min(next tithi's end, 1/3 of
  /// daylight), with no Ekadashi-specific Hari-vasara/Trisprsa refinement -
  /// a direct port of js/parana-engine.js's `computeSimpleTithiParana`, for
  /// fasts like Sri Krishna Janmashtami's Ashtami that are not Ekadashi but
  /// use the identical fraction-based parana formula (same [_pratahFraction]/
  /// [_oneFifthFraction] constants as [compute] above).
  ParanaResult computeSimple({
    required DateTime fastDate,
    required int paranaTithiNumber,
    required CalendarLocation location,
    required PanchangaCalculator calculator,
  }) {
    final paranaDate = addCalendarDays(fastDate, 1);
    final astronomy = calculator.calculateDay(
      date: paranaDate,
      location: location,
    );
    final search = TithiBoundarySearch(calculator);

    final sunriseTithiNumber = calculator.tithiInfo(astronomy.sunrise).number;
    final paranaTithiEnd = sunriseTithiNumber == paranaTithiNumber
        ? search.tithiEndAfter(
            astronomy.sunrise,
            paranaTithiNumber,
            maxHours: 48,
          )
        : search.tithiEndBefore(
            astronomy.sunrise,
            paranaTithiNumber,
            maxHours: 48,
          );

    if (paranaTithiEnd == null) {
      return ParanaResult(
        date: paranaDate,
        start: astronomy.sunrise,
        preferredEnd: null,
        oneFifthEnd: null,
        absoluteEnd: null,
        preferredWindowStatus: null,
        fastDayType: 'single_day_fast',
      );
    }

    final daylightMs = astronomy.sunset
        .difference(astronomy.sunrise)
        .inMilliseconds;
    final pratahEnd = astronomy.sunrise.add(
      Duration(milliseconds: (_pratahFraction * daylightMs).round()),
    );
    final oneFifthEnd = astronomy.sunrise.add(
      Duration(milliseconds: (_oneFifthFraction * daylightMs).round()),
    );
    final tithiEndedBeforeSunrise = paranaTithiEnd.isBefore(astronomy.sunrise);

    return ParanaResult(
      date: paranaDate,
      start: astronomy.sunrise,
      preferredEnd: tithiEndedBeforeSunrise
          ? null
          : (paranaTithiEnd.isBefore(pratahEnd) ? paranaTithiEnd : pratahEnd),
      oneFifthEnd: oneFifthEnd,
      absoluteEnd: tithiEndedBeforeSunrise ? pratahEnd : paranaTithiEnd,
      preferredWindowStatus: tithiEndedBeforeSunrise
          ? 'tithi_ended_before_sunrise'
          : 'available',
      fastDayType: 'single_day_fast',
      pratahEnd: pratahEnd,
    );
  }
}
