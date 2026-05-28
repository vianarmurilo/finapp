import 'package:financeiro/features/admin/controllers/admin_controller.dart';
import 'package:financeiro/features/admin/models/admin_summary.dart';
import 'package:financeiro/features/admin/models/admin_user_item.dart';
import 'package:financeiro/features/admin/screens/admin_users_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'dart:async';

Widget _buildWithOverride(Future<AdminUsersPage> Function() loader) {
  return ProviderScope(
    overrides: [
      adminUsersProvider.overrideWith((ref) async => await loader()),
      adminSummaryProvider.overrideWith((ref) async {
        return const AdminSummary(
          totalUsers: 1,
          totalAdmins: 1,
          totalRegularUsers: 0,
          totalTransactions: 0,
          totalGoals: 0,
          totalFamilyGroups: 0,
          totalSubscriptions: 0,
          newUsersLast7Days: 0,
          generatedAt: null,
        );
      }),
    ],
    child: const MaterialApp(home: Scaffold(body: AdminUsersScreen())),
  );
}

void main() {
  testWidgets('shows loading state', (tester) async {
    final completer = Completer<AdminUsersPage>();

    await tester.pumpWidget(_buildWithOverride(() => completer.future));

    expect(find.byType(CircularProgressIndicator), findsWidgets);

    completer.complete(
      const AdminUsersPage(
        items: [],
        total: 0,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      ),
    );
    await tester.pumpAndSettle();
  });

  testWidgets('renders admin toolbar and title', (tester) async {
    final completer = Completer<AdminUsersPage>();

    await tester.pumpWidget(_buildWithOverride(() => completer.future));

    await tester.pump();
    expect(find.text('Painel administrativo do sistema'), findsOneWidget);
    expect(find.text('Buscar por nome ou e-mail'), findsOneWidget);
    expect(find.text('Exportar CSV'), findsOneWidget);

    completer.complete(
      const AdminUsersPage(
        items: [],
        total: 0,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      ),
    );
    await tester.pumpAndSettle();
  });
}
