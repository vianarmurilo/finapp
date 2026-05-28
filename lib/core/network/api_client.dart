import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../constants/app_constants.dart';
import 'token_storage.dart';

String _resolveBaseUrl() {
  final configured = AppConstants.baseUrl;

  if (!kIsWeb) {
    return configured;
  }

  final uri = Uri.tryParse(configured);
  if (uri == null) {
    return configured;
  }

  // 10.0.2.2 e 127.0.0.1 sao comuns em mobile/emulador e falham no browser.
  if (uri.host == '10.0.2.2' || uri.host == '127.0.0.1') {
    return uri.replace(host: 'localhost').toString();
  }

  return configured;
}

final flutterSecureStorageProvider = Provider<FlutterSecureStorage>(
  (_) => const FlutterSecureStorage(),
);

class TokenStorageStorageAdapter extends TokenStorage {
  const TokenStorageStorageAdapter() : super(const FlutterSecureStorage());
}

final tokenStorageProvider = Provider<TokenStorage>((ref) {
  return const TokenStorage(FlutterSecureStorage());
});

final dioProvider = Provider<Dio>((ref) {
  final baseUrl = _resolveBaseUrl();

  final dio = Dio(
    BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 15),
      headers: {'Content-Type': 'application/json'},
    ),
  );

  dio.interceptors.add(
    InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await ref.read(tokenStorageProvider).getToken();
        if (token != null && token.isNotEmpty) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
    ),
  );

  return dio;
});
