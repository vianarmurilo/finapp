import 'package:dio/dio.dart';
import '../models/family_dashboard.dart';
import '../models/family_group_item.dart';

class FamilyService {
  const FamilyService(this._dio);

  final Dio _dio;

  Future<List<FamilyGroupItem>> listGroups() async {
    final response = await _dio.get('/family/groups');
    final data = (response.data as List<dynamic>?) ?? <dynamic>[];
    final casted = data
        .map((e) => Map<String, dynamic>.from(e as Map))
        .toList();
    return casted.map(FamilyGroupItem.fromJson).toList();
  }

  Future<void> createGroup(String name) async {
    await _dio.post('/family/groups', data: {'name': name});
  }

  Future<void> joinByInviteCode(String inviteCode) async {
    await _dio.post('/family/groups/join', data: {'inviteCode': inviteCode});
  }

  Future<FamilyDashboardItem> groupDashboard(String groupId) async {
    final response = await _dio.get('/family/groups/$groupId/dashboard');
    return FamilyDashboardItem.fromJson(
      Map<String, dynamic>.from(response.data as Map),
    );
  }
}
