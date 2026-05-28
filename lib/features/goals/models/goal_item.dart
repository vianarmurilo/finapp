class GoalItem {
  const GoalItem({
    required this.id,
    required this.title,
    required this.targetAmount,
    required this.currentAmount,
    required this.remainingAmount,
    required this.progress,
    required this.completionPercent,
    required this.status,
    required this.recentMovements,
  });

  final String id;
  final String title;
  final double targetAmount;
  final double currentAmount;
  final double remainingAmount;
  final double progress;
  final double completionPercent;
  final String status;
  final List<GoalMovementItem> recentMovements;

  factory GoalItem.fromJson(Map<String, dynamic> json) {
    return GoalItem(
      id: json['id'] as String,
      title: json['title'] as String,
      targetAmount: _toDouble(json['targetAmount']),
      currentAmount: _toDouble(json['currentAmount']),
      remainingAmount: _toDouble(json['remainingAmount']),
      progress: _toDouble(json['progress']),
      completionPercent: _toDouble(json['completionPercent']),
      status: json['status'] as String,
      recentMovements:
          ((json['recentMovements'] as List<dynamic>?) ?? <dynamic>[])
              .map((e) => Map<String, dynamic>.from(e as Map))
              .map(GoalMovementItem.fromJson)
              .toList(),
    );
  }

  static double _toDouble(dynamic value) {
    if (value is num) return value.toDouble();
    if (value is String) return double.tryParse(value) ?? 0;
    return 0;
  }
}

class GoalMovementItem {
  const GoalMovementItem({
    required this.id,
    required this.type,
    required this.amount,
    required this.note,
    required this.createdAt,
  });

  final String id;
  final String type;
  final double amount;
  final String? note;
  final DateTime? createdAt;

  bool get isDeposit => type == 'DEPOSIT';

  factory GoalMovementItem.fromJson(Map<String, dynamic> json) {
    return GoalMovementItem(
      id: json['id'] as String,
      type: json['type'] as String,
      amount: GoalItem._toDouble(json['amount']),
      note: json['note'] as String?,
      createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? ''),
    );
  }
}
