const RANGE = (from, to) => ({ from, to });

const WEEKDAY_TEMPLATES = {
  0: {
    amritaDay: [RANGE(1, 4), RANGE(8, 12)],
    amritaNight: [RANGE(3, 5), RANGE(8, 10)],
    mahendraDay: [RANGE(13, 14)],
    mahendraNight: [RANGE(1, 2), RANGE(8, 12)]
  },
  1: {
    amritaDay: [RANGE(4, 7), RANGE(6, 9)],
    amritaNight: [RANGE(1, 4), RANGE(7, 11), RANGE(11, 12)],
    mahendraDay: [RANGE(12, 14)],
    mahendraNight: []
  },
  2: {
    amritaDay: [RANGE(2, 7), RANGE(9, 11), RANGE(12, 14)],
    amritaNight: [RANGE(3, 4), RANGE(5, 8), RANGE(10, 12)],
    mahendraDay: [],
    mahendraNight: []
  },
  3: {
    amritaDay: [RANGE(2, 3), RANGE(6, 9), RANGE(12, 14)],
    amritaNight: [RANGE(1, 4), RANGE(4, 12)],
    mahendraDay: [RANGE(1, 2), RANGE(10, 12)],
    mahendraNight: [RANGE(2, 3), RANGE(4, 6)]
  },
  4: {
    amritaDay: [RANGE(10, 12)],
    amritaNight: [RANGE(1, 5), RANGE(8, 12)],
    mahendraDay: [RANGE(6, 9)],
    mahendraNight: []
  },
  5: {
    amritaDay: [RANGE(2, 5), RANGE(8, 12), RANGE(13, 15)],
    amritaNight: [RANGE(1, 5), RANGE(8, 12)],
    mahendraDay: [],
    mahendraNight: [RANGE(6, 7)]
  },
  6: {
    amritaDay: [RANGE(2, 5), RANGE(8, 12), RANGE(13, 15)],
    amritaNight: [RANGE(4, 5), RANGE(8, 10), RANGE(9, 11)],
    mahendraDay: [],
    mahendraNight: [RANGE(11, 12)]
  }
};

export const AMRITA_MAHENDRA_SOURCE = {
  i18n: {
    en: {
      title: "Amrita / Mahendra-yoga",
      source: "Formula layer reconstructed from the Russian and English Sri Navadvipa Panjika MD files.",
      note:
        "The runtime calculation uses only local sunrise, sunset and the next sunrise. The printed Panjika rows are used to infer which 1/15 day or night segments are selected; printed clock times are not used as hidden date overrides.",
      amrita:
        "The Panjika states that Amrita-yoga dispels the inauspiciousness of bisti, vyatipata, papa-yogas, vara-bela and kala-bela, just as sunlight removes darkness. A journey begun in Amrita-yoga brings the desired auspicious result.",
      mahendra:
        "Mahendra-yoga is another auspicious muhurta window printed by the Panjika. In this POC it is resolved through the same local 1/15 day and night division model.",
      status: "Candidate matrix inferred from Panjika rows; keep verifying against the Bengali scan."
    },
    ru: {
      title: "Амрита / Махендра-йога",
      source: "Формульный слой восстановлен по русскому и английскому MD-файлам Шри Навадвипа Панжики.",
      note:
        "Расчёт в приложении использует только местный восход, закат и следующий восход. Строки печатной панжики используются для восстановления того, какие 1/15 части дня или ночи выбираются; готовые часы из панжики не используются как скрытые переопределения дат.",
      amrita:
        "Панжика говорит, что Амрита-йога рассеивает неблагоприятность бишти, вьятипаты, папа-йог, вара-белы и кала-белы, подобно тому как солнечный свет уничтожает тьму. Путешествие, начатое в Амрита-йогу, приносит желаемый благоприятный плод.",
      mahendra:
        "Махендра-йога - ещё одно благоприятное мухурта-окно, печатаемое в панжике. В этом POC оно разворачивается через ту же локальную модель деления дня и ночи на 15 частей.",
      status: "Кандидатная матрица восстановлена по строкам панжики; продолжаем сверку с бенгальским сканом."
    }
  }
};

export function amritaMahendraTemplateForDay(day) {
  const weekday = new Date(`${day.date}T12:00:00Z`).getUTCDay();
  const template = WEEKDAY_TEMPLATES[weekday];
  if (!template) return emptyTemplate();
  return {
    status: "candidate_from_panjika_md",
    basis: {
      weekday,
      bengaliSolarMonth: day.masa?.bengali_solar_month?.name || null,
      source: "Sri Navadvipa Panjika GA540 RU/EN MD"
    },
    amritaDay: template.amritaDay,
    amritaNight: template.amritaNight,
    mahendraDay: template.mahendraDay,
    mahendraNight: template.mahendraNight
  };
}

function emptyTemplate() {
  return {
    status: "matrix_pending",
    basis: null,
    amritaDay: [],
    amritaNight: [],
    mahendraDay: [],
    mahendraNight: []
  };
}
