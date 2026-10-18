import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';
import '../../../core/widgets/dossier_button.dart';
import '../../../core/widgets/dossier_text_field.dart';
import '../../../core/widgets/perforated_divider.dart';
import '../providers/auth_provider.dart';
import 'login_otp_screen.dart';
import 'forgot_password_screen.dart';
import '../../dashboard/screens/student_dashboard_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _submit() async {
    final auth = context.read<AuthProvider>();
    auth.clearError();

    final email = _emailController.text.trim();
    final password = _passwordController.text;

    if (email.isEmpty || !email.contains('@')) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('ERROR — Enter your registered email address.')),
      );
      return;
    }
    if (password.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('ERROR — Enter your account passphrase.')),
      );
      return;
    }

    final success = await auth.login(email: email, password: password);

    if (success && mounted) {
      if (auth.pendingLoginTicket != null) {
        // MFA challenge required
        Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => const LoginOtpScreen()),
        );
      } else if (auth.isAuthenticated) {
        // Direct authenticated
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(builder: (_) => const StudentDashboardScreen()),
          (route) => false,
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DossierThemeColors>() ?? DossierThemeColors.light;
    final authProvider = context.watch<AuthProvider>();

    return Scaffold(
      appBar: AppBar(
        title: Text(
          'AUTHENTICATION',
          style: DossierTypography.monoStamp(color: colors.ink, fontSize: 13),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Access Dealroom Ledger',
                style: DossierTypography.displayMedium(color: colors.ink),
              ),
              const SizedBox(height: 6),
              Text(
                'Present your registered credentials to initiate institutional session authorization.',
                style: DossierTypography.bodySmall(color: colors.inkMuted),
              ),
              const SizedBox(height: 20),
              const PerforatedDivider(),
              const SizedBox(height: 24),

              if (authProvider.errorMessage != null) ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: colors.error.withOpacity(0.08),
                    border: Border.all(color: colors.error, width: 1),
                  ),
                  child: Text(
                    authProvider.errorMessage!,
                    style: DossierTypography.monoError(color: colors.error),
                  ),
                ),
                const SizedBox(height: 20),
              ],

              // Email Address
              DossierTextField(
                label: 'Registered Email Address',
                controller: _emailController,
                hint: 'e.g. founder@szabist.pk',
                keyboardType: TextInputType.emailAddress,
              ),
              const SizedBox(height: 18),

              // Password
              DossierTextField(
                label: 'Passphrase',
                controller: _passwordController,
                obscureText: _obscurePassword,
                hint: '••••••••••••',
                suffixIcon: IconButton(
                  icon: Icon(
                    _obscurePassword ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                    size: 20,
                    color: colors.inkMuted,
                  ),
                  onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                ),
              ),
              const SizedBox(height: 12),

              // Forgot password link
              Align(
                alignment: Alignment.centerRight,
                child: TextButton(
                  onPressed: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => const ForgotPasswordScreen()),
                    );
                  },
                  child: Text(
                    'RECOVER ACCESS CODE',
                    style: DossierTypography.monoStamp(color: colors.inkMuted, fontSize: 10),
                  ),
                ),
              ),
              const SizedBox(height: 24),

              // Login CTA
              DossierButton(
                text: 'CONTINUE TO AUTHORIZATION',
                variant: DossierButtonVariant.primary,
                isLoading: authProvider.isLoading,
                onPressed: _submit,
              ),
              const SizedBox(height: 20),

              // Security notice
              Center(
                child: Text(
                  'PROTECTED BY RFC 9106 ARGON2ID & ESCALATING LOCKOUT BACKOFF.',
                  style: DossierTypography.monoStamp(color: colors.inkMuted, fontSize: 9),
                  textAlign: TextAlign.center,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
