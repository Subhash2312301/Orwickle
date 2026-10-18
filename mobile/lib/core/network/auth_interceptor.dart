import 'package:dio/dio.dart';
import 'secure_storage_service.dart';

class AuthInterceptor extends QueuedInterceptor {
  final Dio dio;
  final SecureStorageService storage;
  final VoidCallback onAuthRevoked;

  AuthInterceptor({
    required this.dio,
    required this.storage,
    required this.onAuthRevoked,
  });

  @override
  Future<void> onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    // 1. Mobile requests send NO cookies and NO Origin header (ADR-014)
    options.headers.remove('Cookie');
    options.headers.remove('Origin');

    // 2. Inject Bearer access token if present
    final accessToken = await storage.getAccessToken();
    if (accessToken != null && accessToken.isNotEmpty) {
      options.headers['Authorization'] = 'Bearer $accessToken';
    }

    return handler.next(options);
  }

  @override
  Future<void> onError(DioException err, ErrorInterceptorHandler handler) async {
    // Only intercept 401 Unauthorized errors from non-auth endpoints
    final isAuthEndpoint = err.requestOptions.path.contains('/auth/login') ||
        err.requestOptions.path.contains('/auth/refresh') ||
        err.requestOptions.path.contains('/auth/signup');

    if (err.response?.statusCode == 401 && !isAuthEndpoint) {
      final refreshToken = await storage.getRefreshToken();
      if (refreshToken == null) {
        onAuthRevoked();
        return handler.next(err);
      }

      try {
        // Atomic Token Rotation Call (ADR-002)
        final refreshResponse = await dio.post(
          '/auth/refresh',
          data: {'refresh_token': refreshToken},
          options: Options(headers: {'Authorization': null}),
        );

        if (refreshResponse.statusCode == 200 && refreshResponse.data['success'] == true) {
          final newAccessToken = refreshResponse.data['access_token'] as String;
          final newRefreshToken = refreshResponse.data['refresh_token'] as String;

          await storage.saveTokens(
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
          );

          // Retry the original request with the newly issued access token
          final retryOptions = err.requestOptions;
          retryOptions.headers['Authorization'] = 'Bearer $newAccessToken';

          final cloneResponse = await dio.fetch(retryOptions);
          return handler.resolve(cloneResponse);
        }
      } catch (refreshError) {
        // Refresh token replayed past grace window or revoked
        await storage.clearAll();
        onAuthRevoked();
        return handler.next(err);
      }
    }

    return handler.next(err);
  }
}

typedef VoidCallback = void Function();
