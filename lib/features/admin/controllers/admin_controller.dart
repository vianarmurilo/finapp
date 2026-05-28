import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../models/admin_summary.dart';
import '../models/admin_user_item.dart';
import '../services/admin_service.dart';

final adminServiceProvider = Provider<AdminService>((ref) {
  return AdminService(ref.watch(dioProvider));
});

final adminSearchProvider = StateProvider<String>((ref) {
  return '';
});

final adminSortOrderProvider = StateProvider<String>((ref) {
  return 'desc';
});

final adminPageProvider = StateProvider<int>((ref) {
  return 1;
});

const adminPageSize = 10;

final adminSummaryProvider = FutureProvider<AdminSummary>((ref) async {
  return ref.watch(adminServiceProvider).getSummary();
});

final adminUsersProvider = FutureProvider<AdminUsersPage>((ref) async {
  final page = ref.watch(adminPageProvider);
  final search = ref.watch(adminSearchProvider);
  final sortOrder = ref.watch(adminSortOrderProvider);

  return ref.watch(adminServiceProvider).listUsers(
    page: page,
    pageSize: adminPageSize,
    search: search,
    sortOrder: sortOrder,
  );
});
