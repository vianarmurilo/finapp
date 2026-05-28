class AdminSummary {
  const AdminSummary({
    required this.totalUsers,
    required this.totalAdmins,
    required this.totalRegularUsers,
    required this.totalTransactions,
    required this.totalGoals,
    required this.totalFamilyGroups,
    required this.totalSubscriptions,
    required this.newUsersLast7Days,
    required this.generatedAt,
  });

  final int totalUsers;
  final int totalAdmins;
  final int totalRegularUsers;
  final int totalTransactions;
  final int totalGoals;
  final int totalFamilyGroups;
  final int totalSubscriptions;
  final int newUsersLast7Days;
  final DateTime? generatedAt;

  factory AdminSummary.fromJson(Map<String, dynamic> json) {
    return AdminSummary(
      totalUsers: (json['totalUsers'] as num?)?.toInt() ?? 0,
      totalAdmins: (json['totalAdmins'] as num?)?.toInt() ?? 0,
      totalRegularUsers: (json['totalRegularUsers'] as num?)?.toInt() ?? 0,
      totalTransactions: (json['totalTransactions'] as num?)?.toInt() ?? 0,
      totalGoals: (json['totalGoals'] as num?)?.toInt() ?? 0,
      totalFamilyGroups: (json['totalFamilyGroups'] as num?)?.toInt() ?? 0,
      totalSubscriptions: (json['totalSubscriptions'] as num?)?.toInt() ?? 0,
      newUsersLast7Days: (json['newUsersLast7Days'] as num?)?.toInt() ?? 0,
      generatedAt: _toDateTime(json['generatedAt']),
    );
  }

  static DateTime? _toDateTime(dynamic value) {
    if (value is String && value.isNotEmpty) {
      return DateTime.tryParse(value);
    }
    return null;
  }
}
