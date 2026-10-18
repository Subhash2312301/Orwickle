import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';
import '../../../core/widgets/dossier_button.dart';
import '../../../core/widgets/perforated_divider.dart';
import '../../../core/widgets/otp_input_row.dart';
import '../../../core/widgets/status_badge.dart';
import '../providers/auth_provider.dart';
import '../../dashboard/screens/student_dashboard_screen.dart';

class LoginOtpScreen extends StatefulWidget {
  const LoginOtpScreen({super.key});

  @override
  State<LoginOtpScreen> createState() => _LoginOtpScreenState();
}

class _LoginOtpScreenState extends State<LoginOtpScreen> {
  String _otpCode = '';

  void _submit() async {
    final auth = context.read<AuthProvider>();
    auth.clearError();

    if (_otpCode.length != 6) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('ERROR — Enter the complete 6-digit authorization code.')),
      );
      return;
    }

    final success = await auth.verifyLoginOtp(_otpCode);

    if (success && mounted) {
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const StudentDashboardScreen()),
        (route) => false,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DossierThemeColors>() ?? DossierThemeColors.light;
    final authProvider = context.watch<AuthProvider>();
    final email = authProvider.pendingEmail ?? 'your registered email';

    return Scaffold(
      appBar: AppBar(
        title: Text(
          'MFA VERIFICATION',
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
                    'CHALLENGE 02 / MFA',
                    style: DossierTypography.monoStamp(color: colors.inkMuted, fontSize: 10),
                  ),
                  const StatusBadge(
                    label: 'SECURITY DIRECTIVE',
                    type: DossierBadgeType.pending,
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                'Multi-Factor Authorization',
                style: DossierTypography.displayMedium(color: colors.ink),
              ),
              const SizedBox(height: 6),
              Text(
                'Enter the 6-digit cryptographic challenge dispatched to:',
                style: DossierTypography.bodySmall(color: colors.inkMuted),
              ),
              const SizedBox(height: 4),
              Text(
                email,
                style: DossierTypography.monoLedger(color: colors.ink, fontSize: 13),
              ),
              const SizedBox(height: 20),
              const PerforatedDivider(),
              const SizedBox(height: 28),

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

              // 6-Cell OTP Input with 5-minute countdown (ADR-004)
              OtpInputRow(
                length: 6,
                totalSeconds: 300, // 5 minutes for login OTP
                onCompleted: (code) {
                  setState(() => _otpCode = code);
                  _submit();
                },
                onChanged: (code) => _otpCode = code,
              ),
              const SizedBox(height: 36),

              // Authorize CTA
              DossierButton(
                text: 'AUTHORIZE ACCESS & ENTER',
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
