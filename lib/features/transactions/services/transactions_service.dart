import 'package:dio/dio.dart';
import '../models/category_option.dart';
import '../models/transaction_item.dart';

class TransactionsService {
  const TransactionsService(this._dio);

  final Dio _dio;

  Future<List<TransactionItem>> list({
    String? type,
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    final query = <String, dynamic>{};
    if (type != null) {
      query['type'] = type;
    }
    if (startDate != null) {
      query['startDate'] = startDate.toUtc().toIso8601String();
    }
    if (endDate != null) {
      query['endDate'] = endDate.toUtc().toIso8601String();
    }

    final response = await _dio.get('/transactions', queryParameters: query);
    final data = (response.data as List<dynamic>?) ?? <dynamic>[];
    final casted = data
        .map((e) => Map<String, dynamic>.from(e as Map))
        .toList();
    return casted.map(TransactionItem.fromJson).toList();
  }

  Future<List<CategoryOption>> listCategories({required String type}) async {
    final response = await _dio.get(
      '/categories',
      queryParameters: {'type': type},
    );
    final data = (response.data as List<dynamic>?) ?? <dynamic>[];
    final casted = data
        .map((e) => Map<String, dynamic>.from(e as Map))
        .toList();
    return casted.map(CategoryOption.fromJson).toList();
  }

  Future<void> create({
    required String categoryId,
    required String type,
    required double amount,
    required String description,
    String? familyGroupId,
    DateTime? occurredAt,
  }) async {
    final data = <String, dynamic>{
      'categoryId': categoryId,
      'type': type,
      'amount': amount,
      'description': description,
      'occurredAt': (occurredAt ?? DateTime.now()).toUtc().toIso8601String(),
    };

    if (familyGroupId != null) {
      data['familyGroupId'] = familyGroupId;
    }

    await _dio.post('/transactions', data: data);
  }

  Future<void> update({
    required String transactionId,
    required String categoryId,
    required String type,
    required double amount,
    required String description,
  }) async {
    await _dio.put(
      '/transactions/$transactionId',
      data: {
        'categoryId': categoryId,
        'type': type,
        'amount': amount,
        'description': description,
      },
    );
  }

  Future<void> delete(String transactionId) async {
    await _dio.delete('/transactions/$transactionId');
  }

  Future<void> createCategory({
    required String name,
    required String type,
  }) async {
    await _dio.post('/categories', data: {'name': name, 'type': type});
  }

  Future<void> updateCategory({
    required String id,
    required String name,
  }) async {
    await _dio.put('/categories/$id', data: {'name': name});
  }

  Future<void> deleteCategory(String id) async {
    await _dio.delete('/categories/$id');
  }
}
