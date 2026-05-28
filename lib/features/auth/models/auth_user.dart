class AuthUser {
  const AuthUser({
    required this.id,
    required this.name,
    required this.email,
    required this.currency,
    required this.role,
  });

  final String id;
  final String name;
  final String email;
  final String currency;
  final String role;

  bool get isAdmin => role.toUpperCase() == 'ADMIN';

  factory AuthUser.fromJson(Map<String, dynamic> json) {
    return AuthUser(
      id: json['id'] as String,
      name: json['name'] as String,
      email: json['email'] as String,
      currency: json['currency'] as String? ?? 'BRL',
      role: json['role'] as String? ?? 'USER',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'email': email,
      'currency': currency,
      'role': role,
    };
  }
}
