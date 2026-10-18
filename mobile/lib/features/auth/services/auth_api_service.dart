import 'package:dio/dio.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/secure_storage_service.dart';
import '../models/user_model.dart';

class AuthApiService {
  final ApiClient apiClient;
  final SecureStorageService storage;

  AuthApiService({
    required this.apiClient,
    required this.storage,
  });

  /// Initiates user registration
  Future<String> signup({
    required String email,
    required String password,
    required String fullName,
    required String role,
  }) async {
    try {
      final res = await apiClient.dio.post('/auth/signup', data: {
        'email': email,
        'password': password,
        'full_name': fullName,
        'role': role,
      });

      return res.data['message'] as String? ?? 'Registration initiated.';
    } on DioException catch (e) {
      throw _extractErrorMessage(e);
    }
  }

  /// Verifies email with OTP code and password (ADR-009 anti-pre-hijacking)
  Future<String> verifyEmail({
    required String email,
    required String otp,
    required String password,
  }) async {
    try {
      final res = await apiClient.dio.post('/auth/verify-email', data: {
        'email': email,
        'otp': otp,
        'password': password,
      });

      return res.data['message'] as String? ?? 'Email verified successfully.';
    } on DioException catch (e) {
      throw _extractErrorMessage(e);
    }
  }

  /// Requests fresh verification OTP
  Future<String> resendVerification({required String email}) async {
    try {
      final res = await apiClient.dio.post('/auth/resend-verification', data: {
        'email': email,
      });

      return res.data['message'] as String? ?? 'Verification code dispatched.';
    } on DioException catch (e) {
      throw _extractErrorMessage(e);
    }
  }

  /// Password login: returns either login_ticket (for MFA) or direct tokens
  Future<Map<String, dynamic>> login({
    required String email,
    required String password,
    String? deviceLabel,
  }) async {
    try {
      final res = await apiClient.dio.post('/auth/login', data: {
        'email': email,
        'password': password,
        'device_label': deviceLabel ?? 'Mobile Device',
      });

      return res.data as Map<String, dynamic>;
    } on DioException catch (e) {
      throw _extractErrorMessage(e);
    }
  }

  /// Verifies login OTP using issued login_ticket
  Future<UserModel> verifyLoginOtp({
    required String loginTicket,
    required String otp,
    String? deviceLabel,
  }) async {
    try {
      final res = await apiClient.dio.post('/auth/login/verify-otp', data: {
        'login_ticket': loginTicket,
        'otp': otp,
        'device_label': deviceLabel ?? 'Mobile Device',
      });

      final accessToken = res.data['access_token'] as String;
      final refreshToken = res.data['refresh_token'] as String;
      final userData = res.data['user'] as Map<String, dynamic>;

      await storage.saveTokens(
        accessToken: accessToken,
        refreshToken: refreshToken,
      );

      await storage.saveUserMetadata(
        id: userData['id'] as String,
        email: userData['email'] as String,
        role: userData['role'] as String,
      );

      return UserModel(
        id: userData['id'] as String,
        email: userData['email'] as String,
        role: _parseRole(userData['role'] as String),
        status: UserStatus.active,
      );
    } on DioException catch (e) {
      throw _extractErrorMessage(e);
    }
  }

  /// Fetches current authenticated user and profile
  Future<UserModel> getProfile() async {
    try {
      final res = await apiClient.dio.get('/me');
      return UserModel.fromJson(res.data['data'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _extractErrorMessage(e);
    }
  }

  /// Logs out of current session
  Future<void> logout() async {
    try {
      await apiClient.dio.post('/auth/logout');
    } catch (_) {
      // Ignore network errors on logout
    } finally {
      await storage.clearAll();
    }
  }

  /// Initiates password recovery
  Future<String> forgotPassword({required String email}) async {
    try {
      final res = await apiClient.dio.post('/auth/forgot-password', data: {
        'email': email,
      });

      return res.data['message'] as String? ?? 'Instructions dispatched.';
    } on DioException catch (e) {
      throw _extractErrorMessage(e);
    }
  }

  /// Completes password reset
  Future<String> resetPassword({
    required String token,
    required String newPassword,
  }) async {
    try {
      final res = await apiClient.dio.post('/auth/reset-password', data: {
        'token': token,
        'new_password': newPassword,
      });

      return res.data['message'] as String? ?? 'Password reset successfully.';
    } on DioException catch (e) {
      throw _extractErrorMessage(e);
    }
  }

  String _extractErrorMessage(DioException e) {
    if (e.response?.data is Map) {
      final errObj = e.response!.data['error'];
      if (errObj is Map && errObj['message'] != null) {
        return errObj['message'] as String;
      }
    }
    return e.message ?? 'An unexpected network error occurred.';
  }

  UserRole _parseRole(String role) {
    switch (role.toLowerCase()) {
      case 'investor':
        return UserRole.investor;
      case 'buyer':
        return UserRole.buyer;
      case 'admin':
        return UserRole.admin;
      default:
        return UserRole.student;
    }
  }
}
