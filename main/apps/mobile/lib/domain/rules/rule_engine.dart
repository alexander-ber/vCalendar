import 'fact_context.dart';
import 'rule_condition.dart';

/// One entry in an ordered rule table: an optional condition (`when`) and
/// the result payload to return when it matches. A branch with no `when`
/// always matches - used as the trailing "else" branch, mirroring the
/// default case at the end of an if/else chain in the JS engines.
class RuleBranch {
  const RuleBranch({required this.condition, required this.result, this.id});

  final RuleCondition? condition;
  final Map<String, dynamic> result;
  final String? id;

  factory RuleBranch.fromJson(
    Map<String, dynamic> json, {
    Map<String, FactFunction> functions = const {},
  }) {
    final whenJson = json['when'] as Map?;
    final result = Map<String, dynamic>.from(json)
      ..remove('when')
      ..remove('id');
    return RuleBranch(
      condition: whenJson == null
          ? null
          : RuleCondition.fromJson(
              Map<String, dynamic>.from(whenJson),
              functions: functions,
            ),
      result: result,
      id: json['id'] as String?,
    );
  }
}

/// Generic first-match-wins evaluator over an ordered [RuleBranch] list.
/// Mirrors the early-return branch order already used throughout the JS
/// engines (e.g. classification_priority in js/rules-data.js and the
/// if/else chains in js/ekadashi-engine.js). Has no domain knowledge.
class RuleEngine {
  const RuleEngine();

  Map<String, dynamic>? evaluateOrderedBranches(
    List<RuleBranch> branches,
    FactContext ctx,
  ) {
    for (final branch in branches) {
      if (branch.condition == null || branch.condition!.evaluate(ctx)) {
        return branch.result;
      }
    }
    return null;
  }

  static List<RuleBranch> branchesFromJsonList(
    List<dynamic> json, {
    Map<String, FactFunction> functions = const {},
  }) {
    return json
        .map(
          (item) => RuleBranch.fromJson(
            Map<String, dynamic>.from(item as Map),
            functions: functions,
          ),
        )
        .toList(growable: false);
  }
}
