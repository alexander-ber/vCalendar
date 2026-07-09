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
      summary:
        "Auspicious windows for travel and new undertakings, calculated for the selected location.",
      status: "the time formula is local; the selection table is still being verified."
    },
    ru: {
      title: "Амрита / Махендра-йога",
      summary:
        "Благоприятные окна для поездок и новых начинаний, рассчитанные для выбранного места.",
      status: "время считается локально, таблица выбора ещё сверяется."
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
