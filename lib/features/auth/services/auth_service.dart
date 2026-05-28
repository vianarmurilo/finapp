import 'package:dio/dio.dart';
import '../models/auth_response.dart';

class AuthException implements Exception {
  const AuthException(this.message);

  final String message;

  @override
  String toString() => message;
}

class AuthService {
  const AuthService(this._dio);

  final Dio _dio;

  String _resolveMessage(DioException error, String fallback) {
    final responseData = error.response?.data;

    if (responseData is Map<String, dynamic>) {
      final message = responseData['message'];
      if (message is String && message.trim().isNotEmpty) {
        return message;
      }
    }

    final dioMessage = error.message;
    if (dioMessage != null && dioMessage.trim().isNotEmpty) {
      return dioMessage;
    }

    final errorMessage = error.error;
    if (errorMessage is String && errorMessage.trim().isNotEmpty) {
      return errorMessage;
    }

    return fallback;
  }

  Future<AuthResponse> login({
    required String email,
    required String password,
  }) async {
    try {
      final response = await _dio
          .post('/auth/login', data: {'email': email, 'password': password})
          .timeout(
            const Duration(seconds: 15),
            onTimeout: () => throw DioException(
              requestOptions: RequestOptions(path: '/auth/login'),
              error: 'Connection timeout',
              type: DioExceptionType.connectionTimeout,
            ),
          );
      return AuthResponse.fromJson(
        Map<String, dynamic>.from(response.data as Map),
      );
    } on DioException catch (error) {
      throw AuthException(
        _resolveMessage(error, 'Não foi possível fazer login'),
      );
    } catch (e) {
      throw AuthException('Erro desconhecido: $e');
    }
  }

  Future<AuthResponse> register({
    required String name,
    required String email,
    required String password,
  }) async {
    try {
      final response = await _dio
          .post(
            '/auth/register',
            data: {'name': name, 'email': email, 'password': password},
          )
          .timeout(
            const Duration(seconds: 15),
            onTimeout: () => throw DioException(
              requestOptions: RequestOptions(path: '/auth/register'),
              error: 'Connection timeout',
              type: DioExceptionType.connectionTimeout,
            ),
          );
      return AuthResponse.fromJson(
        Map<String, dynamic>.from(response.data as Map),
      );
    } on DioException catch (error) {
      final statusCode = error.response?.statusCode;
      final message = _resolveMessage(error, 'Não foi possível cadastrar');

      if (statusCode == 409 || message.contains('E-mail já cadastrado')) {
        throw AuthException(
          'Este e-mail já está cadastrado. Tente entrar com sua senha.',
        );
      }

      throw AuthException(message);
    } catch (e) {
      throw AuthException('Erro desconhecido: $e');
    }
  }
}
