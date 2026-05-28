import 'package:dio/dio.dart';

import '../models/envelope_item.dart';

class EnvelopeService {
  const EnvelopeService(this._dio);

  final Dio _dio;

  Future<List<EnvelopeItem>> list({int? month, int? year}) async {
    final query = <String, dynamic>{};
    if (month != null) {
      query['month'] = month;
    }
    if (year != null) {
      query['year'] = year;
    }

    final response = await _dio.get('/envelopes', queryParameters: query);
    final data = Map<String, dynamic>.from(response.data as Map);
    final itemsList = (data['items'] as List<dynamic>?) ?? [];
    final items = itemsList
        .map((e) => Map<String, dynamic>.from(e as Map))
        .toList();
    return items.map(EnvelopeItem.fromJson).toList();
  }

  Future<EnvelopeItem> create({
    String? categoryId,
    required String name,
    required double budgetAmount,
    required int month,
    required int year,
    required String color,
    required String icon,
  }) async {
    final payload = <String, dynamic>{
      'categoryId': categoryId,
      'name': name,
      'budgetAmount': budgetAmount,
      'month': month,
      'year': year,
      'color': color,
      'icon': icon,
    };

    final response = await _dio.post('/envelopes', data: payload);
    return EnvelopeItem.fromJson(
      Map<String, dynamic>.from(response.data as Map),
    );
  }

  Future<EnvelopeItem> update({
    required String id,
    String? categoryId,
    required String name,
    required double budgetAmount,
    required int month,
    required int year,
    required String color,
    required String icon,
  }) async {
    final payload = <String, dynamic>{
      'categoryId': categoryId,
      'name': name,
      'budgetAmount': budgetAmount,
      'month': month,
      'year': year,
      'color': color,
      'icon': icon,
    };

    final response = await _dio.put('/envelopes/$id', data: payload);
    return EnvelopeItem.fromJson(
      Map<String, dynamic>.from(response.data as Map),
    );
  }

  Future<void> delete(String id) async {
    await _dio.delete('/envelopes/$id');
  }
}
