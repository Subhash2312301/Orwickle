import 'package:flutter/material.dart';
import '../models/user_model.dart';
import '../services/auth_api_service.dart';
import '../../../core/network/secure_storage_service.dart';

class AuthProvider extends ChangeNotifier {
  final AuthApiService _apiService;
  final SecureStorageService _storage;

  UserModel? _currentUser;
  bool _isLoading = false;
  String? _errorMessage;

  // Transient flow state
  UserRole _selectedRole = UserRole.student;
  String? _pendingLoginTicket;
  String? _pendingEmail;

  AuthProvider({
    required AuthApiService apiService,
    required SecureStorageService storage,
  })  : _apiService = apiService,
        _storage = storage;

  UserModel? get currentUser => _currentUser;
  bool get isAuthenticated => _currentUser != null;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  UserRole get selectedRole => _selectedRole;
  String? get pendingLoginTicket => _pendingLoginTicket;
  String? get pendingEmail => _pendingEmail;

  void setSelectedRole(UserRole role) {
    _selectedRole = role;
    notifyListeners();
  }

  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }

  /// Checks stored tokens on app boot
  Future<void> checkInitialAuth() async {
    _isLoading = true;
    notifyListeners();

    try {
      final token = await _storage.getAccessToken();
      if (token != null && token.isNotEmpty) {
        _currentUser = await _apiService.getProfile();
      }
    } catch (_) {
      await _storage.clearAll();
      _currentUser = null;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Signup
  Future<bool> signup({
    required String email,
    required String password,
    required String fullName,
  }) async {
    _setLoading(true);
    _clearError();

    try {
      await _apiService.signup(
        email: email,
        password: password,
        fullName: fullName,
        role: _selectedRole.name,
      );
      _pendingEmail = email;
      _setLoading(false);
      return true;
    } catch (e) {
      _setError(e.toString());
      _setLoading(false);
      return false;
    }
  }

  /// Verify Email (Anti-Pre-Hijacking)
  Future<bool> verifyEmail({
    required String otp,
    required String password,
  }) async {
    if (_pendingEmail == null) {
      _setError('ERROR — Pending registration context missing.');
      return false;
    }

    _setLoading(true);
    _clearError();

    try {
      await _apiService.verifyEmail(
        email: _pendingEmail!,
        otp: otp,
        password: password,
      );
      _setLoading(false);
      return true;
    } catch (e) {
      _setError(e.toString());
      _setLoading(false);
      return false;
    }
  }

  /// Resend Verification OTP
  Future<bool> resendVerification() async {
    if (_pendingEmail == null) return false;
    try {
      await _apiService.resendVerification(email: _pendingEmail!);
      return true;
    } catch (e) {
      _setError(e.toString());
      return false;
    }
  }

  /// Login: handles always-MFA flow
  Future<bool> login({
    required String email,
    required String password,
  }) async {
    _setLoading(true);
    _clearError();

    try {
      final res = await _apiService.login(email: email, password: password);

      if (res['step'] == 'otp_required') {
        _pendingLoginTicket = res['login_ticket'] as String;
        _pendingEmail = email;
        _setLoading(false);
        return true; // proceed to login_otp_screen
      }

      // Direct login if OTP mode off
      _currentUser = await _apiService.getProfile();
      _setLoading(false);
      return true;
    } catch (e) {
      _setError(e.toString());
      _setLoading(false);
      return false;
    }
  }

  /// Complete MFA Login
  Future<bool> verifyLoginOtp(String otp) async {
    if (_pendingLoginTicket == null) {
      _setError('ERROR — Login challenge ticket missing.');
      return false;
    }

    _setLoading(true);
    _clearError();

    try {
      _currentUser = await _apiService.verifyLoginOtp(
        loginTicket: _pendingLoginTicket!,
        otp: otp,
      );
      _pendingLoginTicket = null;
      _setLoading(false);
      return true;
    } catch (e) {
      _setError(e.toString());
      _setLoading(false);
      return false;
    }
  }

  /// Forgot Password
  Future<bool> forgotPassword(String email) async {
    _setLoading(true);
    _clearError();

    try {
      await _apiService.forgotPassword(email: email);
      _setLoading(false);
      return true;
    } catch (e) {
      _setError(e.toString());
      _setLoading(false);
      return false;
    }
  }

  /// Reset Password
  Future<bool> resetPassword({
    required String token,
    required String newPassword,
  }) async {
    _setLoading(true);
    _clearError();

    try {
      await _apiService.resetPassword(token: token, newPassword: newPassword);
      _setLoading(false);
      return true;
    } catch (e) {
      _setError(e.toString());
      _setLoading(false);
      return false;
    }
  }

  /// Logout
  Future<void> logout() async {
    await _apiService.logout();
    _currentUser = null;
    notifyListeners();
  }

  void _setLoading(bool value) {
    _isLoading = value;
    notifyListeners();
  }

  void _setError(String msg) {
    _errorMessage = msg;
    notifyListeners();
  }

  void _clearError() {
    _errorMessage = null;
  }
}
