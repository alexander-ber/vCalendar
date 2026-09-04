/// Mirrors js/date-utils.js's `addDaysToLocalDate`: calendar-day arithmetic
/// must reconstruct the date from adjusted year/month/day fields, not add a
/// fixed [Duration] to a local [DateTime].
///
/// `DateTime.add(Duration(days: n))` adds exactly n*24 hours of elapsed
/// time. That's correct for a UTC instant, but wrong for a calendar day:
/// as soon as the device's own local timezone crosses a DST transition, it
/// lands on the wrong wall-clock day (e.g. 23:00 on the same day instead of
/// the next midnight). A loop that steps day-by-day with it can get stuck
/// reprocessing one date forever instead of ever advancing past the
/// transition.
DateTime addCalendarDays(DateTime date, int days) {
  return DateTime(date.year, date.month, date.day + days);
}
