import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'auth_interceptor.dart';
import 'secure_storage_service.dart';

class ApiClient {
  late final Dio dio;
  final SecureStorageService storage;
  final VoidCallback onAuthRevoked;

  ApiClient({
    required this.storage,
    required this.onAuthRevoked,
    String? customBaseUrl,
  }) {
    final String defaultBaseUrl = _resolveBaseUrl();

    dio = Dio(
      BaseOptions(
        baseUrl: customBaseUrl ?? defaultBaseUrl,
        connectTimeout: const Duration(seconds: 10),
        receiveTimeout: const Duration(seconds: 15),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    dio.interceptors.add(
      AuthInterceptor(
        dio: dio,
        storage: storage,
        onAuthRevoked: onAuthRevoked,
      ),
    );
  }

  static String _resolveBaseUrl() {
    if (kIsWeb) {
      return 'http://localhost:4000/api/v1';
    }
    try {
      if (Platform.isAndroid) {
        // Standard Android emulator loopback alias to host machine
        return 'http://10.0.2.2:4000/api/v1';
      }
    } catch (_) {
      // Fallback if Platform check fails in test runner
    }
    return 'http://localhost:4000/api/v1';
  }
}
