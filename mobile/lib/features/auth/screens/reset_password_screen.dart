import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';
import '../../../core/widgets/dossier_button.dart';
import '../../../core/widgets/dossier_text_field.dart';
import '../../../core/widgets/perforated_divider.dart';
import '../providers/auth_provider.dart';
import 'login_screen.dart';

class ResetPasswordScreen extends StatefulWidget {
  final String? initialToken;

  const ResetPasswordScreen({super.key, this.initialToken});

  @override
  State<ResetPasswordScreen> createState() => _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends State<ResetPasswordScreen> {
  final _tokenController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmController = TextEditingController();
  bool _obscurePassword = true;

  @override
  void initState() {
    super.initState();
    if (widget.initialToken != null) {
      _tokenController.text = widget.initialToken!;
    }
  }

  @override
  void dispose() {
    _tokenController.dispose();
    _passwordController.dispose();
    _confirmController.dispose();
    super.dispose();
  }

  void _submit() async {
    final auth = context.read<AuthProvider>();
    auth.clearError();

    final token = _tokenController.text.trim();
    final password = _passwordController.text;
    final confirm = _confirmController.text;

    if (token.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('ERROR — Enter the recovery authorization token.')),
      );
      return;
    }
    if (password.length < 10) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('ERROR — New password must be at least 10 characters long.')),
      );
      return;
    }
    if (password != confirm) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('ERROR — Passphrases do not match.')),
      );
      return;
    }

    final success = await auth.resetPassword(
      token: token,
      newPassword: password,
    );

    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Passphrase updated. All sessions revoked. Sign in with your new credentials.'),
        ),
      );
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const LoginScreen()),
        (route) => false,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DossierThemeColors>() ?? DossierThemeColors.light;
    final authProvider = context.watch<AuthProvider>();

    return Scaffold(
      appBar: AppBar(
        title: Text(
          'UPDATE CREDENTIALS',
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
                'Execute Passphrase Reset',
                style: DossierTypography.displayMedium(color: colors.ink),
              ),
              const SizedBox(height: 6),
              Text(
                'Redeem your single-use recovery token. Upon completion, any active account lockout is cleared and all previous sessions are revoked.',
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

              // Token
              DossierTextField(
                label: 'Authorization Token',
                controller: _tokenController,
                hint: 'Paste token from recovery email',
              ),
              const SizedBox(height: 18),

              // New Password
              DossierTextField(
                label: 'New Passphrase (Min 10 Characters)',
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
              const SizedBox(height: 18),

              // Confirm Password
              DossierTextField(
                label: 'Confirm New Passphrase',
                controller: _confirmController,
                obscureText: _obscurePassword,
                hint: '••••••••••••',
              ),
              const SizedBox(height: 32),

              // Reset CTA
              DossierButton(
                text: 'RESET PASSPHRASE & REVOKE SESSIONS',
                variant: DossierButtonVariant.signal,
                isLoading: authProvider.isLoading,
                onPressed: _submit,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
