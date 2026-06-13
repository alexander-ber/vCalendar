import { generateCalendarRange, viewModelForDay } from "./calendar-engine.js?v=20260613-2";
import { EVENTS } from "./events-data.js?v=20260613-1";
import { LOCATIONS } from "./locations-data.js?v=20260613-1";
import { RULES } from "./rules-data.js?v=20260613-2";

const locationSelect = document.querySelector("#locationSelect");
const periodFromInput = document.querySelector("#periodFromInput");
const periodToInput = document.querySelector("#periodToInput");
const eventsOnlyInput = document.querySelector("#eventsOnlyInput");
const eventFilterSelect = document.querySelector("#eventFilterSelect");
const eventFilterChips = document.querySelector("#eventFilterChips");
const eventJumpSelect = document.querySelector("#eventJumpSelect");
const renderButton = document.querySelector("#renderButton");
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
const summaryLocation = document.querySelector("#summaryLocation");
const summaryTimezone = document.querySelector("#summaryTimezone");
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
    timezone: "Timezone",
    loading: "Loading calendar...",
    selectedDay: "Selected Day",
    selectDay: "Select a day in the calendar.",
    visibleDays: "visible days",
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
    preferredEnd: "Preferred end",
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
    tithiAtArunodaya: "Tithi at arunodaya",
    until: "until",
    sun: "Sun",
    today: "Today",
    purushottamaNotice: "Purushottama Maas is active",
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
    timezone: "Часовой пояс",
    loading: "Загрузка календаря...",
    selectedDay: "Выбранный день",
    selectDay: "Выберите день в календаре.",
    visibleDays: "видимых дней",
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
    preferredEnd: "Желательное окончание",
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
    tithiAtArunodaya: "Титхи на арунодае",
    until: "до",
    sun: "Солнце",
    today: "Сегодня",
    purushottamaNotice: "Идёт Пурушоттама маса",
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
    matchDay: (day) => day.lunar.masa === "Damodara" || day.lunar.masa_display.includes("Damodara")
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
      return `${tr("parana")}: ${tr("start").toLowerCase()} ${event.parana.start}; ${tr("latestEnd").toLowerCase()} ${event.parana.absolute_end}`;
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
            <p>${ekadashiEvents.map((event) => localizeEventDescription(event)).join(" ")}</p>
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
                    <div><dt>${tr("latestEnd")}</dt><dd>${event.parana.absolute_end}</dd></div>
                  </dl>
                  <small>${localizeEventDescription(event)}</small>
                `
              )
              .join("")}
          </div>`
        : ""
    }
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
    <div class="diagnostic">
      ${tr("tithiAtArunodaya")}: ${localizeTithi(model.arunodayaTithi)}. ${tr("diagnostic")}
    </div>
  `;
  if (options.scrollToEventDetails) {
    requestAnimationFrame(() => {
      const target = document.querySelector(".event-details-panel") || document.querySelector(".details");
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
      target?.focus?.({ preventScroll: true });
    });
  }
}

function renderCalendar() {
  normalizePeriodInputs();
  const location = LOCATIONS.find((item) => item.id === locationSelect.value) || LOCATIONS[0];
  locationSelect.value = location.id;
  const calendar = generateCalendarRange(periodFromInput.value, periodToInput.value, location, RULES, EVENTS);

  calendarTitle.textContent = periodTitle(periodFromInput.value, periodToInput.value);
  calendarStatus.textContent = `${calendar.days.length} ${tr("visibleDays")} - ${tr("updated")} ${new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(new Date())}`;
  summaryLocation.textContent = `${location.name} (${location.lat.toFixed(3)}, ${location.lon.toFixed(3)})`;
  summaryTimezone.textContent = location.timezone;
  renderMasaNotice(calendar.days);
  calendarHeader.innerHTML = "";
  calendarGrid.innerHTML = "";
  calendarGrid.classList.add("is-range");

  const today = currentIsoDate();
  const visibleDays = eventsOnlyInput.checked ? calendar.days.filter((day) => visibleEventsForDay(day).length > 0) : calendar.days;
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
      <div class="calendar-header">${WEEKDAYS[currentLanguage].map((label) => `<span>${label}</span>`).join("")}</div>
      <div class="month-section-grid"></div>
    `;
    const grid = section.querySelector(".month-section-grid");
    if (!eventsOnlyInput.checked) {
      for (let i = 0; i < weekdayOfIsoDate(days[0].date); i += 1) {
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

function renderDayButton(day, today, location) {
  const isToday = day.date === today;
  const isJumpTarget = jumpHighlightDates.has(day.date);
  const button = document.createElement("button");
  button.type = "button";
  button.className = `day${isToday ? " is-today" : ""}${isJumpTarget ? " is-jump-target" : ""}`;
  button.dataset.date = day.date;
  button.innerHTML = `
    <div class="day-topline">
      <span class="gregorian-main">${gregorianDayLine(day.date)}</span>
      <span class="moon-symbol" title="${localizePaksha(day.lunar.paksha)}">${moonSymbol(day.lunar.tithi_at_sunrise.name, day.lunar.paksha)}</span>
    </div>
    ${isToday ? `<div class="today-pill">${tr("today")}</div>` : ""}
    <div class="lunar-line">${localizeMasa(day.lunar.masa_display)} • ${tithiDisplayLine(day)}</div>
    <div class="tithi-end">${tr("until")} ${tithiEndLabel(day)}</div>
    <div class="times"><span class="time-icon" aria-label="${tr("sun")}">☀</span>${calendarTime(day.astronomy.sunrise, location.timezone)}-${calendarTime(day.astronomy.sunset, location.timezone)}</div>
    <div class="times"><span class="time-icon" aria-label="${tr("moonrise")}">☾</span>${calendarTimeOrDash(day.astronomy.moonrise, location.timezone)}-${calendarTimeOrDash(day.astronomy.moonset, location.timezone)} · ${Math.round(day.lunar.tithi_angle_at_sunrise)}°</div>
    <div class="events">
      ${visibleEventsForDay(day)
        .map((event) => `<div class="event ${eventClass(event)}">${eventLabel(event)}</div>`)
        .join("")}
    </div>
  `;
  button.addEventListener("click", () => renderDetails(day, { scrollToEventDetails: true }));
  return button;
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

function renderMasaNotice(days) {
  const adhikaDays = days.filter((day) => day.lunar.masa_type === "adhika");
  if (!adhikaDays.length) {
    masaNotice.hidden = true;
    masaNotice.innerHTML = "";
    return;
  }
  const first = adhikaDays[0];
  const last = adhikaDays[adhikaDays.length - 1];
  masaNotice.hidden = false;
  masaNotice.innerHTML = `
    ${tr("purushottamaNotice")}: ${localizeMasa(first.masa.display_name)}
    <small>${tr("visibleInMonth")} ${gregorianShort(first.date)} ${tr("to")} ${gregorianShort(last.date)} ${tr("forLocation")}.</small>
  `;
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
    timeZone: "UTC"
  }).format(new Date(`${isoDate}T12:00:00Z`));
}

function moonSymbol(tithiName, paksha) {
  if (tithiName === "Purnima") return "○";
  if (tithiName === "Amavasya") return "●";
  return paksha === "Gaura" ? "☽" : "☾";
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
  if (startDate.slice(0, 7) === endDate.slice(0, 7)) {
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
  locationSelect.addEventListener("change", renderCalendar);
  periodFromInput.addEventListener("change", renderCalendar);
  periodToInput.addEventListener("change", renderCalendar);
  eventsOnlyInput.addEventListener("change", renderCalendar);
  eventFilterSelect.addEventListener("change", renderCalendar);
  eventJumpSelect.addEventListener("change", () => jumpToEventMonth(eventJumpSelect.value));
  thisWeekButton.addEventListener("click", () => setCurrentWeekPeriod());
  thisMonthButton.addEventListener("click", () => setCurrentMonthPeriod());
  fullYearButton.addEventListener("click", () => setFullYearPeriod());
  prevMonthTop.addEventListener("click", () => shiftPeriod(-1));
  nextMonthTop.addEventListener("click", () => shiftPeriod(1));
  prevMonthBottom.addEventListener("click", () => shiftPeriod(-1));
  nextMonthBottom.addEventListener("click", () => shiftPeriod(1));
  renderCalendar();
}

function setCurrentWeekPeriod() {
  normalizePeriodInputs();
  const dayOfWeek = weekdayOfIsoDate(periodFromInput.value);
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = shiftIsoDateByDays(periodFromInput.value, mondayOffset);
  periodFromInput.value = weekStart;
  periodToInput.value = shiftIsoDateByDays(weekStart, 6);
  renderCalendar();
}

function setCurrentMonthPeriod() {
  const [year, month] = periodFromInput.value.split("-").map(Number);
  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const monthEndDate = new Date(Date.UTC(year, month, 0));
  periodFromInput.value = monthStart;
  periodToInput.value = isoDateFromDate(monthEndDate);
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
  renderCalendar();
}

function shiftPeriod(deltaMonths) {
  normalizePeriodInputs();
  periodFromInput.value = shiftIsoDateByMonths(periodFromInput.value, deltaMonths);
  periodToInput.value = shiftIsoDateByMonths(periodToInput.value, deltaMonths);
  renderCalendar();
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
  document.querySelector(".eyebrow").textContent = tr("appSubtitle");
  renderButton.textContent = tr("generate");
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = tr(element.dataset.i18n);
  });
  renderEventFilterChips();
  renderEventJumpOptions();
  updateFontSizeButtons();
  if (!selectedDate) dayDetails.textContent = tr("selectDay");
  setTheme(document.documentElement.dataset.theme || "day");
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

function jumpToEventMonth(targetId) {
  if (!targetId) return;
  normalizePeriodInputs();
  const target = EVENT_JUMP_TARGETS.find((item) => item.id === targetId);
  if (!target) return;
  const year = Number(periodFromInput.value.slice(0, 4));
  const location = LOCATIONS.find((item) => item.id === locationSelect.value) || LOCATIONS[0];
  const calendar = generateCalendarRange(`${year}-01-01`, `${year}-12-31`, location, RULES, EVENTS);
  const foundDays = calendar.days.filter((day) => eventJumpMatchesDay(day, target));
  if (!foundDays.length) {
    calendarStatus.textContent = `${tr("eventNotFound")} ${year}`;
    return;
  }
  const foundDay = foundDays[0];
  jumpHighlightDates = new Set(foundDays.map((day) => day.date));
  preferredSelectedDate = foundDay.date;
  pendingScrollTarget = ".calendar-wrap";
  setMonthPeriodForIsoDate(foundDay.date);
  eventJumpSelect.value = targetId;
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
  const defaultVersion = localStorage.getItem("vcalendar-theme-default-version");
  const theme = defaultVersion === "sepia-20260606" ? savedTheme || "sepia" : "sepia";
  setTheme(theme);
  localStorage.setItem("vcalendar-theme-default-version", "sepia-20260606");
  themeToggle.querySelectorAll("[data-theme-choice]").forEach((button) => {
    button.addEventListener("click", () => setTheme(button.dataset.themeChoice));
  });
}

function setTheme(theme) {
  const nextTheme = ["day", "night", "sepia"].includes(theme) ? theme : "day";
  document.documentElement.dataset.theme = nextTheme;
  localStorage.setItem("vcalendar-theme", nextTheme);
  themeToggle.querySelectorAll("[data-theme-choice]").forEach((button) => {
    const selected = button.dataset.themeChoice === nextTheme;
    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
}

function initFontSize() {
  const savedFontSize = localStorage.getItem("vcalendar-font-size");
  setFontSize(savedFontSize || "large");
  fontSizeToggle.querySelectorAll("[data-font-size-choice]").forEach((button) => {
    button.addEventListener("click", () => setFontSize(button.dataset.fontSizeChoice));
  });
}

function setFontSize(size) {
  const nextSize = ["normal", "large", "xlarge"].includes(size) ? size : "large";
  document.documentElement.dataset.fontSize = nextSize;
  localStorage.setItem("vcalendar-font-size", nextSize);
  updateFontSizeButtons();
}

function updateFontSizeButtons() {
  const labels = {
    normal: tr("fontNormal"),
    large: tr("fontLarge"),
    xlarge: tr("fontExtraLarge")
  };
  const currentSize = document.documentElement.dataset.fontSize || "large";
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
      trisprsa_after_dashami_sunrise: "shifted after Dashami at sunrise",
      suddha_after_dashami_sunrise: "shifted after Dashami at sunrise"
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
      trisprsa_after_dashami_sunrise: "перенос: Дашами на восходе",
      suddha_after_dashami_sunrise: "перенос: Дашами на восходе"
    }
  };
  return (map[currentLanguage] || map.en)[value] || value;
}

function ekadashiReasonLabel(classification) {
  if (!classification || classification === "standard" || classification === "suddha_ekadashi" || classification === "normal_ekadashi") return "";
  return localizeClassification(classification);
}

function ekadashiDetailLine(event) {
  const reason = ekadashiReasonLabel(event.classification);
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
