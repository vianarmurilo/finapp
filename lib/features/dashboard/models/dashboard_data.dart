class DashboardData {
  const DashboardData({
    required this.incomes,
    required this.expenses,
    required this.balance,
    required this.reservedInGoals,
    required this.dailyAverageExpense,
    required this.financialProfile,
    required this.profileSavingsRate,
    required this.profileImpulseRate,
    required this.profileVariability,
    required this.insights,
    required this.alerts,
    required this.byCategory,
    required this.futureBalance,
    required this.score,
    required this.level,
    required this.nextLevelAt,
    required this.achievements,
    required this.advisorTips,
  });

  final double incomes;
  final double expenses;
  final double balance;
  final double reservedInGoals;
  final double dailyAverageExpense;
  final String financialProfile;
  final double profileSavingsRate;
  final double profileImpulseRate;
  final double profileVariability;
  final List<String> insights;
  final List<String> alerts;
  final List<CategoryExpense> byCategory;
  final double futureBalance;
  final int score;
  final int level;
  final int nextLevelAt;
  final List<AchievementItem> achievements;
  final List<String> advisorTips;

  factory DashboardData.fromPayload({
    required Map<String, dynamic> analytics,
    required Map<String, dynamic> alerts,
    required Map<String, dynamic> prediction,
    required Map<String, dynamic> profile,
    required Map<String, dynamic> gamification,
    required Map<String, dynamic> advisor,
  }) {
    final totals = Map<String, dynamic>.from(
      (analytics['totals'] as Map?) ?? <String, dynamic>{},
    );
    final categoryItemsList =
        (analytics['byCategory'] as List<dynamic>?) ?? <dynamic>[];
    final categoryItems = categoryItemsList
        .map((e) => Map<String, dynamic>.from(e as Map))
        .toList();
    final insights = (analytics['insights'] as List<dynamic>? ?? [])
        .map((e) => e.toString())
        .toList();
    final alertItemsList = (alerts['alerts'] as List<dynamic>?) ?? <dynamic>[];
    final alertItems = alertItemsList
        .map((e) => Map<String, dynamic>.from(e as Map))
        .toList();
    final advisorTips = (advisor['recommendations'] as List<dynamic>? ?? [])
        .map((e) => e.toString())
        .toList();

    return DashboardData(
      incomes: (totals['incomes'] as num?)?.toDouble() ?? 0.0,
      expenses: (totals['expenses'] as num?)?.toDouble() ?? 0.0,
      balance: (totals['balance'] as num?)?.toDouble() ?? 0.0,
      reservedInGoals: (totals['reservedInGoals'] as num?)?.toDouble() ?? 0.0,
      dailyAverageExpense:
          (analytics['dailyAverageExpense'] as num?)?.toDouble() ?? 0.0,
      financialProfile: (profile['profile'] as String?) ?? 'Equilibrado',
      profileSavingsRate: (() {
        final metrics = profile['metrics'] == null
            ? null
            : Map<String, dynamic>.from(profile['metrics'] as Map);
        return metrics == null
            ? 0.0
            : ((metrics['savingsRate'] as num?)?.toDouble() ?? 0.0);
      })(),
      profileImpulseRate: (() {
        final metrics = profile['metrics'] == null
            ? null
            : Map<String, dynamic>.from(profile['metrics'] as Map);
        return metrics == null
            ? 0.0
            : ((metrics['impulseRate'] as num?)?.toDouble() ?? 0.0);
      })(),
      profileVariability: (() {
        final metrics = profile['metrics'] == null
            ? null
            : Map<String, dynamic>.from(profile['metrics'] as Map);
        return metrics == null
            ? 0.0
            : ((metrics['variability'] as num?)?.toDouble() ?? 0.0);
      })(),
      insights: insights,
      alerts: alertItems.map((item) => item['message'].toString()).toList(),
      byCategory: categoryItems
          .map(
            (item) => CategoryExpense(
              name: (item['category'] ?? 'Sem categoria').toString(),
              amount: _toDashboardDouble(item['amount']),
            ),
          )
          .toList(),
      futureBalance: (prediction['futureBalance'] as num?)?.toDouble() ?? 0,
      score: (gamification['points'] as num?)?.toInt() ?? 0,
      level: (gamification['level'] as num?)?.toInt() ?? 1,
      nextLevelAt: (gamification['nextLevelAt'] as num?)?.toInt() ?? 250,
      achievements:
          ((gamification['achievements'] as List<dynamic>?) ?? <dynamic>[])
              .map((e) => Map<String, dynamic>.from(e as Map))
              .map(AchievementItem.fromJson)
              .toList(),
      advisorTips: advisorTips,
    );
  }
}

class AchievementItem {
  const AchievementItem({
    required this.key,
    required this.title,
    required this.points,
  });

  final String key;
  final String title;
  final int points;

  factory AchievementItem.fromJson(Map<String, dynamic> json) {
    return AchievementItem(
      key: (json['key'] ?? '').toString(),
      title: (json['title'] ?? '').toString(),
      points: (json['points'] as num?)?.toInt() ?? 0,
    );
  }
}

class SimulationResult {
  const SimulationResult({
    required this.baselineFutureBalance,
    required this.monthlyExtraSaving,
    required this.months,
    required this.extraSavingTotal,
    required this.adjustedFutureBalance,
    required this.delta,
  });

  final double baselineFutureBalance;
  final double monthlyExtraSaving;
  final int months;
  final double extraSavingTotal;
  final double adjustedFutureBalance;
  final double delta;

  factory SimulationResult.fromJson(Map<String, dynamic> json) {
    return SimulationResult(
      baselineFutureBalance: _toDashboardDouble(json['baselineFutureBalance']),
      monthlyExtraSaving: _toDashboardDouble(json['monthlyExtraSaving']),
      months: (json['months'] as num?)?.toInt() ?? 0,
      extraSavingTotal: _toDashboardDouble(json['extraSavingTotal']),
      adjustedFutureBalance: _toDashboardDouble(json['adjustedFutureBalance']),
      delta: _toDashboardDouble(json['delta']),
    );
  }
}

class CategoryExpense {
  const CategoryExpense({required this.name, required this.amount});

  final String name;
  final double amount;
}

double _toDashboardDouble(dynamic value) {
  if (value is num) return value.toDouble();
  if (value is String) return double.tryParse(value) ?? 0;
  return 0;
}
