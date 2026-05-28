import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../models/goal_item.dart';
import '../services/goals_service.dart';

final goalsServiceProvider = Provider<GoalsService>((ref) {
  return GoalsService(ref.watch(dioProvider));
});

final goalsMutationProvider = StateProvider<int>((ref) {
  return 0;
});

final goalsProvider = FutureProvider<List<GoalItem>>((ref) async {
  return ref.watch(goalsServiceProvider).list();
});

void notifyGoalChange(WidgetRef ref) {
  ref.invalidate(goalsProvider);
  ref.read(goalsMutationProvider.notifier).state += 1;
}
