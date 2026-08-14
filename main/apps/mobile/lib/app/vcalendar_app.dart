import 'package:flutter/material.dart';

import '../data/local/preferences_store.dart';
import '../features/home/home_screen.dart';
import 'app_settings.dart';
import 'app_theme.dart';

class VCalendarApp extends StatefulWidget {
  const VCalendarApp({super.key});

  @override
  State<VCalendarApp> createState() => _VCalendarAppState();
}

class _VCalendarAppState extends State<VCalendarApp> {
  final PreferencesStore _preferences = PreferencesStore();
  late final Future<AppSettings> _settingsFuture;
  AppSettings? _settings;

  @override
  void initState() {
    super.initState();
    _settingsFuture = _preferences.load();
  }

  Future<void> _updateSettings(AppSettings settings) async {
    setState(() => _settings = settings);
    await _preferences.save(settings);
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<AppSettings>(
      future: _settingsFuture,
      builder: (context, snapshot) {
        final effectiveSettings =
            _settings ?? snapshot.data ?? AppSettings.defaults;

        return MaterialApp(
          debugShowCheckedModeBanner: false,
          title: 'Sree Caitanya Sridhar Seva Ashram',
          theme: AppTheme.fromMode(effectiveSettings.themeMode),
          builder: (context, child) {
            return MediaQuery(
              data: MediaQuery.of(context).copyWith(
                textScaler: TextScaler.linear(effectiveSettings.fontScale),
              ),
              child: child ?? const SizedBox.shrink(),
            );
          },
          home: snapshot.connectionState != ConnectionState.done
              ? const Scaffold(body: Center(child: CircularProgressIndicator()))
              : HomeScreen(
                  settings: effectiveSettings,
                  onSettingsChanged: _updateSettings,
                ),
        );
      },
    );
  }
}
