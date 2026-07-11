// Bengali Panjika muhurta-yoga table.
// The day and night are divided into 15 equal parts locally; these patterns
// select which parts are Amrita, Mahendra, Vakra, or Shunya.
const CODE_AMRITA = "A";
const CODE_MAHENDRA = "M";

const MONTH_GROUP_BY_BENGALI_SOLAR_MONTH = {
  Vaishakha: "G1",
  Shravana: "G1",
  Bhadra: "G1",
  Magha: "G1",
  Phalguna: "G1",
  Chaitra: "G1",

  Jyeshtha: "G2",
  Ashadha: "G2",

  Ashvina: "G3",
  Kartika: "G3",
  Agrahayana: "G3",
  Pausha: "G3"
};

const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

const PANJIKA_YOGA_TABLES = {
  G1: {
    day: {
      sun: "MAAAASSSSMVVVVV",
      mon: "AAVVVVAAAVVVMMS",
      tue: "VVSAAAVVSAASAAS",
      wed: "AAVVVAASVVMMAAS",
      thu: "MMSVVVMMMSSVVSS",
      fri: "AAVSSSVVVAASSAA",
      sat: "SSVSSAAAASSVVSS"
    },
    night: {
      sun: "MAAAASSSSMVVVVV",
      mon: "VAAAVVVAAAASSSS",
      tue: "AVVSAAAVVVAAVVS",
      wed: "SAAAMMVVSSAAAAA",
      thu: "VVVVVSSVVAAASSS",
      fri: "VVAASSMVVVSSAMM",
      sat: "SVVAAAVVAAVAASS"
    }
  },
  G2: {
    day: {
      sun: "SSAAAVVVAAAVVMS",
      mon: "VVVVAASSSVVVVSS",
      tue: "AAASSAAAVVVMAMS",
      wed: "SVVAAAAVVVAAAAS",
      thu: "MSVVVMMSSVVVAAA",
      fri: "SMVVVMSSAAAVVSS",
      sat: "MSVVVMMMSSVVAAA"
    },
    night: {
      sun: "AASSVVAAAVVVVSS",
      mon: "VVVVAAAASSAASMS",
      tue: "AVVMMSSVAAASVVV",
      wed: "AAAAASVVAASSSSS",
      thu: "SAAASVVSAAASSAA",
      fri: "AAASVVSSSAAASAA",
      sat: "SAVVVVSAAASSAAA"
    }
  },
  G3: {
    day: {
      sun: "SAAAVVVVAAAASMS",
      mon: "AASSAAAVVVVVVVV",
      tue: "AVAAAAAVVVSSSVV",
      wed: "AMAVVVAAASMMMVV",
      thu: "AAVVSSVVVSAAVVV",
      fri: "AVAAAVVVAAAASAA",
      sat: "AVAAAVVVAAAASAA"
    },
    night: {
      sun: "SVVAAVVVAASAAAA",
      mon: "VVVAAAAVVVVAVVV",
      tue: "MMMASAAAVVAASSA",
      wed: "VAVVAAAAAAAAVSS",
      thu: "SAAAAVVVAAAASAA",
      fri: "VAAAAVVVAAAASAA",
      sat: "VVVVVSSVVAAMSSS"
    }
  }
};

export const AMRITA_MAHENDRA_SOURCE = {
  stats: {
    model: "panjika_yoga_pattern_table",
    groups: 3,
    patterns: 42,
    slotsPerDayOrNight: 15,
    source: "bengali-panjika-yoga-codex-spec.md, checked against Sri Navadvipa Panjika MD/PDF samples"
  },
  i18n: {
    en: {
      title: "Amrita / Mahendra-yoga",
      summary:
        "Calculated by the Bengali Panjika table: the sidereal solar month group and Panchang weekday choose a 15-slot day/night pattern.",
      status:
        "Times are recalculated for the selected city from local sunrise, sunset, and next sunrise. The Panjika table selects the slots; printed clock times are not used as overrides."
    },
    ru: {
      title: "Амрита / Махендра-йога",
      summary:
        "Считается по бенгальской таблице панжики: группа сидерического солнечного месяца и день недели панчанги выбирают паттерн из 15 долей дня/ночи.",
      status:
        "Время пересчитывается для выбранного города от местного восхода, заката и следующего восхода. Панжика задаёт только доли; готовые часы из печатной строки не используются как переопределение."
    }
  }
};

function validatePattern(pattern, group, phase, weekday) {
  if (pattern.length !== 15) {
    throw new Error(`Invalid Panjika yoga pattern length for ${group}.${phase}.${weekday}: ${pattern.length}`);
  }
  if (/[^AMVS]/.test(pattern)) {
    throw new Error(`Invalid Panjika yoga pattern code for ${group}.${phase}.${weekday}: ${pattern}`);
  }
}

function validateTables() {
  for (const [group, table] of Object.entries(PANJIKA_YOGA_TABLES)) {
    for (const phase of ["day", "night"]) {
      for (const weekday of WEEKDAYS) {
        const pattern = table[phase]?.[weekday];
        if (!pattern) throw new Error(`Missing Panjika yoga pattern for ${group}.${phase}.${weekday}`);
        validatePattern(pattern, group, phase, weekday);
      }
    }
  }
}

function rangesForCode(pattern, code) {
  const ranges = [];
  let start = null;
  for (let index = 0; index <= pattern.length; index += 1) {
    if (pattern[index] === code) {
      if (start === null) start = index;
    } else if (start !== null) {
      ranges.push({ from: start, to: index });
      start = null;
    }
  }
  return ranges;
}

function weekdayKey(day) {
  return WEEKDAYS[new Date(`${day.date}T12:00:00Z`).getUTCDay()];
}

validateTables();

export function amritaMahendraTemplateForDay(day) {
  const weekday = weekdayKey(day);
  const bengaliSolarMonth = day.masa?.bengali_solar_month?.name || day.lunar?.bengali_solar_month?.name || null;
  const monthGroup = bengaliSolarMonth ? MONTH_GROUP_BY_BENGALI_SOLAR_MONTH[bengaliSolarMonth] : null;
  const table = monthGroup ? PANJIKA_YOGA_TABLES[monthGroup] : null;
  if (!table) return emptyTemplate(bengaliSolarMonth, weekday, monthGroup);

  const dayPattern = table.day[weekday];
  const nightPattern = table.night[weekday];
  return {
    status: "panjika_yoga_pattern_table",
    basis: {
      weekday,
      bengaliSolarMonth,
      monthGroup,
      dayPattern,
      nightPattern,
      source: "Bengali Panjika Amrita/Mahendra/Vakra/Shunya table",
      model: "local day/night divided into 15 parts"
    },
    amritaDay: rangesForCode(dayPattern, CODE_AMRITA),
    amritaNight: rangesForCode(nightPattern, CODE_AMRITA),
    mahendraDay: rangesForCode(dayPattern, CODE_MAHENDRA),
    mahendraNight: rangesForCode(nightPattern, CODE_MAHENDRA)
  };
}

function emptyTemplate(bengaliSolarMonth, weekday, monthGroup) {
  return {
    status: "panjika_yoga_pattern_gap",
    basis: {
      weekday,
      bengaliSolarMonth,
      monthGroup,
      source: "Bengali Panjika Amrita/Mahendra/Vakra/Shunya table"
    },
    amritaDay: [],
    amritaNight: [],
    mahendraDay: [],
    mahendraNight: []
  };
}
