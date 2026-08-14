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
  );

  final String lang;
  final AppThemeMode themeMode;
  final double fontScale;
  final bool compactMode;
  final String locationId;
  final bool onlyDaysWithEvents;
  final Set<String> enabledEventCategories;
  final String vaishnavaEventKind;

  AppSettings copyWith({
    String? lang,
    AppThemeMode? themeMode,
    double? fontScale,
    bool? compactMode,
    String? locationId,
    bool? onlyDaysWithEvents,
    Set<String>? enabledEventCategories,
    String? vaishnavaEventKind,
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
    );
  }
}
