import 'package:flutter/material.dart';

class EnvelopeItem {
  const EnvelopeItem({
    required this.id,
    required this.name,
    required this.budgetAmount,
    required this.currentSpent,
    required this.month,
    required this.year,
    required this.color,
    required this.icon,
    required this.progressPercent,
    required this.remainingAmount,
    required this.isOverBudget,
    required this.createdAt,
    required this.categoryId,
    required this.categoryName,
  });

  final String id;
  final String name;
  final double budgetAmount;
  final double currentSpent;
  final int month;
  final int year;
  final String color;
  final String icon;
  final double progressPercent;
  final double remainingAmount;
  final bool isOverBudget;
  final DateTime createdAt;
  final String? categoryId;
  final String? categoryName;

  IconData get iconData => iconFromKey(icon);

  Color get baseColor => colorFromHex(color, fallback: const Color(0xFF006D77));

  factory EnvelopeItem.fromJson(Map<String, dynamic> json) {
    return EnvelopeItem(
      id: (json['id'] ?? '').toString(),
      name: (json['name'] ?? '').toString(),
      budgetAmount: _toDouble(json['budgetAmount']),
      currentSpent: _toDouble(json['currentSpent']),
      month: (json['month'] as num?)?.toInt() ?? DateTime.now().month,
      year: (json['year'] as num?)?.toInt() ?? DateTime.now().year,
      color: (json['color'] ?? '#006D77').toString(),
      icon: (json['icon'] ?? 'wallet').toString(),
      progressPercent: _toDouble(json['progressPercent']),
      remainingAmount: _toDouble(json['remainingAmount']),
      isOverBudget: json['isOverBudget'] as bool? ?? false,
      createdAt:
          DateTime.tryParse((json['createdAt'] ?? '').toString()) ??
          DateTime.now(),
      categoryId: json['categoryId']?.toString(),
      categoryName: json['categoryName']?.toString(),
    );
  }
}

class BadgeItem {
  const BadgeItem({
    required this.id,
    required this.type,
    required this.earnedAt,
    required this.metadata,
  });

  final String id;
  final String type;
  final DateTime earnedAt;
  final Map<String, dynamic> metadata;

  factory BadgeItem.fromJson(Map<String, dynamic> json) {
    return BadgeItem(
      id: (json['id'] ?? '').toString(),
      type: (json['type'] ?? '').toString(),
      earnedAt:
          DateTime.tryParse((json['earnedAt'] ?? '').toString()) ??
          DateTime.now(),
      metadata: Map<String, dynamic>.from(
        (json['metadata'] as Map?) ?? <String, dynamic>{},
      ),
    );
  }
}

IconData iconFromKey(String key) {
  switch (key.toLowerCase()) {
    case 'food':
      return Icons.restaurant_outlined;
    case 'transport':
      return Icons.directions_car_outlined;
    case 'house':
      return Icons.home_outlined;
    case 'health':
      return Icons.favorite_border;
    case 'fun':
      return Icons.sports_esports_outlined;
    case 'savings':
      return Icons.savings_outlined;
    case 'shopping':
      return Icons.shopping_bag_outlined;
    case 'wallet':
    default:
      return Icons.account_balance_wallet_outlined;
  }
}

Color colorFromHex(String hex, {Color fallback = Colors.teal}) {
  var normalized = hex.replaceAll('#', '').trim();
  if (normalized.length == 6) {
    normalized = 'FF$normalized';
  }

  if (normalized.length != 8) {
    return fallback;
  }

  final value = int.tryParse(normalized, radix: 16);
  if (value == null) {
    return fallback;
  }

  return Color(value);
}

String colorToHex(Color color) {
  final value = color.toARGB32().toRadixString(16).padLeft(8, '0');
  return '#${value.substring(2).toUpperCase()}';
}

double _toDouble(dynamic value) {
  if (value is num) {
    return value.toDouble();
  }

  return double.tryParse(value?.toString() ?? '0') ?? 0;
}
