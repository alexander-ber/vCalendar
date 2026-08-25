import 'dart:io';

import 'package:flutter/material.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:path_provider/path_provider.dart';

import '../../app/app_settings.dart';
import '../../app/app_theme.dart';
import '../../data/local/app_database.dart';
import '../../data/local/preferences_store.dart';
import '../../data/remote/content_update_service.dart';
import '../../data/repositories/mobile_calendar_repository.dart';
import '../../domain/models/calendar_location.dart';
import '../../domain/models/cached_calendar_day.dart';
import '../../domain/models/mobile_event.dart';
import '../../domain/models/month_day.dart';
import '../../domain/models/panchanga_day.dart';
import '../../domain/services/location_matcher_service.dart';
import '../../domain/services/month_grid_service.dart';
import '../../domain/services/jyotish_info_service.dart';
import '../../domain/services/panjika_yoga_service.dart';
import '../../domain/services/panchanga_calculator.dart';
import '../../domain/services/panchanga_formatter.dart';

const _eventFilterDefinitions = [
  _EventFilterDefinition(
    id: 'ekadashi',
    ruLabel: 'Экадаши',
    enLabel: 'Ekadashi',
  ),
  _EventFilterDefinition(
    id: 'festival',
    ruLabel: 'Праздники',
    enLabel: 'Festivals',
  ),
  _EventFilterDefinition(id: 'avatar', ruLabel: 'Аватары', enLabel: 'Avatars'),
  _EventFilterDefinition(
    id: 'divine_appearance',
    ruLabel: 'Явления Господа',
    enLabel: 'Divine appearances',
  ),
  _EventFilterDefinition(
    id: 'avatar_associate',
    ruLabel: 'Спутники Господа',
    enLabel: 'Lord’s associates',
  ),
  _EventFilterDefinition(
    id: 'mahaprabhu_parsada',
    ruLabel: 'Паршады Махапрабху',
    enLabel: 'Mahaprabhu parsadas',
  ),
  _EventFilterDefinition(
    id: 'vaishnava_appearance',
    ruLabel: 'Явления вайшнавов',
    enLabel: 'Vaishnava appearances',
  ),
  _EventFilterDefinition(
    id: 'vaishnava_disappearance',
    ruLabel: 'Уходы вайшнавов',
    enLabel: 'Vaishnava disappearances',
  ),
  _EventFilterDefinition(
    id: 'deity_temple',
    ruLabel: 'Божества / храмы',
    enLabel: 'Deities / temples',
  ),
  _EventFilterDefinition(id: 'other', ruLabel: 'Другое', enLabel: 'Other'),
];

const _webEventTonePriority = [
  'ekadashi',
  'parana',
  'vaishnava',
  'festival',
  'deity',
  'purushottama',
  'notice',
];

String? _webEventTone(MobileEvent event) {
  if (event.eventType == 'ekadashi') return 'ekadashi';
  if (event.eventType == 'ekadashi_notice') return 'notice';
  if (event.eventType == 'parana') return 'parana';
  if (event.eventType == 'purushottama_boundary') return 'purushottama';
  if (event.eventType == 'festival' || event.eventType == 'divine_appearance') {
    return 'festival';
  }
  if (event.eventType == 'vaishnava_appearance' ||
      event.eventType == 'vaishnava_disappearance') {
    return 'vaishnava';
  }
  if (event.eventType == 'deity_installation' ||
      event.eventType == 'temple_opening' ||
      event.category == 'deity_temple') {
    return 'deity';
  }
  return null;
}

class HomeScreen extends StatefulWidget {
  const HomeScreen({
    super.key,
    required this.settings,
    required this.onSettingsChanged,
  });

  final AppSettings settings;
  final ValueChanged<AppSettings> onSettingsChanged;

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final MonthGridService _monthGridService = const MonthGridService();
  final PanchangaCalculator _panchangaCalculator = const PanchangaCalculator();
  final LocationMatcherService _locationMatcherService =
      LocationMatcherService();
  final PreferencesStore _preferences = PreferencesStore();
  late final AppDatabase _database;
  late final MobileCalendarRepository _repository;
  late final ContentUpdateService _contentUpdateService;
  late Future<_HomeState> _state;
  late DateTime _visibleMonth;
  late DateTime _selectedDate;
  late DateTime _periodFrom;
  late DateTime _periodTo;
  final Map<String, PanchangaDay> _panchangaCache = {};
  CalendarLocation? _gpsLocation;
  String? _gpsNearestLocationId;

  bool get _isRu => widget.settings.lang == 'ru';

  @override
  void initState() {
    super.initState();
    final today = DateTime.now();
    _visibleMonth = DateTime(today.year, today.month);
    _selectedDate = DateTime(today.year, today.month, today.day);
    _periodFrom = DateTime(today.year, today.month);
    _periodTo = DateTime(today.year, today.month + 1, 0);
    _database = AppDatabase();
    _repository = MobileCalendarRepository(_database);
    _contentUpdateService = ContentUpdateService(_database);
    _state = _load(checkContentUpdates: true);
  }

  @override
  void didUpdateWidget(covariant HomeScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.settings.lang != widget.settings.lang ||
        oldWidget.settings.locationId != widget.settings.locationId) {
      _state = _load();
    }
  }

  Future<_HomeState> _load({bool checkContentUpdates = false}) async {
    if (checkContentUpdates && widget.settings.contentAutoUpdate) {
      await _checkStartupContentUpdates();
    }
    final summary = await _repository.loadSummary(lang: widget.settings.lang);
    final locations = await _repository.loadLocations(
      lang: widget.settings.lang,
    );
    final events = await _repository.loadRuleEvents(lang: widget.settings.lang);
    final languages = await _repository.loadAvailableLanguages();
    final glossary = await _repository.loadGlossary(lang: widget.settings.lang);
    final calendarCache = await _repository.loadCalendarCache(
      locationId: 'nabadwip',
      lang: widget.settings.lang,
      startYear: _visibleMonth.year - 1,
      endYear: _visibleMonth.year + 1,
    );
    return _HomeState(
      summary: summary,
      locations: locations,
      events: events,
      languages: languages,
      glossary: glossary,
      calendarCache: calendarCache,
    );
  }

  void _reload() {
    setState(() {
      _state = _load();
    });
  }

  void _changeSettings(AppSettings settings) {
    if (settings.locationId != widget.settings.locationId) {
      if (_gpsLocation != null &&
          settings.locationId != _gpsNearestLocationId) {
        _gpsLocation = null;
        _gpsNearestLocationId = null;
      }
      _panchangaCache.clear();
    }
    widget.onSettingsChanged(settings);
  }

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    final isTablet = width >= 700;

    return Scaffold(
      body: SafeArea(
        child: FutureBuilder<_HomeState>(
          future: _state,
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snapshot.hasError) {
              return _ErrorState(
                error: snapshot.error.toString(),
                onRetry: _reload,
              );
            }
            final state = snapshot.requireData;
            final storedLocation = _storedLocation(state.locations);
            final selectedLocation = _gpsLocation ?? storedLocation;
            final compactMode = widget.settings.compactMode && !isTablet;
            final monthDays = _monthGridService.buildMonth(
              month: _visibleMonth,
              weekStart: selectedLocation?.weekStart ?? 1,
            );
            final eventMap = selectedLocation == null
                ? <String, List<MobileEvent>>{}
                : _eventsForVisibleDays(
                    days: monthDays,
                    location: selectedLocation,
                    events: state.events,
                    calendarCache: state.calendarCache,
                  );
            final panchangaMonthDays = selectedLocation == null
                ? <PanchangaDay>[]
                : [
                    for (final day in monthDays)
                      if (day.inCurrentMonth)
                        _dayFor(
                          date: day.date,
                          location: selectedLocation,
                          state: state,
                        ),
                  ];
            final calendarDayTones = _calendarDayTones(
              panchangaDays: panchangaMonthDays,
              eventMap: eventMap,
            );
            final selectedPanchanga = selectedLocation == null
                ? null
                : _dayFor(
                    date: _selectedDate,
                    location: selectedLocation,
                    state: state,
                  );
            final nextSelectedPanchanga = selectedLocation == null
                ? null
                : _dayFor(
                    date: _selectedDate.add(const Duration(days: 1)),
                    location: selectedLocation,
                    state: state,
                  );
            final selectedEvents = eventMap[_dateKey(_selectedDate)] ?? [];

            return CustomScrollView(
              slivers: [
                SliverToBoxAdapter(
                  child: Padding(
                    padding: EdgeInsets.all(isTablet ? 28 : 16),
                    child: _Header(
                      isRu: _isRu,
                      onSearchTap: () => _openSearchSheet(
                        selectedLocation: selectedLocation,
                        events: state.events,
                      ),
                      onSettingsTap: () => _openSettingsSheet(
                        locations: state.locations,
                        selectedLocation: storedLocation,
                        exportLocation: selectedLocation,
                        events: state.events,
                        languages: state.languages,
                      ),
                    ),
                  ),
                ),
                SliverPadding(
                  padding: EdgeInsets.fromLTRB(
                    isTablet ? 28 : 16,
                    0,
                    isTablet ? 28 : 16,
                    32,
                  ),
                  sliver: SliverList.list(
                    children: [
                      if (selectedLocation == null) ...[
                        _LocationPromptCard(
                          onTap: () => _openSettingsSheet(
                            locations: state.locations,
                            selectedLocation: storedLocation,
                            exportLocation: selectedLocation,
                            events: state.events,
                            languages: state.languages,
                          ),
                          isRu: _isRu,
                        ),
                        const SizedBox(height: 16),
                      ],
                      _MonthCalendarCard(
                        month: _visibleMonth,
                        selectedDate: _selectedDate,
                        compactMode: compactMode,
                        weekStart: selectedLocation?.weekStart ?? 1,
                        isRu: _isRu,
                        days: monthDays,
                        eventCounts: {
                          for (final entry in calendarDayTones.entries)
                            entry.key: entry.value.length,
                        },
                        eventCategories: {
                          for (final entry in calendarDayTones.entries)
                            entry.key: entry.value.first,
                        },
                        onlyDaysWithEvents: widget.settings.onlyDaysWithEvents,
                        onMonthPickerRequested: () =>
                            _openMonthPicker(initialMonth: _visibleMonth),
                        onPreviousMonth: () {
                          setState(() {
                            _visibleMonth = DateTime(
                              _visibleMonth.year,
                              _visibleMonth.month - 1,
                            );
                          });
                        },
                        onNextMonth: () {
                          setState(() {
                            _visibleMonth = DateTime(
                              _visibleMonth.year,
                              _visibleMonth.month + 1,
                            );
                          });
                        },
                        onDaySelected: (date) {
                          setState(() => _selectedDate = date);
                        },
                      ),
                      const SizedBox(height: 16),
                      if (panchangaMonthDays.isNotEmpty) ...[
                        _MasaPeriodNoticeCard(
                          days: panchangaMonthDays,
                          location: selectedLocation,
                          calculateDay: (date, location) => _dayFor(
                            date: date,
                            location: location,
                            state: state,
                          ),
                          isRu: _isRu,
                        ),
                        const SizedBox(height: 16),
                      ],
                      AnimatedSwitcher(
                        duration: const Duration(milliseconds: 240),
                        switchInCurve: Curves.easeOutCubic,
                        switchOutCurve: Curves.easeInCubic,
                        transitionBuilder: (child, animation) {
                          final offset = Tween<Offset>(
                            begin: const Offset(0, 0.035),
                            end: Offset.zero,
                          ).animate(animation);
                          return FadeTransition(
                            opacity: animation,
                            child: SlideTransition(
                              position: offset,
                              child: child,
                            ),
                          );
                        },
                        child: _SelectedDayCard(
                          key: ValueKey(
                            'selected-${_dateKey(_selectedDate)}-${selectedLocation?.id}',
                          ),
                          date: _selectedDate,
                          location: selectedLocation,
                          events: selectedEvents,
                          panchanga: selectedPanchanga,
                          nextPanchanga: nextSelectedPanchanga,
                          bengaliSolarMonth: selectedPanchanga == null
                              ? null
                              : _panchangaCalculator.bengaliSolarMonth(
                                  selectedPanchanga.sunrise,
                                ),
                          isRu: _isRu,
                        ),
                      ),
                      const SizedBox(height: 16),
                      _SeedSummaryCard(summary: state.summary, isRu: _isRu),
                    ],
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }

  Future<void> _openSettingsSheet({
    required List<CalendarLocation> locations,
    required CalendarLocation? selectedLocation,
    required CalendarLocation? exportLocation,
    required List<MobileEvent> events,
    required List<String> languages,
  }) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (context) {
        return _SettingsSheet(
          settings: widget.settings,
          locations: locations,
          languages: languages,
          selectedLocation: selectedLocation,
          periodFrom: _periodFrom,
          periodTo: _periodTo,
          isRu: _isRu,
          onSettingsChanged: _changeSettings,
          onPeriodChanged: _setPeriod,
          onDetectLocation: () => _detectGpsLocation(locations),
          onCheckUpdates: _checkContentUpdates,
          onExportRequested: exportLocation == null
              ? null
              : (from, to) => _exportCalendar(
                  location: exportLocation,
                  events: events,
                  from: from,
                  to: to,
                ),
        );
      },
    );
  }

  Future<ContentUpdateResult> _checkContentUpdates() async {
    final result = await _contentUpdateService.checkAndInstall();
    await _preferences.markContentUpdateChecked(result.checkedAt);
    if (mounted) _reload();
    return result;
  }

  Future<void> _checkStartupContentUpdates() async {
    try {
      final result = await _contentUpdateService.checkAndInstall();
      await _preferences.markContentUpdateChecked(result.checkedAt);
    } catch (error) {
      await _preferences.markContentUpdateChecked(DateTime.now().toUtc());
      debugPrint('Startup content update skipped: $error');
    }
  }

  Future<void> _openSearchSheet({
    required CalendarLocation? selectedLocation,
    required List<MobileEvent> events,
  }) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (context) {
        return _EventSearchSheet(
          settings: widget.settings,
          events: events,
          isRu: _isRu,
          onSettingsChanged: _changeSettings,
          onJumpToEvent: selectedLocation == null
              ? null
              : (event) => _jumpToEvent(event, selectedLocation),
        );
      },
    );
  }

  Future<void> _openMonthPicker({required DateTime initialMonth}) async {
    final picked = await showModalBottomSheet<DateTime>(
      context: context,
      showDragHandle: true,
      builder: (context) =>
          _MonthYearPickerSheet(initialMonth: initialMonth, isRu: _isRu),
    );
    if (picked == null) return;
    setState(() {
      _visibleMonth = DateTime(picked.year, picked.month);
    });
  }

  void _setPeriod(DateTime from, DateTime to) {
    setState(() {
      _periodFrom = from;
      _periodTo = to;
      _visibleMonth = DateTime(from.year, from.month);
      _selectedDate = from;
    });
  }

  Future<String?> _exportCalendar({
    required CalendarLocation location,
    required List<MobileEvent> events,
    required DateTime from,
    required DateTime to,
  }) async {
    final lines = <String>[
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Sree Caitanya Sridhar Seva Ashram//vCalendar Mobile//EN',
      'CALSCALE:GREGORIAN',
    ];

    for (
      var date = DateTime(from.year, from.month, from.day);
      !date.isAfter(to);
      date = date.add(const Duration(days: 1))
    ) {
      final panchanga = _calculateDay(date: date, location: location);
      final matched = _matchEventsForDay(panchanga, events);
      for (final event in matched) {
        final stamp = DateTime.now().toUtc();
        lines
          ..add('BEGIN:VEVENT')
          ..add('UID:${event.id}-${_dateKey(date)}@vcalendar-mobile')
          ..add('DTSTAMP:${_icsDateTime(stamp)}')
          ..add('DTSTART;VALUE=DATE:${_icsDate(date)}')
          ..add(
            'DTEND;VALUE=DATE:${_icsDate(date.add(const Duration(days: 1)))}',
          )
          ..add('SUMMARY:${_icsText(event.name)}');
        final description = event.shortDescription ?? event.fullDescription;
        if (description != null && description.trim().isNotEmpty) {
          lines.add('DESCRIPTION:${_icsText(description)}');
        }
        lines.add('END:VEVENT');
      }
    }
    lines.add('END:VCALENDAR');

    final dir = await getApplicationDocumentsDirectory();
    final file = File(
      '${dir.path}/vcalendar_${_dateKey(from)}_${_dateKey(to)}.ics',
    );
    await file.writeAsString(lines.join('\r\n'), flush: true);
    return file.path;
  }

  String _icsDate(DateTime date) =>
      '${date.year.toString().padLeft(4, '0')}${date.month.toString().padLeft(2, '0')}${date.day.toString().padLeft(2, '0')}';

  String _icsDateTime(DateTime date) =>
      '${_icsDate(date)}T${date.hour.toString().padLeft(2, '0')}${date.minute.toString().padLeft(2, '0')}${date.second.toString().padLeft(2, '0')}Z';

  String _icsText(String value) {
    return value
        .replaceAll(r'\', r'\\')
        .replaceAll('\n', r'\n')
        .replaceAll(',', r'\,')
        .replaceAll(';', r'\;');
  }

  void _jumpToEvent(MobileEvent event, CalendarLocation location) {
    final year = _selectedDate.year;
    for (
      var date = DateTime(year);
      date.year == year;
      date = date.add(const Duration(days: 1))
    ) {
      final panchanga = _calculateDay(date: date, location: location);
      if (_matchEventsForDay(panchanga, [event], applyFilters: false).isEmpty) {
        continue;
      }
      setState(() {
        _visibleMonth = DateTime(date.year, date.month);
        _selectedDate = date;
        _periodFrom = DateTime(date.year, date.month);
        _periodTo = DateTime(date.year, date.month + 1, 0);
      });
      Navigator.of(context).maybePop();
      return;
    }
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          _isRu
              ? 'Событие не найдено в $year году для выбранного места.'
              : 'Event was not found in $year for the selected location.',
        ),
      ),
    );
  }

  Future<LocationMatchResult> _detectGpsLocation(
    List<CalendarLocation> locations,
  ) async {
    final result = await _locationMatcherService.detectNearest(locations);
    final gpsLocation = CalendarLocation(
      id: 'gps-${result.latitude.toStringAsFixed(5)}-${result.longitude.toStringAsFixed(5)}-${result.location.id}',
      name: _isRu ? 'Текущая GPS-позиция' : 'Current GPS position',
      countryName: '${result.location.name}, ${result.location.countryName}',
      timezone: result.timezone,
      latitude: result.latitude,
      longitude: result.longitude,
      weekStart: result.location.weekStart,
    );
    if (mounted) {
      setState(() {
        _gpsLocation = gpsLocation;
        _gpsNearestLocationId = result.location.id;
        _panchangaCache.clear();
      });
    }
    return result;
  }

  CalendarLocation? _storedLocation(List<CalendarLocation> locations) {
    if (locations.isEmpty) return null;
    return locations
            .where((item) => item.id == widget.settings.locationId)
            .firstOrNull ??
        locations.first;
  }

  Map<String, List<MobileEvent>> _eventsForVisibleDays({
    required List<MonthDay> days,
    required CalendarLocation location,
    required List<MobileEvent> events,
    required Map<String, CachedCalendarDay> calendarCache,
  }) {
    final result = <String, List<MobileEvent>>{};
    for (final day in days.where((item) => item.inCurrentMonth)) {
      final key = _dateKey(day.date);
      final cached = calendarCache[key];
      if (cached != null) {
        final cachedEvents = _enrichCachedEvents(cached.events, events)
            .where((event) {
              if (location.id == 'nabadwip') return true;
              return event.category != 'ekadashi';
            })
            .where(_eventAllowedBySettings)
            .toList(growable: false);
        if (cachedEvents.isNotEmpty) {
          result[key] = cachedEvents;
        }
        if (location.id == 'nabadwip') continue;
      }
      final panchanga = _calculateDay(date: day.date, location: location);
      final matched = _matchEventsForDay(panchanga, events);
      if (matched.isNotEmpty) {
        final localEvents = cached == null
            ? matched
            : matched.where((event) => event.category == 'ekadashi');
        final merged = <String, MobileEvent>{
          for (final event in [...?result[key], ...localEvents])
            event.id: event,
        }.values.toList(growable: false);
        if (merged.isNotEmpty) result[key] = merged;
      }
    }
    return result;
  }

  List<MobileEvent> _enrichCachedEvents(
    List<MobileEvent> cachedEvents,
    List<MobileEvent> seedEvents,
  ) {
    final seedById = {for (final event in seedEvents) event.id: event};
    return cachedEvents
        .map((event) => _mergeCachedEvent(event, seedById[event.id]))
        .toList(growable: false);
  }

  MobileEvent _mergeCachedEvent(MobileEvent cached, MobileEvent? seed) {
    if (seed == null) return cached;
    return MobileEvent(
      id: cached.id,
      category: cached.category,
      eventType: cached.eventType,
      masa: cached.masa,
      masaType: cached.masaType,
      paksha: cached.paksha,
      tithi: cached.tithi,
      allowInAdhika: cached.allowInAdhika,
      priority: cached.priority,
      name: cached.name,
      shortDescription: cached.shortDescription ?? seed.shortDescription,
      fullDescription: cached.fullDescription ?? seed.fullDescription,
    );
  }

  List<MobileEvent> _matchEventsForDay(
    PanchangaDay panchanga,
    List<MobileEvent> events, {
    bool applyFilters = true,
  }) {
    final tithi = _tithiShortName(panchanga.tithiAtSunrise.number);
    return events
        .where((event) {
          if (applyFilters && !_eventAllowedBySettings(event)) return false;
          if (event.masaType == 'adhika' && panchanga.masaType != 'adhika') {
            return false;
          }
          if (event.masa != '*' &&
              event.masa != panchanga.masa &&
              event.masa != panchanga.normalMasaName) {
            return false;
          }
          if (event.paksha != panchanga.tithiAtSunrise.paksha) return false;
          if (event.tithi != tithi) return false;
          if (panchanga.masaType == 'adhika' && !event.allowInAdhika) {
            return false;
          }
          return true;
        })
        .toList(growable: false);
  }

  bool _eventAllowedBySettings(MobileEvent event) {
    final filters = widget.settings.enabledEventCategories;
    if (filters.isEmpty) return true;
    return filters.contains(_eventFilterType(event)) ||
        filters.contains(event.category) ||
        filters.contains(_eventCategoryGroup(event.category));
  }

  Map<String, List<String>> _calendarDayTones({
    required List<PanchangaDay> panchangaDays,
    required Map<String, List<MobileEvent>> eventMap,
  }) {
    final tonesByDate = <String, List<String>>{};
    for (final panchanga in panchangaDays) {
      final key = _dateKey(panchanga.date);
      final events = eventMap[key];
      if (events != null && events.isNotEmpty) {
        final tones = _eventTones(events);
        if (tones.isNotEmpty) {
          tonesByDate[key] = tones;
        }
      }
    }
    return tonesByDate;
  }

  List<String> _eventTones(List<MobileEvent> events) {
    final tones = events.map(_webEventTone).whereType<String>().toSet();
    return [
      for (final tone in _webEventTonePriority)
        if (tones.contains(tone)) tone,
    ];
  }

  String _eventFilterType(MobileEvent event) {
    if (event.eventType == 'ekadashi' || event.eventType == 'ekadashi_notice') {
      return 'ekadashi';
    }
    if (event.eventType == 'parana') return 'parana';
    if (event.eventType == 'purushottama_boundary') return 'purushottama';
    if (event.eventType == 'divine_appearance') return 'divineAppearance';
    if (event.eventType == 'vaishnava_appearance') {
      return 'vaishnavaAppearance';
    }
    if (event.eventType == 'vaishnava_disappearance') {
      return 'vaishnavaDisappearance';
    }
    if (event.eventType == 'deity_installation' ||
        event.eventType == 'temple_opening' ||
        event.category == 'deity_temple') {
      return 'deityTemple';
    }
    return 'festival';
  }

  String _eventCategoryGroup(String category) {
    if (category == 'ekadashi') return 'ekadashi';
    if (category.contains('appearance')) return 'appearance';
    if (category.contains('disappearance')) return 'disappearance';
    if (category == 'avatar' ||
        category == 'avatar_associate' ||
        category == 'festival' ||
        category == 'mahaprabhu_parsada') {
      return 'festival';
    }
    if (category == 'deity_temple') return 'deity_temple';
    return 'other';
  }

  String _tithiShortName(int number) {
    const names = [
      'Pratipat',
      'Dvitiya',
      'Tritiya',
      'Chaturthi',
      'Panchami',
      'Shashthi',
      'Saptami',
      'Ashtami',
      'Navami',
      'Dashami',
      'Ekadashi',
      'Dvadashi',
      'Trayodashi',
      'Chaturdashi',
      'Purnima',
      'Pratipat',
      'Dvitiya',
      'Tritiya',
      'Chaturthi',
      'Panchami',
      'Shashthi',
      'Saptami',
      'Ashtami',
      'Navami',
      'Dashami',
      'Ekadashi',
      'Dvadashi',
      'Trayodashi',
      'Chaturdashi',
      'Amavasya',
    ];
    return names[number - 1];
  }

  String _dateKey(DateTime date) =>
      '${date.year.toString().padLeft(4, '0')}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';

  PanchangaDay _calculateDay({
    required DateTime date,
    required CalendarLocation location,
  }) {
    final key = '${location.id}:${_dateKey(date)}';
    final cached = _panchangaCache[key];
    if (cached != null) return cached;
    final calculated = _panchangaCalculator.calculateDay(
      date: date,
      location: location,
    );
    _panchangaCache[key] = calculated;
    return calculated;
  }

  PanchangaDay _dayFor({
    required DateTime date,
    required CalendarLocation location,
    required _HomeState state,
  }) {
    if (location.id == 'nabadwip') {
      return state.calendarCache[_dateKey(date)]?.panchanga ??
          _calculateDay(date: date, location: location);
    }
    return _calculateDay(date: date, location: location);
  }
}

class _Header extends StatelessWidget {
  const _Header({
    required this.isRu,
    required this.onSearchTap,
    required this.onSettingsTap,
  });

  final bool isRu;
  final VoidCallback onSearchTap;
  final VoidCallback onSettingsTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Image.asset(
              'assets/images/scsashram-logo.png',
              width: 66,
              height: 66,
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  _HeaderTitleLine(
                    lines: isRu
                        ? const ['Вайшнавский', 'календарь']
                        : const ['Vaishnava', 'Calendar'],
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            _AnimatedHeaderIconButton(
              tooltip: isRu ? 'Поиск' : 'Search',
              onPressed: onSearchTap,
              icon: const Icon(Icons.search),
              spin: false,
            ),
            const SizedBox(width: 6),
            _AnimatedHeaderIconButton(
              tooltip: isRu ? 'Настройки' : 'Settings',
              onPressed: onSettingsTap,
              icon: const Icon(Icons.settings),
              spin: true,
            ),
          ],
        ),
      ),
    );
  }
}

class _AnimatedHeaderIconButton extends StatefulWidget {
  const _AnimatedHeaderIconButton({
    required this.tooltip,
    required this.onPressed,
    required this.icon,
    required this.spin,
  });

  final String tooltip;
  final VoidCallback onPressed;
  final Icon icon;
  final bool spin;

  @override
  State<_AnimatedHeaderIconButton> createState() =>
      _AnimatedHeaderIconButtonState();
}

class _AnimatedHeaderIconButtonState extends State<_AnimatedHeaderIconButton> {
  double _turns = 0;
  double _scale = 1;

  void _tap() {
    setState(() {
      _turns += widget.spin ? 1 : 0.0;
      _scale = 0.82;
    });
    Future<void>.delayed(const Duration(milliseconds: 130), () {
      if (mounted) setState(() => _scale = 1);
    });
    Future<void>.delayed(const Duration(milliseconds: 150), () {
      if (mounted) widget.onPressed();
    });
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedScale(
      scale: _scale,
      duration: const Duration(milliseconds: 180),
      curve: Curves.easeOutBack,
      child: IconButton.filledTonal(
        tooltip: widget.tooltip,
        onPressed: _tap,
        icon: AnimatedRotation(
          turns: _turns,
          duration: const Duration(milliseconds: 520),
          curve: Curves.easeOutBack,
          child: widget.icon,
        ),
      ),
    );
  }
}

class _HeaderTitleLine extends StatelessWidget {
  const _HeaderTitleLine({required this.lines});

  final List<String> lines;

  @override
  Widget build(BuildContext context) {
    return FittedBox(
      fit: BoxFit.scaleDown,
      alignment: Alignment.centerLeft,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (final line in lines)
            Text(
              line,
              maxLines: 1,
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w900,
                height: 0.98,
              ),
            ),
        ],
      ),
    );
  }
}

class _SettingsSheet extends StatefulWidget {
  const _SettingsSheet({
    required this.settings,
    required this.locations,
    required this.languages,
    required this.selectedLocation,
    required this.periodFrom,
    required this.periodTo,
    required this.isRu,
    required this.onSettingsChanged,
    required this.onPeriodChanged,
    required this.onDetectLocation,
    required this.onCheckUpdates,
    required this.onExportRequested,
  });

  final AppSettings settings;
  final List<CalendarLocation> locations;
  final List<String> languages;
  final CalendarLocation? selectedLocation;
  final DateTime periodFrom;
  final DateTime periodTo;
  final bool isRu;
  final ValueChanged<AppSettings> onSettingsChanged;
  final void Function(DateTime from, DateTime to) onPeriodChanged;
  final Future<LocationMatchResult> Function() onDetectLocation;
  final Future<ContentUpdateResult> Function() onCheckUpdates;
  final Future<String?> Function(DateTime from, DateTime to)? onExportRequested;

  @override
  State<_SettingsSheet> createState() => _SettingsSheetState();
}

class _SettingsSheetState extends State<_SettingsSheet> {
  late AppSettings _settings;
  late DateTime _periodFrom;
  late DateTime _periodTo;
  bool _detectingLocation = false;
  bool _checkingUpdates = false;
  String? _locationStatus;
  String? _updateStatus;
  late final Future<PackageInfo> _packageInfoFuture;
  bool get _isRu => _settings.lang == 'ru';

  @override
  void initState() {
    super.initState();
    _settings = widget.settings;
    _periodFrom = widget.periodFrom;
    _periodTo = widget.periodTo;
    _packageInfoFuture = PackageInfo.fromPlatform();
  }

  void _change(AppSettings settings) {
    setState(() => _settings = settings);
    widget.onSettingsChanged(settings);
  }

  String _themeLabel(AppThemeMode mode) {
    return switch (mode) {
      AppThemeMode.day => _isRu ? 'День' : 'Day',
      AppThemeMode.night => _isRu ? 'Ночь' : 'Night',
      AppThemeMode.sepia => _isRu ? 'Серпия' : 'Sepia',
      AppThemeMode.ocean => _isRu ? 'Океан' : 'Ocean',
      AppThemeMode.forest => _isRu ? 'Лес' : 'Forest',
      AppThemeMode.lotus => _isRu ? 'Лотос' : 'Lotus',
      AppThemeMode.icon => _isRu ? 'Иконка' : 'Icon',
    };
  }

  String _intervalLabel(int hours) {
    if (!_isRu) {
      if (hours < 24) return '${hours}h';
      return '${hours ~/ 24}d';
    }
    if (hours < 24) return '$hours ч';
    return '${hours ~/ 24} д';
  }

  List<_LocationOption> _groupedLocationOptions() {
    final options = <_LocationOption>[];
    String? currentGroup;
    for (final location in widget.locations) {
      final group = location.countryName.trim().isEmpty
          ? (_isRu ? 'Другие' : 'Other')
          : location.countryName.trim();
      if (group != currentGroup) {
        currentGroup = group;
        options.add(_LocationOption.header(group));
      }
      options.add(_LocationOption.location(location));
    }
    return options;
  }

  String _locationCityLabel(CalendarLocation location) {
    final name = location.name.trim();
    final country = location.countryName.trim();
    if (country.isEmpty) return name;
    final suffix = ', $country';
    if (name.endsWith(suffix)) {
      return name.substring(0, name.length - suffix.length).trim();
    }
    return name;
  }

  String _locationFullLabel(CalendarLocation location) {
    final city = _locationCityLabel(location);
    final country = location.countryName.trim();
    if (country.isEmpty) return city;
    return '$city, $country';
  }

  @override
  Widget build(BuildContext context) {
    final bottomPadding = MediaQuery.viewInsetsOf(context).bottom;
    final locationOptions = _groupedLocationOptions();

    return SafeArea(
      child: SingleChildScrollView(
        padding: EdgeInsets.fromLTRB(20, 4, 20, bottomPadding + 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    _isRu ? 'Настройки' : 'Settings',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontSize: 18,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
                IconButton(
                  tooltip: _isRu ? 'Закрыть' : 'Close',
                  onPressed: () => Navigator.of(context).pop(),
                  icon: const Icon(Icons.close),
                ),
              ],
            ),
            const SizedBox(height: 12),
            _SettingsGroup(
              title: _isRu ? 'Вид' : 'View',
              children: [
                Text(_isRu ? 'Язык' : 'Language'),
                const SizedBox(height: 8),
                SegmentedButton<String>(
                  showSelectedIcon: false,
                  segments: [
                    for (final lang in widget.languages)
                      ButtonSegment(
                        value: lang,
                        label: Text(lang.toUpperCase()),
                      ),
                  ],
                  selected: {
                    widget.languages.contains(_settings.lang)
                        ? _settings.lang
                        : widget.languages.first,
                  },
                  onSelectionChanged: (value) {
                    _change(_settings.copyWith(lang: value.first));
                  },
                ),
                const SizedBox(height: 14),
                SwitchListTile.adaptive(
                  value: _settings.compactMode,
                  onChanged: (value) {
                    _change(_settings.copyWith(compactMode: value));
                  },
                  title: Text(_isRu ? 'Компактный вид' : 'Compact view'),
                  contentPadding: EdgeInsets.zero,
                ),
                const SizedBox(height: 8),
                Text(_isRu ? 'Тема' : 'Theme'),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: AppThemeMode.values.map((mode) {
                    return ChoiceChip(
                      label: Text(_themeLabel(mode)),
                      selected: _settings.themeMode == mode,
                      onSelected: (_) {
                        _change(_settings.copyWith(themeMode: mode));
                      },
                    );
                  }).toList(),
                ),
                const SizedBox(height: 14),
                Text(_isRu ? 'Размер текста' : 'Text size'),
                const SizedBox(height: 8),
                SegmentedButton<double>(
                  showSelectedIcon: false,
                  segments: const [
                    ButtonSegment(value: 0.94, label: Text('A')),
                    ButtonSegment(value: 1, label: Text('A+')),
                    ButtonSegment(value: 1.12, label: Text('A++')),
                  ],
                  selected: {_settings.fontScale},
                  onSelectionChanged: (value) {
                    _change(_settings.copyWith(fontScale: value.first));
                  },
                ),
              ],
            ),
            const SizedBox(height: 12),
            _SettingsGroup(
              title: _isRu ? 'Параметры' : 'Main controls',
              children: [
                Text(_isRu ? 'Место' : 'Location'),
                const SizedBox(height: 8),
                DropdownButtonFormField<String>(
                  isExpanded: true,
                  initialValue:
                      widget.selectedLocation?.id ?? widget.settings.locationId,
                  selectedItemBuilder: (context) => [
                    for (final option in locationOptions)
                      Align(
                        alignment: AlignmentDirectional.centerStart,
                        child: option.location == null
                            ? const SizedBox.shrink()
                            : Text(
                                _locationFullLabel(option.location!),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                      ),
                  ],
                  items: [
                    for (final option in locationOptions)
                      if (option.location == null)
                        DropdownMenuItem<String>(
                          value: option.headerValue,
                          enabled: false,
                          child: Text(
                            option.label,
                            style: Theme.of(context).textTheme.labelLarge
                                ?.copyWith(
                                  fontWeight: FontWeight.w900,
                                  color: Theme.of(
                                    context,
                                  ).extension<VCalendarColors>()!.mutedText,
                                ),
                          ),
                        )
                      else
                        DropdownMenuItem<String>(
                          value: option.location!.id,
                          child: Padding(
                            padding: const EdgeInsetsDirectional.only(
                              start: 14,
                            ),
                            child: Text(
                              _locationCityLabel(option.location!),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ),
                  ],
                  onChanged: (value) {
                    if (value == null || value.startsWith('__group_')) return;
                    _change(_settings.copyWith(locationId: value));
                  },
                ),
                const SizedBox(height: 10),
                FilledButton.tonalIcon(
                  onPressed: _detectingLocation ? null : _detectLocation,
                  icon: _detectingLocation
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.my_location),
                  label: Text(
                    _isRu
                        ? 'Рассчитать по текущей GPS-позиции'
                        : 'Calculate by current GPS position',
                  ),
                ),
                if (_locationStatus != null) ...[
                  const SizedBox(height: 8),
                  Text(
                    _locationStatus!,
                    style: TextStyle(
                      color: Theme.of(
                        context,
                      ).extension<VCalendarColors>()!.mutedText,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
                const SizedBox(height: 14),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => _pickPeriodDate(isFrom: true),
                        child: Text(
                          '${_isRu ? 'С' : 'From'} ${_dateButtonLabel(_periodFrom)}',
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => _pickPeriodDate(isFrom: false),
                        child: Text(
                          '${_isRu ? 'По' : 'To'} ${_dateButtonLabel(_periodTo)}',
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    OutlinedButton(
                      onPressed: _setThisWeek,
                      child: Text(_isRu ? 'Неделя' : 'This week'),
                    ),
                    OutlinedButton(
                      onPressed: _setThisMonth,
                      child: Text(_isRu ? 'Месяц' : 'This month'),
                    ),
                    OutlinedButton(
                      onPressed: _setThisYear,
                      child: Text(_isRu ? 'Год' : 'Full year'),
                    ),
                    FilledButton.tonal(
                      onPressed: _exportCalendar,
                      child: Text(
                        _isRu ? 'Экспорт в календарь' : 'Export calendar',
                      ),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 12),
            _SettingsGroup(
              title: _isRu ? 'Обновления' : 'Updates',
              children: [
                FutureBuilder<PackageInfo>(
                  future: _packageInfoFuture,
                  builder: (context, snapshot) {
                    final packageInfo = snapshot.data;
                    final version = packageInfo == null
                        ? '0.1.0+1'
                        : '${packageInfo.version}+${packageInfo.buildNumber}';
                    return Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 12,
                      ),
                      decoration: BoxDecoration(
                        color: Theme.of(
                          context,
                        ).colorScheme.surfaceContainerHighest,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: Theme.of(context).colorScheme.outline,
                        ),
                      ),
                      child: Text(
                        _isRu
                            ? 'Версия приложения: $version'
                            : 'App version: $version',
                        style: const TextStyle(fontWeight: FontWeight.w900),
                      ),
                    );
                  },
                ),
                const SizedBox(height: 12),
                SwitchListTile.adaptive(
                  value: _settings.contentAutoUpdate,
                  onChanged: (value) {
                    _change(_settings.copyWith(contentAutoUpdate: value));
                  },
                  title: Text(
                    _isRu ? 'Проверять автоматически' : 'Check automatically',
                  ),
                  contentPadding: EdgeInsets.zero,
                ),
                const SizedBox(height: 8),
                Text(_isRu ? 'Интервал проверки' : 'Check interval'),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (final hours in const [6, 12, 24, 72])
                      ChoiceChip(
                        label: Text(_intervalLabel(hours)),
                        selected: _settings.contentUpdateIntervalHours == hours,
                        onSelected: (_) {
                          _change(
                            _settings.copyWith(
                              contentUpdateIntervalHours: hours,
                            ),
                          );
                        },
                      ),
                  ],
                ),
                const SizedBox(height: 14),
                Text(
                  _isRu
                      ? 'Языки, события и биографии можно обновлять из удалённой папки без пересборки приложения.'
                      : 'Languages, events, and biographies can be updated from a remote folder without rebuilding the app.',
                  style: TextStyle(
                    color: Theme.of(
                      context,
                    ).extension<VCalendarColors>()!.mutedText,
                  ),
                ),
                const SizedBox(height: 10),
                FilledButton.icon(
                  onPressed: _checkingUpdates ? null : _checkUpdates,
                  icon: _checkingUpdates
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.sync),
                  label: Text(_isRu ? 'Проверить обновления' : 'Check updates'),
                ),
                if (_updateStatus != null) ...[
                  const SizedBox(height: 8),
                  Text(
                    _updateStatus!,
                    style: TextStyle(
                      color: Theme.of(
                        context,
                      ).extension<VCalendarColors>()!.mutedText,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _detectLocation() async {
    setState(() {
      _detectingLocation = true;
      _locationStatus = null;
    });
    try {
      final result = await widget.onDetectLocation();
      _change(_settings.copyWith(locationId: result.location.id));
      setState(() {
        final coords =
            '${result.latitude.toStringAsFixed(5)}, ${result.longitude.toStringAsFixed(5)}';
        final timezoneSource = result.timezoneFromNearestLocation
            ? (_isRu
                  ? 'fallback от ближайшего города'
                  : 'nearest-city fallback')
            : (_isRu ? 'по координатам' : 'by coordinates');
        _locationStatus = _isRu
            ? 'Расчёт по GPS-координатам: $coords. Часовой пояс: ${result.timezone} ($timezoneSource). Ближайший город: ${result.location.name}, ${result.location.countryName} (${result.distanceKm.toStringAsFixed(1)} км).'
            : 'Calculating by GPS coordinates: $coords. Timezone: ${result.timezone} ($timezoneSource). Nearest city: ${result.location.name}, ${result.location.countryName} (${result.distanceKm.toStringAsFixed(1)} km).';
      });
    } catch (error) {
      setState(() {
        _locationStatus = _isRu
            ? 'GPS не сработал: $error'
            : 'GPS did not work: $error';
      });
    } finally {
      if (mounted) setState(() => _detectingLocation = false);
    }
  }

  Future<void> _checkUpdates() async {
    setState(() {
      _checkingUpdates = true;
      _updateStatus = null;
    });
    try {
      final result = await widget.onCheckUpdates();
      setState(() {
        _updateStatus = result.installedFiles == 0
            ? (_isRu ? 'Новых обновлений нет.' : 'No new updates.')
            : (_isRu
                  ? 'Обновлено файлов пакетов: ${result.installedFiles}.'
                  : 'Updated package files: ${result.installedFiles}.');
      });
    } catch (error) {
      setState(() {
        _updateStatus = _isRu
            ? 'Не удалось проверить обновления: $error'
            : 'Could not check updates: $error';
      });
    } finally {
      if (mounted) setState(() => _checkingUpdates = false);
    }
  }

  Future<void> _pickPeriodDate({required bool isFrom}) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: isFrom ? _periodFrom : _periodTo,
      firstDate: DateTime(1900),
      lastDate: DateTime(2100),
    );
    if (picked == null) return;
    setState(() {
      if (isFrom) {
        _periodFrom = picked;
        if (_periodTo.isBefore(_periodFrom)) _periodTo = _periodFrom;
      } else {
        _periodTo = picked;
        if (_periodFrom.isAfter(_periodTo)) _periodFrom = _periodTo;
      }
    });
    widget.onPeriodChanged(_periodFrom, _periodTo);
  }

  void _setThisWeek() {
    final today = DateTime.now();
    final from = today.subtract(Duration(days: today.weekday - 1));
    final to = from.add(const Duration(days: 6));
    _setPeriod(from, to);
  }

  void _setThisMonth() {
    final today = DateTime.now();
    _setPeriod(
      DateTime(today.year, today.month),
      DateTime(today.year, today.month + 1, 0),
    );
  }

  void _setThisYear() {
    final today = DateTime.now();
    _setPeriod(DateTime(today.year), DateTime(today.year, 12, 31));
  }

  void _setPeriod(DateTime from, DateTime to) {
    setState(() {
      _periodFrom = from;
      _periodTo = to;
    });
    widget.onPeriodChanged(from, to);
    Navigator.of(context).maybePop();
  }

  Future<void> _exportCalendar() async {
    final export = widget.onExportRequested;
    if (export == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(_isRu ? 'Выберите место.' : 'Choose a location.'),
        ),
      );
      return;
    }
    widget.onPeriodChanged(_periodFrom, _periodTo);
    final path = await export(_periodFrom, _periodTo);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          path == null
              ? (_isRu ? 'Экспорт не выполнен.' : 'Export failed.')
              : (_isRu ? 'ICS сохранён: $path' : 'ICS saved: $path'),
        ),
      ),
    );
  }

  String _dateButtonLabel(DateTime date) {
    return '${date.day.toString().padLeft(2, '0')}.${date.month.toString().padLeft(2, '0')}.${date.year}';
  }
}

class _EventSearchSheet extends StatefulWidget {
  const _EventSearchSheet({
    required this.settings,
    required this.events,
    required this.isRu,
    required this.onSettingsChanged,
    required this.onJumpToEvent,
  });

  final AppSettings settings;
  final List<MobileEvent> events;
  final bool isRu;
  final ValueChanged<AppSettings> onSettingsChanged;
  final ValueChanged<MobileEvent>? onJumpToEvent;

  @override
  State<_EventSearchSheet> createState() => _EventSearchSheetState();
}

class _EventSearchSheetState extends State<_EventSearchSheet> {
  late AppSettings _settings;
  String? _selectedEventId;
  String? _selectedVaishnavaEventId;

  bool get _isRu => _settings.lang == 'ru';

  @override
  void initState() {
    super.initState();
    _settings = widget.settings;
  }

  @override
  Widget build(BuildContext context) {
    final bottomPadding = MediaQuery.viewInsetsOf(context).bottom;

    return SafeArea(
      child: SingleChildScrollView(
        padding: EdgeInsets.fromLTRB(20, 4, 20, bottomPadding + 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    _isRu ? 'Поиск события' : 'Event finder',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontSize: 18,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
                IconButton(
                  tooltip: _isRu ? 'Закрыть' : 'Close',
                  onPressed: () => Navigator.of(context).pop(),
                  icon: const Icon(Icons.close),
                ),
              ],
            ),
            const SizedBox(height: 12),
            _SettingsGroup(
              title: _isRu ? 'Событие' : 'Event',
              children: [
                _SearchableSelectField<String>(
                  value: _selectedEventId,
                  hint: _isRu ? 'Выберите событие' : 'Choose event',
                  searchHint: _isRu ? 'Название события' : 'Event name',
                  emptyText: _isRu ? 'Не найдено' : 'Nothing found',
                  options: [
                    for (final event in widget.events)
                      _SearchSelectOption(value: event.id, label: event.name),
                  ],
                  onSelected: (value) {
                    setState(() => _selectedEventId = value);
                  },
                ),
                const SizedBox(height: 12),
                SegmentedButton<String>(
                  showSelectedIcon: false,
                  segments: [
                    ButtonSegment(
                      value: 'any',
                      label: Text(_isRu ? 'Все' : 'All'),
                    ),
                    ButtonSegment(
                      value: 'appearance',
                      label: Text(_isRu ? 'Явление' : 'Appearance'),
                    ),
                    ButtonSegment(
                      value: 'disappearance',
                      label: Text(_isRu ? 'Уход' : 'Disappearance'),
                    ),
                  ],
                  selected: {_settings.vaishnavaEventKind},
                  onSelectionChanged: (value) {
                    final next = _settings.copyWith(
                      vaishnavaEventKind: value.first,
                    );
                    setState(() {
                      _settings = next;
                      _selectedVaishnavaEventId = null;
                    });
                    widget.onSettingsChanged(next);
                  },
                ),
                const SizedBox(height: 12),
                _SearchableSelectField<String>(
                  value: _selectedVaishnavaEventId,
                  hint: _isRu ? 'Выберите вайшнава' : 'Choose Vaishnava',
                  searchHint: _isRu ? 'Имя вайшнава' : 'Vaishnava name',
                  emptyText: _isRu ? 'Не найдено' : 'Nothing found',
                  options: [
                    for (final event in _vaishnavaEvents())
                      _SearchSelectOption(value: event.id, label: event.name),
                  ],
                  onSelected: (value) {
                    setState(() => _selectedVaishnavaEventId = value);
                  },
                ),
                const SizedBox(height: 12),
                FilledButton.icon(
                  onPressed: _jumpToSelectedEvent,
                  icon: const Icon(Icons.search),
                  label: Text(_isRu ? 'Найти в году' : 'Find in year'),
                ),
              ],
            ),
            const SizedBox(height: 12),
            _SettingsGroup(
              title: _isRu ? 'Фильтры событий' : 'Event filters',
              children: [
                SwitchListTile.adaptive(
                  value: _settings.onlyDaysWithEvents,
                  onChanged: (value) {
                    _change(_settings.copyWith(onlyDaysWithEvents: value));
                  },
                  title: Text(
                    _isRu ? 'Только дни с событиями' : 'Only days with events',
                  ),
                  contentPadding: EdgeInsets.zero,
                ),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (final filter in _availableEventFilters())
                      _FilterChipButton(
                        id: filter.id,
                        label: filter.label(isRu: _isRu),
                        settings: _settings,
                        onChanged: _toggleCategory,
                      ),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _change(AppSettings settings) {
    setState(() => _settings = settings);
    widget.onSettingsChanged(settings);
  }

  List<MobileEvent> _vaishnavaEvents() {
    return widget.events
        .where((event) {
          if (!event.category.contains('vaishnava')) return false;
          final kind = _settings.vaishnavaEventKind;
          if (kind == 'appearance') {
            return event.category.contains('appearance');
          }
          if (kind == 'disappearance') {
            return event.category.contains('disappearance');
          }
          return true;
        })
        .toList(growable: false);
  }

  List<_EventFilterDefinition> _availableEventFilters() {
    final categories = widget.events.map((event) => event.category).toSet();
    final known = _eventFilterDefinitions
        .where((filter) => categories.contains(filter.id))
        .toList();
    final knownIds = known.map((filter) => filter.id).toSet();
    for (final category in categories) {
      if (knownIds.contains(category)) continue;
      known.add(
        _EventFilterDefinition(
          id: category,
          ruLabel: category,
          enLabel: category,
        ),
      );
    }
    return known;
  }

  void _toggleCategory(String id) {
    final next = {..._settings.enabledEventCategories};
    if (next.contains(id)) {
      next.remove(id);
    } else {
      next.add(id);
    }
    _change(_settings.copyWith(enabledEventCategories: next));
  }

  void _jumpToSelectedEvent() {
    final id = _selectedVaishnavaEventId ?? _selectedEventId;
    if (id == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(_isRu ? 'Выберите событие.' : 'Choose an event.'),
        ),
      );
      return;
    }
    final event = widget.events.firstWhere((item) => item.id == id);
    widget.onJumpToEvent?.call(event);
  }
}

class _SettingsGroup extends StatelessWidget {
  const _SettingsGroup({required this.title, required this.children});

  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: Theme.of(context).textTheme.titleSmall?.copyWith(
                fontSize: 16,
                fontWeight: FontWeight.w900,
              ),
            ),
            const SizedBox(height: 12),
            ...children,
          ],
        ),
      ),
    );
  }
}

class _LocationOption {
  const _LocationOption._({
    required this.label,
    required this.location,
    required this.headerValue,
  });

  factory _LocationOption.header(String label) {
    final key = label.toLowerCase().replaceAll(RegExp(r'[^a-zа-яё0-9]+'), '-');
    return _LocationOption._(
      label: label,
      location: null,
      headerValue: '__group_$key',
    );
  }

  factory _LocationOption.location(CalendarLocation location) {
    return _LocationOption._(
      label: location.name,
      location: location,
      headerValue: null,
    );
  }

  final String label;
  final CalendarLocation? location;
  final String? headerValue;
}

class _FilterChipButton extends StatelessWidget {
  const _FilterChipButton({
    required this.id,
    required this.label,
    required this.settings,
    required this.onChanged,
  });

  final String id;
  final String label;
  final AppSettings settings;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    final active = settings.enabledEventCategories.isEmpty
        ? true
        : settings.enabledEventCategories.contains(id);
    return FilterChip(
      selected: active,
      label: Text(label),
      onSelected: (_) => onChanged(id),
    );
  }
}

class _SearchSelectOption<T> {
  const _SearchSelectOption({required this.value, required this.label});

  final T value;
  final String label;
}

class _SearchableSelectField<T> extends StatelessWidget {
  const _SearchableSelectField({
    required this.value,
    required this.hint,
    required this.searchHint,
    required this.emptyText,
    required this.options,
    required this.onSelected,
  });

  final T? value;
  final String hint;
  final String searchHint;
  final String emptyText;
  final List<_SearchSelectOption<T>> options;
  final ValueChanged<T> onSelected;

  @override
  Widget build(BuildContext context) {
    final selectedLabel = _selectedLabel();
    return InkWell(
      borderRadius: BorderRadius.circular(12),
      onTap: () async {
        final selected = await showModalBottomSheet<T>(
          context: context,
          isScrollControlled: true,
          useSafeArea: true,
          builder: (context) {
            return _SearchableOptionSheet<T>(
              title: hint,
              searchHint: searchHint,
              emptyText: emptyText,
              options: options,
            );
          },
        );
        if (selected != null) onSelected(selected);
      },
      child: InputDecorator(
        decoration: InputDecoration(
          suffixIcon: const Icon(Icons.arrow_drop_down),
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
        ),
        child: Text(
          selectedLabel ?? hint,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: Theme.of(context).textTheme.bodyLarge?.copyWith(
            color: selectedLabel == null
                ? Theme.of(context).hintColor
                : Theme.of(context).colorScheme.onSurface,
          ),
        ),
      ),
    );
  }

  String? _selectedLabel() {
    for (final option in options) {
      if (option.value == value) return option.label;
    }
    return null;
  }
}

class _SearchableOptionSheet<T> extends StatefulWidget {
  const _SearchableOptionSheet({
    required this.title,
    required this.searchHint,
    required this.emptyText,
    required this.options,
  });

  final String title;
  final String searchHint;
  final String emptyText;
  final List<_SearchSelectOption<T>> options;

  @override
  State<_SearchableOptionSheet<T>> createState() =>
      _SearchableOptionSheetState<T>();
}

class _SearchableOptionSheetState<T> extends State<_SearchableOptionSheet<T>> {
  final TextEditingController _controller = TextEditingController();
  String _query = '';

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final bottomPadding = MediaQuery.viewInsetsOf(context).bottom;
    final filtered = widget.options
        .where((option) {
          return option.label.toLowerCase().contains(
            _query.toLowerCase().trim(),
          );
        })
        .toList(growable: false);

    return SafeArea(
      child: Padding(
        padding: EdgeInsets.fromLTRB(20, 8, 20, bottomPadding + 20),
        child: SizedBox(
          height: MediaQuery.sizeOf(context).height * 0.72,
          child: Column(
            children: [
              Container(
                width: 46,
                height: 5,
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.outline,
                  borderRadius: BorderRadius.circular(999),
                ),
              ),
              Row(
                children: [
                  Expanded(
                    child: Text(
                      widget.title,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.of(context).maybePop(),
                    icon: const Icon(Icons.close),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              TextField(
                controller: _controller,
                autofocus: true,
                decoration: InputDecoration(
                  prefixIcon: const Icon(Icons.search),
                  hintText: widget.searchHint,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                onChanged: (value) => setState(() => _query = value),
              ),
              const SizedBox(height: 10),
              Expanded(
                child: filtered.isEmpty
                    ? Center(child: Text(widget.emptyText))
                    : ListView.separated(
                        keyboardDismissBehavior:
                            ScrollViewKeyboardDismissBehavior.onDrag,
                        itemCount: filtered.length,
                        separatorBuilder: (_, _) => const Divider(height: 1),
                        itemBuilder: (context, index) {
                          final option = filtered[index];
                          return ListTile(
                            title: Text(option.label),
                            onTap: () =>
                                Navigator.of(context).pop(option.value),
                          );
                        },
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _LocationPromptCard extends StatelessWidget {
  const _LocationPromptCard({required this.onTap, required this.isRu});

  final VoidCallback onTap;
  final bool isRu;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        leading: const Icon(Icons.place_outlined),
        title: Text(isRu ? 'Выберите место' : 'Choose location'),
        subtitle: Text(
          isRu
              ? 'Расчёт зависит от координат и часового пояса.'
              : 'Calculation depends on coordinates and timezone.',
        ),
        trailing: const Icon(Icons.chevron_right),
        onTap: onTap,
      ),
    );
  }
}

class _MasaPeriodNoticeCard extends StatelessWidget {
  const _MasaPeriodNoticeCard({
    required this.days,
    required this.location,
    required this.calculateDay,
    required this.isRu,
  });

  final List<PanchangaDay> days;
  final CalendarLocation? location;
  final PanchangaDay Function(DateTime date, CalendarLocation location)
  calculateDay;
  final bool isRu;

  @override
  Widget build(BuildContext context) {
    final notices = _notices();
    if (notices.isEmpty) return const SizedBox.shrink();
    final scheme = Theme.of(context).colorScheme;

    return Card(
      color: scheme.secondaryContainer.withValues(alpha: 0.5),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            for (var index = 0; index < notices.length; index += 1) ...[
              if (index > 0) const Divider(height: 18),
              Text(
                notices[index].title,
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  fontSize: 16,
                  fontWeight: FontWeight.w900,
                  color: scheme.onSecondaryContainer,
                ),
              ),
              if (notices[index].subtitle.isNotEmpty) ...[
                const SizedBox(height: 3),
                Text(
                  notices[index].subtitle,
                  style: TextStyle(
                    color: scheme.onSecondaryContainer.withValues(alpha: 0.76),
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ],
          ],
        ),
      ),
    );
  }

  List<_PeriodNotice> _notices() {
    return [
      _notice(
        days.where((day) => day.masaType == 'adhika').toList(growable: false),
        predicate: (day) => day.masaType == 'adhika',
        activeTitle: isRu
            ? 'Идёт Пурушоттама маса'
            : 'Purushottama Maas is active',
        upcomingTitle: isRu
            ? 'Пурушоттама маса начнётся'
            : 'Purushottama Maas starts',
      ),
      _notice(
        days.where(_isChaturmasyaDay).toList(growable: false),
        predicate: _isChaturmasyaDay,
        activeTitle: isRu ? 'Идёт Чатурмасья' : 'Chaturmasya is active',
        upcomingTitle: isRu ? 'Чатурмасья начнётся' : 'Chaturmasya starts',
      ),
      _notice(
        days.where(_isKarttikDay).toList(growable: false),
        predicate: _isKarttikDay,
        activeTitle: isRu
            ? 'Идёт Карттик / Дамодара маса'
            : 'Karttik / Damodara month is active',
        upcomingTitle: isRu
            ? 'Карттик / Дамодара маса начнётся'
            : 'Karttik / Damodara month starts',
      ),
      _notice(
        days.where(_isBhishmaPanchakaDay).toList(growable: false),
        predicate: _isBhishmaPanchakaDay,
        activeTitle: isRu
            ? 'Идёт Бхишма-панчака'
            : 'Bhishma Panchaka is active',
        upcomingTitle: isRu
            ? 'Бхишма-панчака начнётся'
            : 'Bhishma Panchaka starts',
      ),
    ].whereType<_PeriodNotice>().toList(growable: false);
  }

  _PeriodNotice? _notice(
    List<PanchangaDay> periodDays, {
    required bool Function(PanchangaDay day) predicate,
    required String activeTitle,
    required String upcomingTitle,
  }) {
    if (periodDays.isEmpty) return null;
    final expanded = _expandPeriod(periodDays, predicate);
    final today = _dateOnly(DateTime.now());
    final first = _dateOnly(expanded.first.date);
    final last = _dateOnly(expanded.last.date);
    if (last.isBefore(today)) return null;

    final baseTitle = today.isBefore(first) ? upcomingTitle : activeTitle;
    final range = isRu
        ? 'с ${_shortDate(first)} по ${_shortDate(last)}'
        : 'from ${_shortDate(first)} to ${_shortDate(last)}';
    return _PeriodNotice(title: '$baseTitle $range', subtitle: '');
  }

  List<PanchangaDay> _expandPeriod(
    List<PanchangaDay> visibleDays,
    bool Function(PanchangaDay day) predicate,
  ) {
    final currentLocation = location;
    if (currentLocation == null) return visibleDays;
    var first = visibleDays.first;
    var last = visibleDays.last;

    for (var i = 0; i < 370; i += 1) {
      final previousDate = first.date.subtract(const Duration(days: 1));
      final previous = calculateDay(previousDate, currentLocation);
      if (!predicate(previous)) break;
      first = previous;
    }
    for (var i = 0; i < 370; i += 1) {
      final nextDate = last.date.add(const Duration(days: 1));
      final next = calculateDay(nextDate, currentLocation);
      if (!predicate(next)) break;
      last = next;
    }
    return [first, last];
  }

  bool _isChaturmasyaDay(PanchangaDay day) {
    if ([
      'Sridhara',
      'Hrishikesha',
      'Padmanabha',
      'Damodara',
    ].contains(day.normalMasaName)) {
      return true;
    }
    return day.normalMasaName == 'Vamana' &&
        day.tithiAtSunrise.paksha == 'Gaura' &&
        day.tithiAtSunrise.number == 15;
  }

  bool _isKarttikDay(PanchangaDay day) {
    final isOpeningPurnima =
        day.normalMasaName == 'Padmanabha' &&
        day.tithiAtSunrise.paksha == 'Gaura' &&
        day.tithiAtSunrise.number == 15;
    return isOpeningPurnima || day.normalMasaName == 'Damodara';
  }

  bool _isBhishmaPanchakaDay(PanchangaDay day) {
    final tithi = day.tithiAtSunrise.number;
    return day.normalMasaName == 'Damodara' &&
        day.tithiAtSunrise.paksha == 'Gaura' &&
        tithi >= 11 &&
        tithi <= 15;
  }

  DateTime _dateOnly(DateTime date) =>
      DateTime(date.year, date.month, date.day);

  String _shortDate(DateTime date) {
    final monthsRu = [
      'янв.',
      'февр.',
      'мар.',
      'апр.',
      'мая',
      'июн.',
      'июл.',
      'авг.',
      'сент.',
      'окт.',
      'нояб.',
      'дек.',
    ];
    final monthsEn = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    final month = isRu ? monthsRu[date.month - 1] : monthsEn[date.month - 1];
    return isRu
        ? '${date.day} $month ${date.year}'
        : '$month ${date.day}, ${date.year}';
  }
}

class _PeriodNotice {
  const _PeriodNotice({required this.title, required this.subtitle});

  final String title;
  final String subtitle;
}

class _MonthCalendarCard extends StatelessWidget {
  const _MonthCalendarCard({
    required this.month,
    required this.selectedDate,
    required this.compactMode,
    required this.weekStart,
    required this.isRu,
    required this.days,
    required this.eventCounts,
    required this.eventCategories,
    required this.onlyDaysWithEvents,
    required this.onMonthPickerRequested,
    required this.onPreviousMonth,
    required this.onNextMonth,
    required this.onDaySelected,
  });

  final DateTime month;
  final DateTime selectedDate;
  final bool compactMode;
  final int weekStart;
  final bool isRu;
  final List<MonthDay> days;
  final Map<String, int> eventCounts;
  final Map<String, String> eventCategories;
  final bool onlyDaysWithEvents;
  final VoidCallback onMonthPickerRequested;
  final VoidCallback onPreviousMonth;
  final VoidCallback onNextMonth;
  final ValueChanged<DateTime> onDaySelected;

  @override
  Widget build(BuildContext context) {
    final labels = _weekdayLabels(weekStart, isRu);

    return Card(
      child: Padding(
        padding: EdgeInsets.all(compactMode ? 14 : 18),
        child: Column(
          children: [
            Row(
              children: [
                IconButton.filledTonal(
                  onPressed: onPreviousMonth,
                  icon: const Icon(Icons.chevron_left),
                ),
                Expanded(
                  child: Center(
                    child: _MonthPickerButton(
                      label: _monthLabel(month, isRu),
                      onPressed: onMonthPickerRequested,
                      compactMode: compactMode,
                    ),
                  ),
                ),
                IconButton.filledTonal(
                  onPressed: onNextMonth,
                  icon: const Icon(Icons.chevron_right),
                ),
              ],
            ),
            const SizedBox(height: 12),
            GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: 7,
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 7,
                childAspectRatio: 1.7,
              ),
              itemBuilder: (context, index) {
                return Center(
                  child: Text(
                    labels[index],
                    style: Theme.of(context).textTheme.labelLarge?.copyWith(
                      fontWeight: FontWeight.w900,
                      color: Theme.of(
                        context,
                      ).extension<VCalendarColors>()!.mutedText,
                    ),
                  ),
                );
              },
            ),
            AnimatedSwitcher(
              duration: const Duration(milliseconds: 240),
              switchInCurve: Curves.easeOutCubic,
              switchOutCurve: Curves.easeInCubic,
              transitionBuilder: (child, animation) {
                final offset = Tween<Offset>(
                  begin: const Offset(0.035, 0),
                  end: Offset.zero,
                ).animate(animation);
                return FadeTransition(
                  opacity: animation,
                  child: SlideTransition(position: offset, child: child),
                );
              },
              child: GridView.builder(
                key: ValueKey('${month.year}-${month.month}-$weekStart'),
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: days.length,
                gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 7,
                  childAspectRatio: compactMode ? 1 : 1.18,
                ),
                itemBuilder: (context, index) {
                  final day = days[index];
                  return _DayCell(
                    day: day,
                    selected: _sameDate(day.date, selectedDate),
                    compactMode: compactMode,
                    eventCount: eventCounts[_dateKey(day.date)] ?? 0,
                    eventCategory: eventCategories[_dateKey(day.date)],
                    dimEmptyEventDay:
                        onlyDaysWithEvents &&
                        day.inCurrentMonth &&
                        (eventCounts[_dateKey(day.date)] ?? 0) == 0,
                    onTap: () => onDaySelected(day.date),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  List<String> _weekdayLabels(int weekStart, bool isRu) {
    final base = isRu
        ? ['ВС', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ']
        : ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    return [for (var i = 0; i < 7; i += 1) base[(weekStart + i) % 7]];
  }

  String _monthLabel(DateTime date, bool isRu) {
    final names = isRu
        ? [
            'Январь',
            'Февраль',
            'Март',
            'Апрель',
            'Май',
            'Июнь',
            'Июль',
            'Август',
            'Сентябрь',
            'Октябрь',
            'Ноябрь',
            'Декабрь',
          ]
        : [
            'January',
            'February',
            'March',
            'April',
            'May',
            'June',
            'July',
            'August',
            'September',
            'October',
            'November',
            'December',
          ];
    return '${names[date.month - 1]} ${date.year}';
  }

  bool _sameDate(DateTime a, DateTime b) {
    return a.year == b.year && a.month == b.month && a.day == b.day;
  }

  String _dateKey(DateTime date) =>
      '${date.year.toString().padLeft(4, '0')}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
}

class _MonthPickerButton extends StatelessWidget {
  const _MonthPickerButton({
    required this.label,
    required this.onPressed,
    required this.compactMode,
  });

  final String label;
  final VoidCallback onPressed;
  final bool compactMode;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return OutlinedButton(
      onPressed: onPressed,
      style: OutlinedButton.styleFrom(
        padding: EdgeInsets.symmetric(
          horizontal: compactMode ? 14 : 18,
          vertical: compactMode ? 9 : 11,
        ),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
        side: BorderSide(color: theme.colorScheme.outline),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Flexible(
            child: Text(
              label,
              overflow: TextOverflow.ellipsis,
              style: theme.textTheme.titleMedium?.copyWith(
                fontSize: compactMode ? 16 : 18,
                fontWeight: FontWeight.w900,
              ),
            ),
          ),
          const SizedBox(width: 6),
          const Icon(Icons.keyboard_arrow_down, size: 22),
        ],
      ),
    );
  }
}

class _MonthYearPickerSheet extends StatefulWidget {
  const _MonthYearPickerSheet({required this.initialMonth, required this.isRu});

  final DateTime initialMonth;
  final bool isRu;

  @override
  State<_MonthYearPickerSheet> createState() => _MonthYearPickerSheetState();
}

class _MonthYearPickerSheetState extends State<_MonthYearPickerSheet> {
  late int _year = widget.initialMonth.year;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final months = widget.isRu
        ? [
            'Январь',
            'Февраль',
            'Март',
            'Апрель',
            'Май',
            'Июнь',
            'Июль',
            'Август',
            'Сентябрь',
            'Октябрь',
            'Ноябрь',
            'Декабрь',
          ]
        : [
            'January',
            'February',
            'March',
            'April',
            'May',
            'June',
            'July',
            'August',
            'September',
            'October',
            'November',
            'December',
          ];

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                Text(
                  widget.isRu ? 'Выберите месяц' : 'Choose month',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontSize: 16,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const Spacer(),
                IconButton(
                  onPressed: () => Navigator.of(context).maybePop(),
                  icon: const Icon(Icons.close),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Row(
              children: [
                IconButton.filledTonal(
                  onPressed: () => setState(() => _year -= 1),
                  icon: const Icon(Icons.chevron_left),
                ),
                Expanded(
                  child: Center(
                    child: Text(
                      '$_year',
                      style: theme.textTheme.titleLarge?.copyWith(
                        fontSize: 24,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                ),
                IconButton.filledTonal(
                  onPressed: () => setState(() => _year += 1),
                  icon: const Icon(Icons.chevron_right),
                ),
              ],
            ),
            const SizedBox(height: 14),
            GridView.count(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisCount: 3,
              mainAxisSpacing: 10,
              crossAxisSpacing: 10,
              childAspectRatio: 2.25,
              children: [
                for (var index = 0; index < months.length; index += 1)
                  _MonthChoiceButton(
                    label: months[index],
                    selected:
                        _year == widget.initialMonth.year &&
                        index + 1 == widget.initialMonth.month,
                    onPressed: () {
                      Navigator.of(context).pop(DateTime(_year, index + 1));
                    },
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _MonthChoiceButton extends StatelessWidget {
  const _MonthChoiceButton({
    required this.label,
    required this.selected,
    required this.onPressed,
  });

  final String label;
  final bool selected;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return OutlinedButton(
      onPressed: onPressed,
      style: OutlinedButton.styleFrom(
        backgroundColor: selected
            ? theme.colorScheme.primary.withValues(alpha: 0.12)
            : Colors.transparent,
        foregroundColor: theme.colorScheme.onSurface,
        side: BorderSide(
          color: selected
              ? theme.colorScheme.primary
              : theme.colorScheme.outline,
          width: selected ? 2 : 1,
        ),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
      child: FittedBox(
        fit: BoxFit.scaleDown,
        child: Text(
          label,
          maxLines: 1,
          textAlign: TextAlign.center,
          style: theme.textTheme.labelLarge?.copyWith(
            fontSize: 14,
            fontWeight: FontWeight.w900,
          ),
        ),
      ),
    );
  }
}

class _DayCell extends StatelessWidget {
  const _DayCell({
    required this.day,
    required this.selected,
    required this.compactMode,
    required this.eventCount,
    required this.eventCategory,
    required this.dimEmptyEventDay,
    required this.onTap,
  });

  final MonthDay day;
  final bool selected;
  final bool compactMode;
  final int eventCount;
  final String? eventCategory;
  final bool dimEmptyEventDay;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.extension<VCalendarColors>()!;
    final textColor = day.inCurrentMonth
        ? theme.colorScheme.onSurface
        : colors.mutedText.withValues(alpha: 0.45);
    final eventFillColor = _eventFillColor(theme, colors);
    final borderColor = _borderColor(theme, colors);
    final eventMarkerColor = _eventMarkerColor();
    final markerCount = eventCount > 3 ? 3 : eventCount;
    final cellSize = compactMode ? 46.0 : 56.0;
    final dayTextColor = _dayTextColor(theme, textColor);

    return InkWell(
      borderRadius: BorderRadius.circular(999),
      onTap: onTap,
      child: Center(
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 160),
          width: cellSize,
          height: cellSize,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: day.inCurrentMonth ? eventFillColor : null,
            border: Border.all(
              color: borderColor ?? Colors.transparent,
              width: borderColor == null
                  ? 0
                  : eventCategory == 'ekadashi'
                  ? 2.6
                  : 2,
            ),
          ),
          child: Stack(
            alignment: Alignment.center,
            children: [
              Text(
                '${day.date.day}',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontSize: compactMode ? 18 : 20,
                  fontWeight: FontWeight.w900,
                  color: dimEmptyEventDay
                      ? textColor.withValues(alpha: 0.32)
                      : dayTextColor,
                ),
              ),
              if (day.isToday)
                Align(
                  alignment: Alignment.bottomCenter,
                  child: Padding(
                    padding: EdgeInsets.only(bottom: compactMode ? 3 : 4),
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        color: colors.todayMarker,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const SizedBox(width: 18, height: 4),
                    ),
                  ),
                ),
              if (eventCount > 0)
                Positioned(
                  right: compactMode ? 4 : 5,
                  top: 0,
                  bottom: 0,
                  child: Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        for (var index = 0; index < markerCount; index += 1)
                          Padding(
                            padding: EdgeInsets.only(
                              bottom: index == markerCount - 1 ? 0 : 2,
                            ),
                            child: DecoratedBox(
                              decoration: BoxDecoration(
                                color: eventMarkerColor,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: const SizedBox(width: 4, height: 4),
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Color? _eventFillColor(ThemeData theme, VCalendarColors colors) {
    final category = eventCategory;
    if (category == null) return null;
    if (category == 'notice') return null;
    if (category == 'parana') return colors.parana;
    if (category == 'ekadashi') {
      final alpha = theme.brightness == Brightness.dark ? 0.30 : 0.13;
      return const Color(0xFF3949AB).withValues(alpha: alpha);
    }
    if (category == 'vaishnava') return colors.vaishnavaDisappearance;
    if (category == 'festival') return colors.festival;
    if (category == 'deity') return colors.parana;
    if (category == 'purushottama') return colors.festival;
    if (category.contains('appearance')) return colors.vaishnavaAppearance;
    if (category.contains('disappearance')) {
      return colors.vaishnavaDisappearance;
    }
    if (category == 'avatar' ||
        category == 'avatar_associate' ||
        category == 'divine_appearance' ||
        category == 'festival' ||
        category == 'mahaprabhu_parsada') {
      return colors.festival;
    }
    if (category == 'deity_temple') return colors.parana;
    return colors.ekadashiBorder;
  }

  Color? _borderColor(ThemeData theme, VCalendarColors colors) {
    final category = eventCategory;
    if (category == 'ekadashi') return const Color(0xFFD4A017);
    if (selected) return theme.colorScheme.primary;
    return null;
  }

  Color _dayTextColor(ThemeData theme, Color defaultColor) {
    if (eventCategory == 'ekadashi') {
      return theme.brightness == Brightness.dark
          ? const Color(0xFFBFC8FF)
          : const Color(0xFF3949AB);
    }
    if (selected) return theme.colorScheme.primary;
    return defaultColor;
  }

  Color _eventMarkerColor() {
    final category = eventCategory;
    if (category == null) return const Color(0xFFD4A017);
    if (category == 'notice') return const Color(0xFFA33A1F);
    if (category == 'parana') return const Color(0xFF087A5B);
    if (category == 'ekadashi') return const Color(0xFFD4A017);
    if (category == 'vaishnava') return const Color(0xFF7B3BB8);
    if (category == 'festival') return const Color(0xFFB45A09);
    if (category == 'deity') return const Color(0xFF087A5B);
    if (category == 'purushottama') return const Color(0xFFB45A09);
    if (category.contains('appearance')) return const Color(0xFF6D4DD6);
    if (category.contains('disappearance')) return const Color(0xFF7B3BB8);
    if (category == 'avatar' ||
        category == 'avatar_associate' ||
        category == 'divine_appearance' ||
        category == 'festival' ||
        category == 'mahaprabhu_parsada') {
      return const Color(0xFFB45A09);
    }
    if (category == 'deity_temple') return const Color(0xFF087A5B);
    return const Color(0xFFD4A017);
  }
}

class _SelectedDayCard extends StatelessWidget {
  const _SelectedDayCard({
    super.key,
    required this.date,
    required this.location,
    required this.events,
    required this.panchanga,
    required this.nextPanchanga,
    required this.bengaliSolarMonth,
    required this.isRu,
  });

  final DateTime date;
  final CalendarLocation? location;
  final List<MobileEvent> events;
  final PanchangaDay? panchanga;
  final PanchangaDay? nextPanchanga;
  final String? bengaliSolarMonth;
  final bool isRu;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<VCalendarColors>()!;
    final currentLocation = location;
    final currentPanchanga = panchanga;
    final paranaTomorrow = currentLocation == null
        ? null
        : _paranaTomorrowLabel(
            events: events,
            nextPanchanga: nextPanchanga,
            timezone: currentLocation.timezone,
          );
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              isRu ? 'Выбранный день' : 'Selected day',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontSize: 18,
                fontWeight: FontWeight.w900,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              _dateLabel(date, isRu),
              style: Theme.of(context).textTheme.titleSmall?.copyWith(
                fontSize: 15,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              currentLocation == null
                  ? (isRu ? 'Место не выбрано' : 'No location selected')
                  : '${currentLocation.name} · ${currentLocation.timezone}',
              style: TextStyle(color: colors.mutedText),
            ),
            const SizedBox(height: 12),
            if (currentLocation == null || currentPanchanga == null)
              Text(isRu ? 'Выберите место.' : 'Select a location.')
            else ...[
              if (paranaTomorrow != null) ...[
                _ParanaTomorrowNotice(label: paranaTomorrow),
                const SizedBox(height: 12),
              ],
              _EventsSection(
                events: events,
                panchanga: currentPanchanga,
                timezone: currentLocation.timezone,
                isRu: isRu,
              ),
              const SizedBox(height: 14),
              _PanchangaSummaryGrid(
                panchanga: currentPanchanga,
                timezone: currentLocation.timezone,
                isRu: isRu,
                masaLabel: _masaLabel(currentPanchanga, isRu),
                tithiLabel: _tithiLabel(
                  currentPanchanga.tithiAtSunrise.number,
                  isRu,
                ),
              ),
              const SizedBox(height: 14),
              _JyotishDaySection(
                panchanga: currentPanchanga,
                nextSunrise: nextPanchanga?.sunrise,
                bengaliSolarMonth: bengaliSolarMonth ?? '-',
                timezone: currentLocation.timezone,
                isRu: isRu,
              ),
            ],
          ],
        ),
      ),
    );
  }

  String _masaLabel(PanchangaDay panchanga, bool isRu) {
    final masa = _localizeMasa(panchanga.normalMasaName, isRu);
    if (panchanga.masaType == 'adhika') {
      return isRu ? 'Пурушоттама ($masa)' : 'Purushottama ($masa)';
    }
    return masa;
  }

  String _localizeMasa(String value, bool isRu) {
    if (!isRu) return value;
    const ru = {
      'Vishnu': 'Вишну',
      'Madhusudan': 'Мадхусудан',
      'Trivikrama': 'Тривикрама',
      'Vamana': 'Вамана',
      'Sridhara': 'Шридхара',
      'Hrishikesha': 'Хришикеша',
      'Padmanabha': 'Падманабха',
      'Damodara': 'Дамодара',
      'Keshava': 'Кешава',
      'Narayana': 'Нараяна',
      'Madhava': 'Мадхава',
      'Govinda': 'Говинда',
    };
    return ru[value] ?? value;
  }

  String _dateLabel(DateTime date, bool isRu) {
    final weekdays = isRu
        ? [
            'понедельник',
            'вторник',
            'среда',
            'четверг',
            'пятница',
            'суббота',
            'воскресенье',
          ]
        : [
            'Monday',
            'Tuesday',
            'Wednesday',
            'Thursday',
            'Friday',
            'Saturday',
            'Sunday',
          ];
    final months = isRu
        ? [
            'января',
            'февраля',
            'марта',
            'апреля',
            'мая',
            'июня',
            'июля',
            'августа',
            'сентября',
            'октября',
            'ноября',
            'декабря',
          ]
        : [
            'January',
            'February',
            'March',
            'April',
            'May',
            'June',
            'July',
            'August',
            'September',
            'October',
            'November',
            'December',
          ];
    if (isRu) {
      return '${weekdays[date.weekday - 1]}, ${date.day} ${months[date.month - 1]} ${date.year} г.';
    }
    return '${weekdays[date.weekday - 1]}, ${months[date.month - 1]} ${date.day}, ${date.year}';
  }

  String _tithiLabel(int number, bool isRu) {
    final names = isRu
        ? [
            'Гаура Пратипад',
            'Гаура Двития',
            'Гаура Трития',
            'Гаура Чатуртхи',
            'Гаура Панчами',
            'Гаура Шаштхи',
            'Гаура Саптами',
            'Гаура Аштами',
            'Гаура Навами',
            'Гаура Дашами',
            'Гаура Экадаши',
            'Гаура Двадаши',
            'Гаура Трайодаши',
            'Гаура Чатурдаши',
            'Пурнима',
            'Кришна Пратипад',
            'Кришна Двития',
            'Кришна Трития',
            'Кришна Чатуртхи',
            'Кришна Панчами',
            'Кришна Шаштхи',
            'Кришна Саптами',
            'Кришна Аштами',
            'Кришна Навами',
            'Кришна Дашами',
            'Кришна Экадаши',
            'Кришна Двадаши',
            'Кришна Трайодаши',
            'Кришна Чатурдаши',
            'Амавасья',
          ]
        : const [
            'Gaura Pratipat',
            'Gaura Dvitiya',
            'Gaura Tritiya',
            'Gaura Chaturthi',
            'Gaura Panchami',
            'Gaura Shashthi',
            'Gaura Saptami',
            'Gaura Ashtami',
            'Gaura Navami',
            'Gaura Dashami',
            'Gaura Ekadashi',
            'Gaura Dvadashi',
            'Gaura Trayodashi',
            'Gaura Chaturdashi',
            'Purnima',
            'Krishna Pratipat',
            'Krishna Dvitiya',
            'Krishna Tritiya',
            'Krishna Chaturthi',
            'Krishna Panchami',
            'Krishna Shashthi',
            'Krishna Saptami',
            'Krishna Ashtami',
            'Krishna Navami',
            'Krishna Dashami',
            'Krishna Ekadashi',
            'Krishna Dvadashi',
            'Krishna Trayodashi',
            'Krishna Chaturdashi',
            'Amavasya',
          ];
    return names[number - 1];
  }

  String? _paranaTomorrowLabel({
    required List<MobileEvent> events,
    required PanchangaDay? nextPanchanga,
    required String timezone,
  }) {
    if (!events.any(_isEkadashiFastEvent)) return null;
    final next = nextPanchanga;
    if (next == null || next.tithiAtSunrise.shortName != 'Dvadashi') {
      return null;
    }

    final daylight = next.sunset.difference(next.sunrise);
    final oneThirdEnd = next.sunrise.add(
      Duration(milliseconds: (daylight.inMilliseconds / 3).round()),
    );
    var end = oneThirdEnd;
    final tithiEnd = next.tithiEnd;
    if (tithiEnd != null &&
        tithiEnd.isAfter(next.sunrise) &&
        tithiEnd.isBefore(oneThirdEnd)) {
      end = tithiEnd;
    }
    final formatter = const PanchangaFormatter();
    return isRu
        ? 'Паран завтра: ${formatter.time(next.sunrise, timezone)}-${formatter.time(end, timezone)}'
        : 'Parana tomorrow: ${formatter.time(next.sunrise, timezone)}-${formatter.time(end, timezone)}';
  }

  bool _isEkadashiFastEvent(MobileEvent event) {
    return event.category == 'ekadashi' && event.eventType == 'ekadashi';
  }
}

class _ParanaTomorrowNotice extends StatelessWidget {
  const _ParanaTomorrowNotice({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<VCalendarColors>()!;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: colors.parana.withValues(alpha: 0.35),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: colors.parana),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        child: Text(
          label,
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
            fontWeight: FontWeight.w900,
            color: Theme.of(context).colorScheme.onSurface,
          ),
        ),
      ),
    );
  }
}

class _PanchangaSummaryGrid extends StatelessWidget {
  const _PanchangaSummaryGrid({
    required this.panchanga,
    required this.timezone,
    required this.isRu,
    required this.masaLabel,
    required this.tithiLabel,
  });

  final PanchangaDay panchanga;
  final String timezone;
  final bool isRu;
  final String masaLabel;
  final String tithiLabel;

  @override
  Widget build(BuildContext context) {
    final formatter = const PanchangaFormatter();
    final sun =
        '${formatter.time(panchanga.sunrise, timezone)}-${formatter.time(panchanga.sunset, timezone)}';
    final nakshatra =
        '${panchanga.nakshatraAtSunrise.name} · ${isRu ? 'пада' : 'pada'} ${panchanga.nakshatraAtSunrise.pada}';
    final tithiPeriod =
        '${formatter.dateTime(panchanga.tithiStart, timezone)} - ${formatter.dateTime(panchanga.tithiEnd, timezone)}';
    final textStyle = Theme.of(
      context,
    ).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w700);

    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Theme.of(context).colorScheme.outline),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        child: DefaultTextStyle.merge(
          style: textStyle,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _PanchangaSummaryLine(
                label: isRu ? 'Дата панчанга' : 'Panchanga date',
                value:
                    '$masaLabel · ${_pakshaLabel(panchanga.tithiAtSunrise.paksha)} · $tithiLabel',
              ),
              _PanchangaSummaryLine(
                label: isRu ? 'Накшатра' : 'Nakshatra',
                value: nakshatra,
              ),
              _PanchangaSummaryLine(
                label: isRu ? 'Солнце / арунодая' : 'Sun / arunodaya',
                value:
                    '$sun · ${formatter.time(panchanga.arunodaya, timezone)}',
              ),
              _PanchangaSummaryLine(
                label: isRu ? 'Титхи' : 'Tithi',
                value:
                    '$tithiPeriod · ${panchanga.tithiAtSunrise.angle.toStringAsFixed(2)}°',
                isLast: true,
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _pakshaLabel(String value) {
    if (!isRu) return value;
    return value == 'Gaura' ? 'Гаура' : 'Кришна';
  }
}

class _PanchangaSummaryLine extends StatelessWidget {
  const _PanchangaSummaryLine({
    required this.label,
    required this.value,
    this.isLast = false,
  });

  final String label;
  final String value;
  final bool isLast;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<VCalendarColors>()!;
    return Padding(
      padding: EdgeInsets.only(bottom: isLast ? 0 : 7),
      child: Text.rich(
        TextSpan(
          children: [
            TextSpan(
              text: '$label: ',
              style: TextStyle(
                color: colors.mutedText,
                fontWeight: FontWeight.w900,
              ),
            ),
            TextSpan(
              text: value,
              style: const TextStyle(fontWeight: FontWeight.w800),
            ),
          ],
        ),
      ),
    );
  }
}

class _JyotishDaySection extends StatelessWidget {
  const _JyotishDaySection({
    required this.panchanga,
    required this.nextSunrise,
    required this.bengaliSolarMonth,
    required this.timezone,
    required this.isRu,
  });

  final PanchangaDay panchanga;
  final DateTime? nextSunrise;
  final String bengaliSolarMonth;
  final String timezone;
  final bool isRu;

  @override
  Widget build(BuildContext context) {
    final service = const JyotishInfoService();
    final tithi = service.tithiInfo(panchanga.tithiAtSunrise, isRu: isRu);
    final nakshatra = service.nakshatraInfo(
      panchanga.nakshatraAtSunrise,
      isRu: isRu,
    );
    final formatter = const PanchangaFormatter();
    final yoga = nextSunrise == null
        ? null
        : const PanjikaYogaService().calculate(
            date: panchanga.date,
            bengaliSolarMonth: bengaliSolarMonth,
            sunrise: panchanga.sunrise,
            sunset: panchanga.sunset,
            nextSunrise: nextSunrise!,
          );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          isRu ? 'Джйотиш' : 'Jyotish',
          style: Theme.of(context).textTheme.titleSmall?.copyWith(
            fontSize: 17,
            fontWeight: FontWeight.w900,
          ),
        ),
        const SizedBox(height: 8),
        _JyotishTermsHelpCard(isRu: isRu),
        const SizedBox(height: 8),
        _JyotishInfoCard(
          title: isRu ? 'Титхи' : 'Tithi',
          headline: tithi.name,
          meta: '${tithi.groupLabel} · ${tithi.quality}',
          isRu: isRu,
          lines: [
            _JyotishLine(isRu ? 'Оценка' : 'Evaluation', tithi.evaluation),
            _JyotishLine(
              isRu ? 'Начало' : 'Start',
              formatter.dateTime(panchanga.tithiStart, timezone),
            ),
            _JyotishLine(
              isRu ? 'Окончание' : 'End',
              formatter.dateTime(panchanga.tithiEnd, timezone),
            ),
            _JyotishLine(isRu ? 'Смысл' : 'Meaning', tithi.summary),
          ],
          favorable: tithi.plus,
          unfavorable: tithi.minus,
        ),
        const SizedBox(height: 8),
        _JyotishInfoCard(
          title: isRu ? 'Накшатра' : 'Nakshatra',
          headline: nakshatra.name,
          meta:
              '${nakshatra.group} · ${isRu ? 'пада' : 'pada'} ${nakshatra.pada} · ${nakshatra.sector}',
          isRu: isRu,
          lines: [
            _JyotishLine(isRu ? 'Группа' : 'Group', nakshatra.group),
            _JyotishLine(
              isRu ? 'Пада / сектор' : 'Pada / sector',
              '${nakshatra.pada} · ${nakshatra.sector}',
            ),
            _JyotishLine(isRu ? 'Управитель' : 'Ruler', nakshatra.ruler),
            _JyotishLine(isRu ? 'Символ' : 'Symbol', nakshatra.symbol),
            _JyotishLine(isRu ? 'Божество' : 'Deity', nakshatra.deity),
            _JyotishLine(isRu ? 'Смысл' : 'Meaning', nakshatra.summary),
          ],
          favorable: nakshatra.plus,
          unfavorable: nakshatra.minus,
        ),
        if (yoga != null) ...[
          const SizedBox(height: 8),
          _PanjikaYogaCard(yoga: yoga, timezone: timezone, isRu: isRu),
        ],
      ],
    );
  }
}

class _JyotishInfoCard extends StatelessWidget {
  const _JyotishInfoCard({
    required this.title,
    required this.headline,
    required this.meta,
    required this.isRu,
    required this.lines,
    this.favorable = const [],
    this.unfavorable = const [],
  });

  final String title;
  final String headline;
  final String meta;
  final bool isRu;
  final List<_JyotishLine> lines;
  final List<String> favorable;
  final List<String> unfavorable;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<VCalendarColors>()!;
    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Theme.of(context).colorScheme.outline),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: Theme.of(context).textTheme.labelMedium?.copyWith(
                color: colors.mutedText,
                fontWeight: FontWeight.w900,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              headline,
              style: Theme.of(
                context,
              ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 2),
            Text(meta, style: TextStyle(color: colors.mutedText)),
            const SizedBox(height: 8),
            for (final line in lines)
              Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: Text.rich(
                  TextSpan(
                    children: [
                      TextSpan(
                        text: '${line.label}: ',
                        style: TextStyle(
                          color: colors.mutedText,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      TextSpan(text: line.value),
                    ],
                  ),
                ),
              ),
            if (favorable.isNotEmpty || unfavorable.isNotEmpty) ...[
              const SizedBox(height: 8),
              if (favorable.isNotEmpty)
                _JyotishAdviceBlock(
                  title: isRu ? 'Благоприятно' : 'Favorable',
                  values: favorable,
                  tone: _AdviceTone.good,
                ),
              if (favorable.isNotEmpty && unfavorable.isNotEmpty)
                const SizedBox(height: 8),
              if (unfavorable.isNotEmpty)
                _JyotishAdviceBlock(
                  title: isRu ? 'Нежелательно' : 'Unfavorable',
                  values: unfavorable,
                  tone: _AdviceTone.bad,
                ),
            ],
          ],
        ),
      ),
    );
  }
}

class _JyotishLine {
  const _JyotishLine(this.label, this.value);

  final String label;
  final String value;
}

class _JyotishTermsHelpCard extends StatelessWidget {
  const _JyotishTermsHelpCard({required this.isRu});

  final bool isRu;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<VCalendarColors>()!;
    final terms = _jyotishTerms(isRu);
    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Theme.of(context).colorScheme.outline),
      ),
      child: ExpansionTile(
        tilePadding: const EdgeInsets.symmetric(horizontal: 12),
        childrenPadding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
        leading: CircleAvatar(
          radius: 14,
          backgroundColor: colors.festival,
          foregroundColor: Theme.of(context).colorScheme.onSurface,
          child: const Text(
            'i',
            style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16),
          ),
        ),
        title: Text(
          isRu ? 'Термины' : 'Terms',
          style: Theme.of(
            context,
          ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w900),
        ),
        subtitle: Text(
          isRu ? 'Справка по терминам панчанга' : 'Panchang term reference',
          style: TextStyle(color: colors.mutedText),
        ),
        children: [
          for (final term in terms)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    term.title,
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.primary,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(term.description),
                ],
              ),
            ),
        ],
      ),
    );
  }

  List<_TermDefinition> _jyotishTerms(bool isRu) {
    if (!isRu) {
      return const [
        _TermDefinition(
          'Jyotish',
          'Traditional Vedic astrology and calendrical timing system used here for muhurta notes.',
        ),
        _TermDefinition(
          'Vara',
          'Traditional weekday name in the Panchang order: Ravivara, Somavara, Mangalavara, Budhavara, Guruvara or Brihaspativara, Shukravara, Shanivara.',
        ),
        _TermDefinition(
          'Masa',
          'Lunar month used for Vaishnava calendar observances.',
        ),
        _TermDefinition(
          'Paksha',
          'Half of the lunar month: Gaura is waxing, Krishna is waning.',
        ),
        _TermDefinition(
          'Tithi',
          'Lunar day, calculated from the Moon-Sun angular distance.',
        ),
        _TermDefinition(
          'Nakshatra',
          'One of 27 lunar mansions. Each spans 13°20\' of the sidereal zodiac.',
        ),
        _TermDefinition(
          'Pada',
          'Quarter of a nakshatra; each nakshatra has four padas of 3°20\'.',
        ),
        _TermDefinition(
          'AMRITA',
          'A highly favorable Panjika muhurta slot for journeys, worship, and auspicious beginnings. It is treated as capable of neutralizing several travel blemishes.',
        ),
        _TermDefinition(
          'MAHENDRA',
          'A favorable and supportive Panjika muhurta slot for undertakings and travel, selected from the same month-group and weekday table as AMRITA.',
        ),
        _TermDefinition(
          'VAKRA',
          'A crooked or obstructive Panjika slot. It is generally avoided for important beginnings and journeys unless a stronger rule gives permission.',
        ),
        _TermDefinition(
          'SHUNYA',
          'An empty or void Panjika slot. Traditionally it is not chosen for important beginnings, travel, or auspicious work.',
        ),
        _TermDefinition(
          'Sidereal longitude',
          'Moon position measured against the sidereal zodiac after ayanamsha correction.',
        ),
        _TermDefinition(
          'Graha ruler',
          'The planetary ruler traditionally associated with a nakshatra.',
        ),
        _TermDefinition(
          'Pratipat',
          'The first tithi of a paksha, immediately after New Moon or Full Moon.',
        ),
        _TermDefinition(
          'Amavasya',
          'New Moon tithi, the last tithi of Krishna paksha.',
        ),
        _TermDefinition(
          'Arunodaya',
          'Pre-dawn period used for Ekadashi purity rules; it is calculated as one fifteenth of the previous night before sunrise.',
        ),
        _TermDefinition(
          'Parana',
          'The proper window for breaking an Ekadashi fast.',
        ),
      ];
    }

    return const [
      _TermDefinition(
        'Джйотиш',
        'Традиционная ведическая астрология и система выбора времени, здесь используется для заметок по мухурте.',
      ),
      _TermDefinition(
        'Вара',
        'Традиционное название дня недели в порядке панчанги: Равивара, Сомавара, Мангалавара, Будхавара, Гурувара или Брихаспативара, Шукравара, Шанивара.',
      ),
      _TermDefinition(
        'Маса',
        'Лунный месяц, по которому определяются вайшнавские календарные события.',
      ),
      _TermDefinition(
        'Пакша',
        'Половина лунного месяца: Гаура - растущая Луна, Кришна - убывающая.',
      ),
      _TermDefinition(
        'Титхи',
        'Лунный день, рассчитывается по угловому расстоянию между Луной и Солнцем.',
      ),
      _TermDefinition(
        'Накшатра',
        'Одно из 27 лунных созвездий. Каждая накшатра занимает 13°20\' сидерического зодиака.',
      ),
      _TermDefinition(
        'Пада',
        'Четверть накшатры; в каждой накшатре четыре пады по 3°20\'.',
      ),
      _TermDefinition(
        'AMRITA',
        'Очень благоприятное мухурта-окно панжики для поездок, поклонения и добрых начинаний. В традиции считается, что оно может нейтрализовать ряд неблагоприятных факторов для путешествия.',
      ),
      _TermDefinition(
        'MAHENDRA',
        'Благоприятное поддерживающее мухурта-окно панжики для дел и поездок; выбирается по той же таблице группы месяца и дня недели, что и AMRITA.',
      ),
      _TermDefinition(
        'VAKRA',
        '«Кривой», затрудняющий отрезок панжики. Обычно его избегают для важных начинаний и поездок, если нет более сильного разрешающего правила.',
      ),
      _TermDefinition(
        'SHUNYA',
        '«Пустой» отрезок панжики. Традиционно не выбирается для важных начинаний, поездок и благоприятных дел.',
      ),
      _TermDefinition(
        'Сидерическая долгота',
        'Положение Луны в сидерическом зодиаке после поправки айанамши.',
      ),
      _TermDefinition(
        'Граха-управитель',
        'Планетный управитель, традиционно связанный с накшатрой.',
      ),
      _TermDefinition(
        'Пратипад',
        'Первая титхи пакши, сразу после новолуния или полнолуния.',
      ),
      _TermDefinition(
        'Амавасья',
        'Титхи новолуния, последняя титхи Кришна-пакши.',
      ),
      _TermDefinition(
        'Арунодая',
        'Предрассветный период для правил чистоты Экадаши; считается как одна пятнадцатая предыдущей ночи до восхода.',
      ),
      _TermDefinition('Паран', 'Правильное окно для выхода из поста Экадаши.'),
    ];
  }
}

class _TermDefinition {
  const _TermDefinition(this.title, this.description);

  final String title;
  final String description;
}

class _PanjikaYogaCard extends StatelessWidget {
  const _PanjikaYogaCard({
    required this.yoga,
    required this.timezone,
    required this.isRu,
  });

  final PanjikaYogaDay yoga;
  final String timezone;
  final bool isRu;

  @override
  Widget build(BuildContext context) {
    final formatter = const PanchangaFormatter();
    final favorable = [
      ..._windowLines(
        title: isRu ? 'Амрита' : 'Amrita',
        windows: yoga.amrita,
        formatter: formatter,
      ),
      ..._windowLines(
        title: isRu ? 'Махендра' : 'Mahendra',
        windows: yoga.mahendra,
        formatter: formatter,
      ),
    ];
    final unfavorable = [
      ..._windowLines(
        title: isRu ? 'Вакра' : 'Vakra',
        windows: yoga.vakra,
        formatter: formatter,
      ),
      ..._windowLines(
        title: isRu ? 'Шунья' : 'Shunya',
        windows: yoga.shunya,
        formatter: formatter,
      ),
    ];

    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Theme.of(context).colorScheme.outline),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              isRu ? 'Амрита / Махендра-йога' : 'Amrita / Mahendra-yoga',
              style: Theme.of(
                context,
              ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 4),
            Text(
              isRu
                  ? 'День и ночь делятся на 15 частей; таблица панжики выбирает окна для текущего солнечного месяца и дня недели.'
                  : 'Day and night are divided into 15 parts; the Panjika table selects windows for the current solar month and weekday.',
              style: TextStyle(
                color: Theme.of(
                  context,
                ).extension<VCalendarColors>()!.mutedText,
              ),
            ),
            const SizedBox(height: 10),
            if (favorable.isNotEmpty)
              _JyotishAdviceBlock(
                title: isRu ? 'Благоприятно' : 'Favorable',
                values: favorable,
                tone: _AdviceTone.good,
              ),
            if (favorable.isNotEmpty && unfavorable.isNotEmpty)
              const SizedBox(height: 8),
            if (unfavorable.isNotEmpty)
              _JyotishAdviceBlock(
                title: isRu ? 'Нежелательно' : 'Unfavorable',
                values: unfavorable,
                tone: _AdviceTone.bad,
              ),
          ],
        ),
      ),
    );
  }

  List<String> _windowLines({
    required String title,
    required List<PanjikaYogaWindow> windows,
    required PanchangaFormatter formatter,
  }) {
    return windows
        .map((window) {
          final phase = window.isNight
              ? (isRu ? 'ночь' : 'night')
              : (isRu ? 'день' : 'day');
          return '$title · $phase ${formatter.time(window.start, timezone)}-${formatter.time(window.end, timezone)}';
        })
        .toList(growable: false);
  }
}

enum _AdviceTone { good, bad }

class _JyotishAdviceBlock extends StatelessWidget {
  const _JyotishAdviceBlock({
    required this.title,
    required this.values,
    required this.tone,
  });

  final String title;
  final List<String> values;
  final _AdviceTone tone;

  @override
  Widget build(BuildContext context) {
    final isGood = tone == _AdviceTone.good;
    final baseColor = isGood
        ? const Color(0xFF188654)
        : const Color(0xFFC83E35);
    final onSurface = Theme.of(context).colorScheme.onSurface;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: baseColor.withValues(alpha: 0.13),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: baseColor.withValues(alpha: 0.55)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(10),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: Theme.of(context).textTheme.labelMedium?.copyWith(
                color: baseColor,
                fontWeight: FontWeight.w900,
              ),
            ),
            const SizedBox(height: 6),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                for (final value in values)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 3),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '• ',
                          style: Theme.of(context).textTheme.bodyMedium
                              ?.copyWith(
                                color: baseColor,
                                fontWeight: FontWeight.w900,
                                height: 1.22,
                              ),
                        ),
                        Expanded(
                          child: Text(
                            value,
                            style: Theme.of(context).textTheme.bodyMedium
                                ?.copyWith(
                                  color: onSurface,
                                  fontWeight: FontWeight.w700,
                                  height: 1.22,
                                ),
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _EventsSection extends StatelessWidget {
  const _EventsSection({
    required this.events,
    required this.panchanga,
    required this.timezone,
    required this.isRu,
  });

  final List<MobileEvent> events;
  final PanchangaDay panchanga;
  final String timezone;
  final bool isRu;

  @override
  Widget build(BuildContext context) {
    final paranaWindow = _paranaWindowLabel();
    if (events.isEmpty) {
      return Text(
        isRu ? 'Событий на этот день пока нет.' : 'No events for this day yet.',
        style: TextStyle(
          color: Theme.of(context).extension<VCalendarColors>()!.mutedText,
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          isRu ? 'События' : 'Events',
          style: Theme.of(context).textTheme.titleSmall?.copyWith(
            fontSize: 17,
            fontWeight: FontWeight.w900,
          ),
        ),
        const SizedBox(height: 8),
        for (final event in events)
          _EventTile(
            event: event,
            paranaWindow: event.eventType == 'parana' ? paranaWindow : null,
          ),
      ],
    );
  }

  _ParanaWindowLabel? _paranaWindowLabel() {
    if (panchanga.tithiAtSunrise.shortName != 'Dvadashi') return null;
    final daylight = panchanga.sunset.difference(panchanga.sunrise);
    final oneFifthEnd = panchanga.sunrise.add(
      Duration(milliseconds: (daylight.inMilliseconds / 5).round()),
    );
    final oneThirdEnd = panchanga.sunrise.add(
      Duration(milliseconds: (daylight.inMilliseconds / 3).round()),
    );
    final tithiEnd = panchanga.tithiEnd;
    final preferredEnd =
        tithiEnd != null &&
            tithiEnd.isAfter(panchanga.sunrise) &&
            tithiEnd.isBefore(oneThirdEnd)
        ? tithiEnd
        : oneThirdEnd;
    final fifthEnd =
        tithiEnd != null &&
            tithiEnd.isAfter(panchanga.sunrise) &&
            tithiEnd.isBefore(oneFifthEnd)
        ? tithiEnd
        : oneFifthEnd;
    final formatter = const PanchangaFormatter();
    final start = formatter.time(panchanga.sunrise, timezone);
    final preferred = formatter.time(preferredEnd, timezone);
    final fifth = formatter.time(fifthEnd, timezone);
    return _ParanaWindowLabel(
      summary: isRu
          ? 'Время парана: $start-$preferred'
          : 'Parana time: $start-$preferred',
      oneFifth: isRu ? 'Окончание по 1/5 дня: $fifth' : '1/5 day end: $fifth',
    );
  }
}

class _EventTile extends StatelessWidget {
  const _EventTile({required this.event, this.paranaWindow});

  final MobileEvent event;
  final _ParanaWindowLabel? paranaWindow;

  @override
  Widget build(BuildContext context) {
    final description = _cleanDescription(
      event.fullDescription ?? event.shortDescription,
    );
    final colors = Theme.of(context).extension<VCalendarColors>()!;
    final eventStyle = _eventStyle(context, colors);
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Material(
        color: eventStyle.background,
        clipBehavior: Clip.antiAlias,
        shape: RoundedRectangleBorder(
          side: BorderSide(
            color: eventStyle.border,
            width: eventStyle.tone == 'ekadashi' ? 2 : 1,
          ),
          borderRadius: BorderRadius.circular(14),
        ),
        child: ExpansionTile(
          iconColor: eventStyle.foreground.withValues(alpha: 0.74),
          collapsedIconColor: eventStyle.foreground.withValues(alpha: 0.64),
          tilePadding: const EdgeInsets.symmetric(horizontal: 12),
          childrenPadding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
          title: Text(
            event.name,
            style: Theme.of(context).textTheme.titleSmall?.copyWith(
              color: eventStyle.foreground,
              fontWeight: FontWeight.w900,
            ),
          ),
          subtitle: paranaWindow == null && event.shortDescription == null
              ? null
              : Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (paranaWindow != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        paranaWindow!.summary,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: eventStyle.foreground,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ],
                    if (event.shortDescription != null)
                      Text(
                        event.shortDescription!,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: eventStyle.foreground.withValues(alpha: 0.78),
                        ),
                      ),
                  ],
                ),
          children: [
            if (paranaWindow != null) ...[
              Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  paranaWindow!.oneFifth,
                  style: TextStyle(
                    color: eventStyle.foreground,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              const SizedBox(height: 8),
            ],
            if (description == null || description.trim().isEmpty)
              const SizedBox.shrink()
            else
              Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  description,
                  style: TextStyle(color: eventStyle.foreground),
                ),
              ),
          ],
        ),
      ),
    );
  }

  _EventVisualStyle _eventStyle(BuildContext context, VCalendarColors colors) {
    final theme = Theme.of(context);
    final tone = _webEventTone(event) ?? 'festival';
    final isDark = theme.brightness == Brightness.dark;
    final isSepia = theme.scaffoldBackgroundColor == const Color(0xFFF7EFDF);
    final surface = theme.colorScheme.surface;
    final primary = theme.colorScheme.primary;
    switch (tone) {
      case 'ekadashi':
        return _EventVisualStyle(
          tone: tone,
          background: isDark
              ? const Color(0xFF3949AB).withValues(alpha: 0.24)
              : const Color(0xFFEEF1FF),
          foreground: isDark
              ? const Color(0xFFC7D2FE)
              : const Color(0xFF3949AB),
          border: const Color(0xFFD4A017),
        );
      case 'notice':
        return _EventVisualStyle(
          tone: tone,
          background: surface,
          foreground: colors.mutedText,
          border: colors.mutedText.withValues(alpha: 0.34),
        );
      case 'parana':
        return _EventVisualStyle(
          tone: tone,
          background: isDark
              ? const Color(0xFF6EE7B7).withValues(alpha: 0.13)
              : isSepia
              ? const Color(0xFFE6F5EE)
              : const Color(0xFFEEFAF5),
          foreground: isDark
              ? const Color(0xFF6EE7B7)
              : isSepia
              ? const Color(0xFF23705F)
              : const Color(0xFF3B8A78),
          border: isDark
              ? const Color(0xFF6EE7B7)
              : isSepia
              ? const Color(0xFF23705F)
              : const Color(0xFF3B8A78),
        );
      case 'vaishnava':
        return _EventVisualStyle(
          tone: tone,
          background: isDark
              ? const Color(0xFFC4B5FD).withValues(alpha: 0.14)
              : isSepia
              ? const Color(0xFFF3EBF8)
              : const Color(0xFFF6F1FB),
          foreground: isDark
              ? const Color(0xFFC4B5FD)
              : isSepia
              ? const Color(0xFF7A4CA0)
              : const Color(0xFF8667B8),
          border: isDark
              ? const Color(0xFFC4B5FD)
              : isSepia
              ? const Color(0xFF7A4CA0)
              : const Color(0xFF8667B8),
        );
      case 'deity':
        return _EventVisualStyle(
          tone: tone,
          background: isDark
              ? const Color(0xFF5EEAD4).withValues(alpha: 0.13)
              : isSepia
              ? const Color(0xFFF1F4D7)
              : const Color(0xFFF5F8E8),
          foreground: isDark
              ? const Color(0xFF5EEAD4)
              : isSepia
              ? const Color(0xFF626C1F)
              : const Color(0xFF6F8A38),
          border: isDark
              ? const Color(0xFF5EEAD4)
              : isSepia
              ? const Color(0xFF626C1F)
              : const Color(0xFF6F8A38),
        );
      case 'purushottama':
        return _EventVisualStyle(
          tone: tone,
          background: primary.withValues(alpha: isDark ? 0.14 : 0.10),
          foreground: primary,
          border: primary.withValues(alpha: 0.60),
        );
      case 'festival':
      default:
        return _EventVisualStyle(
          tone: tone,
          background: isDark
              ? const Color(0xFFFBBF24).withValues(alpha: 0.28)
              : isSepia
              ? const Color(0xFFFFDFAD)
              : const Color(0xFFFFE5BF),
          foreground: isDark
              ? const Color(0xFFFBBF24)
              : isSepia
              ? const Color(0xFF9A3412)
              : const Color(0xFFA66A2B),
          border: isDark
              ? const Color(0xFFFBBF24).withValues(alpha: 0.72)
              : isSepia
              ? const Color(0xFF9A3412).withValues(alpha: 0.42)
              : const Color(0xFFA66A2B).withValues(alpha: 0.36),
        );
    }
  }

  String? _cleanDescription(String? value) {
    final text = value?.trim();
    if (text == null || text.isEmpty) return null;
    return text
        .replaceAllMapped(
          RegExp(r'\[([^\]]+)\]\([^)]+\)'),
          (match) => match.group(1) ?? '',
        )
        .replaceAll('**', '')
        .replaceAll('__', '')
        .trim();
  }
}

class _ParanaWindowLabel {
  const _ParanaWindowLabel({required this.summary, required this.oneFifth});

  final String summary;
  final String oneFifth;
}

class _EventVisualStyle {
  const _EventVisualStyle({
    required this.tone,
    required this.background,
    required this.foreground,
    required this.border,
  });

  final String tone;
  final Color background;
  final Color foreground;
  final Color border;
}

class _SeedSummaryCard extends StatelessWidget {
  const _SeedSummaryCard({required this.summary, required this.isRu});

  final MobileSeedSummary summary;
  final bool isRu;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              isRu ? 'Офлайн-база готова' : 'Offline database is ready',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontSize: 18,
                fontWeight: FontWeight.w900,
              ),
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: [
                _Metric(
                  label: isRu ? 'События' : 'Events',
                  value: summary.eventCount.toString(),
                ),
                _Metric(
                  label: isRu ? 'Локации' : 'Locations',
                  value: summary.locationCount.toString(),
                ),
                _Metric(
                  label: isRu ? 'Экадаши' : 'Ekadashi',
                  value: summary.ekadashiCount.toString(),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _Metric extends StatelessWidget {
  const _Metric({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Theme.of(context).colorScheme.outline),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(label, style: Theme.of(context).textTheme.labelMedium),
            const SizedBox(height: 2),
            Text(
              value,
              style: Theme.of(
                context,
              ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w900),
            ),
          ],
        ),
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.error, required this.onRetry});

  final String error;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'Не удалось открыть офлайн-базу',
              style: Theme.of(context).textTheme.titleLarge,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 12),
            Text(error, textAlign: TextAlign.center),
            const SizedBox(height: 16),
            FilledButton(onPressed: onRetry, child: const Text('Повторить')),
          ],
        ),
      ),
    );
  }
}

class _HomeState {
  const _HomeState({
    required this.summary,
    required this.locations,
    required this.events,
    required this.languages,
    required this.glossary,
    required this.calendarCache,
  });

  final MobileSeedSummary summary;
  final List<CalendarLocation> locations;
  final List<MobileEvent> events;
  final List<String> languages;
  final List<GlossaryTerm> glossary;
  final Map<String, CachedCalendarDay> calendarCache;
}

class _EventFilterDefinition {
  const _EventFilterDefinition({
    required this.id,
    required this.ruLabel,
    required this.enLabel,
  });

  final String id;
  final String ruLabel;
  final String enLabel;

  String label({required bool isRu}) => isRu ? ruLabel : enLabel;
}
