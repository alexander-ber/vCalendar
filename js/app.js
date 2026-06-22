import { generateCalendarRange, viewModelForDay } from "./calendar-engine.js?v=20260622-1";
import { EVENTS } from "./events-data.js?v=20260615-1";
import { LOCATIONS } from "./locations-data.js?v=20260622-2";
import { RULES } from "./rules-data.js?v=20260613-3";

const locationSelect = document.querySelector("#locationSelect");
const periodFromInput = document.querySelector("#periodFromInput");
const periodToInput = document.querySelector("#periodToInput");
const eventsOnlyInput = document.querySelector("#eventsOnlyInput");
const eventFilterSelect = document.querySelector("#eventFilterSelect");
const eventFilterChips = document.querySelector("#eventFilterChips");
const eventJumpSelect = document.querySelector("#eventJumpSelect");
const vaishnavaJumpSelect = document.querySelector("#vaishnavaJumpSelect");
const eventSearchInput = document.querySelector("#eventSearchInput");
const eventSearchButton = document.querySelector("#eventSearchButton");
const renderButton = document.querySelector("#renderButton");
const exportIcsButton = document.querySelector("#exportIcsButton");
const thisWeekButton = document.querySelector("#thisWeekButton");
const thisMonthButton = document.querySelector("#thisMonthButton");
const fullYearButton = document.querySelector("#fullYearButton");
const prevMonthTop = document.querySelector("#prevMonthTop");
const nextMonthTop = document.querySelector("#nextMonthTop");
const prevMonthBottom = document.querySelector("#prevMonthBottom");
const nextMonthBottom = document.querySelector("#nextMonthBottom");
const languageToggle = document.querySelector("#languageToggle");
const themeToggle = document.querySelector("#themeToggle");
const fontSizeToggle = document.querySelector("#fontSizeToggle");
const calendarTitle = document.querySelector("#calendarTitle");
const calendarStatus = document.querySelector("#calendarStatus");
const masaNotice = document.querySelector("#masaNotice");
const calendarHeader = document.querySelector("#calendarHeader");
const calendarGrid = document.querySelector("#calendarGrid");
const dayDetails = document.querySelector("#dayDetails");

let selectedDate = null;
let currentLanguage = "ru";
let jumpHighlightDates = new Set();
let preferredSelectedDate = null;
let pendingScrollTarget = null;
let vaishnavaTypeaheadText = "";
let vaishnavaTypeaheadTimer = null;
const MAX_RENDER_DAYS = 400;

const I18N = {
  en: {
    appSubtitle: "Gaudiya Vaishnava Panchang POC",
    day: "Day",
    night: "Night",
    sepia: "Sepia",
    fontNormal: "Normal font size",
    fontLarge: "Large font size",
    fontExtraLarge: "Extra large font size",
    location: "Location",
    periodFrom: "From",
    periodTo: "To",
    generate: "Generate",
    generating: "Generating...",
    periodChanged: "Period changed. Press Generate to recalculate.",
    periodTooLarge: "Selected period is too large. Please choose up to one calendar year.",
    exportCalendar: "Export calendar",
    exportedCalendar: "ICS calendar exported",
    noEventsToExport: "No events match the current period and filters.",
    termsHelp: "Sanskrit terms",
    masaTerm: "Masa",
    masaTermDescription: "Lunar month used for Vaishnava calendar observances.",
    pakshaTerm: "Paksha",
    pakshaTermDescription: "Half of the lunar month: Gaura is waxing, Krishna is waning.",
    tithiTerm: "Tithi",
    tithiTermDescription: "Lunar day, calculated from the Moon-Sun angular distance.",
    arunodayaTerm: "Arunodaya",
    arunodayaTermDescription: "Pre-dawn period used for Ekadashi purity rules; here it is 1/15 of the previous night before sunrise.",
    paranaTerm: "Parana",
    paranaTermDescription: "The proper window for breaking an Ekadashi fast.",
    timezone: "Timezone",
    loading: "Loading calendar...",
    selectedDay: "Selected Day",
    selectDay: "Select a day in the calendar.",
    calendarDays: "calendar days",
    shownDays: "shown days",
    updated: "updated",
    gregorianDate: "Gregorian date",
    isoDate: "ISO date",
    sunrise: "Sunrise",
    sunset: "Sunset",
    moonrise: "Moonrise",
    moonset: "Moonset",
    moonAngle: "Moon-Sun angle",
    arunodaya: "Arunodaya",
    masa: "Masa",
    paksha: "Paksha",
    tithiSunrise: "Tithi sunrise",
    tithiEnds: "Tithi ends",
    tithiAngle: "Tithi angle",
    ekadashiName: "Ekadashi name",
    fastDate: "Fast date",
    paranaTime: "Parana time",
    start: "Start",
    preferredEnd: "End by 1/3 day",
    oneFifthEnd: "End by 1/5 day",
    latestEnd: "Latest end",
    events: "Events",
    eventDetails: "Event details",
    biography: "Biography",
    showFullDescription: "Read full description",
    benefits: "Benefits",
    story: "Story",
    descriptionPending: "Description has not been added to the event database yet.",
    biographyPending: "Biography has not been added to the event database yet.",
    noEvents: "No matched events.",
    diagnostic: "This POC calculates locally in browser JS and does not use external Panchang calendars as runtime data.",
    calculationDetails: "Calculation details",
    calculationEngine: "Calculation engine",
    ekadashiRule: "Ekadashi rule",
    shiftReason: "Shift reason",
    paranaFormula: "Parana formula",
    hariVasaraEnd: "Hari-vasara ends",
    dvadashiStart: "Dvadashi starts",
    dvadashiEnd: "Dvadashi ends",
    tithiAtArunodaya: "Tithi at arunodaya",
    until: "until",
    sun: "Sun",
    moonWaxing: "waxing moon",
    moonWaning: "waning moon",
    moonNew: "new moon",
    moonFull: "full moon",
    moonIllumination: "illumination",
    today: "Today",
    purushottamaNotice: "Purushottama Maas is active",
    chaturmasyaNotice: "Chaturmasya is active",
    karttikNotice: "Karttik / Damodara month is active",
    bhishmaPanchakaNotice: "Bhishma Panchaka is active",
    visibleInMonth: "Visible in this period from",
    to: "to",
    forLocation: "for the selected location",
    noFast: "no fast",
    parana: "Parana",
    calculationPending: "calculation pending",
    notAvailable: "not available",
    mainControls: "Main controls",
    eventFinder: "Event finder",
    eventsOnly: "Only days with events",
    eventFilters: "Event filters",
    filterEkadashi: "Ekadashi",
    filterParana: "Parana",
    filterPurushottama: "Purushottama",
    filterFestivals: "Festivals",
    filterDivineAppearance: "Divine appearances",
    filterVaishnavaAppearance: "Vaishnava appearances",
    filterVaishnavaDisappearance: "Vaishnava disappearances",
    filterDeityTemple: "Deity / temple days",
    jumpToEvent: "Find event",
    chooseEvent: "Select event",
    chooseVaishnava: "Select Vaishnava",
    vaishnavaFinder: "Find Vaishnava",
    eventSearch: "Search event",
    eventSearchPlaceholder: "Search by event name",
    eventSearchFound: "Found matches",
    eventNotFound: "Event was not found in this year.",
    thisWeek: "This week",
    thisMonth: "This month",
    fullYear: "Full year",
    previousMonth: "Previous period",
    nextMonth: "Next period",
    noEventDays: "No event days match this filter."
  },
  ru: {
    appSubtitle: "Гаудия-вайшнавский панчанг POC",
    day: "День",
    night: "Ночь",
    sepia: "Сепия",
    fontNormal: "Обычный размер шрифта",
    fontLarge: "Крупный шрифт",
    fontExtraLarge: "Очень крупный шрифт",
    location: "Место",
    periodFrom: "С",
    periodTo: "По",
    generate: "Рассчитать",
    generating: "Расчёт...",
    periodChanged: "Период изменён. Нажмите «Рассчитать», чтобы обновить календарь.",
    periodTooLarge: "Слишком большой период. Выберите период до одного календарного года.",
    exportCalendar: "Экспорт в календарь",
    exportedCalendar: "ICS календарь экспортирован",
    noEventsToExport: "Нет событий для экспорта с текущим периодом и фильтрами.",
    termsHelp: "Санскритские термины",
    masaTerm: "Маса",
    masaTermDescription: "Лунный месяц, по которому определяются вайшнавские календарные события.",
    pakshaTerm: "Пакша",
    pakshaTermDescription: "Половина лунного месяца: Гаура - растущая Луна, Кришна - убывающая.",
    tithiTerm: "Титхи",
    tithiTermDescription: "Лунный день, рассчитывается по угловому расстоянию между Луной и Солнцем.",
    arunodayaTerm: "Арунодая",
    arunodayaTermDescription: "Предрассветный период для правил чистоты Экадаши; сейчас считается как 1/15 предыдущей ночи до восхода.",
    paranaTerm: "Паран",
    paranaTermDescription: "Правильное окно для выхода из поста Экадаши.",
    timezone: "Часовой пояс",
    loading: "Загрузка календаря...",
    selectedDay: "Выбранный день",
    selectDay: "Выберите день в календаре.",
    calendarDays: "календарных дней",
    shownDays: "показано дней",
    updated: "обновлено",
    gregorianDate: "Григорианская дата",
    isoDate: "ISO дата",
    sunrise: "Восход",
    sunset: "Закат",
    moonrise: "Восход Луны",
    moonset: "Заход Луны",
    moonAngle: "Угол Луна-Солнце",
    arunodaya: "Арунодая",
    masa: "Маса",
    paksha: "Пакша",
    tithiSunrise: "Титхи на восходе",
    tithiEnds: "Титхи до",
    tithiAngle: "Угол титхи",
    ekadashiName: "Название экадаши",
    fastDate: "День поста",
    paranaTime: "Время парана",
    start: "Начало",
    preferredEnd: "Окончание по 1/3 дня",
    oneFifthEnd: "Окончание по 1/5 дня",
    latestEnd: "Последний срок",
    events: "События",
    eventDetails: "Подробности событий",
    biography: "Биография",
    showFullDescription: "Показать полное описание",
    benefits: "Блага",
    story: "История",
    descriptionPending: "Описание ещё не добавлено в базу событий.",
    biographyPending: "Биография ещё не добавлена в базу событий.",
    noEvents: "Нет найденных событий.",
    diagnostic: "Этот POC считает локально в браузере и не использует внешние панчанги как источник данных.",
    calculationDetails: "Детали расчёта",
    calculationEngine: "Движок расчёта",
    ekadashiRule: "Правило Экадаши",
    shiftReason: "Причина переноса",
    paranaFormula: "Формула парана",
    hariVasaraEnd: "Окончание Хари-васары",
    dvadashiStart: "Начало Двадаши",
    dvadashiEnd: "Окончание Двадаши",
    tithiAtArunodaya: "Титхи на арунодае",
    until: "до",
    sun: "Солнце",
    moonWaxing: "растущая Луна",
    moonWaning: "убывающая Луна",
    moonNew: "новолуние",
    moonFull: "полнолуние",
    moonIllumination: "освещённость",
    today: "Сегодня",
    purushottamaNotice: "Идёт Пурушоттама маса",
    chaturmasyaNotice: "Идёт Чатурмасья",
    karttikNotice: "Идёт Карттик / Дамодара маса",
    bhishmaPanchakaNotice: "Идёт Бхишма Панчака",
    visibleInMonth: "Видимо в этом периоде с",
    to: "по",
    forLocation: "для выбранного места",
    noFast: "без поста",
    parana: "Паран",
    calculationPending: "расчёт не завершён",
    notAvailable: "нет",
    mainControls: "Параметры",
    eventFinder: "Поиск события",
    eventsOnly: "Только дни с событиями",
    eventFilters: "Фильтры событий",
    filterEkadashi: "Экадаши",
    filterParana: "Паран",
    filterPurushottama: "Пурушоттама",
    filterFestivals: "Праздники",
    filterDivineAppearance: "Явления Господа",
    filterVaishnavaAppearance: "Явления вайшнавов",
    filterVaishnavaDisappearance: "Уходы вайшнавов",
    filterDeityTemple: "Божества / храмы",
    jumpToEvent: "Найти событие",
    chooseEvent: "Выберите событие",
    chooseVaishnava: "Выберите вайшнава",
    vaishnavaFinder: "Поиск вайшнава",
    eventSearch: "Поиск события",
    eventSearchPlaceholder: "Например: Нитьянанда",
    eventSearchFound: "Найдено совпадений",
    eventNotFound: "Событие не найдено в этом году.",
    thisWeek: "Неделя",
    thisMonth: "Месяц",
    fullYear: "Год",
    previousMonth: "Предыдущий период",
    nextMonth: "Следующий период",
    noEventDays: "Нет дней с событиями для этого фильтра."
  }
};

const WEEKDAYS = {
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  ru: ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"]
};

function weekStartForLocation(location) {
  return location.week_start ?? 1;
}

function orderedWeekdays(location) {
  const labels = WEEKDAYS[currentLanguage];
  const start = weekStartForLocation(location);
  return [...labels.slice(start), ...labels.slice(0, start)];
}

function weekdayOffsetForLocation(isoDate, location) {
  return (weekdayOfIsoDate(isoDate) - weekStartForLocation(location) + 7) % 7;
}

const TITHI_RU = {
  Pratipat: "Пратипад",
  Dvitiya: "Двития",
  Tritiya: "Трития",
  Chaturthi: "Чатурти",
  Panchami: "Панчами",
  Shashthi: "Шаштхи",
  Saptami: "Саптами",
  Ashtami: "Аштами",
  Navami: "Навами",
  Dashami: "Дашами",
  Ekadashi: "Экадаши",
  Dvadashi: "Двадаши",
  Trayodashi: "Трайодаши",
  Chaturdashi: "Чатурдаши",
  Purnima: "Пурнима",
  Amavasya: "Амавасья",
  Gaura: "Гаура",
  Krishna: "Кришна"
};

const MASA_RU = {
  Chaitra: "Чайтра",
  Vaishakha: "Вайшакха",
  Jyeshtha: "Джйештха",
  Ashadha: "Ашадха",
  Shravana: "Шравана",
  Bhadrapada: "Бхадрапада",
  Ashvina: "Ашвина",
  Kartika: "Картика",
  Agrahayana: "Аграхаяна",
  Pausha: "Пауша",
  Magha: "Магха",
  Phalguna: "Пхалгуна",
  Purushottama: "Пурушоттама",
  Adhika: "Адхика",
  Vishnu: "Вишну",
  Madhusudan: "Мадхусудан",
  Trivikrama: "Тривикрама",
  Vamana: "Вамана",
  Sridhara: "Шридхара",
  Hrishikesha: "Хришикеша",
  Padmanabha: "Падманабха",
  Damodara: "Дамодара",
  Keshava: "Кешава",
  Narayana: "Нараяна",
  Madhava: "Мадхава",
  Govinda: "Говинда",
  masa: "маса",
  "(1st": "(1-я",
  "half)": "половина)",
  "(2nd": "(2-я"
};

const EVENT_JUMP_TARGETS = [
  {
    id: "janmashtami",
    labels: { en: "Janmashtami", ru: "Джанмаштами" },
    patterns: [/джанмаштами/i, /janmashtami/i]
  },
  {
    id: "radhastami",
    labels: { en: "Radhastami", ru: "Радхаштами" },
    patterns: [/радхаштами/i, /radhastami/i, /radhashtami/i]
  },
  {
    id: "balaramaPurnima",
    labels: { en: "Balarama Purnima", ru: "Баларам Пурнима" },
    patterns: [/balarama_purnima/i, /баларама\s+пурнима/i, /balarama\s+purnima/i]
  },
  {
    id: "rathaYatra",
    labels: { en: "Ratha Yatra", ru: "Ратха Ятра" },
    patterns: [/ратха/i, /ratha/i, /гундича/i, /gundicha/i]
  },
  {
    id: "karttik",
    labels: { en: "Karttik", ru: "Карттик" },
    patterns: [/карт+ик/i, /kart+ik/i, /дамодара/i, /damodara/i],
    matchDay: isKarttikDay
  },
  {
    id: "bhishmaPanchaka",
    labels: { en: "Bhishma Panchaka", ru: "Бхишма Панчака" },
    patterns: [/bhishma/i, /bkhishma/i, /бхишма/i],
    matchDay: isBhishmaPanchakaDay
  },
  {
    id: "chaturmasya",
    labels: { en: "Chaturmasya", ru: "Чатурмасья" },
    patterns: [/чатурмась/i, /chaturmas/i],
    matchDay: isChaturmasyaDay
  },
  {
    id: "chaturmasyaBegin",
    labels: { en: "Beginning of Chaturmasya", ru: "Начало Чатурмасьи" },
    patterns: [/beginning of chaturmasya/i, /начало\s+чатурмась/i, /chaturmasya_begin/i]
  },
  {
    id: "chaturmasyaMonth1",
    labels: { en: "Chaturmasya Month 1", ru: "Чатурмасья Месяц 1" },
    patterns: [/chaturmasya_month_1/i, /chaturmasya month 1/i, /чатурмась[яи]\s+месяц\s+1/i]
  },
  {
    id: "chaturmasyaMonth2",
    labels: { en: "Chaturmasya Month 2", ru: "Чатурмасья Месяц 2" },
    patterns: [/chaturmasya_month_2/i, /chaturmasya month 2/i, /чатурмась[яи]\s+месяц\s+2/i]
  },
  {
    id: "chaturmasyaMonth3",
    labels: { en: "Chaturmasya Month 3", ru: "Чатурмасья Месяц 3" },
    patterns: [/chaturmasya_month_3/i, /chaturmasya month 3/i, /чатурмась[яи]\s+месяц\s+3/i]
  },
  {
    id: "chaturmasyaEnd",
    labels: { en: "End of Chaturmasya", ru: "Окончание Чатурмасьи" },
    patterns: [/end of chaturmasya/i, /окончание\s+чатурмась/i, /chaturmasya_end/i]
  },
  {
    id: "karttikBegin",
    labels: { en: "Beginning of Karttik", ru: "Начало Карттика" },
    patterns: [/beginning of karttik/i, /начало\s+карт+ик/i, /karttik_begin/i]
  },
  {
    id: "karttikEnd",
    labels: { en: "End of Karttik", ru: "Окончание Карттика" },
    patterns: [/end of karttik/i, /окончание\s+карт+ик/i, /karttik_end/i]
  },
  {
    id: "navadvipParikrama",
    labels: { en: "Navadvip Dhama Parikrama", ru: "Навадвип Дхама Парикрама" },
    patterns: [/навадвип/i, /navadvip/i, /парикрам/i, /parikram/i]
  }
];

function currentPeriod() {
  const now = new Date();
  const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const endDate = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0));
  const end = `${endDate.getUTCFullYear()}-${String(endDate.getUTCMonth() + 1).padStart(2, "0")}-${String(endDate.getUTCDate()).padStart(2, "0")}`;
  return { start, end };
}

function currentIsoDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function eventClass(event) {
  if (event.type === "ekadashi") return "ekadashi";
  if (event.type === "ekadashi_notice") return "ekadashi notice";
  if (event.type === "parana") return "parana";
  if (event.type === "purushottama_boundary") return "purushottama";
  if (event.type === "divine_appearance") return "festival";
  if (event.type === "vaishnava_appearance" || event.type === "vaishnava_disappearance") return "vaishnava";
  if (event.type === "deity_installation" || event.type === "temple_opening" || event.category === "deity_temple") return "deity";
  return "";
}

function eventFilterType(event) {
  if (event.type === "ekadashi" || event.type === "ekadashi_notice") return "ekadashi";
  if (event.type === "parana") return "parana";
  if (event.type === "purushottama_boundary") return "purushottama";
  if (event.type === "divine_appearance") return "divineAppearance";
  if (event.type === "vaishnava_appearance") return "vaishnavaAppearance";
  if (event.type === "vaishnava_disappearance") return "vaishnavaDisappearance";
  if (event.type === "deity_installation" || event.type === "temple_opening" || event.category === "deity_temple") return "deityTemple";
  return "festival";
}

function selectedEventFilters() {
  return new Set([...eventFilterSelect.selectedOptions].map((option) => option.value));
}

function setEventFilter(value, selected) {
  const option = [...eventFilterSelect.options].find((item) => item.value === value);
  if (!option) return;
  option.selected = selected;
  renderEventFilterChips();
  renderCalendar();
}

function visibleEventsForDay(day) {
  const filters = selectedEventFilters();
  return day.events.filter((event) => filters.has(eventFilterType(event)));
}

function eventLabel(event) {
  if (event.type === "ekadashi_notice") return localizeEventName(event);
  if (event.type === "ekadashi") {
    const reason = ekadashiReasonLabel(event.classification);
    return reason ? `${localizeEventName(event)} (${reason})` : localizeEventName(event);
  }
  if (event.type === "parana") {
    const hasWindow = event.parana.start !== "not implemented" && event.parana.preferred_end !== "not implemented";
    if (!hasWindow) return `${localizeEventName(event)}: ${tr("calculationPending")}`;
    if (event.parana.preferred_end === "not available") {
      return `${tr("parana")}: ${tr("start").toLowerCase()} ${event.parana.start}; ${tr("oneFifthEnd").toLowerCase()} ${localizeAvailability(event.parana.one_fifth_end)}`;
    }
    return `${tr("parana")}: ${event.parana.start}-${event.parana.preferred_end}`;
  }
  return localizeEventName(event);
}

function renderDetails(day, options = {}) {
  selectedDate = day.date;
  document.querySelectorAll(".day").forEach((element) => {
    element.classList.toggle("is-selected", element.dataset.date === selectedDate);
  });
  const model = viewModelForDay(day);
  model.events = visibleEventsForDay(day);
  const ekadashiEvents = model.events.filter((event) => event.type === "ekadashi");
  const paranaEvents = model.events.filter((event) => event.type === "parana");
  dayDetails.innerHTML = `
    ${renderSanskritTermsHelp()}
    <div>
      <strong>${tr("events")}</strong>
      <div class="events">
        ${
          model.events.length
            ? model.events.map((event) => `<div class="event ${eventClass(event)}">${eventLabel(event)}</div>`).join("")
            : `<span>${tr("noEvents")}</span>`
        }
      </div>
    </div>
    ${model.events.length ? renderEventDetails(model.events) : ""}
    <section class="selected-day-panel">
      <h3>${tr("selectedDay")}</h3>
      <div class="detail-grid">
        <div class="detail-item"><span>${tr("gregorianDate")}</span>${gregorianLong(model.date)}</div>
        <div class="detail-item"><span>${tr("isoDate")}</span>${model.date}</div>
        <div class="detail-item"><span>${tr("sunrise")}</span>${model.sunrise}</div>
        <div class="detail-item"><span>${tr("sunset")}</span>${model.sunset}</div>
        <div class="detail-item"><span>${tr("moonrise")}</span>${model.moonrise}</div>
        <div class="detail-item"><span>${tr("moonset")}</span>${model.moonset}</div>
        <div class="detail-item"><span>${tr("moonAngle")}</span>${model.moonAngle} deg</div>
        <div class="detail-item"><span>${tr("arunodaya")}</span>${model.arunodaya}</div>
        <div class="detail-item"><span>${tr("masa")}</span>${localizeMasa(model.masa)}</div>
        <div class="detail-item"><span>${tr("paksha")}</span>${localizePaksha(model.paksha)}</div>
        <div class="detail-item"><span>${tr("tithiSunrise")}</span>${localizeTithi(model.tithi)}</div>
        <div class="detail-item"><span>${tr("tithiEnds")}</span>${model.tithiEnd}</div>
        <div class="detail-item"><span>${tr("tithiAngle")}</span>${model.angle} deg</div>
      </div>
    ${
      ekadashiEvents.length
        ? `<div class="ekadashi-panel">
            <span>${tr("ekadashiName")}</span>
            <strong>${ekadashiEvents.map((event) => localizeEventName(event)).join(", ")}</strong>
            <p>${ekadashiEvents.map((event) => localizeEventShortDescription(event)).filter(Boolean).join(" ")}</p>
            <small>${ekadashiEvents.map((event) => ekadashiDetailLine(event)).join(" | ")}</small>
          </div>`
        : ""
    }
    ${
      paranaEvents.length
        ? `<div class="parana-panel">
            <span>${tr("paranaTime")}</span>
            ${paranaEvents
              .map(
                (event) => `
                  <strong>${localizeEventName(event)}</strong>
                  <dl>
                    <div><dt>${tr("start")}</dt><dd>${event.parana.start}</dd></div>
                    <div><dt>${tr("preferredEnd")}</dt><dd>${localizeAvailability(event.parana.preferred_end)}</dd></div>
                    <div><dt>${tr("oneFifthEnd")}</dt><dd>${localizeAvailability(event.parana.one_fifth_end)}</dd></div>
                  </dl>
                  <small>${localizeEventDescription(event)}</small>
                `
              )
              .join("")}
          </div>`
        : ""
    }
      ${renderCalculationDetails(day, model, ekadashiEvents, paranaEvents)}
    </section>
  `;
  if (options.scrollToEventDetails) {
    requestAnimationFrame(() => {
      const target = document.querySelector(".event-details-panel") || document.querySelector(".details");
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
      target?.focus?.({ preventScroll: true });
    });
  }
}

function renderCalculationDetails(day, model, ekadashiEvents, paranaEvents) {
  const baseRows = [
    [tr("sunrise"), model.sunrise],
    [tr("arunodaya"), model.arunodaya],
    [tr("tithiSunrise"), localizeTithi(model.tithi)],
    [tr("tithiAtArunodaya"), localizeTithi(model.arunodayaTithi)],
    [tr("tithiEnds"), model.tithiEnd],
    [tr("tithiAngle"), `${model.angle} deg`],
    [tr("calculationEngine"), tr("diagnostic")]
  ];
  const ekadashiRows = ekadashiEvents.flatMap((event) => [
    [tr("ekadashiName"), localizeEventName(event)],
    [tr("ekadashiRule"), localizeClassification(event.diagnostics?.rule_applied || event.classification || event.fast_day_type || "standard")],
    [tr("shiftReason"), ekadashiCalculationExplanation(event)],
    [tr("fastDate"), event.fast_date || ""],
    event.candidate_no_fast_reason
      ? [tr("noFast"), localizeClassification(event.candidate_no_fast_reason)]
      : null
  ]).filter(Boolean);
  const ekadashiParanaRows = ekadashiEvents.flatMap((event) => {
    const diagnostics = event.parana?.diagnostics || {};
    return [
      [tr("paranaFormula"), event.parana_type ? localizeClassification(event.parana_type) : ""],
      [tr("dvadashiStart"), diagnosticTime(diagnostics.dvadashi_start, day.location.timezone)],
      [tr("hariVasaraEnd"), diagnosticTime(diagnostics.hari_vasara_end, day.location.timezone)],
      [tr("dvadashiEnd"), diagnosticTime(diagnostics.dvadashi_end, day.location.timezone)],
      [tr("preferredEnd"), diagnosticTime(diagnostics.pratah_end, day.location.timezone)],
      [tr("oneFifthEnd"), diagnosticTime(diagnostics.one_fifth_end, day.location.timezone)]
    ].filter(([, value]) => value);
  });
  const paranaRows = paranaEvents.flatMap((event) => [
    [tr("parana"), localizeEventName(event)],
    [tr("start"), localizeAvailability(event.parana?.start)],
    [tr("preferredEnd"), localizeAvailability(event.parana?.preferred_end)],
    [tr("oneFifthEnd"), localizeAvailability(event.parana?.one_fifth_end)],
    [tr("latestEnd"), localizeAvailability(event.parana?.absolute_end)]
  ]);

  return `
    <details class="diagnostic diagnostic-panel">
      <summary>${tr("calculationDetails")}</summary>
      <dl class="diagnostic-grid">
        ${renderDiagnosticRows([...baseRows, ...ekadashiRows, ...ekadashiParanaRows, ...paranaRows])}
      </dl>
    </details>
  `;
}

function renderDiagnosticRows(rows) {
  return rows
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`)
    .join("");
}

function diagnosticTime(value, timezone) {
  if (!value) return "";
  if (value instanceof Date) return calendarTime(value, timezone);
  return String(value);
}

function renderSanskritTermsHelp() {
  const terms = [
    ["masaTerm", "masaTermDescription"],
    ["pakshaTerm", "pakshaTermDescription"],
    ["tithiTerm", "tithiTermDescription"],
    ["arunodayaTerm", "arunodayaTermDescription"],
    ["paranaTerm", "paranaTermDescription"]
  ];
  return `
    <details class="terms-help">
      <summary aria-label="${tr("termsHelp")}" title="${tr("termsHelp")}">
        <span aria-hidden="true">i</span>
      </summary>
      <dl>
        ${terms.map(([term, description]) => `<div><dt>${tr(term)}</dt><dd>${tr(description)}</dd></div>`).join("")}
      </dl>
    </details>
  `;
}

function renderCalendar() {
  normalizePeriodInputs();
  if (!ensureRenderablePeriod()) return;
  const location = LOCATIONS.find((item) => item.id === locationSelect.value) || LOCATIONS[0];
  locationSelect.value = location.id;
  const calendar = generateCalendarRange(periodFromInput.value, periodToInput.value, location, RULES, EVENTS);

  renderMasaNotice(calendar.days);
  calendarHeader.innerHTML = "";
  calendarGrid.innerHTML = "";
  calendarGrid.classList.add("is-range");

  const today = currentIsoDate();
  const visibleDays = eventsOnlyInput.checked ? calendar.days.filter((day) => visibleEventsForDay(day).length > 0) : calendar.days;
  calendarTitle.textContent = periodTitle(periodFromInput.value, periodToInput.value);
  calendarStatus.textContent = `${visibleDays.length} ${eventsOnlyInput.checked ? tr("shownDays") : tr("calendarDays")} - ${tr("updated")} ${new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(new Date())}`;
  if (!visibleDays.length) {
    calendarGrid.innerHTML = `<div class="calendar-loading">${tr("noEventDays")}</div>`;
    dayDetails.textContent = tr("selectDay");
    return;
  }

  for (const [monthKey, days] of groupDaysByMonth(visibleDays)) {
    const section = document.createElement("section");
    section.className = `month-section${eventsOnlyInput.checked ? " is-event-list" : ""}`;
    section.innerHTML = `
      <h3 class="month-section-title">${monthTitle(Number(monthKey.slice(0, 4)), Number(monthKey.slice(5, 7)))}</h3>
      <div class="calendar-header">${orderedWeekdays(location).map((label) => `<span>${label}</span>`).join("")}</div>
      <div class="month-section-grid"></div>
    `;
    const grid = section.querySelector(".month-section-grid");
    if (!eventsOnlyInput.checked) {
      for (let i = 0; i < weekdayOffsetForLocation(days[0].date, location); i += 1) {
        const spacer = document.createElement("div");
        spacer.className = "day-spacer";
        grid.append(spacer);
      }
    }
    for (const day of days) {
      grid.append(renderDayButton(day, today, location));
    }
    calendarGrid.append(section);
  }

  const preferredDay = preferredSelectedDate ? visibleDays.find((day) => day.date === preferredSelectedDate) : null;
  preferredSelectedDate = null;
  const todayInView = visibleDays.find((day) => day.date === today);
  const firstCurrentDay = visibleDays[0];
  if (preferredDay) renderDetails(preferredDay);
  else if (todayInView) renderDetails(todayInView);
  else if (firstCurrentDay) renderDetails(firstCurrentDay);
  if (pendingScrollTarget) {
    const targetSelector = pendingScrollTarget;
    pendingScrollTarget = null;
    requestAnimationFrame(() => {
      const target = document.querySelector(targetSelector);
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
      target?.focus?.({ preventScroll: true });
    });
  }
}

function exportCurrentCalendarIcs() {
  normalizePeriodInputs();
  if (!ensureRenderablePeriod()) return;
  const location = LOCATIONS.find((item) => item.id === locationSelect.value) || LOCATIONS[0];
  const calendar = generateCalendarRange(periodFromInput.value, periodToInput.value, location, RULES, EVENTS);
  const entries = [];

  for (const day of calendar.days) {
    for (const event of visibleEventsForDay(day)) {
      entries.push({ day, event });
    }
  }

  if (!entries.length) {
    calendarStatus.textContent = tr("noEventsToExport");
    return;
  }

  const ics = buildIcsCalendar(entries, location);
  const fileName = `vcalendar-${periodFromInput.value}-${periodToInput.value}-${location.id}.ics`;
  downloadTextFile(fileName, ics, "text/calendar;charset=utf-8");
  calendarStatus.textContent = `${tr("exportedCalendar")}: ${entries.length}`;
}

function buildIcsCalendar(entries, location) {
  const stamp = icsDateTimeUtc(new Date());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//vCalendar//Gaudiya Vaishnava Panchang//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${icsEscape(`vCalendar ${periodFromInput.value} - ${periodToInput.value}`)}`,
    `X-WR-TIMEZONE:${icsEscape(location.timezone)}`
  ];

  entries.forEach(({ day, event }, index) => {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${icsEscape(`${event.id || event.name}-${day.date}-${index}@vcalendar.local`)}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${icsDate(day.date)}`,
      `DTEND;VALUE=DATE:${icsDate(shiftIsoDateByDays(day.date, 1))}`,
      `SUMMARY:${icsEscape(localizeEventName(event))}`,
      `DESCRIPTION:${icsEscape(icsEventDescription(day, event))}`,
      `LOCATION:${icsEscape(`${location.name} (${location.timezone})`)}`,
      event.source_url ? `URL:${icsEscape(event.source_url)}` : null,
      "END:VEVENT"
    );
  });

  lines.push("END:VCALENDAR");
  return lines.filter(Boolean).map(foldIcsLine).join("\r\n") + "\r\n";
}

function icsEventDescription(day, event) {
  const lines = [
    `${tr("gregorianDate")}: ${gregorianLong(day.date)}`,
    `${tr("masa")}: ${localizeMasa(day.masa.display_name)}`,
    `${tr("tithiSunrise")}: ${localizeTithi(day.lunar.tithi_at_sunrise.name)}`,
    `${tr("sun")}: ${calendarTime(day.astronomy.sunrise, day.location.timezone)}-${calendarTime(day.astronomy.sunset, day.location.timezone)}`
  ];

  if (event.type === "parana" && event.parana) {
    lines.push(
      `${tr("paranaTime")}: ${event.parana.start}-${localizeAvailability(event.parana.preferred_end)}`,
      `${tr("oneFifthEnd")}: ${localizeAvailability(event.parana.one_fifth_end)}`
    );
  }

  const description = stripHtml(localizeEventDescription(event));
  if (description) lines.push("", description);
  if (event.source_url) lines.push("", event.source_url);
  return lines.join("\n");
}

function icsDate(isoDate) {
  return isoDate.replaceAll("-", "");
}

function icsDateTimeUtc(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function icsEscape(value) {
  return String(value || "")
    .replaceAll("\\", "\\\\")
    .replaceAll("\r\n", "\n")
    .replaceAll("\r", "\n")
    .replaceAll("\n", "\\n")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,");
}

function foldIcsLine(line) {
  const chunks = [];
  let remaining = line;
  while (remaining.length > 72) {
    chunks.push(remaining.slice(0, 72));
    remaining = ` ${remaining.slice(72)}`;
  }
  chunks.push(remaining);
  return chunks.join("\r\n");
}

function stripHtml(value) {
  return String(value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function downloadTextFile(fileName, contents, type) {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function renderDayButton(day, today, location) {
  const isToday = day.date === today;
  const isJumpTarget = jumpHighlightDates.has(day.date);
  const events = visibleEventsForDay(day);
  const button = document.createElement("button");
  button.type = "button";
  button.className = `day${isToday ? " is-today" : ""}${isJumpTarget ? " is-jump-target" : ""}`;
  button.dataset.date = day.date;
  button.innerHTML = `
    <div class="day-topline">
      <span class="gregorian-main">${gregorianDayLine(day.date)}</span>
      ${moonPhaseIcon(day)}
    </div>
    ${isToday ? `<div class="today-pill">${tr("today")}</div>` : ""}
    <div class="lunar-line">
      <span class="lunar-masa">${localizeMasaCompact(day.lunar.masa_display)}</span>
      <span class="lunar-tithi">${tithiDisplayLine(day)} ${tr("until")} ${tithiEndLabel(day)}</span>
    </div>
    <div class="times"><span class="time-icon" aria-label="${tr("sun")}">☀</span>${calendarTime(day.astronomy.sunrise, location.timezone)}-${calendarTime(day.astronomy.sunset, location.timezone)}</div>
    <div class="times"><span class="time-icon" aria-label="${tr("moonrise")}">☾</span>${calendarTimeOrDash(day.astronomy.moonrise, location.timezone)}-${calendarTimeOrDash(day.astronomy.moonset, location.timezone)} · ${Math.round(day.lunar.tithi_angle_at_sunrise)}°</div>
    ${renderDayEventBadges(events)}
  `;
  button.addEventListener("click", () => renderDetails(day, { scrollToEventDetails: true }));
  return button;
}

function renderDayEventBadges(events) {
  const maxVisibleEvents = 2;
  const visible = events.slice(0, maxVisibleEvents);
  const hiddenCount = events.length - visible.length;
  return `
    <div class="events">
      ${visible.map((event) => `<div class="event ${eventClass(event)}">${eventLabel(event)}</div>`).join("")}
      ${hiddenCount > 0 ? `<div class="event-more">+${hiddenCount}</div>` : ""}
    </div>
  `;
}

function tithiDisplayLine(day) {
  const base = day.lunar.tithi_at_sunrise.name;
  const extraTithis = visibleEventsForDay(day)
    .map((event) => eventTithiName(event))
    .filter((tithiName) => tithiName && tithiName !== base);
  const uniqueExtraTithis = [...new Set(extraTithis)];
  return [base, ...uniqueExtraTithis].map((tithiName) => localizeTithi(tithiName)).join(" → ");
}

function eventTithiName(event) {
  if (!event.paksha || !event.tithi) return "";
  if (event.tithi === "Purnima" || event.tithi === "Amavasya") return event.tithi;
  return `${event.paksha} ${event.tithi}`;
}

function groupDaysByMonth(days) {
  const groups = new Map();
  for (const day of days) {
    const key = day.date.slice(0, 7);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(day);
  }
  return groups;
}

function weekdayOfIsoDate(isoDate) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function normalizePeriodInputs() {
  const fallback = currentPeriod();
  if (!isIsoDate(periodFromInput.value)) periodFromInput.value = fallback.start;
  if (!isIsoDate(periodToInput.value)) periodToInput.value = fallback.end;
  if (periodFromInput.value > periodToInput.value) {
    periodToInput.value = periodFromInput.value;
  }
}

function ensureRenderablePeriod() {
  if (daysBetweenInclusive(periodFromInput.value, periodToInput.value) <= MAX_RENDER_DAYS) return true;
  calendarGrid.innerHTML = `<div class="calendar-loading">${tr("periodTooLarge")}</div>`;
  calendarStatus.textContent = tr("periodTooLarge");
  dayDetails.textContent = tr("selectDay");
  return false;
}

function isIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function tithiEndLabel(day) {
  if (!day.lunar.next_tithi_boundary) return "not implemented";
  const endDate = day.lunar.next_tithi_boundary;
  const endIso = new Intl.DateTimeFormat("en-CA", {
    timeZone: day.location.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(endDate);
  const time = calendarTime(endDate, day.location.timezone);
  return endIso === day.date ? time : `${gregorianShort(endIso)} ${time}`;
}

function isKarttikDay(day) {
  const isOpeningPurnima =
    day.masa.normal_masa_name === "Padmanabha" && day.lunar.paksha === "Gaura" && day.lunar.tithi_at_sunrise.number === 15;
  return isOpeningPurnima || day.masa.normal_masa_name === "Damodara";
}

function isBhishmaPanchakaDay(day) {
  const tithi = day.lunar.tithi_at_sunrise.number;
  return day.masa.normal_masa_name === "Damodara" && day.lunar.paksha === "Gaura" && tithi >= 11 && tithi <= 15;
}

function isChaturmasyaDay(day) {
  if (["Sridhara", "Hrishikesha", "Padmanabha", "Damodara"].includes(day.masa.normal_masa_name)) return true;
  return day.masa.normal_masa_name === "Vamana" && day.lunar.paksha === "Gaura" && day.lunar.tithi_at_sunrise.number === 15;
}

function periodNotice(labelKey, days) {
  if (!days.length) return "";
  return `
    <div>
      ${tr(labelKey)}
      <small>${tr("visibleInMonth")} ${gregorianShort(days[0].date)} ${tr("to")} ${gregorianShort(days.at(-1).date)} ${tr("forLocation")}.</small>
    </div>
  `;
}

function renderMasaNotice(days) {
  const notices = [];
  const adhikaDays = days.filter((day) => day.lunar.masa_type === "adhika");
  if (adhikaDays.length) notices.push(periodNotice("purushottamaNotice", adhikaDays));

  const chaturmasyaDays = days.filter(isChaturmasyaDay);
  if (chaturmasyaDays.length) notices.push(periodNotice("chaturmasyaNotice", chaturmasyaDays));

  const karttikDays = days.filter(isKarttikDay);
  if (karttikDays.length) notices.push(periodNotice("karttikNotice", karttikDays));

  const bhishmaPanchakaDays = days.filter(isBhishmaPanchakaDay);
  if (bhishmaPanchakaDays.length) notices.push(periodNotice("bhishmaPanchakaNotice", bhishmaPanchakaDays));

  if (!notices.length) {
    masaNotice.hidden = true;
    masaNotice.innerHTML = "";
    return;
  }
  masaNotice.hidden = false;
  masaNotice.innerHTML = notices.join("");
}

function gregorianShort(isoDate) {
  return new Intl.DateTimeFormat(dateLocale(), {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC"
  }).format(new Date(`${isoDate}T12:00:00Z`));
}

function gregorianDayLine(isoDate) {
  return new Intl.DateTimeFormat(dateLocale(), {
    day: "numeric",
    month: "short",
    weekday: "short",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(`${isoDate}T12:00:00Z`));
}

function moonPhaseIcon(day) {
  const phase = normalizedMoonAngle(day.lunar.tithi_angle_at_sunrise);
  const illumination = moonIllumination(phase);
  const percent = Math.round(illumination * 100);
  const label = moonPhaseLabel(phase, percent);
  return `<span class="moon-symbol" title="${label}" aria-label="${label}">${moonPhaseSvg(phase, illumination)}</span>`;
}

function normalizedMoonAngle(angle) {
  return ((Number(angle) % 360) + 360) % 360;
}

function moonIllumination(phase) {
  return (1 - Math.cos((phase * Math.PI) / 180)) / 2;
}

function moonPhaseLabel(phase, percent) {
  if (isNewMoonPhase(phase)) return `${tr("moonNew")} · ${tr("moonIllumination")} ${percent}%`;
  if (isFullMoonPhase(phase)) return `${tr("moonFull")} · ${tr("moonIllumination")} ${percent}%`;
  const direction = phase < 180 ? tr("moonWaxing") : tr("moonWaning");
  return `${direction} · ${tr("moonIllumination")} ${percent}%`;
}

function isNewMoonPhase(phase) {
  return phase <= 1 || phase >= 359;
}

function isFullMoonPhase(phase) {
  return Math.abs(phase - 180) <= 1;
}

function moonPhaseSvg(phase, illumination) {
  const waxing = phase < 180;
  const clamped = Math.max(0, Math.min(1, illumination));
  if (isNewMoonPhase(phase)) {
    return `<svg class="moon-svg" viewBox="0 0 32 32" aria-hidden="true"><circle class="moon-dark" cx="16" cy="16" r="14"></circle></svg>`;
  }
  if (isFullMoonPhase(phase)) {
    return `<svg class="moon-svg" viewBox="0 0 32 32" aria-hidden="true"><circle class="moon-lit moon-full-disc" cx="16" cy="16" r="14"></circle></svg>`;
  }

  if (clamped <= 0.5) {
    const controlX = waxing ? 30 - clamped * 28 : 2 + clamped * 28;
    const sweep = waxing ? 1 : 0;
    return `
      <svg class="moon-svg" viewBox="0 0 32 32" aria-hidden="true">
        <circle class="moon-dark" cx="16" cy="16" r="14"></circle>
        <path class="moon-lit" d="M16 2 A14 14 0 0 ${sweep} 16 30 Q ${controlX.toFixed(2)} 16 16 2 Z"></path>
      </svg>
    `;
  }

  const darkFraction = 1 - clamped;
  const controlX = waxing ? 2 + darkFraction * 28 : 30 - darkFraction * 28;
  const sweep = waxing ? 0 : 1;
  return `
    <svg class="moon-svg" viewBox="0 0 32 32" aria-hidden="true">
      <circle class="moon-lit moon-full-disc" cx="16" cy="16" r="14"></circle>
      <path class="moon-dark" d="M16 2 A14 14 0 0 ${sweep} 16 30 Q ${controlX.toFixed(2)} 16 16 2 Z"></path>
    </svg>
  `;
}

function gregorianLong(isoDate) {
  return new Intl.DateTimeFormat(dateLocale(), {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC"
  }).format(new Date(`${isoDate}T12:00:00Z`));
}

function monthTitle(year, month) {
  return new Intl.DateTimeFormat(dateLocale(), { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, 1))
  );
}

function periodTitle(startDate, endDate) {
  const mode = periodShiftMode(startDate, endDate);
  if (mode.type === "year") return String(startDate.slice(0, 4));
  if (mode.type === "month") {
    const [year, month] = startDate.split("-").map(Number);
    return monthTitle(year, month);
  }
  return `${gregorianShort(startDate)} - ${gregorianShort(endDate)}`;
}

function dateLocale() {
  return currentLanguage === "ru" ? "ru-RU" : "en";
}

function calendarTime(date, timezone) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}

function calendarTimeOrDash(date, timezone) {
  return date ? calendarTime(date, timezone) : "-";
}

function init() {
  locationSelect.innerHTML = renderLocationOptions();
  locationSelect.value = "maalot";
  const period = currentPeriod();
  periodFromInput.value = period.start;
  periodToInput.value = period.end;
  initEventsOnly();
  initLanguage();
  initTheme();
  initFontSize();
  renderButton.addEventListener("click", () => {
    renderButton.disabled = true;
    renderButton.textContent = tr("generating");
    requestAnimationFrame(() => {
      renderCalendar();
      renderButton.disabled = false;
      renderButton.textContent = tr("generate");
    });
  });
  exportIcsButton.addEventListener("click", exportCurrentCalendarIcs);
  locationSelect.addEventListener("change", renderCalendar);
  periodFromInput.addEventListener("change", markPeriodChanged);
  periodToInput.addEventListener("change", markPeriodChanged);
  eventsOnlyInput.addEventListener("change", renderCalendar);
  eventFilterSelect.addEventListener("change", renderCalendar);
  eventJumpSelect.addEventListener("change", () => jumpToEventMonth(eventJumpSelect.value));
  vaishnavaJumpSelect.addEventListener("change", () => jumpToVaishnava(vaishnavaJumpSelect.value));
  vaishnavaJumpSelect.addEventListener("keydown", handleVaishnavaSelectTypeahead);
  eventSearchButton.addEventListener("click", jumpToEventSearch);
  eventSearchInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    jumpToEventSearch();
  });
  thisWeekButton.addEventListener("click", () => setCurrentWeekPeriod());
  thisMonthButton.addEventListener("click", () => setCurrentMonthPeriod());
  fullYearButton.addEventListener("click", () => setFullYearPeriod());
  prevMonthTop.addEventListener("click", () => shiftPeriod(-1));
  nextMonthTop.addEventListener("click", () => shiftPeriod(1));
  prevMonthBottom.addEventListener("click", () => shiftPeriod(-1));
  nextMonthBottom.addEventListener("click", () => shiftPeriod(1));
  renderCalendar();
}

function markPeriodChanged() {
  calendarStatus.textContent = tr("periodChanged");
}

function setCurrentWeekPeriod() {
  normalizePeriodInputs();
  const location = LOCATIONS.find((item) => item.id === locationSelect.value) || LOCATIONS[0];
  const dayOfWeek = weekdayOfIsoDate(periodFromInput.value);
  const startDay = weekStartForLocation(location);
  const startOffset = -((dayOfWeek - startDay + 7) % 7);
  const weekStart = shiftIsoDateByDays(periodFromInput.value, startOffset);
  periodFromInput.value = weekStart;
  periodToInput.value = shiftIsoDateByDays(weekStart, 6);
  pendingScrollTarget = ".calendar-wrap";
  renderCalendar();
}

function setCurrentMonthPeriod() {
  const [year, month] = periodFromInput.value.split("-").map(Number);
  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const monthEndDate = new Date(Date.UTC(year, month, 0));
  periodFromInput.value = monthStart;
  periodToInput.value = isoDateFromDate(monthEndDate);
  pendingScrollTarget = ".calendar-wrap";
  renderCalendar();
}

function setMonthPeriodForIsoDate(isoDate) {
  const [year, month] = isoDate.split("-").map(Number);
  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const monthEndDate = new Date(Date.UTC(year, month, 0));
  periodFromInput.value = monthStart;
  periodToInput.value = isoDateFromDate(monthEndDate);
  renderCalendar();
}

function setFullYearPeriod() {
  const [year] = periodFromInput.value.split("-").map(Number);
  periodFromInput.value = `${year}-01-01`;
  periodToInput.value = `${year}-12-31`;
  pendingScrollTarget = ".calendar-wrap";
  renderCalendar();
}

function shiftPeriod(direction) {
  normalizePeriodInputs();
  const mode = periodShiftMode(periodFromInput.value, periodToInput.value);
  if (mode.type === "week") {
    periodFromInput.value = shiftIsoDateByDays(periodFromInput.value, 7 * direction);
    periodToInput.value = shiftIsoDateByDays(periodToInput.value, 7 * direction);
  } else if (mode.type === "month") {
    periodFromInput.value = shiftIsoDateByMonths(periodFromInput.value, direction);
    const [year, month] = periodFromInput.value.split("-").map(Number);
    periodToInput.value = isoDateFromDate(new Date(Date.UTC(year, month, 0)));
  } else if (mode.type === "year") {
    const year = Number(periodFromInput.value.slice(0, 4)) + direction;
    periodFromInput.value = `${year}-01-01`;
    periodToInput.value = `${year}-12-31`;
  } else {
    const deltaDays = mode.days * direction;
    periodFromInput.value = shiftIsoDateByDays(periodFromInput.value, deltaDays);
    periodToInput.value = shiftIsoDateByDays(periodToInput.value, deltaDays);
  }
  renderCalendar();
}

function periodShiftMode(startDate, endDate) {
  const [startYear, startMonth] = startDate.split("-").map(Number);
  const monthStart = `${startYear}-${String(startMonth).padStart(2, "0")}-01`;
  const monthEnd = isoDateFromDate(new Date(Date.UTC(startYear, startMonth, 0)));
  if (startDate === monthStart && endDate === monthEnd) return { type: "month" };
  if (startDate === `${startYear}-01-01` && endDate === `${startYear}-12-31`) return { type: "year" };
  const days = daysBetweenInclusive(startDate, endDate);
  if (days === 7) return { type: "week" };
  return { type: "custom", days };
}

function daysBetweenInclusive(startDate, endDate) {
  const start = Date.parse(`${startDate}T00:00:00Z`);
  const end = Date.parse(`${endDate}T00:00:00Z`);
  return Math.max(1, Math.round((end - start) / (24 * 60 * 60 * 1000)) + 1);
}

function shiftIsoDateByMonths(isoDate, deltaMonths) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const targetMonthFirst = new Date(Date.UTC(year, month - 1 + deltaMonths, 1));
  const lastDay = new Date(Date.UTC(targetMonthFirst.getUTCFullYear(), targetMonthFirst.getUTCMonth() + 1, 0)).getUTCDate();
  const next = new Date(Date.UTC(targetMonthFirst.getUTCFullYear(), targetMonthFirst.getUTCMonth(), Math.min(day, lastDay)));
  return isoDateFromDate(next);
}

function shiftIsoDateByDays(isoDate, deltaDays) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return isoDateFromDate(new Date(Date.UTC(year, month - 1, day + deltaDays)));
}

function isoDateFromDate(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function initLanguage() {
  const savedLanguage = localStorage.getItem("vcalendar-language");
  currentLanguage = savedLanguage === "en" ? "en" : "ru";
  languageToggle.addEventListener("click", () => {
    setLanguage(currentLanguage === "ru" ? "en" : "ru");
    renderCalendar();
  });
  setLanguage(currentLanguage);
}

function setLanguage(language) {
  currentLanguage = language;
  localStorage.setItem("vcalendar-language", language);
  document.documentElement.lang = language;
  languageToggle.textContent = language === "ru" ? "EN" : "RU";
  languageToggle.setAttribute("aria-pressed", String(language === "ru"));
  eventJumpSelect.setAttribute("aria-label", tr("eventFinder"));
  vaishnavaJumpSelect.setAttribute("aria-label", tr("vaishnavaFinder"));
  eventSearchInput.setAttribute("aria-label", tr("eventSearch"));
  eventSearchButton.setAttribute("aria-label", tr("eventSearch"));
  eventSearchButton.setAttribute("title", tr("eventSearch"));
  document.querySelector(".eyebrow").textContent = tr("appSubtitle");
  renderButton.textContent = tr("generate");
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = tr(element.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
    element.setAttribute("placeholder", tr(element.dataset.i18nPlaceholder));
  });
  renderEventFilterChips();
  renderEventJumpOptions();
  renderVaishnavaJumpOptions();
  updateFontSizeButtons();
  if (!selectedDate) dayDetails.textContent = tr("selectDay");
  updateThemeButtons();
}

function eventFilterLabels() {
  return {
    ekadashi: tr("filterEkadashi"),
    parana: tr("filterParana"),
    purushottama: tr("filterPurushottama"),
    festival: tr("filterFestivals"),
    divineAppearance: tr("filterDivineAppearance"),
    vaishnavaAppearance: tr("filterVaishnavaAppearance"),
    vaishnavaDisappearance: tr("filterVaishnavaDisappearance"),
    deityTemple: tr("filterDeityTemple")
  };
}

function renderLocationOptions() {
  const groups = new Map();
  for (const location of LOCATIONS) {
    const group = location.group || "Other";
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(location);
  }
  return [...groups]
    .map(([label, locations]) => {
      const options = locations.map((location) => `<option value="${location.id}">${location.name}</option>`).join("");
      return `<optgroup label="${label}">${options}</optgroup>`;
    })
    .join("");
}

function renderEventJumpOptions() {
  const selected = eventJumpSelect.value;
  eventJumpSelect.innerHTML = `
    <option value="">${tr("chooseEvent")}</option>
    ${EVENT_JUMP_TARGETS.map((target) => `<option value="${target.id}">${target.labels[currentLanguage] || target.labels.en}</option>`).join("")}
  `;
  eventJumpSelect.value = EVENT_JUMP_TARGETS.some((target) => target.id === selected) ? selected : "";
}

function renderVaishnavaJumpOptions() {
  const selected = vaishnavaJumpSelect.value;
  const targets = vaishnavaJumpTargets();
  vaishnavaJumpSelect.innerHTML = `
    <option value="">${tr("chooseVaishnava")}</option>
    ${targets.map((target) => `<option value="${target.id}">${target.label}</option>`).join("")}
  `;
  vaishnavaJumpSelect.value = targets.some((target) => target.id === selected) ? selected : "";
}

function jumpToEventMonth(targetId) {
  if (!targetId) return;
  normalizePeriodInputs();
  const target = EVENT_JUMP_TARGETS.find((item) => item.id === targetId);
  if (!target) return;
  const year = Number(periodFromInput.value.slice(0, 4));
  const location = LOCATIONS.find((item) => item.id === locationSelect.value) || LOCATIONS[0];
  const calendar = generateCalendarRange(`${year}-01-01`, `${year}-12-31`, location, RULES, EVENTS);
  const foundDays = calendar.days.filter((day) => eventJumpMatchesDay(day, target));
  renderVaishnavaJumpOptions();
  vaishnavaJumpSelect.value = "";
  jumpToFoundDays(foundDays, `${target.labels[currentLanguage] || target.labels.en} ${year}`);
  eventJumpSelect.value = targetId;
}

function jumpToVaishnava(targetId) {
  if (!targetId) return;
  normalizePeriodInputs();
  const target = vaishnavaJumpTargets().find((item) => item.id === targetId);
  if (!target) return;
  ensureVaishnavaFiltersEnabled();
  const year = Number(periodFromInput.value.slice(0, 4));
  const location = LOCATIONS.find((item) => item.id === locationSelect.value) || LOCATIONS[0];
  const calendar = generateCalendarRange(`${year}-01-01`, `${year}-12-31`, location, RULES, EVENTS);
  const foundDays = calendar.days.filter((day) => day.events.some((event) => target.eventIds.has(event.id) || target.keys.has(vaishnavaPersonKey(event))));
  eventJumpSelect.value = "";
  jumpToFoundDays(foundDays, `${target.label} ${year}`);
  vaishnavaJumpSelect.value = targetId;
}

function jumpToEventSearch() {
  normalizePeriodInputs();
  const query = eventSearchInput.value.trim();
  if (!query) return;
  const year = Number(periodFromInput.value.slice(0, 4));
  const location = LOCATIONS.find((item) => item.id === locationSelect.value) || LOCATIONS[0];
  const calendar = generateCalendarRange(`${year}-01-01`, `${year}-12-31`, location, RULES, EVENTS);
  const needle = normalizeSearchText(query);
  const foundDays = calendar.days.filter((day) => dayMatchesSearch(day, needle));
  eventJumpSelect.value = "";
  renderVaishnavaJumpOptions();
  vaishnavaJumpSelect.value = "";
  jumpToFoundDays(foundDays, `"${query}" ${year}`);
}

function jumpToFoundDays(foundDays, label) {
  if (!foundDays.length) {
    calendarStatus.textContent = `${tr("eventNotFound")} ${label}`;
    return;
  }
  const foundDay = foundDays[0];
  jumpHighlightDates = new Set(foundDays.map((day) => day.date));
  preferredSelectedDate = foundDay.date;
  pendingScrollTarget = `.day[data-date="${foundDay.date}"]`;
  setMonthPeriodForIsoDate(foundDay.date);
  calendarStatus.textContent = `${tr("eventSearchFound")}: ${foundDays.length}`;
}

function eventJumpMatchesDay(day, target) {
  if (target.matchDay?.(day)) return true;
  return day.events.some((event) => {
    const haystack = [
      event.id,
      event.runtime_id,
      event.subject,
      event.name,
      event.i18n?.en?.name,
      event.i18n?.ru?.name
    ]
      .filter(Boolean)
      .join(" ");
    return target.patterns.some((pattern) => pattern.test(haystack));
  });
}

function handleVaishnavaSelectTypeahead(event) {
  if (event.key === "Enter" && vaishnavaJumpSelect.value) {
    event.preventDefault();
    jumpToVaishnava(vaishnavaJumpSelect.value);
    return;
  }
  if (event.key === "Escape") {
    vaishnavaTypeaheadText = "";
    return;
  }
  if (event.key === "Backspace") {
    event.preventDefault();
    vaishnavaTypeaheadText = vaishnavaTypeaheadText.slice(0, -1);
    selectVaishnavaTypeaheadMatch();
    return;
  }
  if (event.key.length !== 1 || event.metaKey || event.ctrlKey || event.altKey) return;
  event.preventDefault();
  vaishnavaTypeaheadText += event.key;
  selectVaishnavaTypeaheadMatch();
}

function selectVaishnavaTypeaheadMatch() {
  clearTimeout(vaishnavaTypeaheadTimer);
  vaishnavaTypeaheadTimer = setTimeout(() => {
    vaishnavaTypeaheadText = "";
  }, 1200);
  const needle = normalizeSearchText(vaishnavaTypeaheadText);
  if (!needle) return;
  const target = vaishnavaJumpTargets().find((item) => normalizeSearchText(`${item.label} ${item.id} ${item.searchText}`).includes(needle));
  if (!target) return;
  vaishnavaJumpSelect.value = target.id;
  calendarStatus.textContent = `${tr("vaishnavaFinder")}: ${target.label}`;
}

function vaishnavaJumpTargets() {
  const targets = new Map();
  for (const event of EVENTS.filter(isVaishnavaEvent)) {
    const key = vaishnavaPersonKey(event);
    if (!key) continue;
    const label = vaishnavaPersonLabel(event);
    const searchText = normalizeSearchText(`${key} ${label} ${event.subject || ""} ${event.name || ""} ${event.i18n?.en?.name || ""} ${event.i18n?.ru?.name || ""}`);
    if (!targets.has(key)) {
      targets.set(key, {
        id: key,
        label,
        searchText,
        eventIds: new Set(),
        keys: new Set([key])
      });
    }
    const target = targets.get(key);
    target.eventIds.add(event.id);
    target.keys.add(key);
    target.searchText = `${target.searchText} ${searchText}`;
    if (label.length < target.label.length) target.label = label;
  }
  return [...targets.values()].sort((a, b) => a.label.localeCompare(b.label, currentLanguage === "ru" ? "ru" : "en"));
}

function isVaishnavaEvent(event) {
  return event.type === "vaishnava_appearance" || event.type === "vaishnava_disappearance";
}

function vaishnavaPersonKey(event) {
  return normalizeSearchText(cleanVaishnavaPersonLabel(event.subject || event.name || event.i18n?.en?.name || event.id));
}

function vaishnavaPersonLabel(event) {
  return cleanVaishnavaPersonLabel(localizeEventName(event) || event.subject || event.name || event.id);
}

function cleanVaishnavaPersonLabel(value) {
  return String(value || "")
    .replace(/^День\s+(явления|ухода)\s+/i, "")
    .replace(/^Празднование\s+(явления|ухода)\s+/i, "")
    .replace(/^Явление\s+/i, "")
    .replace(/^Уход\s+/i, "")
    .replace(/^Appearance festival of\s+/i, "")
    .replace(/^Disappearance festival of\s+/i, "")
    .replace(/^Appearance day celebration of\s+/i, "")
    .replace(/^Disappearance day celebration of\s+/i, "")
    .replace(/^Appearance of\s+/i, "")
    .replace(/^Disappearance of\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function ensureVaishnavaFiltersEnabled() {
  setFilterSelectedWithoutRender("vaishnavaAppearance", true);
  setFilterSelectedWithoutRender("vaishnavaDisappearance", true);
  renderEventFilterChips();
}

function setFilterSelectedWithoutRender(value, selected) {
  const option = [...eventFilterSelect.options].find((item) => item.value === value);
  if (option) option.selected = selected;
}

function dayMatchesSearch(day, needle) {
  const dayText = [
    day.date,
    day.masa.display_name,
    day.masa.normal_masa_name,
    day.lunar.paksha,
    day.lunar.tithi_at_sunrise.name,
    localizeMasa(day.masa.display_name),
    localizePaksha(day.lunar.paksha),
    localizeTithi(day.lunar.tithi_at_sunrise.name)
  ].join(" ");
  const eventText = day.events.map(eventSearchText).join(" ");
  return normalizeSearchText(`${dayText} ${eventText}`).includes(needle);
}

function eventSearchText(event) {
  return [
    event.id,
    event.runtime_id,
    event.subject,
    event.name,
    event.description,
    event.full_description,
    event.ekadashi_id,
    event.i18n?.en?.name,
    event.i18n?.en?.description,
    event.i18n?.en?.full_description,
    event.i18n?.ru?.name,
    event.i18n?.ru?.description,
    event.i18n?.ru?.full_description
  ]
    .filter(Boolean)
    .join(" ");
}

function normalizeSearchText(value) {
  return String(value || "")
    .toLowerCase()
    .replaceAll("ё", "е")
    .replace(/\s+/g, " ")
    .trim();
}

function renderEventFilterChips() {
  const labels = {
    ...eventFilterLabels()
  };
  eventFilterChips.innerHTML = "";
  [...eventFilterSelect.options].forEach((option) => {
    option.textContent = labels[option.value] || option.value;
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = `filter-chip${option.selected ? " is-active" : ""}`;
    chip.textContent = option.textContent;
    chip.setAttribute("aria-pressed", String(option.selected));
    chip.addEventListener("click", () => setEventFilter(option.value, !option.selected));
    eventFilterChips.append(chip);
  });
}

function initTheme() {
  const savedTheme = localStorage.getItem("vcalendar-theme");
  const userThemeSelected = localStorage.getItem("vcalendar-theme-user-set") === "true" || (savedTheme && savedTheme !== "sepia");
  const defaultVersion = localStorage.getItem("vcalendar-theme-default-version");
  const theme = userThemeSelected && savedTheme ? savedTheme : defaultVersion === "sepia-20260606" ? savedTheme || "sepia" : "sepia";
  setTheme(theme, false);
  localStorage.setItem("vcalendar-theme-default-version", "sepia-20260606");
  themeToggle.querySelectorAll("[data-theme-choice]").forEach((button) => {
    button.addEventListener("click", () => setTheme(button.dataset.themeChoice, true));
  });
}

function setTheme(theme, userSelected = false) {
  const nextTheme = ["day", "night", "sepia"].includes(theme) ? theme : "sepia";
  document.documentElement.dataset.theme = nextTheme;
  localStorage.setItem("vcalendar-theme", nextTheme);
  if (userSelected) localStorage.setItem("vcalendar-theme-user-set", "true");
  updateThemeButtons();
}

function updateThemeButtons() {
  const currentTheme = document.documentElement.dataset.theme || "sepia";
  themeToggle.querySelectorAll("[data-theme-choice]").forEach((button) => {
    const selected = button.dataset.themeChoice === currentTheme;
    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
}

function initFontSize() {
  const savedFontSize = localStorage.getItem("vcalendar-font-size");
  const userFontSelected = localStorage.getItem("vcalendar-font-size-user-set") === "true" || (savedFontSize && savedFontSize !== "large");
  setFontSize(userFontSelected && savedFontSize ? savedFontSize : "normal", false);
  fontSizeToggle.querySelectorAll("[data-font-size-choice]").forEach((button) => {
    button.addEventListener("click", () => setFontSize(button.dataset.fontSizeChoice, true));
  });
}

function setFontSize(size, userSelected = false) {
  const nextSize = ["normal", "large", "xlarge"].includes(size) ? size : "normal";
  document.documentElement.dataset.fontSize = nextSize;
  localStorage.setItem("vcalendar-font-size", nextSize);
  if (userSelected) localStorage.setItem("vcalendar-font-size-user-set", "true");
  updateFontSizeButtons();
}

function updateFontSizeButtons() {
  const labels = {
    normal: tr("fontNormal"),
    large: tr("fontLarge"),
    xlarge: tr("fontExtraLarge")
  };
  const currentSize = document.documentElement.dataset.fontSize || "normal";
  fontSizeToggle.querySelectorAll("[data-font-size-choice]").forEach((button) => {
    const selected = button.dataset.fontSizeChoice === currentSize;
    const label = labels[button.dataset.fontSizeChoice] || button.dataset.fontSizeChoice;
    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-pressed", String(selected));
    button.setAttribute("aria-label", label);
    button.setAttribute("title", label);
  });
}

function initEventsOnly() {
  const saved = localStorage.getItem("vcalendar-events-only");
  eventsOnlyInput.checked = saved === null ? true : saved === "true";
  eventsOnlyInput.addEventListener("change", () => {
    localStorage.setItem("vcalendar-events-only", String(eventsOnlyInput.checked));
  });
}

function tr(key) {
  return I18N[currentLanguage][key] || I18N.en[key] || key;
}

function localizeTithi(value) {
  if (currentLanguage !== "ru") return value;
  return value
    .split(" ")
    .map((part) => TITHI_RU[part] || part)
    .join(" ");
}

function localizePaksha(value) {
  if (currentLanguage !== "ru") return value;
  return TITHI_RU[value] || value;
}

function localizeMasa(value) {
  if (currentLanguage !== "ru") return value;
  return value
    .split(" / ")
    .map((segment) =>
      segment
        .split(" ")
        .map((part) => MASA_RU[part] || part)
        .join(" ")
    )
    .join(" / ");
}

function localizeMasaCompact(value) {
  return localizeMasa(value)
    .replace(/\s+маса/gi, "")
    .replace(/\s+masa/gi, "");
}

function localizedEventField(event, field) {
  return event.i18n?.[currentLanguage]?.[field] || event[field] || "";
}

function localizeEventName(event) {
  return localizedEventField(event, "name");
}

function localizeEventDescription(event) {
  return localizeEventFullDescription(event) || localizeEventShortDescription(event);
}

function localizeEventShortDescription(event) {
  return localizedEventField(event, "description");
}

function localizeEventFullDescription(event) {
  return localizedEventField(event, "full_description");
}

function localizeClassification(value) {
  const map = {
    en: {
      viddha: "viddha",
      double_sunrise: "two sunrises",
      no_sunrise: "no sunrise",
      dashami_viddha_at_arunodaya: "Dashami at arunodaya",
      dashami_viddha_at_sunrise: "Dashami at sunrise",
      vyanjuli_mahadvadashi: "Vyanjuli Mahadvadashi",
      paksavardhini_mahadvadashi: "Paksavardhini Mahadvadashi",
      dvadashi_suitable_for_ekadashi_fasting: "Dvadashi fasting day",
      unmilani: "Unmilani Mahadvadashi",
      trisprsa: "Trisprsa Mahadvadashi",
      unmilani_trisprsa: "Unmilani Trisprsa Mahadvadashi",
      trisprsa_after_dashami_viddha: "shifted after Dashami at arunodaya",
      suddha_after_dashami_viddha: "shifted after Dashami at arunodaya",
      trisprsa_after_dashami_sunrise: "shifted from previous day: Dashami at sunrise",
      suddha_after_dashami_sunrise: "shifted from previous day: Dashami at sunrise"
    },
    ru: {
      viddha: "виддха",
      double_sunrise: "два восхода",
      no_sunrise: "без восхода",
      dashami_viddha_at_arunodaya: "Дашами на арунодае",
      dashami_viddha_at_sunrise: "Дашами на восходе",
      vyanjuli_mahadvadashi: "Вьянджули махадвадаши",
      paksavardhini_mahadvadashi: "Пакшавардхини махадвадаши",
      dvadashi_suitable_for_ekadashi_fasting: "пост на Двадаши",
      unmilani: "Унмилани махадвадаши",
      trisprsa: "Триспрша махадвадаши",
      unmilani_trisprsa: "Унмилани триспрша махадвадаши",
      trisprsa_after_dashami_viddha: "перенос: Дашами на арунодае",
      suddha_after_dashami_viddha: "перенос: Дашами на арунодае",
      trisprsa_after_dashami_sunrise: "перенос с предыдущего дня: Дашами на восходе",
      suddha_after_dashami_sunrise: "перенос с предыдущего дня: Дашами на восходе"
    }
  };
  return (map[currentLanguage] || map.en)[value] || value;
}

function ekadashiCalculationExplanation(event) {
  const rule = event.diagnostics?.rule_applied || event.classification || event.fast_day_type || "";
  const firstDate = event.candidate_date && event.candidate_date !== event.fast_date ? event.candidate_date : "";
  const fastDate = event.fast_date || "";
  const spanRu = firstDate && fastDate ? ` (${firstDate} и ${fastDate})` : "";
  const spanEn = firstDate && fastDate ? ` (${firstDate} and ${fastDate})` : "";
  const map = {
    en: {
      unmilani: `Ekadashi is present at two consecutive sunrises${spanEn}; by the Unmilani rule the fast is observed on the second solar day.`,
      unmilani_trisprsa: `Ekadashi is present at two consecutive sunrises${spanEn}, and the following Dvadashi/Trayodashi condition makes it Unmilani Trisprsa; the fast is observed on the second solar day.`,
      trisprsa: "Dvadashi is not available at the next sunrise in the normal way, so the fast follows the Trisprsa Mahadvadashi rule.",
      trisprsa_after_dashami_viddha: "The previous Ekadashi candidate was Dashami-viddha at arunodaya; the fast shifts to the next suitable Trisprsa day.",
      suddha_after_dashami_viddha: "The previous Ekadashi candidate was Dashami-viddha at arunodaya; the fast shifts to the next clean Ekadashi day.",
      trisprsa_after_dashami_sunrise: "The previous solar day began with Dashami at sunrise and Ekadashi started later; the fast is observed on the next suitable Trisprsa day.",
      suddha_after_dashami_sunrise: "The previous solar day began with Dashami at sunrise and Ekadashi started later; the fast is observed on the next clean Ekadashi day.",
      vyanjuli_mahadvadashi: "Dvadashi extends across two sunrises, so the fast follows the Vyanjuli Mahadvadashi rule.",
      paksavardhini_mahadvadashi: "A vriddhi full moon or new moon occurs later in the paksha, so the fast follows the Paksavardhini Mahadvadashi rule.",
      dvadashi_suitable_for_ekadashi_fasting: "Ekadashi was affected by Dashami at arunodaya; the suitable fasting day is Dvadashi.",
      no_sunrise: "Ekadashi does not touch sunrise on a solar day, so the fast shifts to the next suitable day."
    },
    ru: {
      unmilani: `Экадаши присутствует на двух восходах подряд${spanRu}; по правилу Унмилани пост соблюдается во второй солнечный день.`,
      unmilani_trisprsa: `Экадаши присутствует на двух восходах подряд${spanRu}, а следующее условие Двадаши/Трайодаши делает случай Унмилани Триспрша; пост соблюдается во второй солнечный день.`,
      trisprsa: "Двадаши не доступна на следующем восходе обычным образом, поэтому пост определяется по правилу Триспрша Махадвадаши.",
      trisprsa_after_dashami_viddha: "Предыдущий кандидат Экадаши был Дашами-виддха на арунодае; пост переносится на следующий подходящий день Триспрша.",
      suddha_after_dashami_viddha: "Предыдущий кандидат Экадаши был Дашами-виддха на арунодае; пост переносится на следующий чистый день Экадаши.",
      trisprsa_after_dashami_sunrise: "Предыдущий солнечный день начался с Дашами на восходе, а Экадаши началась позже; пост соблюдается в следующий подходящий день Триспрша.",
      suddha_after_dashami_sunrise: "Предыдущий солнечный день начался с Дашами на восходе, а Экадаши началась позже; пост соблюдается в следующий чистый день Экадаши.",
      vyanjuli_mahadvadashi: "Двадаши растянулась на два восхода подряд, поэтому пост определяется по правилу Вьянджули Махадвадаши.",
      paksavardhini_mahadvadashi: "Позже в этой пакше есть вриддхи Пурнима или Амавасья, поэтому пост определяется по правилу Пакшавардхини Махадвадаши.",
      dvadashi_suitable_for_ekadashi_fasting: "Экадаши была затронута Дашами на арунодае; подходящим днём поста становится Двадаши.",
      no_sunrise: "Экадаши не попала на восход ни одного солнечного дня, поэтому пост переносится на следующий подходящий день."
    }
  };
  return (map[currentLanguage] || map.en)[rule] || "";
}

function ekadashiReasonLabel(classification) {
  if (!classification || classification === "standard" || classification === "suddha_ekadashi" || classification === "normal_ekadashi") return "";
  if (classification === "suddha_after_dashami_sunrise") return "";
  if (classification === "trisprsa_after_dashami_sunrise") return localizeClassification("trisprsa");
  return localizeClassification(classification);
}

function ekadashiDetailLine(event) {
  const reason = ekadashiReasonLabel(event.classification);
  if (reason && event.candidate_date && event.candidate_date !== event.fast_date) {
    return `${tr("fastDate")} ${event.fast_date}, ${reason} (${event.candidate_date})`;
  }
  return reason ? `${tr("fastDate")} ${event.fast_date}, ${reason}` : `${tr("fastDate")} ${event.fast_date}`;
}

function renderEventDetails(events) {
  return `
    <section class="event-details-panel" tabindex="-1">
      <h3>${tr("eventDetails")}</h3>
      ${events.map((event) => renderEventDetail(event)).join("")}
    </section>
  `;
}

function renderEventDetail(event) {
  const isBioEvent = event.type === "vaishnava_appearance" || event.type === "vaishnava_disappearance";
  const heading = isBioEvent ? tr("biography") : tr("events");
  const shortDescription = localizeEventShortDescription(event) || eventNarrativeFallback(event, isBioEvent);
  const fullDescription = localizeEventFullDescription(event);
  const structuredNotes = renderEventStructuredNotes(event);
  return `
    <article class="event-detail-card ${eventClass(event)}">
      <div>
        <span>${heading}</span>
        <strong>${localizeEventName(event)}</strong>
      </div>
      ${structuredNotes}
      ${structuredNotes || fullDescription ? "" : `<p>${shortDescription}</p>`}
      ${fullDescription ? renderFullDescription(fullDescription) : ""}
    </article>
  `;
}

function renderFullDescription(description) {
  return `
    <details class="full-description">
      <summary aria-label="${tr("showFullDescription")}" title="${tr("showFullDescription")}">
        <span class="full-description-icon" aria-hidden="true"></span>
      </summary>
      <div class="full-description-body">${description}</div>
    </details>
  `;
}

function eventNarrativeFallback(event, isBioEvent) {
  if (isBioEvent) return tr("biographyPending");
  return tr("descriptionPending");
}

function renderEventStructuredNotes(event) {
  const benefits = localizedEventField(event, "benefits");
  const story = localizedEventField(event, "story");
  if (!benefits && !story) return "";
  return `
    <dl class="event-notes">
      ${benefits ? `<div><dt>${tr("benefits")}</dt><dd>${benefits}</dd></div>` : ""}
      ${story ? `<div><dt>${tr("story")}</dt><dd>${story}</dd></div>` : ""}
    </dl>
  `;
}

function localizeAvailability(value) {
  if (currentLanguage !== "ru") return value;
  return value === "not available" ? tr("notAvailable") : value;
}

try {
  init();
} catch (error) {
  console.error(error);
  calendarStatus.textContent = "Calculation failed";
  calendarGrid.innerHTML = `<div class="calendar-loading">Calendar failed to load. ${error.message}</div>`;
}
