class FamilyGroupItem {
  const FamilyGroupItem({
    required this.id,
    required this.name,
    required this.inviteCode,
    required this.membersCount,
  });

  final String id;
  final String name;
  final String inviteCode;
  final int membersCount;

  factory FamilyGroupItem.fromJson(Map<String, dynamic> json) {
    final members = (json['members'] as List<dynamic>? ?? []).length;
    return FamilyGroupItem(
      id: json['id'] as String,
      name: json['name'] as String,
      inviteCode: json['inviteCode'] as String? ?? '-',
      membersCount: members,
    );
  }
}
