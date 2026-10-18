import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SecureStorageService {
  final FlutterSecureStorage _storage;

  SecureStorageService({FlutterSecureStorage? storage})
      : _storage = storage ??
            const FlutterSecureStorage(
              aOptions: AndroidOptions(encryptedSharedPreferences: true),
              iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
            );

  static const String _keyAccessToken = 'orwickle_access_token';
  static const String _keyRefreshToken = 'orwickle_refresh_token';
  static const String _keyUserId = 'orwickle_user_id';
  static const String _keyUserRole = 'orwickle_user_role';
  static const String _keyUserEmail = 'orwickle_user_email';

  Future<void> saveTokens({required String accessToken, required String refreshToken}) async {
    await _storage.write(key: _keyAccessToken, value: accessToken);
    await _storage.write(key: _keyRefreshToken, value: refreshToken);
  }

  Future<String?> getAccessToken() async {
    return await _storage.read(key: _keyAccessToken);
  }

  Future<String?> getRefreshToken() async {
    return await _storage.read(key: _keyRefreshToken);
  }

  Future<void> saveUserMetadata({
    required String id,
    required String email,
    required String role,
  }) async {
    await _storage.write(key: _keyUserId, value: id);
    await _storage.write(key: _keyUserEmail, value: email);
    await _storage.write(key: _keyUserRole, value: role);
  }

  Future<Map<String, String?>> getUserMetadata() async {
    return {
      'id': await _storage.read(key: _keyUserId),
      'email': await _storage.read(key: _keyUserEmail),
      'role': await _storage.read(key: _keyUserRole),
    };
  }

  Future<void> clearAll() async {
    await _storage.deleteAll();
  }
}
