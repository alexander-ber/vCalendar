class MonthDay {
  const MonthDay({
    required this.date,
    required this.inCurrentMonth,
    required this.isToday,
  });

  final DateTime date;
  final bool inCurrentMonth;
  final bool isToday;
}
