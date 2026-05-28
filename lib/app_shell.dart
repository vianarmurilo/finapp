import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core/constants/responsive.dart';
import 'core/navigation/app_routes.dart';
import 'features/admin/screens/admin_users_screen.dart';
import 'features/auth/controllers/auth_controller.dart';
import 'features/dashboard/screens/dashboard_screen.dart';
import 'features/family/screens/family_screen.dart';
import 'features/goals/screens/goals_screen.dart';
import 'features/intelligence/screens/intelligence_screen.dart';
import 'screens/receipt_scan_screen.dart';
import 'screens/envelopes_screen.dart';
import 'features/transactions/screens/transactions_screen.dart';

class AppShell extends ConsumerStatefulWidget {
  const AppShell({super.key, this.initialIndex = 0});

  final int initialIndex;

  @override
  ConsumerState<AppShell> createState() => _AppShellState();
}

class _AppShellState extends ConsumerState<AppShell> {
  static const _exclusiveAdminEmail = 'murilo@gmail.com';
  late int _currentIndex;

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialIndex;
  }

  Future<void> _handleLogout() async {
    final shouldLogout = await showDialog<bool>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          title: const Text('Sair da conta'),
          content: const Text('Deseja sair para acessar com outra conta?'),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(false),
              child: const Text('Cancelar'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(dialogContext).pop(true),
              child: const Text('Sair'),
            ),
          ],
        );
      },
    );

    if (shouldLogout != true) {
      return;
    }

    final messenger = ScaffoldMessenger.of(context);

    await ref.read(authStateProvider.notifier).logout();

    messenger
      ..hideCurrentSnackBar()
      ..showSnackBar(
        const SnackBar(content: Text('Sessão encerrada com sucesso')),
      );

    if (!mounted) {
      return;
    }

    setState(() => _currentIndex = 0);
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authStateProvider);
    final currentUser = authState.valueOrNull;
    final currentEmail = currentUser?.email.toLowerCase().trim() ?? '';
    final isExclusiveAdmin = currentEmail == _exclusiveAdminEmail;

    if (isExclusiveAdmin) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('FinMind AI+'),
          actions: [
            IconButton(
              tooltip: 'Sair da conta',
              icon: const Icon(Icons.logout),
              onPressed: _handleLogout,
            ),
          ],
        ),
        body: const AdminUsersScreen(),
      );
    }

    final screens = <Widget>[
      const DashboardScreen(),
      const TransactionsScreen(),
      const GoalsScreen(),
      const EnvelopesScreen(),
      const IntelligenceScreen(),
      const FamilyScreen(),
    ];

    if (_currentIndex >= screens.length) {
      _currentIndex = 0;
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('FinMind AI+'),
        actions: [
          IconButton(
            tooltip: 'Sair da conta',
            icon: const Icon(Icons.logout),
            onPressed: _handleLogout,
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          await Navigator.of(context).push(
            MaterialPageRoute<void>(builder: (_) => const ReceiptScanScreen()),
          );
        },
        icon: const Icon(Icons.document_scanner_outlined),
        label: const Text('Ler nota'),
      ),
      body: AnimatedSwitcher(
        duration: const Duration(milliseconds: 350),
        child: SafeArea(
          child: Padding(
            padding: Responsive.pagePadding(context),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _RouteLinksBar(
                  currentIndex: _currentIndex,
                  onSelect: (index) => setState(() => _currentIndex = index),
                ),
                const SizedBox(height: 16),
                Expanded(child: screens[_currentIndex]),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _RouteLinksBar extends StatelessWidget {
  const _RouteLinksBar({required this.currentIndex, required this.onSelect});

  final int currentIndex;
  final ValueChanged<int> onSelect;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 10,
      runSpacing: 10,
      children: List.generate(AppRoutes.shellRoutes.length, (index) {
        final route = AppRoutes.shellRoutes[index];
        final isSelected = index == currentIndex;
        return InkWell(
          onTap: () => onSelect(index),
          borderRadius: BorderRadius.circular(18),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 180),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: BoxDecoration(
              color: isSelected
                  ? Theme.of(context).colorScheme.primaryContainer
                  : Theme.of(context).colorScheme.surface,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(
                color: isSelected
                    ? Theme.of(context).colorScheme.primary
                    : Theme.of(context).colorScheme.outlineVariant,
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(route.icon, size: 18),
                const SizedBox(width: 8),
                Text(
                  route.label,
                  style: TextStyle(
                    fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        );
      }),
    );
  }
}
