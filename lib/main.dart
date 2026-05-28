import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'app_shell.dart';
import 'core/theme/app_theme.dart';
import 'core/navigation/app_routes.dart';
import 'features/auth/controllers/auth_controller.dart';
import 'features/auth/screens/auth_screen.dart';

void main() {
  runApp(const ProviderScope(child: FinMindApp()));
}

class FinMindApp extends ConsumerWidget {
  const FinMindApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authStateProvider);
    final initialShellIndex = AppRoutes.indexForPath(Uri.base.path);

    return MaterialApp(
      title: 'FinMind AI+',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      darkTheme: AppTheme.dark(),
      themeMode: ThemeMode.system,
      home: auth.when(
        loading: () => const _BootstrapScreen(),
        error: (_, _) => const AuthScreen(),
        data: (user) =>
            user == null
            ? const AuthScreen()
            : AppShell(initialIndex: initialShellIndex),
      ),
    );
  }
}

class _BootstrapScreen extends StatelessWidget {
  const _BootstrapScreen();

  @override
  Widget build(BuildContext context) {
    return const Scaffold(body: Center(child: CircularProgressIndicator()));
  }
}
