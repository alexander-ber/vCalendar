import 'package:timezone/timezone.dart' as tz;

class PanchangaFormatter {
  const PanchangaFormatter();

  String time(DateTime utc, String timezone) {
    final local = tz.TZDateTime.from(utc, tz.getLocation(timezone));
    return '${_two(local.hour)}:${_two(local.minute)}';
  }

  String dateTime(DateTime? utc, String timezone) {
    if (utc == null) return '-';
    final local = tz.TZDateTime.from(utc, tz.getLocation(timezone));
    return '${local.year}-${_two(local.month)}-${_two(local.day)} ${_two(local.hour)}:${_two(local.minute)}';
  }

  String _two(int value) => value.toString().padLeft(2, '0');
}
