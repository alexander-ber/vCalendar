import 'app_theme.dart';

class AppSettings {
  const AppSettings({
    required this.lang,
    required this.themeMode,
    required this.fontScale,
    required this.compactMode,
    required this.locationId,
    required this.onlyDaysWithEvents,
    required this.enabledEventCategories,
    required this.vaishnavaEventKind,
    required this.contentAutoUpdate,
    required this.contentUpdateIntervalHours,
    required this.calendarDigitFont,
    required this.calendarDigitBold,
    required this.calendarDigitItalic,
    required this.calendarDigitScale,
  });

  static const defaults = AppSettings(
    lang: 'ru',
    themeMode: AppThemeMode.sepia,
    fontScale: 1,
    compactMode: true,
    locationId: 'nabadwip',
    onlyDaysWithEvents: false,
    enabledEventCategories: {},
    vaishnavaEventKind: 'any',
    contentAutoUpdate: true,
    contentUpdateIntervalHours: 24,
    calendarDigitFont: CalendarDigitFont.system,
    calendarDigitBold: true,
    calendarDigitItalic: false,
    calendarDigitScale: 1,
  );

  final String lang;
  final AppThemeMode themeMode;
  final double fontScale;
  final bool compactMode;
  final String locationId;
  final bool onlyDaysWithEvents;
  final Set<String> enabledEventCategories;
  final String vaishnavaEventKind;
  final bool contentAutoUpdate;
  final int contentUpdateIntervalHours;
  final String calendarDigitFont;
  final bool calendarDigitBold;
  final bool calendarDigitItalic;
  final double calendarDigitScale;

  AppSettings copyWith({
    String? lang,
    AppThemeMode? themeMode,
    double? fontScale,
    bool? compactMode,
    String? locationId,
    bool? onlyDaysWithEvents,
    Set<String>? enabledEventCategories,
    String? vaishnavaEventKind,
    bool? contentAutoUpdate,
    int? contentUpdateIntervalHours,
    String? calendarDigitFont,
    bool? calendarDigitBold,
    bool? calendarDigitItalic,
    double? calendarDigitScale,
  }) {
    return AppSettings(
      lang: lang ?? this.lang,
      themeMode: themeMode ?? this.themeMode,
      fontScale: fontScale ?? this.fontScale,
      compactMode: compactMode ?? this.compactMode,
      locationId: locationId ?? this.locationId,
      onlyDaysWithEvents: onlyDaysWithEvents ?? this.onlyDaysWithEvents,
      enabledEventCategories:
          enabledEventCategories ?? this.enabledEventCategories,
      vaishnavaEventKind: vaishnavaEventKind ?? this.vaishnavaEventKind,
      contentAutoUpdate: contentAutoUpdate ?? this.contentAutoUpdate,
      contentUpdateIntervalHours:
          contentUpdateIntervalHours ?? this.contentUpdateIntervalHours,
      calendarDigitFont: calendarDigitFont ?? this.calendarDigitFont,
      calendarDigitBold: calendarDigitBold ?? this.calendarDigitBold,
      calendarDigitItalic: calendarDigitItalic ?? this.calendarDigitItalic,
      calendarDigitScale: calendarDigitScale ?? this.calendarDigitScale,
    );
  }
}

/// Font family ids for the calendar day-number digits (settings screen).
/// Bold/italic are applied on top via [FontWeight]/[FontStyle], not baked
/// into separate bundled files - see pubspec.yaml's `fonts:` section for
/// the actual asset registrations these family names resolve to.
class CalendarDigitFont {
  static const system = 'system';
  static const inter = 'Inter';
  static const nunito = 'Nunito';
  static const yatraOne = 'YatraOne';
  static const khand = 'Khand';
  static const rajdhani = 'Rajdhani';
  static const dancingScript = 'DancingScript';
  static const sacramento = 'Sacramento';

  static const values = [
    system,
    inter,
    nunito,
    yatraOne,
    khand,
    rajdhani,
    dancingScript,
    sacramento,
  ];

  static String label(String id, {required bool isRu}) {
    const labelsRu = {
      system: 'По умолчанию',
      inter: 'Inter',
      nunito: 'Nunito',
      yatraOne: 'Yatra One',
      khand: 'Khand',
      rajdhani: 'Rajdhani',
      dancingScript: 'Dancing Script',
      sacramento: 'Sacramento',
    };
    const labelsEn = {
      system: 'Default',
      inter: 'Inter',
      nunito: 'Nunito',
      yatraOne: 'Yatra One',
      khand: 'Khand',
      rajdhani: 'Rajdhani',
      dancingScript: 'Dancing Script',
      sacramento: 'Sacramento',
    };
    return (isRu ? labelsRu : labelsEn)[id] ?? id;
  }
}
