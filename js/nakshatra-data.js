const NAKSHATRA_GROUPS = {
  fixed: {
    i18n: {
      en: {
        name: "Fixed",
        summary: "Steady nakshatras for actions intended to give lasting and stable results.",
        plus: ["planting and cultivation", "entering a new home", "taking vows", "laying foundations", "long-term commitments"],
        minus: ["short-lived experiments", "actions meant to be quickly reversed"]
      },
      ru: {
        name: "Фиксированная",
        summary: "Устойчивая накшатра для дел, рассчитанных на длительный и стабильный результат.",
        plus: ["посадка и выращивание", "вход в новый дом", "принятие обетов", "закладка фундамента", "долгие обязательства"],
        minus: ["краткосрочные эксперименты", "дела, которые нужно быстро отменить или развернуть назад"]
      }
    }
  },
  soft: {
    i18n: {
      en: {
        name: "Soft",
        summary: "Gentle nakshatra for friendship, family, beauty, art, and auspicious social activity.",
        plus: ["friendship", "marriage", "conception", "wearing new clothes", "dance and art", "travel", "ceremonial rituals"],
        minus: ["harsh confrontation", "destructive or cutting actions"]
      },
      ru: {
        name: "Мягкая",
        summary: "Мягкая накшатра для дружбы, семьи, красоты, искусства и благоприятной социальной активности.",
        plus: ["дружба", "брак", "зачатие детей", "новая одежда", "танцы и искусство", "путешествия", "торжественные ритуалы"],
        minus: ["жёсткая конфронтация", "разрушительные или режущие действия"]
      }
    }
  },
  light: {
    i18n: {
      en: {
        name: "Light",
        summary: "Quick and light nakshatra for practical, useful, and relatively easy undertakings.",
        plus: ["trade", "purchases", "short trips", "sports", "jewelry", "business start", "crafts", "education", "taking medicine"],
        minus: ["heavy irreversible commitments", "slow foundational work"]
      },
      ru: {
        name: "Лёгкая",
        summary: "Быстрая и лёгкая накшатра для практичных, полезных и сравнительно простых дел.",
        plus: ["торговля", "покупки", "недалёкие поездки", "спорт", "украшения", "начало бизнеса", "ремесло", "образование", "приём лекарств"],
        minus: ["тяжёлые необратимые обязательства", "медленная фундаментальная работа"]
      }
    }
  },
  movable: {
    i18n: {
      en: {
        name: "Movable",
        summary: "Movable nakshatra for temporary work, travel, treatment, repair, learning, and gardening.",
        plus: ["temporary activities", "travel", "buying vehicles", "starting treatment or fasting", "repairs", "learning", "gardening"],
        minus: ["undertakings requiring permanent stability"]
      },
      ru: {
        name: "Подвижная",
        summary: "Подвижная накшатра для временных дел, поездок, лечения, ремонта, обучения и садоводства.",
        plus: ["временные дела", "путешествия", "покупка транспорта", "начало лечения или голодания", "ремонт", "обучение", "садоводство"],
        minus: ["дела, требующие постоянной устойчивости"]
      }
    }
  },
  sharp: {
    i18n: {
      en: {
        name: "Sharp",
        summary: "Sharp nakshatra for forceful actions, opposition, protection, and mystical mantra practice.",
        plus: ["active intervention", "facing opposition", "protection", "mystical mantra practice", "removing harmful influences"],
        minus: ["starting a journey", "purchases", "peaceful family ceremonies", "delicate agreements"]
      },
      ru: {
        name: "Резкая",
        summary: "Резкая накшатра для активных действий, противостояния, защиты и мистических мантр.",
        plus: ["активное действие", "встреча с противником", "защита", "мистические мантры", "устранение вредного влияния"],
        minus: ["начало поездки", "покупки", "мирные семейные церемонии", "тонкие договорённости"]
      }
    }
  },
  fierce: {
    i18n: {
      en: {
        name: "Fierce",
        summary: "Fierce nakshatra connected with risk, fire, weapons, poisons, competition, and destructive force.",
        plus: ["work with fire or weapons", "chemicals and poisons", "cutting trees", "competition", "risk-managed forceful work"],
        minus: ["starting a journey", "pledged borrowing", "peaceful auspicious beginnings", "unprotected risky activity"]
      },
      ru: {
        name: "Ужасная",
        summary: "Жёсткая накшатра, связанная с риском, огнём, оружием, ядами, соревнованием и разрушительной силой.",
        plus: ["работа с огнём или оружием", "химические вещества и яды", "подрезание деревьев", "соревнования", "силовая работа с контролем риска"],
        minus: ["начало поездки", "деньги под залог", "мирные благоприятные начинания", "риск без защиты"]
      }
    }
  },
  mixed: {
    i18n: {
      en: {
        name: "Mixed",
        summary: "Mixed nakshatra suitable for routine duties, but weak for important new beginnings.",
        plus: ["routine work", "daily duties", "maintenance", "ordinary obligations"],
        minus: ["important new undertakings", "major life starts"]
      },
      ru: {
        name: "Смешанная",
        summary: "Смешанная накшатра подходит для рутины и повседневных обязанностей, но слаба для важных новых начинаний.",
        plus: ["рутинная деятельность", "повседневные обязанности", "поддержание порядка", "обычные обязательства"],
        minus: ["важные новые дела", "крупные жизненные начинания"]
      }
    }
  }
};

export const NAKSHATRA_JYOTISH = [
  { number: 1, key: "ashvini", group: "light", i18n: { en: { name: "Ashvini" }, ru: { name: "Ашвини" } } },
  { number: 2, key: "bharani", group: "fierce", i18n: { en: { name: "Bharani" }, ru: { name: "Бхарани" } } },
  { number: 3, key: "krittika", group: "mixed", i18n: { en: { name: "Krittika" }, ru: { name: "Криттика" } } },
  { number: 4, key: "rohini", group: "fixed", i18n: { en: { name: "Rohini" }, ru: { name: "Рохини" } } },
  { number: 5, key: "mrigashirsha", group: "soft", i18n: { en: { name: "Mrigashirsha" }, ru: { name: "Мригаширша" } } },
  { number: 6, key: "ardra", group: "sharp", i18n: { en: { name: "Ardra" }, ru: { name: "Ардра" } } },
  { number: 7, key: "punarvasu", group: "movable", i18n: { en: { name: "Punarvasu" }, ru: { name: "Пунарвасу" } } },
  { number: 8, key: "pushya", group: "light", i18n: { en: { name: "Pushya" }, ru: { name: "Пушья" } } },
  { number: 9, key: "ashlesha", group: "sharp", i18n: { en: { name: "Ashlesha" }, ru: { name: "Ашлеша" } } },
  { number: 10, key: "magha", group: "fierce", i18n: { en: { name: "Magha" }, ru: { name: "Магха" } } },
  { number: 11, key: "purva-phalguni", group: "fierce", i18n: { en: { name: "Purva Phalguni" }, ru: { name: "Пурва-пхалгуни" } } },
  { number: 12, key: "uttara-phalguni", group: "fixed", i18n: { en: { name: "Uttara Phalguni" }, ru: { name: "Уттара-пхалгуни" } } },
  { number: 13, key: "hasta", group: "light", i18n: { en: { name: "Hasta" }, ru: { name: "Хаста" } } },
  { number: 14, key: "chitra", group: "soft", i18n: { en: { name: "Chitra" }, ru: { name: "Читра" } } },
  { number: 15, key: "swati", group: "movable", i18n: { en: { name: "Swati" }, ru: { name: "Свати" } } },
  { number: 16, key: "vishakha", group: "mixed", i18n: { en: { name: "Vishakha" }, ru: { name: "Вишакха" } } },
  { number: 17, key: "anuradha", group: "soft", i18n: { en: { name: "Anuradha" }, ru: { name: "Анурадха" } } },
  { number: 18, key: "jyeshtha", group: "sharp", i18n: { en: { name: "Jyeshtha" }, ru: { name: "Джйештха" } } },
  { number: 19, key: "mula", group: "sharp", i18n: { en: { name: "Mula" }, ru: { name: "Мула" } } },
  { number: 20, key: "purva-ashadha", group: "fierce", i18n: { en: { name: "Purva Ashadha" }, ru: { name: "Пурва-ашадха" } } },
  { number: 21, key: "uttara-ashadha", group: "fixed", i18n: { en: { name: "Uttara Ashadha" }, ru: { name: "Уттара-ашадха" } } },
  { number: 22, key: "shravana", group: "movable", i18n: { en: { name: "Shravana" }, ru: { name: "Шравана" } } },
  { number: 23, key: "dhanishtha", group: "movable", i18n: { en: { name: "Dhanishtha" }, ru: { name: "Дхаништха" } } },
  { number: 24, key: "shatabhisha", group: "movable", i18n: { en: { name: "Shatabhisha" }, ru: { name: "Сатабхиша" } } },
  { number: 25, key: "purva-bhadrapada", group: "fierce", i18n: { en: { name: "Purva Bhadrapada" }, ru: { name: "Пурва-бхадра" } } },
  { number: 26, key: "uttara-bhadrapada", group: "fixed", i18n: { en: { name: "Uttara Bhadrapada" }, ru: { name: "Уттара-бхадра" } } },
  { number: 27, key: "revati", group: "soft", i18n: { en: { name: "Revati" }, ru: { name: "Ревати" } } }
];

const NAKSHATRA_TECHNICAL = [
  { ruler: { en: "Ketu", ru: "Кету" }, symbol: { en: "horse head", ru: "лошадиная голова" }, deity: { en: "Ashvins, divine twin healers", ru: "Ашвины, божественные близнецы-лекари" } },
  { ruler: { en: "Shukra (Venus)", ru: "Шукра (Венера)" }, symbol: { en: "yoni", ru: "йони" }, deity: { en: "Yama / Dharma", ru: "Яма / Дхарма" } },
  { ruler: { en: "Surya (Sun)", ru: "Сурья (Солнце)" }, symbol: { en: "knife or spear", ru: "нож или копьё" }, deity: { en: "Agni, fire deity", ru: "Агни, божество огня" } },
  { ruler: { en: "Chandra (Moon)", ru: "Чандра (Луна)" }, symbol: { en: "cart, chariot, temple, banyan", ru: "телега, колесница, храм, баньян" }, deity: { en: "Brahma / Prajapati", ru: "Брахма / Праджапати" } },
  { ruler: { en: "Mangala (Mars)", ru: "Мангала (Марс)" }, symbol: { en: "deer's head", ru: "оленья голова" }, deity: { en: "Soma / Chandra", ru: "Сома / Чандра" } },
  { ruler: { en: "Rahu", ru: "Раху" }, symbol: { en: "tear, diamond, human head", ru: "слеза, алмаз, человеческая голова" }, deity: { en: "Rudra, storm deity", ru: "Рудра, божество бури" } },
  { ruler: { en: "Brihaspati (Jupiter)", ru: "Брихаспати (Юпитер)" }, symbol: { en: "bow and quiver", ru: "лук и колчан" }, deity: { en: "Aditi, mother of the gods", ru: "Адити, мать божеств" } },
  { ruler: { en: "Shani (Saturn)", ru: "Шани (Сатурн)" }, symbol: { en: "cow udder, lotus, arrow and circle", ru: "коровье вымя, лотос, стрела и круг" }, deity: { en: "Brihaspati, divine priest", ru: "Брихаспати, божественный жрец" } },
  { ruler: { en: "Budha (Mercury)", ru: "Будха (Меркурий)" }, symbol: { en: "serpent", ru: "змея" }, deity: { en: "Nagas, serpents", ru: "Наги, змеи" } },
  { ruler: { en: "Ketu", ru: "Кету" }, symbol: { en: "royal throne", ru: "царский трон" }, deity: { en: "Pitris, ancestors", ru: "Питары, предки" } },
  { ruler: { en: "Shukra (Venus)", ru: "Шукра (Венера)" }, symbol: { en: "front legs of a bed, hammock, fig tree", ru: "передние ножки кровати, гамак, фикус" }, deity: { en: "Bhaga, deity of fortune and family happiness", ru: "Бхага, божество богатства и семейного счастья" } },
  { ruler: { en: "Surya (Sun)", ru: "Сурья (Солнце)" }, symbol: { en: "four legs of a bed, hammock", ru: "четыре ножки кровати, гамак" }, deity: { en: "Aryaman, patron deity", ru: "Арьяман, бог-покровитель" } },
  { ruler: { en: "Chandra (Moon)", ru: "Чандра (Луна)" }, symbol: { en: "hand or fist", ru: "рука или кулак" }, deity: { en: "Savitar / Surya", ru: "Савитар / Сурья" } },
  { ruler: { en: "Mangala (Mars)", ru: "Мангала (Марс)" }, symbol: { en: "bright jewel or pearl", ru: "блестящая драгоценность или жемчужина" }, deity: { en: "Tvashtr / Vishvakarman, divine builder", ru: "Тваштар / Вишвакарман, божественный строитель" } },
  { ruler: { en: "Rahu", ru: "Раху" }, symbol: { en: "plant shoot, coral", ru: "побег растения, коралл" }, deity: { en: "Vayu, wind deity", ru: "Ваю, божество ветра" } },
  { ruler: { en: "Brihaspati (Jupiter)", ru: "Брихаспати (Юпитер)" }, symbol: { en: "triumphal arch, potter's wheel", ru: "триумфальная арка, гончарный круг" }, deity: { en: "Indra and Agni", ru: "Индра и Агни" } },
  { ruler: { en: "Shani (Saturn)", ru: "Шани (Сатурн)" }, symbol: { en: "triumphal arch, lotus", ru: "триумфальная арка, лотос" }, deity: { en: "Mitra, deity of friendship and cooperation", ru: "Митра, божество дружбы и сотрудничества" } },
  { ruler: { en: "Budha (Mercury)", ru: "Будха (Меркурий)" }, symbol: { en: "round amulet, umbrella, earring", ru: "круглый амулет, зонтик, серьга" }, deity: { en: "Indra", ru: "Индра" } },
  { ruler: { en: "Ketu", ru: "Кету" }, symbol: { en: "bundle of roots, elephant goad", ru: "связка корней, слоновье стрекало" }, deity: { en: "Nirriti, goddess of destruction and dissolution", ru: "Ниррити, богиня разрушения и распада" } },
  { ruler: { en: "Shukra (Venus)", ru: "Шукра (Венера)" }, symbol: { en: "elephant tusk, fan, winnowing basket", ru: "слоновый бивень, опахало, веяльная плетушка" }, deity: { en: "Apas, deity of cosmic waters", ru: "Апас, божество космических вод" } },
  { ruler: { en: "Surya (Sun)", ru: "Сурья (Солнце)" }, symbol: { en: "elephant tusk, small bed", ru: "слоновый бивень, маленькое ложе" }, deity: { en: "Vishvadevas, universal gods", ru: "Вишведевы, универсальные боги" } },
  { ruler: { en: "Chandra (Moon)", ru: "Чандра (Луна)" }, symbol: { en: "ear or three footprints", ru: "ухо или три следа" }, deity: { en: "Vishnu, preserver of the universe", ru: "Вишну, хранитель мироздания" } },
  { ruler: { en: "Mangala (Mars)", ru: "Мангала (Марс)" }, symbol: { en: "drum or flute", ru: "барабан или флейта" }, deity: { en: "Eight Vasus, deities of earthly abundance", ru: "Восемь Васу, боги земного изобилия" } },
  { ruler: { en: "Rahu", ru: "Раху" }, symbol: { en: "empty circle, thousand flowers or stars", ru: "пустая окружность, тысяча цветов или звёзд" }, deity: { en: "Varuna, deity of waters, sky and earth", ru: "Варуна, божество воды, неба и земли" } },
  { ruler: { en: "Brihaspati (Jupiter)", ru: "Брихаспати (Юпитер)" }, symbol: { en: "swords, front legs of a funeral cot, two-faced man", ru: "мечи, передние ножки погребального ложа, человек с двумя лицами" }, deity: { en: "Aja Ekapada, ancient fiery dragon", ru: "Аджикапада, древний огненный дракон" } },
  { ruler: { en: "Shani (Saturn)", ru: "Шани (Сатурн)" }, symbol: { en: "twins, back legs of a funeral cot, serpent in water", ru: "близнецы, задние ножки погребального ложа, змея в воде" }, deity: { en: "Ahir Budhnya, serpent or dragon of the deep", ru: "Ахир Будхьяна, змей или дракон глубины" } },
  { ruler: { en: "Budha (Mercury)", ru: "Будха (Меркурий)" }, symbol: { en: "fish or pair of fish, drum", ru: "рыба или пара рыб, барабан" }, deity: { en: "Pushan, nourisher and protector", ru: "Пушан, кормилец и защитник" } }
];

export function nakshatraJyotishForNumber(number) {
  const nakshatra = NAKSHATRA_JYOTISH[number - 1];
  if (!nakshatra) return null;
  const group = NAKSHATRA_GROUPS[nakshatra.group];
  return { ...nakshatra, technical: NAKSHATRA_TECHNICAL[number - 1], groupInfo: group };
}
