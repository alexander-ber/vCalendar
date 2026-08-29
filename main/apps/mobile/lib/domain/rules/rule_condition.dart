import 'fact_context.dart';

/// A fact-function implementation: takes the resolved argument values and
/// the current context, returns a value. Fact-functions are the one place
/// domain-specific *algorithms* (tithi boundary search, etc.) may live -
/// they are supplied by the caller, not hardcoded here, so this file stays
/// fully generic. See apps/mobile/lib/domain/rules/fact_functions.dart.
typedef FactFunction = dynamic Function(
  FactContext ctx,
  Map<String, dynamic> args,
);

/// An expression that evaluates to a value: a fact reference, a rule
/// constant, a fact-function call, or a literal.
abstract class RuleExpr {
  const RuleExpr();

  factory RuleExpr.fromJson(
    Object? json, {
    Map<String, FactFunction> functions = const {},
  }) {
    if (json is Map) {
      final map = Map<String, dynamic>.from(json);
      if (map.containsKey('fact')) {
        return _FactRefExpr(
          map['fact'] as String,
          (map['day'] as num?)?.toInt() ?? 0,
        );
      }
      if (map.containsKey('rule')) {
        return _RuleConstExpr(map['rule'] as String);
      }
      if (map.containsKey('fn')) {
        final rawArgs = Map<String, dynamic>.from(
          (map['args'] as Map?) ?? const {},
        );
        final args = rawArgs.map(
          (key, value) => MapEntry(
            key,
            RuleExpr.fromJson(value, functions: functions),
          ),
        );
        return _FnCallExpr(map['fn'] as String, args, functions);
      }
    }
    return _LiteralExpr(json);
  }

  dynamic evaluate(FactContext ctx);
}

class _FactRefExpr extends RuleExpr {
  const _FactRefExpr(this.path, this.dayOffset);
  final String path;
  final int dayOffset;

  @override
  dynamic evaluate(FactContext ctx) => ctx.factAt(path, dayOffset);
}

class _RuleConstExpr extends RuleExpr {
  const _RuleConstExpr(this.path);
  final String path;

  @override
  dynamic evaluate(FactContext ctx) => ctx.ruleConstant(path);
}

class _LiteralExpr extends RuleExpr {
  const _LiteralExpr(this.value);
  final Object? value;

  @override
  dynamic evaluate(FactContext ctx) => value;
}

class _FnCallExpr extends RuleExpr {
  const _FnCallExpr(this.name, this.args, this.functions);
  final String name;
  final Map<String, RuleExpr> args;
  final Map<String, FactFunction> functions;

  @override
  dynamic evaluate(FactContext ctx) {
    final fn = functions[name];
    if (fn == null) {
      throw StateError('Unknown fact function referenced in rules: $name');
    }
    final resolvedArgs = args.map(
      (key, expr) => MapEntry(key, expr.evaluate(ctx)),
    );
    return fn(ctx, resolvedArgs);
  }
}

/// A boolean condition tree: and/or/not/eq/neq/gt/gte/lt/lte/in over
/// [RuleExpr] operands.
abstract class RuleCondition {
  const RuleCondition();

  factory RuleCondition.fromJson(
    Map<String, dynamic> json, {
    Map<String, FactFunction> functions = const {},
  }) {
    if (json.containsKey('and')) {
      final items = (json['and'] as List)
          .map(
            (c) => RuleCondition.fromJson(
              Map<String, dynamic>.from(c as Map),
              functions: functions,
            ),
          )
          .toList(growable: false);
      return _AndCondition(items);
    }
    if (json.containsKey('or')) {
      final items = (json['or'] as List)
          .map(
            (c) => RuleCondition.fromJson(
              Map<String, dynamic>.from(c as Map),
              functions: functions,
            ),
          )
          .toList(growable: false);
      return _OrCondition(items);
    }
    if (json.containsKey('not')) {
      return _NotCondition(
        RuleCondition.fromJson(
          Map<String, dynamic>.from(json['not'] as Map),
          functions: functions,
        ),
      );
    }
    for (final op in const ['eq', 'neq', 'gt', 'gte', 'lt', 'lte']) {
      if (json.containsKey(op)) {
        final pair = json[op] as List;
        return _CompareCondition(
          op,
          RuleExpr.fromJson(pair[0], functions: functions),
          RuleExpr.fromJson(pair[1], functions: functions),
        );
      }
    }
    if (json.containsKey('in')) {
      final pair = json['in'] as List;
      final options = List<Object?>.from(pair[1] as List);
      return _InCondition(
        RuleExpr.fromJson(pair[0], functions: functions),
        options,
      );
    }
    throw StateError('Unrecognized rule condition: $json');
  }

  bool evaluate(FactContext ctx);
}

class _AndCondition extends RuleCondition {
  const _AndCondition(this.items);
  final List<RuleCondition> items;

  @override
  bool evaluate(FactContext ctx) => items.every((item) => item.evaluate(ctx));
}

class _OrCondition extends RuleCondition {
  const _OrCondition(this.items);
  final List<RuleCondition> items;

  @override
  bool evaluate(FactContext ctx) => items.any((item) => item.evaluate(ctx));
}

class _NotCondition extends RuleCondition {
  const _NotCondition(this.inner);
  final RuleCondition inner;

  @override
  bool evaluate(FactContext ctx) => !inner.evaluate(ctx);
}

class _CompareCondition extends RuleCondition {
  const _CompareCondition(this.op, this.left, this.right);
  final String op;
  final RuleExpr left;
  final RuleExpr right;

  @override
  bool evaluate(FactContext ctx) {
    final a = left.evaluate(ctx);
    final b = right.evaluate(ctx);
    switch (op) {
      case 'eq':
        return a == b;
      case 'neq':
        return a != b;
      case 'gt':
      case 'gte':
      case 'lt':
      case 'lte':
        if (a == null || b == null) return false;
        final cmp = (a as Comparable).compareTo(b);
        switch (op) {
          case 'gt':
            return cmp > 0;
          case 'gte':
            return cmp >= 0;
          case 'lt':
            return cmp < 0;
          case 'lte':
            return cmp <= 0;
        }
    }
    throw StateError('Unknown comparison operator: $op');
  }
}

class _InCondition extends RuleCondition {
  const _InCondition(this.expr, this.options);
  final RuleExpr expr;
  final List<Object?> options;

  @override
  bool evaluate(FactContext ctx) => options.contains(expr.evaluate(ctx));
}
