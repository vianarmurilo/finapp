class GamificationSummary {
  const GamificationSummary({
    required this.streakCount,
    required this.withinBudget,
    required this.score,
    required this.justification,
  });

  final int streakCount;
  final bool withinBudget;
  final int score;
  final String justification;

  factory GamificationSummary.fromJson(Map<String, dynamic> json) {
    final streak = Map<String, dynamic>.from(
      (json['streak'] as Map?) ?? <String, dynamic>{},
    );

    return GamificationSummary(
      streakCount: (streak['streakCount'] as num?)?.toInt() ?? 0,
      withinBudget: streak['withinBudget'] as bool? ?? true,
      score: (json['score'] as num?)?.toInt() ?? 0,
      justification: (json['justification'] ?? '').toString(),
    );
  }
}
