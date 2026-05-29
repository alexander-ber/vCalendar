import { generateCalendarRange, viewModelForDay } from "./calendar-engine.js?v=20260529-4";
import { EVENTS } from "./events-data.js?v=20260529-4";
import { LOCATIONS } from "./locations-data.js?v=20260528-17";
import { RULES } from "./rules-data.js?v=20260528-17";

const locationSelect = document.querySelector("#locationSelect");
const periodFromInput = document.querySelector("#periodFromInput");
const periodToInput = document.querySelector("#periodToInput");
const eventsOnlyInput = document.querySelector("#eventsOnlyInput");
const eventFilterSelect = document.querySelector("#eventFilterSelect");
const renderButton = document.querySelector("#renderButton");
const prevMonthTop = document.querySelector("#prevMonthTop");
const nextMonthTop = document.querySelector("#nextMonthTop");
const prevMonthBottom = document.querySelector("#prevMonthBottom");
const nextMonthBottom = document.querySelector("#nextMonthBottom");
const languageToggle = document.querySelector("#languageToggle");
const themeToggle = document.querySelector("#themeToggle");
const themeLabel = document.querySelector("#themeLabel");
const summaryLocation = document.querySelector("#summaryLocation");
const summaryTimezone = document.querySelector("#summaryTimezone");
const calendarTitle = document.querySelector("#calendarTitle");
const calendarStatus = document.querySelector("#calendarStatus");
const masaNotice = document.querySelector("#masaNotice");
const calendarHeader = document.querySelector("#calendarHeader");
const calendarGrid = document.querySelector("#calendarGrid");
const dayDetails = document.querySelector("#dayDetails");

let selectedDate = null;
let currentLanguage = "en";

const I18N = {
  en: {
    appSubtitle: "Gaudiya Vaishnava Panchang POC",
    day: "Day",
    night: "Night",
    strictMode: "Strict internal mode",
    location: "Location",
    periodFrom: "From",
    periodTo: "To",
    generate: "Generate",
    generating: "Generating...",
    timezone: "Timezone",
    engine: "Engine",
    engineValue: "Local browser JS",
    loading: "Loading calendar...",
    selectedDay: "Selected Day",
    selectDay: "Select a day in the calendar.",
    visibleDays: "visible days",
    updated: "updated",
    gregorianDate: "Gregorian date",
    isoDate: "ISO date",
    sunrise: "Sunrise",
    sunset: "Sunset",
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
    eventsOnly: "Only days with events",
    eventFilters: "Event filters",
    filterEkadashi: "Ekadashi",
    filterParana: "Parana",
    filterPurushottama: "Purushottama",
    filterFestivals: "Festivals",
    filterVaishnavaAppearance: "Vaishnava appearances",
    filterVaishnavaDisappearance: "Vaishnava disappearances",
    filterDeityTemple: "Deity / temple days",
    previousMonth: "Previous period",
    nextMonth: "Next period",
    noEventDays: "No event days match this filter."
  },
  ru: {
    appSubtitle: "Гаудия-вайшнавский панчанг POC",
    day: "День",
    night: "Ночь",
    strictMode: "Строгий внутренний режим",
    location: "Место",
    periodFrom: "С",
    periodTo: "По",
    generate: "Рассчитать",
    generating: "Расчёт...",
    timezone: "Часовой пояс",
    engine: "Движок",
    engineValue: "Локальный JS в браузере",
    loading: "Загрузка календаря...",
    selectedDay: "Выбранный день",
    selectDay: "Выберите день в календаре.",
    visibleDays: "видимых дней",
    updated: "обновлено",
    gregorianDate: "Григорианская дата",
    isoDate: "ISO дата",
    sunrise: "Восход",
    sunset: "Закат",
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
    eventsOnly: "Только дни с событиями",
    eventFilters: "Фильтры событий",
    filterEkadashi: "Экадаши",
    filterParana: "Паран",
    filterPurushottama: "Пурушоттама",
    filterFestivals: "Праздники",
    filterVaishnavaAppearance: "Явления вайшнавов",
    filterVaishnavaDisappearance: "Уходы вайшнавов",
    filterDeityTemple: "Божества / храмы",
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

const EVENT_RU = {
  "Padmini Ekadashi": "Падмини экадаши",
  "Parana for Padmini Ekadashi": "Паран для Падмини экадаши",
  "Gaura Ekadashi - no fast": "Гаура Экадаши — без поста",
  "Varuthini Ekadashi": "Варутхини экадаши",
  "Mohini Ekadashi": "Мохини экадаши",
  "Papamochani Ekadashi": "Папамочани экадаши",
  "Kamada Ekadashi": "Камада экадаши",
  "Sri Balarama Purnima": "Шри Баларама Пурнима",
  "Appearance of Srila Bhakti Prapanna Tirtha Goswami Maharaj": "Явление Шрилы Бхакти Прапанны Тиртхи Госвами Махараджа",
  "Sri Krishna Janmashtami": "Шри Кришна Джанмаштами",
  "Sri Gaura Purnima": "Шри Гаура Пурнима",
  "Sri Rama Navami": "Шри Рама Навами",
  "Sri Nrsimha Chaturdashi": "Шри Нрисимха Чатурдаши",
  "Ganga Saptami": "Ганга Саптами",
  "Sita Navami": "Сита Навами",
  "Start of Purushottama Masa": "Начало Пурушоттама",
  "End of Purushottama Masa": "Окончание Пурушоттама"
};

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
  if (event.type === "vaishnava_appearance" || event.type === "vaishnava_disappearance") return "vaishnava";
  if (event.type === "deity_installation" || event.type === "temple_opening" || event.category === "deity_temple") return "deity";
  return "";
}

function eventFilterType(event) {
  if (event.type === "ekadashi" || event.type === "ekadashi_notice") return "ekadashi";
  if (event.type === "parana") return "parana";
  if (event.type === "purushottama_boundary") return "purushottama";
  if (event.type === "vaishnava_appearance") return "vaishnavaAppearance";
  if (event.type === "vaishnava_disappearance") return "vaishnavaDisappearance";
  if (event.type === "deity_installation" || event.type === "temple_opening" || event.category === "deity_temple") return "deityTemple";
  return "festival";
}

function selectedEventFilters() {
  return new Set([...eventFilterSelect.selectedOptions].map((option) => option.value));
}

function visibleEventsForDay(day) {
  const filters = selectedEventFilters();
  return day.events.filter((event) => filters.has(eventFilterType(event)));
}

function eventLabel(event) {
  if (event.type === "ekadashi_notice") return localizeEventName(event.name);
  if (event.type === "ekadashi") return `${localizeEventName(event.name)} (${localizeClassification(event.classification)})`;
  if (event.type === "parana") {
    const hasWindow = event.parana.start !== "not implemented" && event.parana.preferred_end !== "not implemented";
    if (!hasWindow) return `${localizeEventName(event.name)}: ${tr("calculationPending")}`;
    if (event.parana.preferred_end === "not available") {
      return `${tr("parana")}: ${tr("start").toLowerCase()} ${event.parana.start}; ${tr("latestEnd").toLowerCase()} ${event.parana.absolute_end}`;
    }
    return `${tr("parana")}: ${event.parana.start}-${event.parana.preferred_end}`;
  }
  return localizeEventName(event.name);
}

function renderDetails(day) {
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
            <strong>${ekadashiEvents.map((event) => localizeEventName(event.name)).join(", ")}</strong>
            <p>${ekadashiEvents.map((event) => event.description).join(" ")}</p>
            <small>${ekadashiEvents.map((event) => `${tr("fastDate")} ${event.fast_date}, ${localizeClassification(event.classification)}`).join(" | ")}</small>
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
                  <strong>${localizeEventName(event.name)}</strong>
                  <dl>
                    <div><dt>${tr("start")}</dt><dd>${event.parana.start}</dd></div>
                    <div><dt>${tr("preferredEnd")}</dt><dd>${localizeAvailability(event.parana.preferred_end)}</dd></div>
                    <div><dt>${tr("latestEnd")}</dt><dd>${event.parana.absolute_end}</dd></div>
                  </dl>
                  <small>${event.description}</small>
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
    <div class="diagnostic">
      ${tr("tithiAtArunodaya")}: ${localizeTithi(model.arunodayaTithi)}. ${tr("diagnostic")}
    </div>
  `;
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
    for (const day of days) {
      grid.append(renderDayButton(day, today, location));
    }
    calendarGrid.append(section);
  }

  const todayInView = visibleDays.find((day) => day.date === today);
  const firstCurrentDay = visibleDays[0];
  if (todayInView) renderDetails(todayInView);
  else if (firstCurrentDay) renderDetails(firstCurrentDay);
}

function renderDayButton(day, today, location) {
  const isToday = day.date === today;
  const button = document.createElement("button");
  button.type = "button";
  button.className = `day${isToday ? " is-today" : ""}`;
  button.dataset.date = day.date;
  button.innerHTML = `
    <div class="day-topline">
      <span class="gregorian-main">${gregorianDayLine(day.date)}</span>
      <span class="moon-symbol" title="${localizePaksha(day.lunar.paksha)}">${moonSymbol(day.lunar.tithi_at_sunrise.name, day.lunar.paksha)}</span>
    </div>
    ${isToday ? `<div class="today-pill">${tr("today")}</div>` : ""}
    <div class="lunar-line">${localizeMasa(day.lunar.masa_display)} • ${localizeTithi(day.lunar.tithi_at_sunrise.name)}</div>
    <div class="tithi-end">${tr("until")} ${tithiEndLabel(day)}</div>
    <div class="times">${tr("sun")} ${calendarTime(day.astronomy.sunrise, location.timezone)}-${calendarTime(day.astronomy.sunset, location.timezone)}</div>
    <div class="events">
      ${visibleEventsForDay(day)
        .slice(0, 4)
        .map((event) => `<div class="event ${eventClass(event)}">${eventLabel(event)}</div>`)
        .join("")}
    </div>
  `;
  button.addEventListener("click", () => renderDetails(day));
  return button;
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

function init() {
  locationSelect.innerHTML = LOCATIONS.map((location) => `<option value="${location.id}">${location.name}</option>`).join("");
  locationSelect.value = "maalot";
  const period = currentPeriod();
  periodFromInput.value = period.start;
  periodToInput.value = period.end;
  initLanguage();
  initTheme();
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
  prevMonthTop.addEventListener("click", () => shiftPeriod(-1));
  nextMonthTop.addEventListener("click", () => shiftPeriod(1));
  prevMonthBottom.addEventListener("click", () => shiftPeriod(-1));
  nextMonthBottom.addEventListener("click", () => shiftPeriod(1));
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
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(next.getUTCDate()).padStart(2, "0")}`;
}

function initLanguage() {
  const savedLanguage = localStorage.getItem("vcalendar-language");
  currentLanguage = savedLanguage === "ru" ? "ru" : "en";
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
  document.querySelector(".eyebrow").textContent = tr("appSubtitle");
  document.querySelector(".engine-badge").textContent = tr("strictMode");
  renderButton.textContent = tr("generate");
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = tr(element.dataset.i18n);
  });
  localizeEventFilterOptions();
  if (!selectedDate) dayDetails.textContent = tr("selectDay");
  setTheme(document.documentElement.dataset.theme || "day");
}

function localizeEventFilterOptions() {
  const labels = {
    ekadashi: tr("filterEkadashi"),
    parana: tr("filterParana"),
    purushottama: tr("filterPurushottama"),
    festival: tr("filterFestivals"),
    vaishnavaAppearance: tr("filterVaishnavaAppearance"),
    vaishnavaDisappearance: tr("filterVaishnavaDisappearance"),
    deityTemple: tr("filterDeityTemple")
  };
  [...eventFilterSelect.options].forEach((option) => {
    option.textContent = labels[option.value] || option.value;
  });
}

function initTheme() {
  const savedTheme = localStorage.getItem("vcalendar-theme");
  const preferredTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "night" : "day";
  setTheme(savedTheme || preferredTheme);
  themeToggle.addEventListener("click", () => {
    setTheme(document.documentElement.dataset.theme === "night" ? "day" : "night");
  });
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("vcalendar-theme", theme);
  themeToggle.setAttribute("aria-pressed", String(theme === "night"));
  themeLabel.textContent = theme === "night" ? tr("night") : tr("day");
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

function localizeEventName(value) {
  if (currentLanguage !== "ru") return value;
  if (EVENT_RU[value]) return EVENT_RU[value];
  if (value.startsWith("Parana for ")) return value.replace("Parana for ", "Паран для ");
  return value.replace("Ekadashi", "экадаши").replace("Parana", "Паран");
}

function localizeClassification(value) {
  if (currentLanguage !== "ru") return value;
  const map = {
    standard: "обычный",
    viddha: "виддха",
    double_sunrise: "два восхода",
    no_sunrise: "без восхода",
    vyanjuli_mahadvadashi: "вьянджули махадвадаши"
  };
  return map[value] || value;
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
