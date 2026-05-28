import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/network/api_client.dart';
import '../models/envelope_item.dart';
import '../models/gamification_summary.dart';
import '../services/envelope_service.dart';
import '../services/gamification_service.dart';

final envelopeServiceProvider = Provider<EnvelopeService>((ref) {
  return EnvelopeService(ref.watch(dioProvider));
});

final gamificationServiceProvider = Provider<GamificationService>((ref) {
  return GamificationService(ref.watch(dioProvider));
});

final gamificationSummaryProvider = FutureProvider<GamificationSummary>((
  ref,
) async {
  return ref.watch(gamificationServiceProvider).fetchSummary();
});

final badgesProvider = FutureProvider<List<BadgeItem>>((ref) async {
  return ref.watch(gamificationServiceProvider).fetchBadges();
});

final financialHealthScoreProvider =
    FutureProvider<FinancialHealthScorePayload>((ref) async {
      return ref.watch(gamificationServiceProvider).fetchScore();
    });

final envelopeProvider =
    AsyncNotifierProvider<EnvelopeNotifier, List<EnvelopeItem>>(
      EnvelopeNotifier.new,
    );

class EnvelopeNotifier extends AsyncNotifier<List<EnvelopeItem>> {
  int _month = DateTime.now().month;
  int _year = DateTime.now().year;

  EnvelopeService get _service => ref.read(envelopeServiceProvider);

  @override
  Future<List<EnvelopeItem>> build() async {
    return _fetchCurrentMonth();
  }

  Future<List<EnvelopeItem>> _fetchCurrentMonth() async {
    return _service.list(month: _month, year: _year);
  }

  Future<List<EnvelopeItem>> loadEnvelopes({int? month, int? year}) async {
    if (month != null) {
      _month = month;
    }
    if (year != null) {
      _year = year;
    }

    state = const AsyncValue.loading();
    final items = await AsyncValue.guard(() => _fetchCurrentMonth());
    state = items;
    ref.invalidate(gamificationSummaryProvider);
    ref.invalidate(financialHealthScoreProvider);
    return items.valueOrNull ?? const <EnvelopeItem>[];
  }

  Future<void> createEnvelope({
    String? categoryId,
    required String name,
    required double budgetAmount,
    required int month,
    required int year,
    required String color,
    required String icon,
  }) async {
    await _service.create(
      categoryId: categoryId,
      name: name,
      budgetAmount: budgetAmount,
      month: month,
      year: year,
      color: color,
      icon: icon,
    );
    await loadEnvelopes(month: month, year: year);
  }

  Future<void> updateEnvelope({
    required String id,
    String? categoryId,
    required String name,
    required double budgetAmount,
    required int month,
    required int year,
    required String color,
    required String icon,
  }) async {
    await _service.update(
      id: id,
      categoryId: categoryId,
      name: name,
      budgetAmount: budgetAmount,
      month: month,
      year: year,
      color: color,
      icon: icon,
    );
    await loadEnvelopes(month: month, year: year);
  }

  Future<void> deleteEnvelope(String id) async {
    await _service.delete(id);
    await loadEnvelopes(month: _month, year: _year);
  }
}
