import 'dart:convert';

import '../rules/fact_context.dart';
import '../rules/rule_engine.dart';

/// Evaluates the masa adhika/kshaya/normal classification from the shared
/// `data/engine-rules.json` "masa" section via the generic [RuleEngine].
///
/// `PanchangaCalculator._masaForDate` already computes this classification
/// directly (it mirrors js/masa-engine.js's own thresholds), so this class
/// is deliberately "verify, not port": it exists to prove, via
/// engine_rules_parity_test.dart, that the declarative rule table agrees
/// with the already-correct Dart implementation - not to replace it.
class MasaRuleValidator {
  MasaRuleValidator(Map<String, dynamic> engineRules)
    : _branches = RuleEngine.branchesFromJsonList(
        (engineRules['masa']?['type_branches'] as List?) ?? const [],
      );

  factory MasaRuleValidator.fromJsonString(String jsonString) {
    return MasaRuleValidator(
      Map<String, dynamic>.from(jsonDecode(jsonString) as Map),
    );
  }

  final List<RuleBranch> _branches;
  static const _engine = RuleEngine();

  /// Classifies a masa interval purely from its sankranti count.
  String classifyBySankrantiCount(int sankrantiCount) {
    final ctx = FactContext(
      dayFacts: [
        {
          'masa': {'sankranti_count': sankrantiCount},
        },
      ],
      centerIndex: 0,
    );
    final result = _engine.evaluateOrderedBranches(_branches, ctx);
    return (result?['type'] as String?) ?? 'normal';
  }
}
