import 'package:flutter/material.dart';

class AppRouteSpec {
  const AppRouteSpec({
    required this.path,
    required this.label,
    required this.icon,
  });

  final String path;
  final String label;
  final IconData icon;
}

class AppRoutes {
  const AppRoutes._();

  static const List<AppRouteSpec> shellRoutes = [
    AppRouteSpec(
      path: '/dashboard',
      label: 'Dashboard',
      icon: Icons.dashboard_outlined,
    ),
    AppRouteSpec(
      path: '/transactions',
      label: 'Transações',
      icon: Icons.receipt_long_outlined,
    ),
    AppRouteSpec(path: '/goals', label: 'Metas', icon: Icons.flag_outlined),
    AppRouteSpec(
      path: '/envelopes',
      label: 'Envelopes',
      icon: Icons.account_balance_wallet_outlined,
    ),
    AppRouteSpec(
      path: '/intelligence',
      label: 'Plano IA',
      icon: Icons.auto_awesome_outlined,
    ),
    AppRouteSpec(
      path: '/family',
      label: 'Família',
      icon: Icons.family_restroom_outlined,
    ),
  ];

  static int indexForPath(String path) {
    final normalizedPath = _normalizePath(path);
    final index = shellRoutes.indexWhere(
      (route) => route.path == normalizedPath,
    );
    return index == -1 ? 0 : index;
  }

  static String pathForIndex(int index) {
    if (index < 0 || index >= shellRoutes.length) {
      return shellRoutes.first.path;
    }

    return shellRoutes[index].path;
  }

  static String _normalizePath(String path) {
    final parsed = Uri.tryParse(path);

    if (parsed == null) {
      return '/dashboard';
    }

    final normalized = parsed.path.trim().toLowerCase();
    if (normalized.isEmpty || normalized == '/') {
      return '/dashboard';
    }

    return normalized;
  }
}
