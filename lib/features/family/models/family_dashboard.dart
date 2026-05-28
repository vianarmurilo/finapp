class FamilyDashboardItem {
  const FamilyDashboardItem({
    required this.totalIncomes,
    required this.totalExpenses,
    required this.balance,
    required this.memberStats,
    required this.lastTransactions,
  });

  final double totalIncomes;
  final double totalExpenses;
  final double balance;
  final List<FamilyMemberStatItem> memberStats;
  final List<FamilyTransactionItem> lastTransactions;

  factory FamilyDashboardItem.fromJson(Map<String, dynamic> json) {
    return FamilyDashboardItem(
      totalIncomes: _toDouble(json['totalIncomes']),
      totalExpenses: _toDouble(json['totalExpenses']),
      balance: _toDouble(json['balance']),
      memberStats: _toList(
        json['memberStats'],
      ).map(FamilyMemberStatItem.fromJson).toList(),
      lastTransactions: _toList(
        json['lastTransactions'],
      ).map(FamilyTransactionItem.fromJson).toList(),
    );
  }
}

class FamilyMemberStatItem {
  const FamilyMemberStatItem({
    required this.userId,
    required this.name,
    required this.incomes,
    required this.expenses,
    required this.balance,
  });

  final String userId;
  final String name;
  final double incomes;
  final double expenses;
  final double balance;

  factory FamilyMemberStatItem.fromJson(Map<String, dynamic> json) {
    return FamilyMemberStatItem(
      userId: (json['userId'] ?? '').toString(),
      name: (json['name'] ?? 'Membro').toString(),
      incomes: _toDouble(json['incomes']),
      expenses: _toDouble(json['expenses']),
      balance: _toDouble(json['balance']),
    );
  }
}

class FamilyTransactionItem {
  const FamilyTransactionItem({
    required this.id,
    required this.description,
    required this.type,
    required this.amount,
    required this.occurredAt,
    required this.userName,
    required this.categoryName,
  });

  final String id;
  final String description;
  final String type;
  final double amount;
  final DateTime? occurredAt;
  final String userName;
  final String categoryName;

  bool get isIncome => type == 'INCOME';

  factory FamilyTransactionItem.fromJson(Map<String, dynamic> json) {
    final user = json['user'] is Map
        ? Map<String, dynamic>.from(json['user'] as Map)
        : const <String, dynamic>{};
    final category = json['category'] is Map
        ? Map<String, dynamic>.from(json['category'] as Map)
        : const <String, dynamic>{};

    return FamilyTransactionItem(
      id: (json['id'] ?? '').toString(),
      description: (json['description'] ?? 'Sem descrição').toString(),
      type: (json['type'] ?? '').toString(),
      amount: _toDouble(json['amount']),
      occurredAt: DateTime.tryParse((json['occurredAt'] ?? '').toString()),
      userName: (user['name'] ?? 'Usuario').toString(),
      categoryName: (category['name'] ?? 'Categoria').toString(),
    );
  }
}

double _toDouble(dynamic value) {
  if (value is num) {
    return value.toDouble();
  }
  return double.tryParse(value?.toString() ?? '0') ?? 0;
}

List<Map<String, dynamic>> _toList(dynamic value) {
  if (value is! List) {
    return const [];
  }

  return value
      .whereType<Map>()
      .map((item) => Map<String, dynamic>.from(item))
      .toList();
}
