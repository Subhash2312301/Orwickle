import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';
import '../../../core/widgets/dossier_button.dart';
import '../../../core/widgets/dossier_text_field.dart';
import '../../../core/widgets/perforated_divider.dart';
import '../../../core/widgets/status_badge.dart';
import '../providers/auth_provider.dart';
import 'verify_email_screen.dart';

class SignupScreen extends StatefulWidget {
  const SignupScreen({super.key});

  @override
  State<SignupScreen> createState() => _SignupScreenState();
}

class _SignupScreenState extends State<SignupScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _submit() async {
    final auth = context.read<AuthProvider>();
    auth.clearError();

    final name = _nameController.text.trim();
    final email = _emailController.text.trim();
    final password = _passwordController.text;

    if (name.length < 2) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('ERROR — Name must be at least 2 characters.')),
      );
      return;
    }
    if (!email.contains('@')) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('ERROR — Enter a valid institutional email address.')),
      );
      return;
    }
    if (password.length < 10) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('ERROR — Password must be at least 10 characters long.')),
      );
      return;
    }

    final success = await auth.signup(
      email: email,
      password: password,
      fullName: name,
    );

    if (success && mounted) {
      Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => const VerifyEmailScreen()),
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
          'ACCOUNT INITIATION',
          style: DossierTypography.monoStamp(color: colors.ink, fontSize: 13),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'SECTION 01 / REGISTRATION',
                      style: DossierTypography.monoStamp(color: colors.inkMuted, fontSize: 10),
                    ),
                    StatusBadge(
                      label: authProvider.selectedRole.name.toUpperCase(),
                      type: DossierBadgeType.neutral,
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  'Institutional Credentials',
                  style: DossierTypography.displayMedium(color: colors.ink),
                ),
                const SizedBox(height: 6),
                Text(
                  'Enter your official name and institutional address to generate your verified cryptographic keypair.',
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

                // Full Name
                DossierTextField(
                  label: 'Full Legal / Academic Name',
                  controller: _nameController,
                  hint: 'e.g. Mustafa Muhammad',
                ),
                const SizedBox(height: 18),

                // Institutional Email
                DossierTextField(
                  label: 'Official Email Address',
                  controller: _emailController,
                  hint: 'e.g. student@szabist.pk',
                  keyboardType: TextInputType.emailAddress,
                ),
                const SizedBox(height: 18),

                // Password
                DossierTextField(
                  label: 'Access Passphrase (Min 10 Characters)',
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
                const SizedBox(height: 10),
                Text(
                  'Password policy: Minimum 10 characters. Common or sequential phrases are strictly rejected by the cryptographic engine.',
                  style: DossierTypography.monoStamp(color: colors.inkMuted, fontSize: 9),
                ),
                const SizedBox(height: 36),

                // Submit Button
                DossierButton(
                  text: 'DISPATCH AUTHORIZATION CODE',
                  variant: DossierButtonVariant.signal,
                  isLoading: authProvider.isLoading,
                  onPressed: _submit,
                ),
                const SizedBox(height: 16),

                // Terms disclaimer
                Center(
                  child: Text(
                    'BY INITIATING YOU AGREE TO THE DEALROOM DOSSIER NOTARY TERMS.',
                    style: DossierTypography.monoStamp(color: colors.inkMuted, fontSize: 9),
                    textAlign: TextAlign.center,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
