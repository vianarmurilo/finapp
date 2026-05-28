class TransactionItem {
  const TransactionItem({
    required this.id,
    required this.categoryId,
    required this.type,
    required this.amount,
    required this.description,
    required this.occurredAt,
    required this.categoryName,
  });

  final String id;
  final String categoryId;
  final String type;
  final double amount;
  final String description;
  final DateTime occurredAt;
  final String categoryName;

  bool get isExpense => type == 'EXPENSE';

  factory TransactionItem.fromJson(Map<String, dynamic> json) {
    final category = json['category'] == null
        ? null
        : Map<String, dynamic>.from(json['category'] as Map);
    final occurredAtStr =
        json['occurredAt']?.toString() ?? DateTime.now().toIso8601String();

    return TransactionItem(
      id: json['id'] as String,
      categoryId: (category?['id'] ?? '').toString(),
      type: json['type'] as String,
      amount: _toDouble(json['amount']),
      description: json['description'] as String,
      occurredAt: _parseDateTime(occurredAtStr),
      categoryName: (category?['name'] ?? 'Sem categoria').toString(),
    );
  }

  static DateTime _parseDateTime(String dateStr) {
    try {
      return DateTime.parse(dateStr);
    } catch (e) {
      return DateTime.now();
    }
  }
}

double _toDouble(dynamic value) {
  if (value is num) {
    return value.toDouble();
  }
  return double.tryParse(value?.toString() ?? '0') ?? 0;
}
