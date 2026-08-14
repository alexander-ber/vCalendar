import 'package:shared_preferences/shared_preferences.dart';

import '../../app/app_settings.dart';
import '../../app/app_theme.dart';

class PreferencesStore {
  static const _lang = 'lang';
  static const _theme = 'theme';
  static const _fontScale = 'font_scale';
  static const _compactMode = 'compact_mode';
  static const _locationId = 'location_id';
  static const _onlyDaysWithEvents = 'only_days_with_events';
  static const _enabledEventCategories = 'enabled_event_categories';
  static const _vaishnavaEventKind = 'vaishnava_event_kind';

  Future<AppSettings> load() async {
    final prefs = await SharedPreferences.getInstance();
    return AppSettings(
      lang: prefs.getString(_lang) ?? AppSettings.defaults.lang,
      themeMode: _themeModeFromString(prefs.getString(_theme)),
      fontScale: prefs.getDouble(_fontScale) ?? AppSettings.defaults.fontScale,
      compactMode:
          prefs.getBool(_compactMode) ?? AppSettings.defaults.compactMode,
      locationId:
          prefs.getString(_locationId) ?? AppSettings.defaults.locationId,
      onlyDaysWithEvents:
          prefs.getBool(_onlyDaysWithEvents) ??
          AppSettings.defaults.onlyDaysWithEvents,
      enabledEventCategories:
          prefs.getStringList(_enabledEventCategories)?.toSet() ??
          AppSettings.defaults.enabledEventCategories,
      vaishnavaEventKind:
          prefs.getString(_vaishnavaEventKind) ??
          AppSettings.defaults.vaishnavaEventKind,
    );
  }

  Future<void> save(AppSettings settings) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_lang, settings.lang);
    await prefs.setString(_theme, settings.themeMode.name);
    await prefs.setDouble(_fontScale, settings.fontScale);
    await prefs.setBool(_compactMode, settings.compactMode);
    await prefs.setString(_locationId, settings.locationId);
    await prefs.setBool(_onlyDaysWithEvents, settings.onlyDaysWithEvents);
    await prefs.setStringList(
      _enabledEventCategories,
      settings.enabledEventCategories.toList()..sort(),
    );
    await prefs.setString(_vaishnavaEventKind, settings.vaishnavaEventKind);
  }

  AppThemeMode _themeModeFromString(String? value) {
    return AppThemeMode.values.firstWhere(
      (item) => item.name == value,
      orElse: () => AppSettings.defaults.themeMode,
    );
  }
}
