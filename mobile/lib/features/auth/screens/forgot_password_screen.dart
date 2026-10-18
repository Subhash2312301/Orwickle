import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';
import '../../../core/widgets/dossier_button.dart';
import '../../../core/widgets/dossier_text_field.dart';
import '../../../core/widgets/perforated_divider.dart';
import '../providers/auth_provider.dart';
import 'reset_password_screen.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _emailController = TextEditingController();
  bool _submitted = false;

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  void _submit() async {
    final email = _emailController.text.trim();
    if (email.isEmpty || !email.contains('@')) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('ERROR — Enter your registered email address.')),
      );
      return;
    }

    final auth = context.read<AuthProvider>();
    final success = await auth.forgotPassword(email);

    if (success && mounted) {
      setState(() => _submitted = true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DossierThemeColors>() ?? DossierThemeColors.light;
    final authProvider = context.watch<AuthProvider>();

    return Scaffold(
      appBar: AppBar(
        title: Text(
          'RECOVERY DIRECTIVE',
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
                'Credential Recovery Protocol',
                style: DossierTypography.displayMedium(color: colors.ink),
              ),
              const SizedBox(height: 6),
              Text(
                'Submit your institutional address. If registered, single-use recovery instructions will be dispatched to your email.',
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

              if (!_submitted) ...[
                DossierTextField(
                  label: 'Registered Email Address',
                  controller: _emailController,
                  hint: 'e.g. founder@szabist.pk',
                  keyboardType: TextInputType.emailAddress,
                ),
                const SizedBox(height: 28),
                DossierButton(
                  text: 'DISPATCH RECOVERY DIRECTIVE',
                  variant: DossierButtonVariant.primary,
                  isLoading: authProvider.isLoading,
                  onPressed: _submit,
                ),
              ] else ...[
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: colors.surface,
                    border: Border.all(color: colors.rule, width: 1),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'DIRECTIVE DISPATCHED',
                        style: DossierTypography.monoStamp(color: colors.success, fontSize: 11),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'If your address is registered on the ledger, a single-use authorization token was generated and dispatched.',
                        style: DossierTypography.bodySmall(color: colors.ink),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
                DossierButton(
                  text: 'ENTER AUTHORIZATION TOKEN',
                  variant: DossierButtonVariant.signal,
                  onPressed: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => const ResetPasswordScreen()),
                    );
                  },
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
