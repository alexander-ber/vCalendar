import '../models/panchanga_day.dart';

class JyotishInfoService {
  const JyotishInfoService();

  TithiJyotishInfo tithiInfo(TithiInfo tithi, {required bool isRu}) {
    final pakshaPrefix = tithi.number <= 15 ? 'shukla' : 'krishna';
    final pakshaIndex = ((tithi.number - 1) % 15) + 1;
    final group = _tithiGroups[(pakshaIndex - 1) % _tithiGroups.length];
    final profile = _tithiProfiles[group]!;
    final evaluation = _evaluationFor(pakshaPrefix, pakshaIndex);
    return TithiJyotishInfo(
      name: _tithiName(tithi.number, isRu),
      group: group,
      groupLabel: isRu ? profile.ruName : profile.enName,
      quality: isRu ? profile.ruQuality : profile.enQuality,
      evaluation: isRu
          ? _evaluationRu[evaluation]!
          : _evaluationEn[evaluation]!,
      summary: isRu ? profile.ruSummary : profile.enSummary,
      plus: isRu ? profile.ruPlus : profile.enPlus,
      minus: isRu ? profile.ruMinus : profile.enMinus,
    );
  }

  NakshatraJyotishInfo nakshatraInfo(
    NakshatraInfo nakshatra, {
    required bool isRu,
  }) {
    final data = _nakshatraData[nakshatra.number - 1];
    final group = _nakshatraGroups[data.group]!;
    return NakshatraJyotishInfo(
      name: isRu ? data.ruName : data.enName,
      group: isRu ? group.ruName : group.enName,
      summary: isRu ? group.ruSummary : group.enSummary,
      plus: isRu ? group.ruPlus : group.enPlus,
      minus: isRu ? group.ruMinus : group.enMinus,
      pada: nakshatra.pada,
      sector: _sector(nakshatra.number),
      ruler: isRu ? data.ruRuler : data.enRuler,
      symbol: isRu ? data.ruSymbol : data.enSymbol,
      deity: isRu ? data.ruDeity : data.enDeity,
    );
  }

  String _tithiName(int number, bool isRu) {
    final names = isRu ? _tithiNamesRu : _tithiNamesEn;
    return names[number - 1];
  }

  String _sector(int number) {
    const spanMinutes = 800;
    final start = (number - 1) * spanMinutes;
    final end = number * spanMinutes;
    return '${_degreeMinute(start)}-${_degreeMinute(end)}';
  }

  String _degreeMinute(int totalMinutes) {
    final degrees = totalMinutes ~/ 60;
    final minutes = totalMinutes % 60;
    return "$degrees°${minutes.toString().padLeft(2, '0')}'";
  }

  String _evaluationFor(String paksha, int tithi) {
    if (tithi == 4 || tithi == 8 || tithi == 9 || tithi == 14) {
      return 'avoid';
    }
    if (tithi == 1 || tithi == 6 || tithi == 10 || tithi == 12) {
      return paksha == 'shukla' ? 'conditional' : 'careful';
    }
    return 'good';
  }
}

class TithiJyotishInfo {
  const TithiJyotishInfo({
    required this.name,
    required this.group,
    required this.groupLabel,
    required this.quality,
    required this.evaluation,
    required this.summary,
    required this.plus,
    required this.minus,
  });

  final String name;
  final String group;
  final String groupLabel;
  final String quality;
  final String evaluation;
  final String summary;
  final List<String> plus;
  final List<String> minus;
}

class NakshatraJyotishInfo {
  const NakshatraJyotishInfo({
    required this.name,
    required this.group,
    required this.summary,
    required this.plus,
    required this.minus,
    required this.pada,
    required this.sector,
    required this.ruler,
    required this.symbol,
    required this.deity,
  });

  final String name;
  final String group;
  final String summary;
  final List<String> plus;
  final List<String> minus;
  final int pada;
  final String sector;
  final String ruler;
  final String symbol;
  final String deity;
}

class _TithiProfile {
  const _TithiProfile({
    required this.enName,
    required this.ruName,
    required this.enQuality,
    required this.ruQuality,
    required this.enSummary,
    required this.ruSummary,
    required this.enPlus,
    required this.ruPlus,
    required this.enMinus,
    required this.ruMinus,
  });

  final String enName;
  final String ruName;
  final String enQuality;
  final String ruQuality;
  final String enSummary;
  final String ruSummary;
  final List<String> enPlus;
  final List<String> ruPlus;
  final List<String> enMinus;
  final List<String> ruMinus;
}

class _NakshatraGroup {
  const _NakshatraGroup({
    required this.enName,
    required this.ruName,
    required this.enSummary,
    required this.ruSummary,
    required this.enPlus,
    required this.ruPlus,
    required this.enMinus,
    required this.ruMinus,
  });

  final String enName;
  final String ruName;
  final String enSummary;
  final String ruSummary;
  final List<String> enPlus;
  final List<String> ruPlus;
  final List<String> enMinus;
  final List<String> ruMinus;
}

class _NakshatraData {
  const _NakshatraData({
    required this.enName,
    required this.ruName,
    required this.group,
    required this.enRuler,
    required this.ruRuler,
    required this.enSymbol,
    required this.ruSymbol,
    required this.enDeity,
    required this.ruDeity,
  });

  final String enName;
  final String ruName;
  final String group;
  final String enRuler;
  final String ruRuler;
  final String enSymbol;
  final String ruSymbol;
  final String enDeity;
  final String ruDeity;
}

const _tithiGroups = ['Nanda', 'Bhadra', 'Jaya', 'Rikta', 'Purna'];

const _evaluationEn = {
  'good': 'Good',
  'conditional': 'Conditional',
  'careful': 'Careful',
  'avoid': 'Avoid for major starts',
};

const _evaluationRu = {
  'good': 'Благоприятно',
  'conditional': 'Условно',
  'careful': 'С осторожностью',
  'avoid': 'Избегать важных начинаний',
};

const _tithiProfiles = {
  'Nanda': _TithiProfile(
    enName: 'Nanda',
    ruName: 'Нанда',
    enQuality: 'Growth',
    ruQuality: 'Рост',
    enSummary:
        'A tithi of increase and nourishment; useful when the action should grow steadily.',
    ruSummary:
        'Титхи роста и питания; полезна для дел, которые должны постепенно развиваться.',
    enPlus: ['routine work', 'preparation', 'worship', 'care and support'],
    ruPlus: [
      'рутинная работа',
      'подготовка',
      'поклонение',
      'забота и поддержка',
    ],
    enMinus: ['major launches without checking the rest of the muhurta'],
    ruMinus: ['крупные старты без проверки остальных факторов мухурты'],
  ),
  'Bhadra': _TithiProfile(
    enName: 'Bhadra',
    ruName: 'Бхадра',
    enQuality: 'Constructive',
    ruQuality: 'Созидание',
    enSummary:
        'A cooperative and constructive tithi for agreements, learning, and useful social activity.',
    ruSummary:
        'Созидательная титхи для договорённостей, учёбы и полезной социальной активности.',
    enPlus: ['partnerships', 'agreements', 'study', 'travel'],
    ruPlus: ['партнёрства', 'договорённости', 'учёба', 'путешествия'],
    enMinus: ['destructive actions', 'conflict and separation'],
    ruMinus: ['разрушительные действия', 'конфликт и разделение'],
  ),
  'Jaya': _TithiProfile(
    enName: 'Jaya',
    ruName: 'Джая',
    enQuality: 'Victory',
    ruQuality: 'Победа',
    enSummary:
        'An active tithi for overcoming obstacles, skill, discipline, and goal-oriented effort.',
    ruSummary:
        'Активная титхи для преодоления препятствий, навыка, дисциплины и работы на результат.',
    enPlus: ['study', 'practice', 'active initiatives', 'problem solving'],
    ruPlus: ['учёба', 'практика', 'активные инициативы', 'решение проблем'],
    enMinus: ['delicate reconciliation', 'passive undertakings'],
    ruMinus: ['тонкое примирение', 'пассивные начинания'],
  ),
  'Rikta': _TithiProfile(
    enName: 'Rikta',
    ruName: 'Рикта',
    enQuality: 'Emptying',
    ruQuality: 'Очищение',
    enSummary:
        'A clearing tithi; better for removal, repair, correction, and austerity than for auspicious starts.',
    ruSummary:
        'Очищающая титхи; лучше подходит для устранения, ремонта, исправления и аскезы, чем для благоприятных стартов.',
    enPlus: ['repairs', 'removing obstacles', 'debt repayment', 'austerity'],
    ruPlus: ['ремонт', 'устранение препятствий', 'возврат долгов', 'аскеза'],
    enMinus: [
      'marriage',
      'new home entry',
      'business opening',
      'major purchases',
    ],
    ruMinus: [
      'брак',
      'вход в новый дом',
      'открытие бизнеса',
      'крупные покупки',
    ],
  ),
  'Purna': _TithiProfile(
    enName: 'Purna',
    ruName: 'Пурна',
    enQuality: 'Fullness',
    ruQuality: 'Полнота',
    enSummary:
        'A nourishing and prosperity-oriented tithi; supportive for accumulation, worship, and stable work.',
    ruSummary:
        'Питательная титхи полноты и процветания; поддерживает накопление, поклонение и устойчивые дела.',
    enPlus: ['education', 'finance', 'trade', 'agriculture', 'worship'],
    ruPlus: ['образование', 'финансы', 'торговля', 'земледелие', 'поклонение'],
    enMinus: ['harmful actions', 'careless lending'],
    ruMinus: ['вредоносные действия', 'неосторожные займы'],
  ),
};

const _nakshatraGroups = {
  'fixed': _NakshatraGroup(
    enName: 'Fixed',
    ruName: 'Фиксированная',
    enSummary:
        'Steady nakshatras for actions intended to give lasting and stable results.',
    ruSummary:
        'Устойчивая накшатра для дел, рассчитанных на длительный и стабильный результат.',
    enPlus: ['foundations', 'vows', 'home matters', 'long commitments'],
    ruPlus: ['фундаменты', 'обеты', 'домашние дела', 'долгие обязательства'],
    enMinus: ['quickly reversible actions'],
    ruMinus: ['дела, которые нужно быстро отменить'],
  ),
  'soft': _NakshatraGroup(
    enName: 'Soft',
    ruName: 'Мягкая',
    enSummary: 'Gentle nakshatra for friendship, family, beauty, and art.',
    ruSummary: 'Мягкая накшатра для дружбы, семьи, красоты и искусства.',
    enPlus: ['friendship', 'marriage', 'art', 'ceremonies', 'travel'],
    ruPlus: ['дружба', 'брак', 'искусство', 'церемонии', 'путешествия'],
    enMinus: ['harsh confrontation'],
    ruMinus: ['жёсткая конфронтация'],
  ),
  'light': _NakshatraGroup(
    enName: 'Light',
    ruName: 'Лёгкая',
    enSummary: 'Quick and light nakshatra for practical and useful actions.',
    ruSummary: 'Быстрая и лёгкая накшатра для практичных и полезных дел.',
    enPlus: ['trade', 'short trips', 'crafts', 'medicine', 'study'],
    ruPlus: ['торговля', 'короткие поездки', 'ремесло', 'лекарства', 'учёба'],
    enMinus: ['heavy irreversible commitments'],
    ruMinus: ['тяжёлые необратимые обязательства'],
  ),
  'movable': _NakshatraGroup(
    enName: 'Movable',
    ruName: 'Подвижная',
    enSummary: 'Movable nakshatra for temporary work, travel, and treatment.',
    ruSummary: 'Подвижная накшатра для временных дел, поездок и лечения.',
    enPlus: ['travel', 'temporary activity', 'repairs', 'learning'],
    ruPlus: ['путешествия', 'временные дела', 'ремонт', 'обучение'],
    enMinus: ['undertakings requiring permanent stability'],
    ruMinus: ['дела, требующие постоянной устойчивости'],
  ),
  'sharp': _NakshatraGroup(
    enName: 'Sharp',
    ruName: 'Резкая',
    enSummary:
        'Sharp nakshatra for forceful action, protection, and removing harmful influence.',
    ruSummary:
        'Резкая накшатра для активного действия, защиты и устранения вредного влияния.',
    enPlus: ['protection', 'opposition', 'mantra practice', 'removal'],
    ruPlus: ['защита', 'противостояние', 'мантра-практика', 'устранение'],
    enMinus: ['peaceful family ceremonies', 'delicate agreements'],
    ruMinus: ['мирные семейные церемонии', 'тонкие договорённости'],
  ),
  'fierce': _NakshatraGroup(
    enName: 'Fierce',
    ruName: 'Ужасная',
    enSummary:
        'Fierce nakshatra connected with risk, fire, weapons, and destructive force.',
    ruSummary:
        'Жёсткая накшатра, связанная с риском, огнём, оружием и разрушительной силой.',
    enPlus: ['risk-managed forceful work', 'competition', 'cutting'],
    ruPlus: ['силовая работа с контролем риска', 'соревнования', 'отсечение'],
    enMinus: ['peaceful auspicious beginnings', 'unprotected risk'],
    ruMinus: ['мирные благоприятные старты', 'риск без защиты'],
  ),
  'mixed': _NakshatraGroup(
    enName: 'Mixed',
    ruName: 'Смешанная',
    enSummary: 'Suitable for routine duties, weaker for important new starts.',
    ruSummary: 'Подходит для рутины, слабее для важных новых начинаний.',
    enPlus: ['routine work', 'maintenance', 'ordinary obligations'],
    ruPlus: ['рутинная работа', 'поддержание порядка', 'обычные обязанности'],
    enMinus: ['major life starts'],
    ruMinus: ['крупные жизненные начинания'],
  ),
};

const _nakshatraData = [
  _NakshatraData(
    enName: 'Ashvini',
    ruName: 'Ашвини',
    group: 'light',
    enRuler: 'Ketu',
    ruRuler: 'Кету',
    enSymbol: 'horse head',
    ruSymbol: 'лошадиная голова',
    enDeity: 'Ashvins',
    ruDeity: 'Ашвины',
  ),
  _NakshatraData(
    enName: 'Bharani',
    ruName: 'Бхарани',
    group: 'fierce',
    enRuler: 'Shukra (Venus)',
    ruRuler: 'Шукра (Венера)',
    enSymbol: 'yoni',
    ruSymbol: 'йони',
    enDeity: 'Yama / Dharma',
    ruDeity: 'Яма / Дхарма',
  ),
  _NakshatraData(
    enName: 'Krittika',
    ruName: 'Криттика',
    group: 'mixed',
    enRuler: 'Surya (Sun)',
    ruRuler: 'Сурья (Солнце)',
    enSymbol: 'knife or spear',
    ruSymbol: 'нож или копьё',
    enDeity: 'Agni',
    ruDeity: 'Агни',
  ),
  _NakshatraData(
    enName: 'Rohini',
    ruName: 'Рохини',
    group: 'fixed',
    enRuler: 'Chandra (Moon)',
    ruRuler: 'Чандра (Луна)',
    enSymbol: 'cart, chariot, temple',
    ruSymbol: 'телега, колесница, храм',
    enDeity: 'Brahma / Prajapati',
    ruDeity: 'Брахма / Праджапати',
  ),
  _NakshatraData(
    enName: 'Mrigashirsha',
    ruName: 'Мригаширша',
    group: 'soft',
    enRuler: 'Mangala (Mars)',
    ruRuler: 'Мангала (Марс)',
    enSymbol: "deer's head",
    ruSymbol: 'оленья голова',
    enDeity: 'Soma / Chandra',
    ruDeity: 'Сома / Чандра',
  ),
  _NakshatraData(
    enName: 'Ardra',
    ruName: 'Ардра',
    group: 'sharp',
    enRuler: 'Rahu',
    ruRuler: 'Раху',
    enSymbol: 'tear, diamond',
    ruSymbol: 'слеза, алмаз',
    enDeity: 'Rudra',
    ruDeity: 'Рудра',
  ),
  _NakshatraData(
    enName: 'Punarvasu',
    ruName: 'Пунарвасу',
    group: 'movable',
    enRuler: 'Brihaspati (Jupiter)',
    ruRuler: 'Брихаспати (Юпитер)',
    enSymbol: 'bow and quiver',
    ruSymbol: 'лук и колчан',
    enDeity: 'Aditi',
    ruDeity: 'Адити',
  ),
  _NakshatraData(
    enName: 'Pushya',
    ruName: 'Пушья',
    group: 'light',
    enRuler: 'Shani (Saturn)',
    ruRuler: 'Шани (Сатурн)',
    enSymbol: 'cow udder, lotus',
    ruSymbol: 'коровье вымя, лотос',
    enDeity: 'Brihaspati',
    ruDeity: 'Брихаспати',
  ),
  _NakshatraData(
    enName: 'Ashlesha',
    ruName: 'Ашлеша',
    group: 'sharp',
    enRuler: 'Budha (Mercury)',
    ruRuler: 'Будха (Меркурий)',
    enSymbol: 'serpent',
    ruSymbol: 'змея',
    enDeity: 'Nagas',
    ruDeity: 'Наги',
  ),
  _NakshatraData(
    enName: 'Magha',
    ruName: 'Магха',
    group: 'fierce',
    enRuler: 'Ketu',
    ruRuler: 'Кету',
    enSymbol: 'royal throne',
    ruSymbol: 'царский трон',
    enDeity: 'Pitris',
    ruDeity: 'Питары',
  ),
  _NakshatraData(
    enName: 'Purva Phalguni',
    ruName: 'Пурва-пхалгуни',
    group: 'fierce',
    enRuler: 'Shukra (Venus)',
    ruRuler: 'Шукра (Венера)',
    enSymbol: 'front legs of a bed',
    ruSymbol: 'передние ножки кровати',
    enDeity: 'Bhaga',
    ruDeity: 'Бхага',
  ),
  _NakshatraData(
    enName: 'Uttara Phalguni',
    ruName: 'Уттара-пхалгуни',
    group: 'fixed',
    enRuler: 'Surya (Sun)',
    ruRuler: 'Сурья (Солнце)',
    enSymbol: 'four legs of a bed',
    ruSymbol: 'четыре ножки кровати',
    enDeity: 'Aryaman',
    ruDeity: 'Арьяман',
  ),
  _NakshatraData(
    enName: 'Hasta',
    ruName: 'Хаста',
    group: 'light',
    enRuler: 'Chandra (Moon)',
    ruRuler: 'Чандра (Луна)',
    enSymbol: 'hand or fist',
    ruSymbol: 'рука или кулак',
    enDeity: 'Savitar / Surya',
    ruDeity: 'Савитар / Сурья',
  ),
  _NakshatraData(
    enName: 'Chitra',
    ruName: 'Читра',
    group: 'soft',
    enRuler: 'Mangala (Mars)',
    ruRuler: 'Мангала (Марс)',
    enSymbol: 'bright jewel',
    ruSymbol: 'драгоценность',
    enDeity: 'Tvashtr / Vishvakarman',
    ruDeity: 'Тваштар / Вишвакарман',
  ),
  _NakshatraData(
    enName: 'Swati',
    ruName: 'Свати',
    group: 'movable',
    enRuler: 'Rahu',
    ruRuler: 'Раху',
    enSymbol: 'plant shoot, coral',
    ruSymbol: 'побег растения, коралл',
    enDeity: 'Vayu',
    ruDeity: 'Ваю',
  ),
  _NakshatraData(
    enName: 'Vishakha',
    ruName: 'Вишакха',
    group: 'mixed',
    enRuler: 'Brihaspati (Jupiter)',
    ruRuler: 'Брихаспати (Юпитер)',
    enSymbol: 'triumphal arch',
    ruSymbol: 'триумфальная арка',
    enDeity: 'Indra and Agni',
    ruDeity: 'Индра и Агни',
  ),
  _NakshatraData(
    enName: 'Anuradha',
    ruName: 'Анурадха',
    group: 'soft',
    enRuler: 'Shani (Saturn)',
    ruRuler: 'Шани (Сатурн)',
    enSymbol: 'triumphal arch, lotus',
    ruSymbol: 'триумфальная арка, лотос',
    enDeity: 'Mitra',
    ruDeity: 'Митра',
  ),
  _NakshatraData(
    enName: 'Jyeshtha',
    ruName: 'Джйештха',
    group: 'sharp',
    enRuler: 'Budha (Mercury)',
    ruRuler: 'Будха (Меркурий)',
    enSymbol: 'amulet, umbrella, earring',
    ruSymbol: 'амулет, зонтик, серьга',
    enDeity: 'Indra',
    ruDeity: 'Индра',
  ),
  _NakshatraData(
    enName: 'Mula',
    ruName: 'Мула',
    group: 'sharp',
    enRuler: 'Ketu',
    ruRuler: 'Кету',
    enSymbol: 'bundle of roots',
    ruSymbol: 'связка корней',
    enDeity: 'Nirriti',
    ruDeity: 'Ниррити',
  ),
  _NakshatraData(
    enName: 'Purva Ashadha',
    ruName: 'Пурва-ашадха',
    group: 'fierce',
    enRuler: 'Shukra (Venus)',
    ruRuler: 'Шукра (Венера)',
    enSymbol: 'elephant tusk, fan',
    ruSymbol: 'слоновый бивень, опахало',
    enDeity: 'Apas',
    ruDeity: 'Апас',
  ),
  _NakshatraData(
    enName: 'Uttara Ashadha',
    ruName: 'Уттара-ашадха',
    group: 'fixed',
    enRuler: 'Surya (Sun)',
    ruRuler: 'Сурья (Солнце)',
    enSymbol: 'elephant tusk, small bed',
    ruSymbol: 'слоновый бивень, малое ложе',
    enDeity: 'Vishvadevas',
    ruDeity: 'Вишведевы',
  ),
  _NakshatraData(
    enName: 'Shravana',
    ruName: 'Шравана',
    group: 'movable',
    enRuler: 'Chandra (Moon)',
    ruRuler: 'Чандра (Луна)',
    enSymbol: 'ear or three footprints',
    ruSymbol: 'ухо или три следа',
    enDeity: 'Vishnu',
    ruDeity: 'Вишну',
  ),
  _NakshatraData(
    enName: 'Dhanishtha',
    ruName: 'Дхаништха',
    group: 'movable',
    enRuler: 'Mangala (Mars)',
    ruRuler: 'Мангала (Марс)',
    enSymbol: 'drum or flute',
    ruSymbol: 'барабан или флейта',
    enDeity: 'Eight Vasus',
    ruDeity: 'Восемь Васу',
  ),
  _NakshatraData(
    enName: 'Shatabhisha',
    ruName: 'Сатабхиша',
    group: 'movable',
    enRuler: 'Rahu',
    ruRuler: 'Раху',
    enSymbol: 'empty circle, stars',
    ruSymbol: 'пустой круг, звёзды',
    enDeity: 'Varuna',
    ruDeity: 'Варуна',
  ),
  _NakshatraData(
    enName: 'Purva Bhadrapada',
    ruName: 'Пурва-бхадра',
    group: 'fierce',
    enRuler: 'Brihaspati (Jupiter)',
    ruRuler: 'Брихаспати (Юпитер)',
    enSymbol: 'swords, funeral cot',
    ruSymbol: 'мечи, погребальное ложе',
    enDeity: 'Aja Ekapada',
    ruDeity: 'Аджикапада',
  ),
  _NakshatraData(
    enName: 'Uttara Bhadrapada',
    ruName: 'Уттара-бхадра',
    group: 'fixed',
    enRuler: 'Shani (Saturn)',
    ruRuler: 'Шани (Сатурн)',
    enSymbol: 'twins, serpent in water',
    ruSymbol: 'близнецы, змей в воде',
    enDeity: 'Ahir Budhnya',
    ruDeity: 'Ахир Будхьяна',
  ),
  _NakshatraData(
    enName: 'Revati',
    ruName: 'Ревати',
    group: 'soft',
    enRuler: 'Budha (Mercury)',
    ruRuler: 'Будха (Меркурий)',
    enSymbol: 'fish, pair of fish, drum',
    ruSymbol: 'рыба, пара рыб, барабан',
    enDeity: 'Pushan',
    ruDeity: 'Пушан',
  ),
];

const _tithiNamesEn = [
  'Gaura Pratipat',
  'Gaura Dvitiya',
  'Gaura Tritiya',
  'Gaura Chaturthi',
  'Gaura Panchami',
  'Gaura Shashthi',
  'Gaura Saptami',
  'Gaura Ashtami',
  'Gaura Navami',
  'Gaura Dashami',
  'Gaura Ekadashi',
  'Gaura Dvadashi',
  'Gaura Trayodashi',
  'Gaura Chaturdashi',
  'Purnima',
  'Krishna Pratipat',
  'Krishna Dvitiya',
  'Krishna Tritiya',
  'Krishna Chaturthi',
  'Krishna Panchami',
  'Krishna Shashthi',
  'Krishna Saptami',
  'Krishna Ashtami',
  'Krishna Navami',
  'Krishna Dashami',
  'Krishna Ekadashi',
  'Krishna Dvadashi',
  'Krishna Trayodashi',
  'Krishna Chaturdashi',
  'Amavasya',
];

const _tithiNamesRu = [
  'Гаура Пратипад',
  'Гаура Двития',
  'Гаура Трития',
  'Гаура Чатуртхи',
  'Гаура Панчами',
  'Гаура Шаштхи',
  'Гаура Саптами',
  'Гаура Аштами',
  'Гаура Навами',
  'Гаура Дашами',
  'Гаура Экадаши',
  'Гаура Двадаши',
  'Гаура Трайодаши',
  'Гаура Чатурдаши',
  'Пурнима',
  'Кришна Пратипад',
  'Кришна Двития',
  'Кришна Трития',
  'Кришна Чатуртхи',
  'Кришна Панчами',
  'Кришна Шаштхи',
  'Кришна Саптами',
  'Кришна Аштами',
  'Кришна Навами',
  'Кришна Дашами',
  'Кришна Экадаши',
  'Кришна Двадаши',
  'Кришна Трайодаши',
  'Кришна Чатурдаши',
  'Амавасья',
];
