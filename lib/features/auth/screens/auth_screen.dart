import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/widgets/animated_button.dart';
import '../controllers/auth_controller.dart';
import '../services/auth_service.dart';
// import '../models/auth_user.dart';

class AuthScreen extends ConsumerStatefulWidget {
  const AuthScreen({super.key});

  @override
  ConsumerState<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends ConsumerState<AuthScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isLogin = true;
  String? _lastAuthErrorMessage;

  @override
  void initState() {
    super.initState();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) {
      return;
    }

    if (_isLogin) {
      await ref
          .read(authStateProvider.notifier)
          .login(_emailController.text.trim(), _passwordController.text.trim());
    } else {
      await ref
          .read(authStateProvider.notifier)
          .register(
            _nameController.text.trim(),
            _emailController.text.trim(),
            _passwordController.text.trim(),
          );
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(authStateProvider);

    // Show auth errors as snackbars when a new error appears
    state.whenOrNull(
      error: (error, _) {
        final message = error is AuthException
            ? error.message
            : error.toString();
        if (message != _lastAuthErrorMessage) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (mounted) {
              ScaffoldMessenger.of(
                context,
              ).showSnackBar(SnackBar(content: Text(message)));
            }
          });
          _lastAuthErrorMessage = message;
        }
      },
    );

    return Scaffold(
      body: DecoratedBox(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFF022B3A), Color(0xFF1F7A8C), Color(0xFFBFDBF7)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 450),
                child: Card(
                  child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: Form(
                      key: _formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'FinMind AI+',
                            style: Theme.of(context).textTheme.headlineMedium,
                          ),
                          const SizedBox(height: 6),
                          Text(
                            _isLogin ? 'Acesse sua conta' : 'Crie sua conta',
                          ),
                          const SizedBox(height: 24),
                          if (!_isLogin)
                            TextFormField(
                              controller: _nameController,
                              decoration: const InputDecoration(
                                labelText: 'Nome',
                              ),
                              validator: (value) {
                                if (_isLogin) {
                                  return null;
                                }

                                if ((value ?? '').trim().length < 2) {
                                  return 'Informe um nome com pelo menos 2 caracteres';
                                }

                                return null;
                              },
                            ),
                          if (!_isLogin) const SizedBox(height: 12),
                          TextFormField(
                            controller: _emailController,
                            keyboardType: TextInputType.emailAddress,
                            decoration: const InputDecoration(
                              labelText: 'E-mail',
                            ),
                            validator: (value) {
                              final email = (value ?? '').trim();

                              if (email.isEmpty) {
                                return 'Informe um e-mail';
                              }

                              if (!email.contains('@') ||
                                  !email.contains('.')) {
                                return 'Informe um e-mail válido';
                              }

                              return null;
                            },
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: _passwordController,
                            obscureText: true,
                            decoration: const InputDecoration(
                              labelText: 'Senha',
                            ),
                            validator: (value) {
                              final password = (value ?? '').trim();

                              if (password.length < 8) {
                                return 'A senha deve ter pelo menos 8 caracteres';
                              }

                              return null;
                            },
                          ),
                          const SizedBox(height: 20),
                          AnimatedButton(
                            label: _isLogin ? 'Entrar' : 'Cadastrar',
                            isLoading: state.isLoading,
                            onPressed: _submit,
                          ),
                          const SizedBox(height: 10),
                          TextButton(
                            onPressed: () {
                              setState(() => _isLogin = !_isLogin);
                              _formKey.currentState?.reset();
                            },
                            child: Text(
                              _isLogin
                                  ? 'Ainda não tem conta? Cadastre-se'
                                  : 'Já tem conta? Entre',
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
