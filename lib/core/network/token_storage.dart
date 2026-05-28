import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../constants/app_constants.dart';

class TokenStorage {
  const TokenStorage(this._storage);

  final FlutterSecureStorage _storage;

  Future<void> saveToken(String token) async {
    await _storage.write(key: AppConstants.tokenStorageKey, value: token);
  }

  Future<String?> getToken() {
    return _storage.read(key: AppConstants.tokenStorageKey);
  }

  Future<void> clearToken() {
    return _storage.delete(key: AppConstants.tokenStorageKey);
  }

  Future<void> saveUser(String userJson) {
    return _storage.write(key: AppConstants.userStorageKey, value: userJson);
  }

  Future<String?> getUser() {
    return _storage.read(key: AppConstants.userStorageKey);
  }

  Future<void> clearUser() {
    return _storage.delete(key: AppConstants.userStorageKey);
  }

  Future<void> clearSession() async {
    await clearToken();
    await clearUser();
  }
}
