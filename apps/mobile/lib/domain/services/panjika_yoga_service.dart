class PanjikaYogaService {
  const PanjikaYogaService();

  PanjikaYogaDay calculate({
    required DateTime date,
    required String bengaliSolarMonth,
    required DateTime sunrise,
    required DateTime sunset,
    required DateTime nextSunrise,
  }) {
    final group = _monthGroupByBengaliSolarMonth[bengaliSolarMonth];
    final weekday = _weekdayKey(date);
    final table = group == null ? null : _panjikaYogaTables[group];
    final dayPattern = table == null ? null : table.day[weekday];
    final nightPattern = table == null ? null : table.night[weekday];
    if (dayPattern == null || nightPattern == null) {
      return PanjikaYogaDay.empty(
        bengaliSolarMonth: bengaliSolarMonth,
        weekday: weekday,
        monthGroup: group,
      );
    }

    final dayBoundaries = _boundaries(sunrise, sunset);
    final nightBoundaries = _boundaries(sunset, nextSunrise);
    return PanjikaYogaDay(
      bengaliSolarMonth: bengaliSolarMonth,
      weekday: weekday,
      monthGroup: group,
      amrita: [
        ..._rangesForCode(dayPattern, 'A', dayBoundaries, isNight: false),
        ..._rangesForCode(nightPattern, 'A', nightBoundaries, isNight: true),
      ],
      mahendra: [
        ..._rangesForCode(dayPattern, 'M', dayBoundaries, isNight: false),
        ..._rangesForCode(nightPattern, 'M', nightBoundaries, isNight: true),
      ],
      vakra: [
        ..._rangesForCode(dayPattern, 'V', dayBoundaries, isNight: false),
        ..._rangesForCode(nightPattern, 'V', nightBoundaries, isNight: true),
      ],
      shunya: [
        ..._rangesForCode(dayPattern, 'S', dayBoundaries, isNight: false),
        ..._rangesForCode(nightPattern, 'S', nightBoundaries, isNight: true),
      ],
    );
  }

  List<DateTime> _boundaries(DateTime start, DateTime end) {
    final duration = end.difference(start);
    return List.generate(16, (index) {
      return start.add(
        Duration(milliseconds: (duration.inMilliseconds * index / 15).round()),
      );
    });
  }

  List<PanjikaYogaWindow> _rangesForCode(
    String pattern,
    String code,
    List<DateTime> boundaries, {
    required bool isNight,
  }) {
    final ranges = <PanjikaYogaWindow>[];
    int? start;
    for (var index = 0; index <= pattern.length; index += 1) {
      if (index < pattern.length && pattern[index] == code) {
        start ??= index;
      } else if (start != null) {
        ranges.add(
          PanjikaYogaWindow(
            start: boundaries[start],
            end: boundaries[index],
            fromPart: start,
            toPart: index,
            isNight: isNight,
          ),
        );
        start = null;
      }
    }
    return ranges;
  }

  String _weekdayKey(DateTime date) {
    return switch (date.weekday) {
      DateTime.monday => 'mon',
      DateTime.tuesday => 'tue',
      DateTime.wednesday => 'wed',
      DateTime.thursday => 'thu',
      DateTime.friday => 'fri',
      DateTime.saturday => 'sat',
      DateTime.sunday => 'sun',
      _ => 'sun',
    };
  }
}

class PanjikaYogaDay {
  const PanjikaYogaDay({
    required this.bengaliSolarMonth,
    required this.weekday,
    required this.monthGroup,
    required this.amrita,
    required this.mahendra,
    required this.vakra,
    required this.shunya,
  });

  factory PanjikaYogaDay.empty({
    required String bengaliSolarMonth,
    required String weekday,
    required String? monthGroup,
  }) {
    return PanjikaYogaDay(
      bengaliSolarMonth: bengaliSolarMonth,
      weekday: weekday,
      monthGroup: monthGroup,
      amrita: const [],
      mahendra: const [],
      vakra: const [],
      shunya: const [],
    );
  }

  final String bengaliSolarMonth;
  final String weekday;
  final String? monthGroup;
  final List<PanjikaYogaWindow> amrita;
  final List<PanjikaYogaWindow> mahendra;
  final List<PanjikaYogaWindow> vakra;
  final List<PanjikaYogaWindow> shunya;
}

class PanjikaYogaWindow {
  const PanjikaYogaWindow({
    required this.start,
    required this.end,
    required this.fromPart,
    required this.toPart,
    required this.isNight,
  });

  final DateTime start;
  final DateTime end;
  final int fromPart;
  final int toPart;
  final bool isNight;
}

class _YogaTable {
  const _YogaTable({required this.day, required this.night});

  final Map<String, String> day;
  final Map<String, String> night;
}

const _monthGroupByBengaliSolarMonth = {
  'Vaishakha': 'G1',
  'Shravana': 'G1',
  'Bhadra': 'G1',
  'Magha': 'G1',
  'Phalguna': 'G1',
  'Chaitra': 'G1',
  'Jyeshtha': 'G2',
  'Ashadha': 'G2',
  'Ashvina': 'G3',
  'Kartika': 'G3',
  'Agrahayana': 'G3',
  'Pausha': 'G3',
};

const _panjikaYogaTables = {
  'G1': _YogaTable(
    day: {
      'sun': 'MAAAASSSSMVVVVV',
      'mon': 'AAVVVVAAAVVVMMS',
      'tue': 'VVSAAAVVSAASAAS',
      'wed': 'AAVVVAASVVMMAAS',
      'thu': 'MMSVVVMMMSSVVSS',
      'fri': 'AAVSSSVVVAASSAA',
      'sat': 'SSVSSAAAASSVVSS',
    },
    night: {
      'sun': 'MAAAASSSSMVVVVV',
      'mon': 'VAAAVVVAAAASSSS',
      'tue': 'AVVSAAAVVVAAVVS',
      'wed': 'SAAAMMVVSSAAAAA',
      'thu': 'VVVVVSSVVAAASSS',
      'fri': 'VVAASSMVVVSSAMM',
      'sat': 'SVVAAAVVAAVAASS',
    },
  ),
  'G2': _YogaTable(
    day: {
      'sun': 'SSAAAVVVAAAVVMS',
      'mon': 'VVVVAASSSVVVVSS',
      'tue': 'AAASSAAAVVVMAMS',
      'wed': 'SVVAAAAVVVAAAAS',
      'thu': 'MSVVVMMSSVVVAAA',
      'fri': 'SMVVVMSSAAAVVSS',
      'sat': 'MSVVVMMMSSVVAAA',
    },
    night: {
      'sun': 'AASSVVAAAVVVVSS',
      'mon': 'VVVVAAAASSAASMS',
      'tue': 'AVVMMSSVAAASVVV',
      'wed': 'AAAAASVVAASSSSS',
      'thu': 'SAAASVVSAAASSAA',
      'fri': 'AAASVVSSSAAASAA',
      'sat': 'SAVVVVSAAASSAAA',
    },
  ),
  'G3': _YogaTable(
    day: {
      'sun': 'SAAAVVVVAAAASMS',
      'mon': 'AASSAAAVVVVVVVV',
      'tue': 'AVAAAAAVVVSSSVV',
      'wed': 'AMAVVVAAASMMMVV',
      'thu': 'AAVVSSVVVSAAVVV',
      'fri': 'AVAAAVVVAAAASAA',
      'sat': 'AVAAAVVVAAAASAA',
    },
    night: {
      'sun': 'SVVAAVVVAASAAAA',
      'mon': 'VVVAAAAVVVVAVVV',
      'tue': 'MMMASAAAVVAASSA',
      'wed': 'VAVVAAAAAAAAVSS',
      'thu': 'SAAAAVVVAAAASAA',
      'fri': 'VAAAAVVVAAAASAA',
      'sat': 'VVVVVSSVVAAMSSS',
    },
  ),
};
