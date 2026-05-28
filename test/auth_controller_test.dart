import 'package:dio/dio.dart';
import 'package:financeiro/core/network/token_storage.dart';
import 'package:financeiro/features/auth/controllers/auth_controller.dart';
import 'package:financeiro/features/auth/models/auth_response.dart';
import 'package:financeiro/features/auth/models/auth_user.dart';
import 'package:financeiro/features/auth/services/auth_service.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';

class FakeTokenStorage extends TokenStorage {
  FakeTokenStorage() : super(const FlutterSecureStorage());

  String? token;
  String? userJson;

  @override
  Future<void> saveToken(String token) async {
    this.token = token;
  }

  @override
  Future<String?> getToken() async => token;

  @override
  Future<void> clearToken() async {
    token = null;
  }

  @override
  Future<void> saveUser(String userJson) async {
    this.userJson = userJson;
  }

  @override
  Future<String?> getUser() async => userJson;

  @override
  Future<void> clearUser() async {
    userJson = null;
  }
}

class FakeAuthService extends AuthService {
  FakeAuthService({required this.loginResponse, required this.registerResponse})
    : super(Dio());

  final AuthResponse loginResponse;
  final AuthResponse registerResponse;

  @override
  Future<AuthResponse> login({
    required String email,
    required String password,
  }) async {
    return loginResponse;
  }

  @override
  Future<AuthResponse> register({
    required String name,
    required String email,
    required String password,
  }) async {
    return registerResponse;
  }
}

void main() {
  test('bootstraps empty session as null', () async {
    final storage = FakeTokenStorage();
    final controller = AuthController(
      FakeAuthService(
        loginResponse: const AuthResponse(
          token: 'token-login',
          user: AuthUser(
            id: '1',
            name: 'Login User',
            email: 'login@financeiro.com',
            currency: 'BRL',
            role: 'USER',
          ),
        ),
        registerResponse: const AuthResponse(
          token: 'token-register',
          user: AuthUser(
            id: '2',
            name: 'Register User',
            email: 'register@financeiro.com',
            currency: 'BRL',
            role: 'USER',
          ),
        ),
      ),
      storage,
    );

    expect(controller.state.isLoading, isTrue);
    await pumpEventQueue();

    expect(controller.state.isLoading, isFalse);
    expect(storage.token, isNull);
    expect(storage.userJson, isNull);
  });

  test('login persists token and user session', () async {
    final storage = FakeTokenStorage();
    final response = AuthResponse(
      token: 'token-login',
      user: const AuthUser(
        id: '1',
        name: 'Login User',
        email: 'login@financeiro.com',
        currency: 'BRL',
        role: 'USER',
      ),
    );

    final controller = AuthController(
      FakeAuthService(loginResponse: response, registerResponse: response),
      storage,
    );

    expect(controller.state.isLoading, isTrue);
    await pumpEventQueue();
    await controller.login('login@financeiro.com', 'password123');

    expect(storage.token, 'token-login');
    expect(storage.userJson, isNotNull);
    expect(controller.state.isLoading, isFalse);

    await controller.logout();

    expect(storage.token, isNull);
    expect(storage.userJson, isNull);
    expect(controller.state.isLoading, isFalse);
  });
}
