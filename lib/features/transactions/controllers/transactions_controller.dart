import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../models/transaction_filter.dart';
import '../models/transaction_item.dart';
import '../services/transactions_service.dart';

final transactionsServiceProvider = Provider<TransactionsService>((ref) {
  return TransactionsService(ref.watch(dioProvider));
});

final transactionFilterProvider = StateProvider<TransactionFilter>((ref) {
  return const TransactionFilter();
});

final transactionsMutationProvider = StateProvider<int>((ref) {
  return 0;
});

final transactionsProvider = FutureProvider<List<TransactionItem>>((ref) async {
  final filter = ref.watch(transactionFilterProvider);
  return ref
      .watch(transactionsServiceProvider)
      .list(
        type: filter.type,
        startDate: filter.startDate,
        endDate: filter.endDate,
      );
});

void notifyTransactionChange(WidgetRef ref) {
  ref.invalidate(transactionsProvider);
  ref.read(transactionsMutationProvider.notifier).state += 1;
}
