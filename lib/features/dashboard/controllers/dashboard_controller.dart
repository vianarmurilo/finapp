import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../models/dashboard_data.dart';
import '../services/dashboard_service.dart';
import '../../transactions/controllers/transactions_controller.dart';
import '../../goals/controllers/goals_controller.dart';

final dashboardServiceProvider = Provider<DashboardService>((ref) {
  return DashboardService(ref.watch(dioProvider));
});

final dashboardProvider = FutureProvider<DashboardData>((ref) async {
  ref.watch(transactionsMutationProvider);
  ref.watch(goalsMutationProvider);
  final payload = await ref.watch(dashboardServiceProvider).fetchOverview();
  try {
    return DashboardData.fromPayload(
      analytics: Map<String, dynamic>.from(payload['analytics'] as Map),
      alerts: Map<String, dynamic>.from(payload['alerts'] as Map),
      prediction: Map<String, dynamic>.from(payload['prediction'] as Map),
      profile: Map<String, dynamic>.from(payload['profile'] as Map),
      gamification: Map<String, dynamic>.from(payload['gamification'] as Map),
      advisor: Map<String, dynamic>.from(payload['advisor'] as Map),
    );
  } catch (e) {
    // Debug: log payload types to help locate LinkedMap<dynamic,dynamic> origin
    try {
      // ignore: avoid_print
      print('Dashboard parsing error: $e');
      // ignore: avoid_print
      print('Payload keys and types:');
      payload.forEach((k, v) {
        // ignore: avoid_print
        print('  $k -> ${v.runtimeType}');
      });
    } catch (_) {}
    // Re-throw after logging so UI still receives the error
    rethrow;
  }
});
