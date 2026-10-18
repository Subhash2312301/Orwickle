import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';
import '../../../core/widgets/dossier_button.dart';
import '../../../core/widgets/dossier_text_field.dart';
import '../../../core/widgets/perforated_divider.dart';
import '../../../core/widgets/otp_input_row.dart';
import '../../../core/widgets/status_badge.dart';
import '../providers/auth_provider.dart';
import 'login_screen.dart';

class VerifyEmailScreen extends StatefulWidget {
  const VerifyEmailScreen({super.key});

  @override
  State<VerifyEmailScreen> createState() => _VerifyEmailScreenState();
}

class _VerifyEmailScreenState extends State<VerifyEmailScreen> {
  final _passwordController = TextEditingController();
  String _otpCode = '';
  bool _obscurePassword = true;

  @override
  void dispose() {
    _passwordController.dispose();
    super.dispose();
  }

  void _verify() async {
    final auth = context.read<AuthProvider>();
    auth.clearError();

    if (_otpCode.length != 6) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('ERROR — Enter the full 6-digit verification code.')),
      );
      return;
    }

    final password = _passwordController.text;
    if (password.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('ERROR — Passphrase confirmation is required for pre-hijacking defense.'),
        ),
      );
      return;
    }

    final success = await auth.verifyEmail(
      otp: _otpCode,
      password: password,
    );

    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Account verified and activated. Please sign in with your credentials.'),
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
    final email = authProvider.pendingEmail ?? 'institutional.address';

    return Scaffold(
      appBar: AppBar(
        title: Text(
          'AUTHORIZATION CODE',
          style: DossierTypography.monoStamp(color: colors.ink, fontSize: 13),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'SECTION 02 / VERIFICATION',
                    style: DossierTypography.monoStamp(color: colors.inkMuted, fontSize: 10),
                  ),
                  const StatusBadge(
                    label: 'CHALLENGE PENDING',
                    type: DossierBadgeType.pending,
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                'Redeem Authorization Code',
                style: DossierTypography.displayMedium(color: colors.ink),
              ),
              const SizedBox(height: 6),
              Text(
                'An offline-notarized 6-digit authorization code has been dispatched to:',
                style: DossierTypography.bodySmall(color: colors.inkMuted),
              ),
              const SizedBox(height: 4),
              Text(
                email,
                style: DossierTypography.monoLedger(color: colors.ink, fontSize: 13),
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

              // 6-Cell Perforated OTP Stub
              OtpInputRow(
                length: 6,
                totalSeconds: 600, // 10 minutes (ADR-004)
                onCompleted: (code) => setState(() => _otpCode = code),
                onChanged: (code) => _otpCode = code,
                onResendRequested: () async {
                  final sent = await authProvider.resendVerification();
                  if (sent && mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Fresh authorization code dispatched.')),
                    );
                  }
                },
              ),
              const SizedBox(height: 28),

              // Anti-Pre-Hijacking Passphrase (ADR-009)
              DossierTextField(
                label: 'Confirm Passphrase (Anti-Pre-Hijacking Defense)',
                controller: _passwordController,
                obscureText: _obscurePassword,
                hint: 'Confirm your account passphrase',
                suffixIcon: IconButton(
                  icon: Icon(
                    _obscurePassword ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                    size: 20,
                    color: colors.inkMuted,
                  ),
                  onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Required to guarantee the verification code is being redeemed by the authentic passphrase owner (ADR-009).',
                style: DossierTypography.monoStamp(color: colors.inkMuted, fontSize: 9),
              ),
              const SizedBox(height: 36),

              // Verification CTA
              DossierButton(
                text: 'VERIFY & ACTIVATE ACCOUNT',
                variant: DossierButtonVariant.signal,
                isLoading: authProvider.isLoading,
                onPressed: _verify,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
