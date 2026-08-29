import '../models/panchanga_day.dart';

/// Mirrors js/tithi-muhurta-data.js and js/nakshatra-data.js word-for-word
/// (both plus/minus content and ruler/symbol/deity text) - web is the
/// reference for this content, not something to be re-derived.
class JyotishInfoService {
  const JyotishInfoService();

  TithiJyotishInfo tithiInfo(TithiInfo tithi, {required bool isRu}) {
    final pakshaPrefix = tithi.number <= 15 ? 'shukla' : 'krishna';
    final pakshaIndex = tithi.number <= 15 ? tithi.number : tithi.number - 15;
    final record = _tithiMuhurta['$pakshaPrefix-$pakshaIndex']!;
    return TithiJyotishInfo(
      name: _tithiName(tithi.number, isRu),
      group: record.group,
      groupLabel: isRu
          ? (_tithiGroupNamesRu[record.group] ?? record.group)
          : record.group,
      quality: record.quality,
      evaluation: isRu
          ? _evaluationRu[record.evaluation]!
          : _evaluationEn[record.evaluation]!,
      summary: isRu ? record.ruSummary : record.enSummary,
      plus: isRu ? record.ruPlus : record.enPlus,
      minus: isRu ? record.ruMinus : record.enMinus,
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

class _TithiMuhurta {
  const _TithiMuhurta({
    required this.group,
    required this.quality,
    required this.evaluation,
    required this.enSummary,
    required this.ruSummary,
    required this.enPlus,
    required this.ruPlus,
    required this.enMinus,
    required this.ruMinus,
  });

  final String group;
  final String quality;
  final String evaluation;
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

const _tithiGroupNamesRu = {
  'Nanda': 'Нанда',
  'Bhadra': 'Бхадра',
  'Jaya': 'Джая',
  'Rikta': 'Рикта',
  'Purna': 'Пурна',
};

const _evaluationEn = {
  'excellent': 'Excellent',
  'good': 'Good',
  'conditional': 'Conditional',
  'spiritual_only': 'For spiritual activities only',
  'avoid': 'Avoid for major starts',
};

const _evaluationRu = {
  'excellent': 'Отлично',
  'good': 'Благоприятно',
  'conditional': 'Условно',
  'spiritual_only': 'Только для духовных дел',
  'avoid': 'Избегать важных начинаний',
};

const _tithiMuhurta = {
  'shukla-1': _TithiMuhurta(
    group: 'Nanda',
    quality: 'Vriddhi',
    evaluation: 'avoid',
    enSummary:
        'A beginning tithi of growth, but generally weak for major auspicious starts in Shukla paksha.',
    ruSummary:
        'Титхи начала и роста, но в Шукла-пакше обычно слабая для крупных благоприятных начинаний.',
    enPlus: [
      'routine work',
      'preparation and planning',
      'cleaning and organizing',
      'prescribed worship',
    ],
    ruPlus: [
      'рутинная работа',
      'подготовка и планирование',
      'уборка и организация',
      'предписанное поклонение',
    ],
    enMinus: [
      'marriage',
      'business opening',
      'new home entry',
      'major contracts or purchases',
      'long-term project launch',
    ],
    ruMinus: [
      'брак',
      'открытие бизнеса',
      'вход в новый дом',
      'крупные договоры или покупки',
      'запуск долгого проекта',
    ],
  ),
  'shukla-2': _TithiMuhurta(
    group: 'Bhadra',
    quality: 'Mangala',
    evaluation: 'conditional',
    enSummary:
        'Constructive and cooperative, suitable when the rest of the muhurta supports the action.',
    ruSummary:
        'Созидательная и кооперативная титхи, применима при поддержке остальной мухурты.',
    enPlus: [
      'partnerships',
      'agreements',
      'reconciliation',
      'travel',
      'arts and study',
      'public affairs',
    ],
    ruPlus: [
      'партнёрства',
      'договорённости',
      'примирение',
      'путешествия',
      'искусства и учёба',
      'общественные дела',
    ],
    enMinus: [
      'critical long-term launches without checking lagna, nakshatra and yoga',
      'destructive actions',
      'separation and conflict',
    ],
    ruMinus: [
      'критичные долгие начинания без проверки лагны, накшатры и йоги',
      'разрушительные действия',
      'разделение и конфликт',
    ],
  ),
  'shukla-3': _TithiMuhurta(
    group: 'Jaya',
    quality: 'Bala',
    evaluation: 'good',
    enSummary:
        'Active and skill-building; good for learning, movement, and goal-oriented work.',
    ruSummary:
        'Активная титхи для развития навыков, движения и целенаправленной работы.',
    enPlus: [
      'study',
      'learning a skill',
      'crafts, art and music',
      'active initiatives',
      'travel and moving',
      'goal-oriented work',
    ],
    ruPlus: [
      'учёба',
      'освоение навыка',
      'ремёсла, искусство и музыка',
      'активные инициативы',
      'поездки и переезд',
      'работа на результат',
    ],
    enMinus: [
      'delicate reconciliation under an aggressive muhurta',
      'passive undertakings requiring complete calm',
    ],
    ruMinus: [
      'тонкое примирение при агрессивной мухурте',
      'пассивные дела, требующие полного спокойствия',
    ],
  ),
  'shukla-4': _TithiMuhurta(
    group: 'Rikta',
    quality: 'Khala',
    evaluation: 'avoid',
    enSummary:
        'A clearing and obstacle-removing tithi; unsuitable for ordinary auspicious beginnings.',
    ruSummary:
        'Титхи очищения и устранения препятствий; не подходит для обычных благоприятных начинаний.',
    enPlus: [
      'removing obstacles',
      'debt repayment',
      'repairs',
      'correcting defects',
      'breaking harmful habits',
    ],
    ruPlus: [
      'устранение препятствий',
      'возврат долгов',
      'ремонт',
      'исправление недостатков',
      'разрыв вредных привычек',
    ],
    enMinus: [
      'marriage',
      'business opening',
      'buying or entering a home',
      'peaceful agreements',
      'auspicious samskaras',
    ],
    ruMinus: [
      'брак',
      'открытие бизнеса',
      'покупка или вход в дом',
      'мирные соглашения',
      'благоприятные самскары',
    ],
  ),
  'shukla-5': _TithiMuhurta(
    group: 'Purna',
    quality: 'Lakshmi',
    evaluation: 'good',
    enSummary:
        'Prosperity-oriented and nourishing; good for learning, resources, and accumulation.',
    ruSummary:
        'Питательная и связанная с процветанием титхи; хороша для учёбы, ресурсов и накопления.',
    enPlus: [
      'education',
      'finance',
      'accumulation',
      'trade',
      'useful purchases',
      'agriculture and nourishment',
    ],
    ruPlus: [
      'образование',
      'финансы',
      'накопление',
      'торговля',
      'полезные покупки',
      'земледелие и питание',
    ],
    enMinus: ['lending money', 'destructive or conflict-oriented actions'],
    ruMinus: [
      'давать деньги в долг',
      'разрушительные или конфликтные действия',
    ],
  ),
  'shukla-6': _TithiMuhurta(
    group: 'Nanda',
    quality: 'Yashas',
    evaluation: 'conditional',
    enSummary:
        'Disciplined and status-building; use with care for soft family ceremonies.',
    ruSummary:
        'Дисциплинированная титхи для статуса и структуры; мягкие семейные церемонии требуют осторожности.',
    enPlus: [
      'disciplined work',
      'architecture and construction',
      'professional reputation',
      'protection',
      'organized projects',
    ],
    ruPlus: [
      'дисциплинированная работа',
      'архитектура и строительство',
      'профессиональная репутация',
      'защита',
      'организованные проекты',
    ],
    enMinus: [
      'delicate family ceremonies without a strong muhurta',
      'marriage without full chart checking',
      'activities requiring maximum softness',
    ],
    ruMinus: [
      'тонкие семейные церемонии без сильной мухурты',
      'брак без полной проверки карты',
      'дела, требующие максимальной мягкости',
    ],
  ),
  'shukla-7': _TithiMuhurta(
    group: 'Bhadra',
    quality: 'Mitra',
    evaluation: 'good',
    enSummary:
        'Friendly and alliance-forming; good for cooperation, travel, and public dealings.',
    ruSummary:
        'Дружественная титхи для союзов, сотрудничества, поездок и общественных дел.',
    enPlus: [
      'friendship',
      'alliances',
      'agreements',
      'public affairs',
      'dealings with authorities',
      'travel and health routines',
    ],
    ruPlus: [
      'дружба',
      'союзы',
      'соглашения',
      'общественные дела',
      'дела с властями',
      'поездки и забота о здоровье',
    ],
    enMinus: [
      'betrayal',
      'secret hostility',
      'breaking alliances',
      'destructive actions',
    ],
    ruMinus: [
      'предательство',
      'скрытая вражда',
      'разрыв союзов',
      'разрушительные действия',
    ],
  ),
  'shukla-8': _TithiMuhurta(
    group: 'Jaya',
    quality: 'Dvandva',
    evaluation: 'avoid',
    enSummary:
        'Tense and transformative; useful for overcoming resistance, not for peaceful beginnings.',
    ruSummary:
        'Напряжённая и трансформирующая титхи; полезна для преодоления, но не для мирных начинаний.',
    enPlus: [
      'overcoming resistance',
      'austerity',
      'disciplined practice',
      'crisis solving',
      'transformation',
    ],
    ruPlus: [
      'преодоление сопротивления',
      'аскеза',
      'дисциплинированная практика',
      'решение кризиса',
      'трансформация',
    ],
    enMinus: [
      'marriage',
      'reconciliation',
      'peaceful agreements',
      'new home entry',
      'family celebrations',
    ],
    ruMinus: [
      'брак',
      'примирение',
      'мирные договоры',
      'вход в новый дом',
      'семейные праздники',
    ],
  ),
  'shukla-9': _TithiMuhurta(
    group: 'Rikta',
    quality: 'Ugra',
    evaluation: 'avoid',
    enSummary:
        'Strong and cutting; suited to removal, purification, and decisive endings.',
    ruSummary:
        'Сильная и резкая титхи для устранения, очищения и решительных завершений.',
    enPlus: [
      'removing harmful influences',
      'ending unprofitable activity',
      'purification',
      'protection',
      'strong spiritual discipline',
    ],
    ruPlus: [
      'устранение вредного влияния',
      'завершение бесполезной деятельности',
      'очищение',
      'защита',
      'строгая духовная практика',
    ],
    enMinus: [
      'marriage',
      'travel',
      'moving',
      'buying valuables',
      'starting education or long-term projects',
    ],
    ruMinus: [
      'брак',
      'путешествия',
      'переезд',
      'покупка ценностей',
      'начало учёбы или долгого проекта',
    ],
  ),
  'shukla-10': _TithiMuhurta(
    group: 'Purna',
    quality: 'Saumya',
    evaluation: 'good',
    enSummary:
        'Balanced and completing; good for administration, education, ceremony, and travel.',
    ruSummary:
        'Уравновешенная титхи завершения; хороша для управления, учёбы, церемоний и поездок.',
    enPlus: [
      'legal affairs',
      'administration',
      'management',
      'education',
      'marriage',
      'moving and travel',
      'project completion',
    ],
    ruPlus: [
      'юридические дела',
      'администрирование',
      'управление',
      'образование',
      'брак',
      'переезд и поездки',
      'завершение проекта',
    ],
    enMinus: [
      'destructive actions',
      'intentional conflict',
      'breaking stable agreements',
    ],
    ruMinus: [
      'разрушительные действия',
      'намеренный конфликт',
      'разрыв стабильных договоров',
    ],
  ),
  'shukla-11': _TithiMuhurta(
    group: 'Nanda',
    quality: 'Ananda',
    evaluation: 'spiritual_only',
    enSummary:
        'Especially spiritual; excellent for vrata, worship, purification, and quiet service.',
    ruSummary:
        'Особенно духовная титхи; превосходна для враты, поклонения, очищения и спокойного служения.',
    enPlus: [
      'fasting',
      'japa and kirtana',
      'shastra study',
      'Vishnu worship',
      'temple service',
      'vows and charity',
    ],
    ruPlus: [
      'пост',
      'джапа и киртан',
      'изучение шастр',
      'поклонение Вишну',
      'служение в храме',
      'обеты и благотворительность',
    ],
    enMinus: [
      'feasting',
      'sensual entertainment',
      'overeating',
      'material celebration conflicting with vrata',
      'ordinary commercial launch',
    ],
    ruMinus: [
      'пиршества',
      'чувственные развлечения',
      'переедание',
      'материальный праздник в конфликте с вратой',
      'обычный коммерческий запуск',
    ],
  ),
  'shukla-12': _TithiMuhurta(
    group: 'Bhadra',
    quality: 'Yashas',
    evaluation: 'conditional',
    enSummary:
        'Restorative and vow-completing; useful for parana, service, charity, and nourishment.',
    ruSummary:
        'Восстанавливающая титхи завершения обета; хороша для парана, служения, благотворительности и питания.',
    enPlus: [
      'breaking Ekadashi fast properly',
      'completing a vow',
      'service',
      'charity',
      'nourishment',
      'Vishnu worship',
    ],
    ruPlus: [
      'правильный выход из поста Экадаши',
      'завершение обета',
      'служение',
      'благотворительность',
      'питание',
      'поклонение Вишну',
    ],
    enMinus: [
      'construction start',
      'new home entry',
      'long journey',
      'major commercial launch',
      'marriage without a strong muhurta',
    ],
    ruMinus: [
      'начало строительства',
      'вход в новый дом',
      'долгая поездка',
      'крупный коммерческий запуск',
      'брак без сильной мухурты',
    ],
  ),
  'shukla-13': _TithiMuhurta(
    group: 'Jaya',
    quality: 'Jaya',
    evaluation: 'excellent',
    enSummary:
        'Victorious and auspicious; strong for achievement, success, and many ordinary beginnings.',
    ruSummary:
        'Победоносная и благоприятная титхи для достижения, успеха и многих обычных начинаний.',
    enPlus: [
      'achieving a goal',
      'overcoming obstacles',
      'agreements after conflict',
      'public affairs',
      'architecture',
      'success ceremonies',
    ],
    ruPlus: [
      'достижение цели',
      'преодоление препятствий',
      'соглашения после конфликта',
      'общественные дела',
      'архитектура',
      'церемонии успеха',
    ],
    enMinus: [
      'some traditions avoid travel',
      'some traditions avoid moving',
      'some traditions avoid first wearing of new clothes or upanayana',
    ],
    ruMinus: [
      'в некоторых традициях избегают поездок',
      'в некоторых традициях избегают переезда',
      'иногда избегают первого ношения новой одежды или упанаяны',
    ],
  ),
  'shukla-14': _TithiMuhurta(
    group: 'Rikta',
    quality: 'Ugra',
    evaluation: 'avoid',
    enSummary:
        'Intense and purifying; suited for austerity, dismantling, repentance, and Shiva worship.',
    ruSummary:
        'Интенсивная и очищающая титхи для аскезы, демонтажа, покаяния и поклонения Шиве.',
    enPlus: [
      'ending an old activity',
      'abandoning a harmful habit',
      'repentance',
      'austerity',
      'deep purification',
      'Shiva worship',
    ],
    ruPlus: [
      'завершение старого дела',
      'оставление вредной привычки',
      'покаяние',
      'аскеза',
      'глубокое очищение',
      'поклонение Шиве',
    ],
    enMinus: [
      'marriage',
      'business opening',
      'buying or entering a house',
      'travel',
      'peaceful family ceremonies',
      'long-term agreements',
    ],
    ruMinus: [
      'брак',
      'открытие бизнеса',
      'покупка или вход в дом',
      'путешествие',
      'мирные семейные церемонии',
      'долгие соглашения',
    ],
  ),
  'shukla-15': _TithiMuhurta(
    group: 'Purna',
    quality: 'Saumya',
    evaluation: 'conditional',
    enSummary:
        'Full and luminous; strong for worship, charity, completion, and public religious ceremonies.',
    ruSummary:
        'Полная и светлая титхи для поклонения, благотворительности, завершения и публичных религиозных церемоний.',
    enPlus: [
      'worship and yajna',
      'deity installation with proper rules',
      'charity',
      'spiritual education',
      'completion and presentation',
    ],
    ruPlus: [
      'поклонение и ягья',
      'установка божеств по правилам',
      'благотворительность',
      'духовное образование',
      'завершение и представление результата',
    ],
    enMinus: [
      'commercial launch without checking full muhurta',
      'secret or reducing actions',
      'unstable ventures',
    ],
    ruMinus: [
      'коммерческий запуск без полной проверки мухурты',
      'скрытые или уменьшающие действия',
      'нестабильные предприятия',
    ],
  ),
  'krishna-1': _TithiMuhurta(
    group: 'Nanda',
    quality: 'Vriddhi',
    evaluation: 'excellent',
    enSummary:
        'Strong early waning tithi; good for practical launches and stable material undertakings.',
    ruSummary:
        'Сильная ранняя титхи убывающей половины; хороша для практических запусков и устойчивых дел.',
    enPlus: [
      'marriage',
      'construction',
      'new home entry',
      'travel',
      'samskaras',
      'practical project launch',
    ],
    ruPlus: [
      'брак',
      'строительство',
      'вход в новый дом',
      'поездки',
      'самскары',
      'практический запуск проекта',
    ],
    enMinus: [
      'destruction',
      'separation',
      'actions aimed at reduction or dissolution',
    ],
    ruMinus: [
      'разрушение',
      'разделение',
      'действия, направленные на уменьшение или распад',
    ],
  ),
  'krishna-2': _TithiMuhurta(
    group: 'Bhadra',
    quality: 'Mangala',
    evaluation: 'excellent',
    enSummary:
        'Very favorable for cooperation, agreements, learning, travel, and public affairs.',
    ruSummary:
        'Очень благоприятна для сотрудничества, соглашений, учёбы, поездок и общественных дел.',
    enPlus: [
      'marriage',
      'partnership',
      'contracts',
      'travel',
      'music and education',
      'public affairs',
    ],
    ruPlus: [
      'брак',
      'партнёрство',
      'контракты',
      'путешествия',
      'музыка и образование',
      'общественные дела',
    ],
    enMinus: [
      'breaking partnerships',
      'hostile confrontation',
      'destructive acts',
    ],
    ruMinus: [
      'разрыв партнёрств',
      'враждебная конфронтация',
      'разрушительные действия',
    ],
  ),
  'krishna-3': _TithiMuhurta(
    group: 'Jaya',
    quality: 'Bala',
    evaluation: 'excellent',
    enSummary:
        'Excellent for skill, movement, art, travel, and achieving a clear goal.',
    ruSummary:
        'Отлична для навыков, движения, искусства, поездок и достижения ясной цели.',
    enPlus: [
      'education',
      'art and music',
      'crafts',
      'moving',
      'marriage',
      'travel',
      'strengthening skills',
    ],
    ruPlus: [
      'образование',
      'искусство и музыка',
      'ремёсла',
      'переезд',
      'брак',
      'путешествия',
      'укрепление навыков',
    ],
    enMinus: [
      'passive activities',
      'delicate peace work under an aggressive muhurta',
    ],
    ruMinus: [
      'пассивные занятия',
      'тонкая миротворческая работа при агрессивной мухурте',
    ],
  ),
  'krishna-4': _TithiMuhurta(
    group: 'Rikta',
    quality: 'Khala',
    evaluation: 'avoid',
    enSummary:
        'Useful for removing defects and obstacles; avoid for auspicious household beginnings.',
    ruSummary:
        'Полезна для устранения дефектов и препятствий; не подходит для благоприятных домашних начинаний.',
    enPlus: [
      'debt repayment',
      'cleaning',
      'repairs',
      'eliminating defects',
      'ending a problem',
      'Ganesha prayer',
    ],
    ruPlus: [
      'возврат долгов',
      'уборка',
      'ремонт',
      'устранение дефектов',
      'завершение проблемы',
      'молитва Ганеше',
    ],
    enMinus: [
      'marriage',
      'business opening',
      'buying or entering a home',
      'auspicious samskaras',
    ],
    ruMinus: [
      'брак',
      'открытие бизнеса',
      'покупка или вход в дом',
      'благоприятные самскары',
    ],
  ),
  'krishna-5': _TithiMuhurta(
    group: 'Purna',
    quality: 'Lakshmi',
    evaluation: 'excellent',
    enSummary:
        'Excellent for resources, learning, trade, nourishment, and most constructive work.',
    ruSummary:
        'Отлична для ресурсов, учёбы, торговли, питания и большинства созидательных дел.',
    enPlus: [
      'finances',
      'education',
      'accumulation',
      'trade',
      'useful purchases',
      'agriculture and nourishment',
    ],
    ruPlus: [
      'финансы',
      'образование',
      'накопление',
      'торговля',
      'полезные покупки',
      'земледелие и питание',
    ],
    enMinus: ['lending money', 'destructive acts'],
    ruMinus: ['давать деньги в долг', 'разрушительные действия'],
  ),
  'krishna-6': _TithiMuhurta(
    group: 'Nanda',
    quality: 'Yashas',
    evaluation: 'conditional',
    enSummary:
        'Structured and disciplined; good for reputation and organized work with supporting factors.',
    ruSummary:
        'Структурная и дисциплинированная титхи; хороша для репутации и организованной работы при поддержке факторов.',
    enPlus: [
      'architecture',
      'construction',
      'professional discipline',
      'reputation',
      'organized work',
      'protection',
    ],
    ruPlus: [
      'архитектура',
      'строительство',
      'профессиональная дисциплина',
      'репутация',
      'организованная работа',
      'защита',
    ],
    enMinus: [
      'major family ceremonies without strong support',
      'marriage without checking lagna and nakshatra',
      'soft conciliatory work',
    ],
    ruMinus: [
      'крупные семейные церемонии без сильной поддержки',
      'брак без проверки лагны и накшатры',
      'мягкая примирительная работа',
    ],
  ),
  'krishna-7': _TithiMuhurta(
    group: 'Bhadra',
    quality: 'Mitra',
    evaluation: 'good',
    enSummary:
        'Friendly and practical; useful for agreements, travel, health, and public activity.',
    ruSummary:
        'Дружественная и практичная титхи для соглашений, поездок, здоровья и общественных дел.',
    enPlus: [
      'marriage',
      'friendship',
      'agreements',
      'travel',
      'construction',
      'moving',
      'public affairs',
    ],
    ruPlus: [
      'брак',
      'дружба',
      'соглашения',
      'путешествия',
      'строительство',
      'переезд',
      'общественные дела',
    ],
    enMinus: ['secret hostility', 'destructive separation', 'betrayal'],
    ruMinus: ['скрытая вражда', 'разрушительное разделение', 'предательство'],
  ),
  'krishna-8': _TithiMuhurta(
    group: 'Jaya',
    quality: 'Dvandva',
    evaluation: 'avoid',
    enSummary:
        'Intense and inward; suited for austerity, discipline, analysis, and transformation.',
    ruSummary:
        'Интенсивная внутренняя титхи для аскезы, дисциплины, анализа и трансформации.',
    enPlus: [
      'austerity',
      'inner discipline',
      'overcoming psychological obstacles',
      'difficult analysis',
      'transformation',
    ],
    ruPlus: [
      'аскеза',
      'внутренняя дисциплина',
      'преодоление психологических препятствий',
      'сложный анализ',
      'трансформация',
    ],
    enMinus: [
      'marriage',
      'reconciliation',
      'peaceful agreements',
      'family business opening',
      'new home entry',
    ],
    ruMinus: [
      'брак',
      'примирение',
      'мирные соглашения',
      'открытие семейного бизнеса',
      'вход в новый дом',
    ],
  ),
  'krishna-9': _TithiMuhurta(
    group: 'Rikta',
    quality: 'Ugra',
    evaluation: 'avoid',
    enSummary:
        'Strong for ending difficult processes, removing harm, purification, and strict practice.',
    ruSummary:
        'Сильна для завершения трудных процессов, устранения вредного, очищения и строгой практики.',
    enPlus: [
      'ending a difficult process',
      'removing harmful things',
      'purification',
      'ending conflict',
      'strict spiritual practice',
    ],
    ruPlus: [
      'завершение трудного процесса',
      'устранение вредного',
      'очищение',
      'окончание конфликта',
      'строгая духовная практика',
    ],
    enMinus: [
      'marriage',
      'travel',
      'moving',
      'buying valuables',
      'ordinary auspicious beginnings',
    ],
    ruMinus: [
      'брак',
      'путешествие',
      'переезд',
      'покупка ценностей',
      'обычные благоприятные начинания',
    ],
  ),
  'krishna-10': _TithiMuhurta(
    group: 'Purna',
    quality: 'Saumya',
    evaluation: 'good',
    enSummary:
        'Good for completion, administration, law, management, and travel with support.',
    ruSummary:
        'Хороша для завершения, администрирования, права, управления и поездок при поддержке факторов.',
    enPlus: [
      'project completion',
      'administrative affairs',
      'legal affairs',
      'management',
      'marriage with support',
      'travel and moving',
    ],
    ruPlus: [
      'завершение проекта',
      'административные дела',
      'юридические дела',
      'управление',
      'брак при поддержке факторов',
      'поездки и переезд',
    ],
    enMinus: [
      'expansion-oriented long-term launch when a stronger waxing date is available',
      'destructive acts',
    ],
    ruMinus: [
      'долгий проект на расширение, если есть более сильная растущая дата',
      'разрушительные действия',
    ],
  ),
  'krishna-11': _TithiMuhurta(
    group: 'Nanda',
    quality: 'Ananda',
    evaluation: 'spiritual_only',
    enSummary:
        'Spiritually focused; excellent for Vaishnava fasting, prayer, repentance, and purification.',
    ruSummary:
        'Духовно направленная титхи; превосходна для вайшнавского поста, молитвы, покаяния и очищения.',
    enPlus: [
      'Vaishnava fasting',
      'japa and kirtana',
      'bhajana',
      'shastra study',
      'prayer',
      'vows and repentance',
    ],
    ruPlus: [
      'вайшнавский пост',
      'джапа и киртан',
      'бхаджан',
      'изучение шастр',
      'молитва',
      'обеты и покаяние',
    ],
    enMinus: [
      'business opening',
      'marriage',
      'moving',
      'major purchase',
      'material celebration',
      'sensual entertainment',
    ],
    ruMinus: [
      'открытие бизнеса',
      'брак',
      'переезд',
      'крупная покупка',
      'материальный праздник',
      'чувственные развлечения',
    ],
  ),
  'krishna-12': _TithiMuhurta(
    group: 'Bhadra',
    quality: 'Yashas',
    evaluation: 'spiritual_only',
    enSummary:
        'Spiritual and restorative; important for parana, Vishnu worship, service, and vrata completion.',
    ruSummary:
        'Духовная и восстановительная титхи; важна для парана, поклонения Вишну, служения и завершения враты.',
    enPlus: [
      'parana at the prescribed time',
      'Vishnu worship',
      'service to Vaishnavas',
      'charity',
      'completion of vrata',
      'restoration',
    ],
    ruPlus: [
      'паран в предписанное время',
      'поклонение Вишну',
      'служение вайшнавам',
      'благотворительность',
      'завершение враты',
      'восстановление',
    ],
    enMinus: [
      'construction',
      'new home entry',
      'long journey',
      'commercial launch',
      'marriage without special prescription',
    ],
    ruMinus: [
      'строительство',
      'вход в новый дом',
      'долгая поездка',
      'коммерческий запуск',
      'брак без особого предписания',
    ],
  ),
  'krishna-13': _TithiMuhurta(
    group: 'Jaya',
    quality: 'Jaya',
    evaluation: 'avoid',
    enSummary:
        'A closing and overcoming tithi in the dark half; good for ending struggle, not expansion.',
    ruSummary:
        'Титхи завершения и преодоления в тёмной половине; хороша для окончания борьбы, не для расширения.',
    enPlus: [
      'ending a struggle',
      'abandoning a harmful habit',
      'reconciliation after crisis',
      'repentance',
      'prescribed worship',
      'closure',
    ],
    ruPlus: [
      'завершение борьбы',
      'оставление вредной привычки',
      'примирение после кризиса',
      'покаяние',
      'предписанное поклонение',
      'закрытие',
    ],
    enMinus: [
      'marriage',
      'business opening',
      'moving',
      'major purchase',
      'long journey',
      'expansion-oriented beginnings',
    ],
    ruMinus: [
      'брак',
      'открытие бизнеса',
      'переезд',
      'крупная покупка',
      'долгая поездка',
      'начинания на расширение',
    ],
  ),
  'krishna-14': _TithiMuhurta(
    group: 'Rikta',
    quality: 'Ugra',
    evaluation: 'avoid',
    enSummary:
        'Very intense and purifying; suited for austerity, closure, dismantling, and Shiva worship.',
    ruSummary:
        'Очень интенсивная и очищающая титхи для аскезы, закрытия, демонтажа и поклонения Шиве.',
    enPlus: [
      'austerity',
      'ending old matters',
      'inner purification',
      'Shiva worship',
      'dismantling',
      'preparation for closure',
    ],
    ruPlus: [
      'аскеза',
      'завершение старого',
      'внутреннее очищение',
      'поклонение Шиве',
      'демонтаж',
      'подготовка к завершению',
    ],
    enMinus: [
      'marriage',
      'business launch',
      'moving',
      'travel',
      'beauty ceremony',
      'long-term constructive contracts',
    ],
    ruMinus: [
      'брак',
      'запуск бизнеса',
      'переезд',
      'путешествие',
      'церемонии красоты',
      'долгие созидательные контракты',
    ],
  ),
  'krishna-15': _TithiMuhurta(
    group: 'Purna',
    quality: 'Pitara',
    evaluation: 'spiritual_only',
    enSummary:
        'New Moon tithi; suited to ancestors, charity, silence, retreat, and inner purification.',
    ruSummary:
        'Титхи новолуния; подходит для предков, благотворительности, тишины, ретрита и внутреннего очищения.',
    enPlus: [
      'tarpana',
      'shraddha',
      'ancestor worship',
      'charity',
      'prayer and silence',
      'retreat',
      'ending the past',
    ],
    ruPlus: [
      'тарпана',
      'шраддха',
      'почитание предков',
      'благотворительность',
      'молитва и молчание',
      'ретрит',
      'завершение прошлого',
    ],
    enMinus: [
      'marriage',
      'new home entry',
      'business opening',
      'travel',
      'major purchase',
      'ordinary material celebration',
    ],
    ruMinus: [
      'брак',
      'вход в новый дом',
      'открытие бизнеса',
      'путешествие',
      'крупная покупка',
      'обычный материальный праздник',
    ],
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
    enPlus: [
      'planting and cultivation',
      'entering a new home',
      'taking vows',
      'laying foundations',
      'long-term commitments',
    ],
    ruPlus: [
      'посадка и выращивание',
      'вход в новый дом',
      'принятие обетов',
      'закладка фундамента',
      'долгие обязательства',
    ],
    enMinus: [
      'short-lived experiments',
      'actions meant to be quickly reversed',
    ],
    ruMinus: [
      'краткосрочные эксперименты',
      'дела, которые нужно быстро отменить или развернуть назад',
    ],
  ),
  'soft': _NakshatraGroup(
    enName: 'Soft',
    ruName: 'Мягкая',
    enSummary:
        'Gentle nakshatra for friendship, family, beauty, art, and auspicious social activity.',
    ruSummary:
        'Мягкая накшатра для дружбы, семьи, красоты, искусства и благоприятной социальной активности.',
    enPlus: [
      'friendship',
      'marriage',
      'conception',
      'wearing new clothes',
      'dance and art',
      'travel',
      'ceremonial rituals',
    ],
    ruPlus: [
      'дружба',
      'брак',
      'зачатие детей',
      'новая одежда',
      'танцы и искусство',
      'путешествия',
      'торжественные ритуалы',
    ],
    enMinus: ['harsh confrontation', 'destructive or cutting actions'],
    ruMinus: ['жёсткая конфронтация', 'разрушительные или режущие действия'],
  ),
  'light': _NakshatraGroup(
    enName: 'Light',
    ruName: 'Лёгкая',
    enSummary:
        'Quick and light nakshatra for practical, useful, and relatively easy undertakings.',
    ruSummary:
        'Быстрая и лёгкая накшатра для практичных, полезных и сравнительно простых дел.',
    enPlus: [
      'trade',
      'purchases',
      'short trips',
      'sports',
      'jewelry',
      'business start',
      'crafts',
      'education',
      'taking medicine',
    ],
    ruPlus: [
      'торговля',
      'покупки',
      'недалёкие поездки',
      'спорт',
      'украшения',
      'начало бизнеса',
      'ремесло',
      'образование',
      'приём лекарств',
    ],
    enMinus: ['heavy irreversible commitments', 'slow foundational work'],
    ruMinus: [
      'тяжёлые необратимые обязательства',
      'медленная фундаментальная работа',
    ],
  ),
  'movable': _NakshatraGroup(
    enName: 'Movable',
    ruName: 'Подвижная',
    enSummary:
        'Movable nakshatra for temporary work, travel, treatment, repair, learning, and gardening.',
    ruSummary:
        'Подвижная накшатра для временных дел, поездок, лечения, ремонта, обучения и садоводства.',
    enPlus: [
      'temporary activities',
      'travel',
      'buying vehicles',
      'starting treatment or fasting',
      'repairs',
      'learning',
      'gardening',
    ],
    ruPlus: [
      'временные дела',
      'путешествия',
      'покупка транспорта',
      'начало лечения или голодания',
      'ремонт',
      'обучение',
      'садоводство',
    ],
    enMinus: ['undertakings requiring permanent stability'],
    ruMinus: ['дела, требующие постоянной устойчивости'],
  ),
  'sharp': _NakshatraGroup(
    enName: 'Sharp',
    ruName: 'Резкая',
    enSummary:
        'Sharp nakshatra for forceful actions, opposition, protection, and mystical mantra practice.',
    ruSummary:
        'Резкая накшатра для активных действий, противостояния, защиты и мистических мантр.',
    enPlus: [
      'active intervention',
      'facing opposition',
      'protection',
      'mystical mantra practice',
      'removing harmful influences',
    ],
    ruPlus: [
      'активное действие',
      'встреча с противником',
      'защита',
      'мистические мантры',
      'устранение вредного влияния',
    ],
    enMinus: [
      'starting a journey',
      'purchases',
      'peaceful family ceremonies',
      'delicate agreements',
    ],
    ruMinus: [
      'начало поездки',
      'покупки',
      'мирные семейные церемонии',
      'тонкие договорённости',
    ],
  ),
  'fierce': _NakshatraGroup(
    enName: 'Fierce',
    ruName: 'Ужасная',
    enSummary:
        'Fierce nakshatra connected with risk, fire, weapons, poisons, competition, and destructive force.',
    ruSummary:
        'Жёсткая накшатра, связанная с риском, огнём, оружием, ядами, соревнованием и разрушительной силой.',
    enPlus: [
      'work with fire or weapons',
      'chemicals and poisons',
      'cutting trees',
      'competition',
      'risk-managed forceful work',
    ],
    ruPlus: [
      'работа с огнём или оружием',
      'химические вещества и яды',
      'подрезание деревьев',
      'соревнования',
      'силовая работа с контролем риска',
    ],
    enMinus: [
      'starting a journey',
      'pledged borrowing',
      'peaceful auspicious beginnings',
      'unprotected risky activity',
    ],
    ruMinus: [
      'начало поездки',
      'деньги под залог',
      'мирные благоприятные начинания',
      'риск без защиты',
    ],
  ),
  'mixed': _NakshatraGroup(
    enName: 'Mixed',
    ruName: 'Смешанная',
    enSummary:
        'Mixed nakshatra suitable for routine duties, but weak for important new beginnings.',
    ruSummary:
        'Смешанная накшатра подходит для рутины и повседневных обязанностей, но слаба для важных новых начинаний.',
    enPlus: [
      'routine work',
      'daily duties',
      'maintenance',
      'ordinary obligations',
    ],
    ruPlus: [
      'рутинная деятельность',
      'повседневные обязанности',
      'поддержание порядка',
      'обычные обязательства',
    ],
    enMinus: ['important new undertakings', 'major life starts'],
    ruMinus: ['важные новые дела', 'крупные жизненные начинания'],
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
    enDeity: 'Ashvins, divine twin healers',
    ruDeity: 'Ашвины, божественные близнецы-лекари',
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
    enDeity: 'Agni, fire deity',
    ruDeity: 'Агни, божество огня',
  ),
  _NakshatraData(
    enName: 'Rohini',
    ruName: 'Рохини',
    group: 'fixed',
    enRuler: 'Chandra (Moon)',
    ruRuler: 'Чандра (Луна)',
    enSymbol: 'cart, chariot, temple, banyan',
    ruSymbol: 'телега, колесница, храм, баньян',
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
    enSymbol: 'tear, diamond, human head',
    ruSymbol: 'слеза, алмаз, человеческая голова',
    enDeity: 'Rudra, storm deity',
    ruDeity: 'Рудра, божество бури',
  ),
  _NakshatraData(
    enName: 'Punarvasu',
    ruName: 'Пунарвасу',
    group: 'movable',
    enRuler: 'Brihaspati (Jupiter)',
    ruRuler: 'Брихаспати (Юпитер)',
    enSymbol: 'bow and quiver',
    ruSymbol: 'лук и колчан',
    enDeity: 'Aditi, mother of the gods',
    ruDeity: 'Адити, мать божеств',
  ),
  _NakshatraData(
    enName: 'Pushya',
    ruName: 'Пушья',
    group: 'light',
    enRuler: 'Shani (Saturn)',
    ruRuler: 'Шани (Сатурн)',
    enSymbol: 'cow udder, lotus, arrow and circle',
    ruSymbol: 'коровье вымя, лотос, стрела и круг',
    enDeity: 'Brihaspati, divine priest',
    ruDeity: 'Брихаспати, божественный жрец',
  ),
  _NakshatraData(
    enName: 'Ashlesha',
    ruName: 'Ашлеша',
    group: 'sharp',
    enRuler: 'Budha (Mercury)',
    ruRuler: 'Будха (Меркурий)',
    enSymbol: 'serpent',
    ruSymbol: 'змея',
    enDeity: 'Nagas, serpents',
    ruDeity: 'Наги, змеи',
  ),
  _NakshatraData(
    enName: 'Magha',
    ruName: 'Магха',
    group: 'fierce',
    enRuler: 'Ketu',
    ruRuler: 'Кету',
    enSymbol: 'royal throne',
    ruSymbol: 'царский трон',
    enDeity: 'Pitris, ancestors',
    ruDeity: 'Питары, предки',
  ),
  _NakshatraData(
    enName: 'Purva Phalguni',
    ruName: 'Пурва-пхалгуни',
    group: 'fierce',
    enRuler: 'Shukra (Venus)',
    ruRuler: 'Шукра (Венера)',
    enSymbol: 'front legs of a bed, hammock, fig tree',
    ruSymbol: 'передние ножки кровати, гамак, фикус',
    enDeity: 'Bhaga, deity of fortune and family happiness',
    ruDeity: 'Бхага, божество богатства и семейного счастья',
  ),
  _NakshatraData(
    enName: 'Uttara Phalguni',
    ruName: 'Уттара-пхалгуни',
    group: 'fixed',
    enRuler: 'Surya (Sun)',
    ruRuler: 'Сурья (Солнце)',
    enSymbol: 'four legs of a bed, hammock',
    ruSymbol: 'четыре ножки кровати, гамак',
    enDeity: 'Aryaman, patron deity',
    ruDeity: 'Арьяман, бог-покровитель',
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
    enSymbol: 'bright jewel or pearl',
    ruSymbol: 'блестящая драгоценность или жемчужина',
    enDeity: 'Tvashtr / Vishvakarman, divine builder',
    ruDeity: 'Тваштар / Вишвакарман, божественный строитель',
  ),
  _NakshatraData(
    enName: 'Swati',
    ruName: 'Свати',
    group: 'movable',
    enRuler: 'Rahu',
    ruRuler: 'Раху',
    enSymbol: 'plant shoot, coral',
    ruSymbol: 'побег растения, коралл',
    enDeity: 'Vayu, wind deity',
    ruDeity: 'Ваю, божество ветра',
  ),
  _NakshatraData(
    enName: 'Vishakha',
    ruName: 'Вишакха',
    group: 'mixed',
    enRuler: 'Brihaspati (Jupiter)',
    ruRuler: 'Брихаспати (Юпитер)',
    enSymbol: "triumphal arch, potter's wheel",
    ruSymbol: 'триумфальная арка, гончарный круг',
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
    enDeity: 'Mitra, deity of friendship and cooperation',
    ruDeity: 'Митра, божество дружбы и сотрудничества',
  ),
  _NakshatraData(
    enName: 'Jyeshtha',
    ruName: 'Джйештха',
    group: 'sharp',
    enRuler: 'Budha (Mercury)',
    ruRuler: 'Будха (Меркурий)',
    enSymbol: 'round amulet, umbrella, earring',
    ruSymbol: 'круглый амулет, зонтик, серьга',
    enDeity: 'Indra',
    ruDeity: 'Индра',
  ),
  _NakshatraData(
    enName: 'Mula',
    ruName: 'Мула',
    group: 'sharp',
    enRuler: 'Ketu',
    ruRuler: 'Кету',
    enSymbol: 'bundle of roots, elephant goad',
    ruSymbol: 'связка корней, слоновье стрекало',
    enDeity: 'Nirriti, goddess of destruction and dissolution',
    ruDeity: 'Ниррити, богиня разрушения и распада',
  ),
  _NakshatraData(
    enName: 'Purva Ashadha',
    ruName: 'Пурва-ашадха',
    group: 'fierce',
    enRuler: 'Shukra (Venus)',
    ruRuler: 'Шукра (Венера)',
    enSymbol: 'elephant tusk, fan, winnowing basket',
    ruSymbol: 'слоновый бивень, опахало, веяльная плетушка',
    enDeity: 'Apas, deity of cosmic waters',
    ruDeity: 'Апас, божество космических вод',
  ),
  _NakshatraData(
    enName: 'Uttara Ashadha',
    ruName: 'Уттара-ашадха',
    group: 'fixed',
    enRuler: 'Surya (Sun)',
    ruRuler: 'Сурья (Солнце)',
    enSymbol: 'elephant tusk, small bed',
    ruSymbol: 'слоновый бивень, маленькое ложе',
    enDeity: 'Vishvadevas, universal gods',
    ruDeity: 'Вишведевы, универсальные боги',
  ),
  _NakshatraData(
    enName: 'Shravana',
    ruName: 'Шравана',
    group: 'movable',
    enRuler: 'Chandra (Moon)',
    ruRuler: 'Чандра (Луна)',
    enSymbol: 'ear or three footprints',
    ruSymbol: 'ухо или три следа',
    enDeity: 'Vishnu, preserver of the universe',
    ruDeity: 'Вишну, хранитель мироздания',
  ),
  _NakshatraData(
    enName: 'Dhanishtha',
    ruName: 'Дхаништха',
    group: 'movable',
    enRuler: 'Mangala (Mars)',
    ruRuler: 'Мангала (Марс)',
    enSymbol: 'drum or flute',
    ruSymbol: 'барабан или флейта',
    enDeity: 'Eight Vasus, deities of earthly abundance',
    ruDeity: 'Восемь Васу, боги земного изобилия',
  ),
  _NakshatraData(
    enName: 'Shatabhisha',
    ruName: 'Сатабхиша',
    group: 'movable',
    enRuler: 'Rahu',
    ruRuler: 'Раху',
    enSymbol: 'empty circle, thousand flowers or stars',
    ruSymbol: 'пустая окружность, тысяча цветов или звёзд',
    enDeity: 'Varuna, deity of waters, sky and earth',
    ruDeity: 'Варуна, божество воды, неба и земли',
  ),
  _NakshatraData(
    enName: 'Purva Bhadrapada',
    ruName: 'Пурва-бхадра',
    group: 'fierce',
    enRuler: 'Brihaspati (Jupiter)',
    ruRuler: 'Брихаспати (Юпитер)',
    enSymbol: 'swords, front legs of a funeral cot, two-faced man',
    ruSymbol: 'мечи, передние ножки погребального ложа, человек с двумя лицами',
    enDeity: 'Aja Ekapada, ancient fiery dragon',
    ruDeity: 'Аджикапада, древний огненный дракон',
  ),
  _NakshatraData(
    enName: 'Uttara Bhadrapada',
    ruName: 'Уттара-бхадра',
    group: 'fixed',
    enRuler: 'Shani (Saturn)',
    ruRuler: 'Шани (Сатурн)',
    enSymbol: 'twins, back legs of a funeral cot, serpent in water',
    ruSymbol: 'близнецы, задние ножки погребального ложа, змея в воде',
    enDeity: 'Ahir Budhnya, serpent or dragon of the deep',
    ruDeity: 'Ахир Будхьяна, змей или дракон глубины',
  ),
  _NakshatraData(
    enName: 'Revati',
    ruName: 'Ревати',
    group: 'soft',
    enRuler: 'Budha (Mercury)',
    ruRuler: 'Будха (Меркурий)',
    enSymbol: 'fish or pair of fish, drum',
    ruSymbol: 'рыба или пара рыб, барабан',
    enDeity: 'Pushan, nourisher and protector',
    ruDeity: 'Пушан, кормилец и защитник',
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
