import 'package:flutter/material.dart';
import 'package:timezone/data/latest.dart' as tz;

import 'app/vcalendar_app.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  tz.initializeTimeZones();
  runApp(const VCalendarApp());
}
