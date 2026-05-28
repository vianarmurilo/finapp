import 'package:dio/dio.dart';
import '../models/category_item.dart';

class CategoriesService {
  const CategoriesService(this._dio);

  final Dio _dio;

  Future<List<CategoryItem>> list({String? type}) async {
    final queryParameters = <String, dynamic>{};
    if (type != null) {
      queryParameters['type'] = type;
    }

    final response = await _dio.get(
      '/categories',
      queryParameters: queryParameters.isEmpty ? null : queryParameters,
    );
    final data = (response.data as List<dynamic>?) ?? <dynamic>[];
    final casted = data
        .map((e) => Map<String, dynamic>.from(e as Map))
        .toList();
    return casted.map(CategoryItem.fromJson).toList();
  }

  Future<CategoryItem> create({
    required String name,
    required String type,
  }) async {
    final response = await _dio.post(
      '/categories',
      data: {'name': name, 'type': type},
    );
    return CategoryItem.fromJson(
      Map<String, dynamic>.from(response.data as Map),
    );
  }

  Future<CategoryItem> update({
    required String id,
    required String name,
  }) async {
    final response = await _dio.put('/categories/$id', data: {'name': name});
    return CategoryItem.fromJson(
      Map<String, dynamic>.from(response.data as Map),
    );
  }

  Future<void> delete(String id) async {
    await _dio.delete('/categories/$id');
  }
}
