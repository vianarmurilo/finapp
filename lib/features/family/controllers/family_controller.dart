import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../models/family_group_item.dart';
import '../services/family_service.dart';

final familyServiceProvider = Provider<FamilyService>((ref) {
  return FamilyService(ref.watch(dioProvider));
});

final familyGroupsProvider = FutureProvider<List<FamilyGroupItem>>((ref) async {
  return ref.watch(familyServiceProvider).listGroups();
});
