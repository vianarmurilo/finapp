class CategoryOption {
  const CategoryOption({
    required this.id,
    required this.name,
    required this.type,
    this.userId,
  });

  final String id;
  final String name;
  final String type;
  final String? userId;

  factory CategoryOption.fromJson(Map<String, dynamic> json) {
    return CategoryOption(
      id: json['id'] as String,
      name: json['name'] as String,
      type: json['type'] as String,
      userId: json['userId'] as String?,
    );
  }
}
