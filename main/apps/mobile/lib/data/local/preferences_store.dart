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
  static const _contentAutoUpdate = 'content_auto_update';
  static const _contentUpdateIntervalHours = 'content_update_interval_hours';
  static const _lastContentUpdateCheck = 'last_content_update_check';
  static const _calendarDigitFont = 'calendar_digit_font';
  static const _calendarDigitBold = 'calendar_digit_bold';
  static const _calendarDigitItalic = 'calendar_digit_italic';
  static const _calendarDigitScale = 'calendar_digit_scale';

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
      contentAutoUpdate:
          prefs.getBool(_contentAutoUpdate) ??
          AppSettings.defaults.contentAutoUpdate,
      contentUpdateIntervalHours:
          prefs.getInt(_contentUpdateIntervalHours) ??
          AppSettings.defaults.contentUpdateIntervalHours,
      calendarDigitFont:
          prefs.getString(_calendarDigitFont) ??
          AppSettings.defaults.calendarDigitFont,
      calendarDigitBold:
          prefs.getBool(_calendarDigitBold) ??
          AppSettings.defaults.calendarDigitBold,
      calendarDigitItalic:
          prefs.getBool(_calendarDigitItalic) ??
          AppSettings.defaults.calendarDigitItalic,
      calendarDigitScale:
          prefs.getDouble(_calendarDigitScale) ??
          AppSettings.defaults.calendarDigitScale,
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
    await prefs.setBool(_contentAutoUpdate, settings.contentAutoUpdate);
    await prefs.setInt(
      _contentUpdateIntervalHours,
      settings.contentUpdateIntervalHours,
    );
    await prefs.setString(_calendarDigitFont, settings.calendarDigitFont);
    await prefs.setBool(_calendarDigitBold, settings.calendarDigitBold);
    await prefs.setBool(_calendarDigitItalic, settings.calendarDigitItalic);
    await prefs.setDouble(_calendarDigitScale, settings.calendarDigitScale);
  }

  Future<bool> isContentUpdateDue(int intervalHours) async {
    final prefs = await SharedPreferences.getInstance();
    final rawValue = prefs.getString(_lastContentUpdateCheck);
    if (rawValue == null) return true;
    final lastCheck = DateTime.tryParse(rawValue);
    if (lastCheck == null) return true;
    final interval = Duration(hours: intervalHours.clamp(1, 24 * 30));
    return DateTime.now().toUtc().difference(lastCheck.toUtc()) >= interval;
  }

  Future<void> markContentUpdateChecked(DateTime checkedAt) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      _lastContentUpdateCheck,
      checkedAt.toUtc().toIso8601String(),
    );
  }

  AppThemeMode _themeModeFromString(String? value) {
    return AppThemeMode.values.firstWhere(
      (item) => item.name == value,
      orElse: () => AppSettings.defaults.themeMode,
    );
  }
}
