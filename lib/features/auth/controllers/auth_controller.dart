import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/token_storage.dart';
import '../models/auth_user.dart';
import '../services/auth_service.dart';

final authServiceProvider = Provider<AuthService>((ref) {
  return AuthService(ref.watch(dioProvider));
});

final authStateProvider =
    StateNotifierProvider<AuthController, AsyncValue<AuthUser?>>((ref) {
      return AuthController(
        ref.watch(authServiceProvider),
        ref.watch(tokenStorageProvider),
      );
    });

class AuthController extends StateNotifier<AsyncValue<AuthUser?>> {
  AuthController(this._authService, this._tokenStorage)
    : super(const AsyncValue.loading()) {
    _bootstrap();
  }

  final AuthService _authService;
  final TokenStorage _tokenStorage;

  Future<void> _persistSession(AuthUser user, String token) async {
    try {
      await _tokenStorage.saveToken(token);
      await _tokenStorage.saveUser(jsonEncode(user.toJson()));
    } catch (_) {
      // Mantem a sessao em memoria mesmo se persistencia falhar no dispositivo.
    }
  }

  Future<void> _bootstrap() async {
    try {
      final token = await _tokenStorage.getToken();
      final storedUser = await _tokenStorage.getUser();

      if (token == null || token.isEmpty || storedUser == null) {
        state = const AsyncValue.data(null);
        return;
      }

      state = AsyncValue.data(
        AuthUser.fromJson(
          Map<String, dynamic>.from(jsonDecode(storedUser) as Map),
        ),
      );
    } catch (_) {
      await _tokenStorage.clearSession();
      state = const AsyncValue.data(null);
    }
  }

  Future<void> login(String email, String password) async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      final auth = await _authService.login(email: email, password: password);
      await _persistSession(auth.user, auth.token);
      return auth.user;
    });
  }

  Future<void> register(String name, String email, String password) async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      final auth = await _authService.register(
        name: name,
        email: email,
        password: password,
      );
      await _persistSession(auth.user, auth.token);
      return auth.user;
    });
  }

  Future<void> logout() async {
    await _tokenStorage.clearSession();
    state = const AsyncValue.data(null);
  }
}
