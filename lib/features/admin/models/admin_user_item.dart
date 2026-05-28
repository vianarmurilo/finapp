class AdminUserItem {
  const AdminUserItem({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    required this.isBlocked,
    required this.currency,
    required this.createdAt,
    required this.blockedAt,
  });

  final String id;
  final String name;
  final String email;
  final String role;
  final bool isBlocked;
  final String currency;
  final DateTime? createdAt;
  final DateTime? blockedAt;

  factory AdminUserItem.fromJson(Map<String, dynamic> json) {
    return AdminUserItem(
      id: json['id'] as String,
      name: json['name'] as String,
      email: json['email'] as String,
      role: json['role'] as String? ?? 'USER',
      isBlocked: json['isBlocked'] as bool? ?? false,
      currency: json['currency'] as String? ?? 'BRL',
      createdAt: _toDateTime(json['createdAt']),
      blockedAt: _toDateTime(json['blockedAt']),
    );
  }

  static DateTime? _toDateTime(dynamic value) {
    if (value is String && value.isNotEmpty) {
      return DateTime.tryParse(value);
    }
    return null;
  }
}

class AdminUsersPage {
  const AdminUsersPage({
    required this.items,
    required this.total,
    required this.page,
    required this.pageSize,
    required this.totalPages,
  });

  final List<AdminUserItem> items;
  final int total;
  final int page;
  final int pageSize;
  final int totalPages;

  factory AdminUsersPage.fromJson(Map<String, dynamic> json) {
    final itemsList = (json['items'] as List<dynamic>?) ?? <dynamic>[];
    final itemsRaw = itemsList
        .map((e) => Map<String, dynamic>.from(e as Map))
        .toList();

    return AdminUsersPage(
      items: itemsRaw.map(AdminUserItem.fromJson).toList(),
      total: (json['total'] as num?)?.toInt() ?? 0,
      page: (json['page'] as num?)?.toInt() ?? 1,
      pageSize: (json['pageSize'] as num?)?.toInt() ?? 10,
      totalPages: (json['totalPages'] as num?)?.toInt() ?? 1,
    );
  }
}
