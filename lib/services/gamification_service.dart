import 'package:dio/dio.dart';

import '../models/envelope_item.dart';
import '../models/gamification_summary.dart';

class GamificationService {
  const GamificationService(this._dio);

  final Dio _dio;

  Future<GamificationSummary> fetchSummary() async {
    final response = await _dio.get('/gamification/streak');
    return GamificationSummary.fromJson(
      Map<String, dynamic>.from(response.data as Map),
    );
  }

  Future<List<BadgeItem>> fetchBadges() async {
    final response = await _dio.get('/gamification/badges');
    final data = Map<String, dynamic>.from(response.data as Map);
    final badgesList = (data['badges'] as List<dynamic>?) ?? [];
    final badges = badgesList
        .map((e) => Map<String, dynamic>.from(e as Map))
        .map(BadgeItem.fromJson)
        .toList();
    return badges;
  }

  Future<FinancialHealthScorePayload> fetchScore() async {
    final response = await _dio.get('/gamification/score');
    return FinancialHealthScorePayload.fromJson(
      Map<String, dynamic>.from(response.data as Map),
    );
  }
}

class FinancialHealthScorePayload {
  const FinancialHealthScorePayload({
    required this.score,
    required this.justification,
    required this.streakCount,
  });

  final int score;
  final String justification;
  final int streakCount;

  factory FinancialHealthScorePayload.fromJson(Map<String, dynamic> json) {
    return FinancialHealthScorePayload(
      score: (json['score'] as num?)?.toInt() ?? 0,
      justification: (json['justification'] ?? '').toString(),
      streakCount: (json['streakCount'] as num?)?.toInt() ?? 0,
    );
  }
}
