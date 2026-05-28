import 'package:dio/dio.dart';
import '../models/dashboard_data.dart';

class DashboardService {
  const DashboardService(this._dio);

  final Dio _dio;

  Future<Map<String, dynamic>> fetchOverview() async {
    try {
      final results = await Future.wait([
        _dio.get('/analytics/overview'),
        _dio.get('/alerts'),
        _dio.get('/prediction?daysAhead=30'),
        _dio.get('/profile'),
        _dio.get('/gamification'),
        _dio.get('/advisor?months=12'),
      ], eagerError: false);

      return {
        'analytics': _safeData(results[0]),
        'alerts': _safeData(results[1]),
        'prediction': _safeData(results[2]),
        'profile': _safeData(results[3]),
        'gamification': _safeData(results[4]),
        'advisor': _safeData(results[5]),
      };
    } catch (e) {
      // Fallback para dados vazios em caso de erro
      return {
        'analytics': {
          'totals': {},
          'byCategory': [],
          'insights': [],
          'dailyAverageExpense': 0,
        },
        'alerts': {'alerts': []},
        'prediction': {'futureBalance': 0},
        'profile': {
          'profile': 'Equilibrado',
          'metrics': {'savingsRate': 0, 'impulseRate': 0, 'variability': 0},
        },
        'gamification': {
          'points': 0,
          'level': 1,
          'nextLevelAt': 250,
          'achievements': [],
        },
        'advisor': {'recommendations': []},
      };
    }
  }

  Future<SimulationResult> simulateScenario({
    required double monthlyExtraSaving,
    required int months,
  }) async {
    final response = await _dio.get(
      '/simulation',
      queryParameters: {
        'monthlyExtraSaving': monthlyExtraSaving,
        'months': months,
      },
    );

    return SimulationResult.fromJson(
      Map<String, dynamic>.from(response.data as Map),
    );
  }

  Map<String, dynamic> _safeData(dynamic response) {
    try {
      if (response is DioException) {
        return <String, dynamic>{};
      }
      try {
        return Map<String, dynamic>.from(
          (response?.data as Map?) ?? <String, dynamic>{},
        );
      } catch (_) {
        return <String, dynamic>{};
      }
    } catch (e) {
      return <String, dynamic>{};
    }
  }
}
