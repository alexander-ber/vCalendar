import '../date_utils.dart';
import '../models/month_day.dart';

class MonthGridService {
  const MonthGridService();

  List<MonthDay> buildMonth({
    required DateTime month,
    required int weekStart,
    DateTime? today,
  }) {
    final normalizedToday = _dateOnly(today ?? DateTime.now());
    final first = DateTime(month.year, month.month);
    final daysBefore = (first.weekday % 7 - weekStart) % 7;
    final start = addCalendarDays(first, -daysBefore);
    final days = <MonthDay>[];

    for (var index = 0; index < 42; index += 1) {
      final date = addCalendarDays(start, index);
      days.add(
        MonthDay(
          date: date,
          inCurrentMonth: date.month == month.month,
          isToday: _sameDate(date, normalizedToday),
        ),
      );
    }

    final lastWeek = days.sublist(days.length - 7);
    if (lastWeek.every((day) => !day.inCurrentMonth)) {
      return days.sublist(0, days.length - 7);
    }
    return days;
  }

  DateTime _dateOnly(DateTime date) {
    return DateTime(date.year, date.month, date.day);
  }

  bool _sameDate(DateTime a, DateTime b) {
    return a.year == b.year && a.month == b.month && a.day == b.day;
  }
}
