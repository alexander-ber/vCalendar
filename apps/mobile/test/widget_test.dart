import 'package:flutter_test/flutter_test.dart';

import 'package:vcalendar_mobile/app/app_theme.dart';

void main() {
  test('builds supported app themes', () {
    for (final mode in AppThemeMode.values) {
      final theme = AppTheme.fromMode(mode);
      expect(theme.extensions[VCalendarColors], isA<VCalendarColors>());
    }
  });
}
