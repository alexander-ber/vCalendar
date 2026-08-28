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
  });

  final DateTime date;
  final DateTime? start;
  final DateTime? preferredEnd;
  final DateTime? oneFifthEnd;
  final DateTime? absoluteEnd;
  final String? preferredWindowStatus;
  final String fastDayType;
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
    final paranaDate = fastDate.add(const Duration(days: 1));
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

    final dvadashiStart =
        search.tithiStartBefore(
          astronomy.sunrise,
          dvadashiNumber,
          maxHours: 48,
        ) ??
        astronomy.sunrise;
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

    final daylightMs = astronomy.sunset
        .difference(astronomy.sunrise)
        .inMilliseconds;
    final pratahEnd = astronomy.sunrise.add(
      Duration(milliseconds: (_pratahFraction * daylightMs).round()),
    );
    final oneFifthEnd = astronomy.sunrise.add(
      Duration(milliseconds: (_oneFifthFraction * daylightMs).round()),
    );

    final isNormal = fastDayType == _normalFastDayType;
    final isTrisprsa = _trisprsaFastDayTypes.contains(fastDayType);
    final isSunriseBegin = !isNormal;
    final dvadashiEndedBeforeSunrise = dvadashiEnd != null
        ? dvadashiEnd.isBefore(astronomy.sunrise)
        : true;

    final start = isSunriseBegin
        ? astronomy.sunrise
        : (hariVasaraEnd.isAfter(astronomy.sunrise)
              ? hariVasaraEnd
              : astronomy.sunrise);
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
    );
  }
}
