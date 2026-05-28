import 'package:dio/dio.dart';
import '../models/goal_item.dart';

class GoalsService {
  const GoalsService(this._dio);

  final Dio _dio;

  Future<List<GoalItem>> list() async {
    final response = await _dio.get('/goals');
    final data = (response.data as List<dynamic>?) ?? <dynamic>[];
    final casted = data
        .map((e) => Map<String, dynamic>.from(e as Map))
        .toList();
    return casted.map(GoalItem.fromJson).toList();
  }

  Future<void> create({
    required String title,
    required double targetAmount,
    double? currentAmount,
  }) async {
    await _dio.post(
      '/goals',
      data: {
        'title': title,
        'targetAmount': targetAmount,
        ...currentAmount == null
            ? const <String, dynamic>{}
            : {'currentAmount': currentAmount},
      },
    );
  }

  Future<void> update({
    required String goalId,
    required String title,
    required double targetAmount,
    required double currentAmount,
  }) async {
    await _dio.put(
      '/goals/$goalId',
      data: {
        'title': title,
        'targetAmount': targetAmount,
        'currentAmount': currentAmount,
      },
    );
  }

  Future<void> delete(String goalId) async {
    await _dio.delete('/goals/$goalId');
  }

  Future<void> adjustBalance({
    required String goalId,
    required String action,
    required double amount,
  }) async {
    await _dio.post(
      '/goals/$goalId/balance',
      data: {'action': action, 'amount': amount},
    );
  }

  Future<List<GoalMovementItem>> listMovements(String goalId) async {
    final response = await _dio.get('/goals/$goalId/movements');
    final data = (response.data as List<dynamic>?) ?? <dynamic>[];
    final casted = data
        .map((e) => Map<String, dynamic>.from(e as Map))
        .toList();
    return casted.map(GoalMovementItem.fromJson).toList();
  }
}
