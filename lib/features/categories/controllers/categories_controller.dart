import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../models/category_item.dart';
import '../services/categories_service.dart';

final categoriesServiceProvider = Provider<CategoriesService>((ref) {
  return CategoriesService(ref.watch(dioProvider));
});

final categoriesProvider = FutureProvider.family<List<CategoryItem>, String?>((
  ref,
  type,
) async {
  return ref.watch(categoriesServiceProvider).list(type: type);
});
