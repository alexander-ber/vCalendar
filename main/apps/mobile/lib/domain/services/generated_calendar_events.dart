import '../models/mobile_event.dart';
import '../models/panchanga_day.dart';

/// A handful of calendar entries the web engine generates directly in
/// js/calendar-engine.js with hardcoded bilingual text (not sourced from
/// `data/events/*.json`/SQLite, unlike every other event in the app):
/// Purushottama Masa boundary markers, the Bhishma Panchaka period notice,
/// and Sankranti (+ dependent) notices. Ported here as plain functions
/// returning [MobileEvent] so callers can treat them the same as any other
/// matched event.
class GeneratedCalendarEvents {
  const GeneratedCalendarEvents();

  static const _rashiNames = [
    'Mesha',
    'Vrishabha',
    'Mithuna',
    'Karka',
    'Simha',
    'Kanya',
    'Tula',
    'Vrischika',
    'Dhanus',
    'Makara',
    'Kumbha',
    'Mina',
  ];

  /// Mirrors js/calendar-engine.js:204-240 `addPurushottamaBoundaryEvents`.
  /// Call once per day with its immediate previous/next neighbor.
  List<MobileEvent> boundaryEventsFor({
    required PanchangaDay day,
    required PanchangaDay? previousDay,
    required PanchangaDay? nextDay,
    required bool isRu,
  }) {
    final events = <MobileEvent>[];
    if (day.masaType == 'adhika' && previousDay?.masaType != 'adhika') {
      events.add(
        _simpleEvent(
          id: 'purushottama_start_${_dateKey(day.date)}',
          type: 'purushottama_boundary',
          category: 'masa',
          name: isRu ? 'Начало Пурушоттама' : 'Start of Purushottama Masa',
          description: isRu
              ? 'Пурушоттама маса начинается по локальному календарному дню на восходе.'
              : 'Purushottama Masa begins according to the local sunrise-based calendar display.',
        ),
      );
    }
    if (day.masaType == 'adhika' && nextDay?.masaType != 'adhika') {
      events.add(
        _simpleEvent(
          id: 'purushottama_end_${_dateKey(day.date)}',
          type: 'purushottama_boundary',
          category: 'masa',
          name: isRu ? 'Окончание Пурушоттама' : 'End of Purushottama Masa',
          description: isRu
              ? 'Пурушоттама маса заканчивается после этого локального календарного дня.'
              : 'Purushottama Masa ends after this local calendar day.',
        ),
      );
    }
    return events;
  }

  /// Mirrors js/calendar-engine.js:346-388 `addBhishmaPanchakaActiveEvents`
  /// (the `hasBhishmaPanchakaEvent` de-dup check is the caller's
  /// responsibility here, since it depends on the full day's event list).
  bool isBhishmaPanchakaDay(PanchangaDay day) {
    final tithi = day.tithiAtSunrise.number;
    return day.normalMasaName == 'Damodara' &&
        day.tithiAtSunrise.paksha == 'Gaura' &&
        tithi >= 11 &&
        tithi <= 15;
  }

  MobileEvent bhishmaPanchakaActiveEvent({
    required PanchangaDay day,
    required bool isRu,
  }) {
    return _simpleEvent(
      id: 'bhishma_panchaka_active_${_dateKey(day.date)}',
      type: 'festival',
      category: 'festival',
      name: isRu ? 'Бхишма Панчака' : 'Bhishma Panchaka',
      description: isRu
          ? 'Идёт Бхишма Панчака: пятидневный обет от Дамодара/Картика Гаура Экадаши до Дамодара Пурнимы.'
          : 'Bhishma Panchaka is active: the five-day observance from Damodara/Kartika Gaura Ekadashi through Damodara Purnima.',
    );
  }

  /// Mirrors js/calendar-engine.js:265-280 `sankrantiEvent`.
  MobileEvent sankrantiEvent({
    required int toRashiIndex,
    required String dateKey,
    required bool isRu,
  }) {
    final rashi = toRashiIndex >= 0 && toRashiIndex < _rashiNames.length
        ? _rashiNames[toRashiIndex]
        : 'Rashi ${toRashiIndex + 1}';
    return _simpleEvent(
      id: 'sankranti_${rashi.toLowerCase()}_$dateKey',
      type: 'sankranti',
      category: 'sankranti',
      name: isRu ? '$rashi санкранти' : '$rashi Sankranti',
      description: isRu
          ? '$rashi санкранти. Дата показа рассчитана по GCAL-режиму noon-to-noon.'
          : '$rashi Sankranti. Display date uses GCAL noon-to-noon default.',
    );
  }

  /// Mirrors js/calendar-engine.js:282-314 `sankrantiDependentEvent`.
  /// [kind] is one of `ganga_sagara`, `tulasi_begin`, `tulasi_end`.
  MobileEvent sankrantiDependentEvent({
    required String kind,
    required String dateKey,
    required bool isRu,
  }) {
    final table = {
      'ganga_sagara': (
        en: 'Ganga Sagara Mela',
        ru: 'Ганга Сагара Мела',
        desc: 'Observed on Makara Sankranti.',
        descRu: 'Observed on Makara Sankranti.',
      ),
      'tulasi_begin': (
        en: 'Tulasi Jala Dan begins',
        ru: 'Начало Туласи Джала Дан',
        desc: 'Begins on Mesha Sankranti.',
        descRu: 'Begins on Mesha Sankranti.',
      ),
      'tulasi_end': (
        en: 'Tulasi Jala Dan ends',
        ru: 'Окончание Туласи Джала Дан',
        desc: 'Ends one day before Vrishabha Sankranti.',
        descRu: 'Ends one day before Vrishabha Sankranti.',
      ),
    }[kind]!;
    return _simpleEvent(
      id: 'sankranti_dependent_${kind}_$dateKey',
      type: 'sankranti_dependent',
      category: 'sankranti',
      name: isRu ? table.ru : table.en,
      description: isRu ? table.descRu : table.desc,
    );
  }

  MobileEvent _simpleEvent({
    required String id,
    required String type,
    required String category,
    required String name,
    required String description,
  }) {
    return MobileEvent(
      id: id,
      category: category,
      eventType: type,
      masa: '',
      masaType: null,
      paksha: '',
      tithi: '',
      naksatra: null,
      timingRule: null,
      gaudiyaMasa: null,
      anchorEventId: null,
      observanceOffsetDays: 0,
      disabled: false,
      allowInAdhika: true,
      priority: 100,
      name: name,
      shortDescription: description,
      fullDescription: null,
    );
  }

  String _dateKey(DateTime date) {
    final y = date.year.toString().padLeft(4, '0');
    final m = date.month.toString().padLeft(2, '0');
    final d = date.day.toString().padLeft(2, '0');
    return '$y-$m-$d';
  }
}
