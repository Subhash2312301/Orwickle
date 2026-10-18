import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/dossier_button.dart';
import '../../../core/widgets/perforated_divider.dart';
import '../models/user_model.dart';
import '../providers/auth_provider.dart';
import 'signup_screen.dart';
import 'login_screen.dart';

class RoleSelectionScreen extends StatelessWidget {
  const RoleSelectionScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DossierThemeColors>() ?? DossierThemeColors.light;
    final authProvider = context.watch<AuthProvider>();

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 20.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 20),
              // Wordmark & Relative Square (~0.12em square as specified in DESIGN.md)
              Row(
                children: [
                  Text(
                    'ORWICKLE',
                    style: DossierTypography.monoStamp(color: colors.ink, fontSize: 13),
                  ),
                  const SizedBox(width: 4),
                  Container(
                    width: 5,
                    height: 5,
                    color: colors.signal,
                  ),
                  const Spacer(),
                  Text(
                    'DOSSIER NO. 2026-FYP',
                    style: DossierTypography.monoStamp(color: colors.inkMuted, fontSize: 10),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              const PerforatedDivider(),
              const SizedBox(height: 28),

              // Editorial Headline
              Text(
                'Designate Your Role in the Dealroom.',
                style: DossierTypography.displayMedium(color: colors.ink),
              ),
              const SizedBox(height: 8),
              Text(
                'Every participant operates under institutional-grade verification. Select your primary operational mandate.',
                style: DossierTypography.bodyMedium(color: colors.inkMuted),
              ),
              const SizedBox(height: 32),

              // Role Selection Cards
              Expanded(
                child: ListView(
                  children: [
                    _buildRoleCard(
                      context,
                      role: UserRole.student,
                      title: 'Student / Project Founder',
                      code: 'ROLE 01',
                      description:
                          'Publish verified final year engineering dossiers, pitch decks, and source architectures to accredited capital.',
                      isSelected: authProvider.selectedRole == UserRole.student,
                      onTap: () => authProvider.setSelectedRole(UserRole.student),
                      colors: colors,
                    ),
                    const SizedBox(height: 14),
                    _buildRoleCard(
                      context,
                      role: UserRole.investor,
                      title: 'Accredited Investor',
                      code: 'ROLE 02',
                      description:
                          'Review pre-cleared technical IP, evaluate student prototypes, and submit version-controlled term sheets.',
                      isSelected: authProvider.selectedRole == UserRole.investor,
                      onTap: () => authProvider.setSelectedRole(UserRole.investor),
                      colors: colors,
                    ),
                    const SizedBox(height: 14),
                    _buildRoleCard(
                      context,
                      role: UserRole.buyer,
                      title: 'Acquisitions Buyer',
                      code: 'ROLE 03',
                      description:
                          'Acquire completed software solutions, proprietary algorithms, and institutional research artifacts.',
                      isSelected: authProvider.selectedRole == UserRole.buyer,
                      onTap: () => authProvider.setSelectedRole(UserRole.buyer),
                      colors: colors,
                    ),
                  ],
                ),
              ),

              // CTA Controls
              DossierButton(
                text: 'INITIALIZE REGISTRATION',
                variant: DossierButtonVariant.signal,
                onPressed: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const SignupScreen()),
                  );
                },
              ),
              const SizedBox(height: 12),
              DossierButton(
                text: 'EXISTING CREDENTIALS / LOGIN',
                variant: DossierButtonVariant.secondary,
                onPressed: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const LoginScreen()),
                  );
                },
              ),
              const SizedBox(height: 8),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildRoleCard(
    BuildContext context, {
    required UserRole role,
    required String title,
    required String code,
    required String description,
    required bool isSelected,
    required VoidCallback onTap,
    required DossierThemeColors colors,
  }) {
    return Material(
      color: colors.surface,
      shape: RoundedRectangleBorder(
        borderRadius: DossierTheme.radius2px,
        side: BorderSide(
          color: isSelected ? colors.signal : colors.rule,
          width: isSelected ? 1.5 : 1.0,
        ),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: DossierTheme.radius2px,
        child: Padding(
          padding: const EdgeInsets.all(18.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    code,
                    style: DossierTypography.monoStamp(
                      color: isSelected ? colors.signal : colors.inkMuted,
                      fontSize: 10,
                    ),
                  ),
                  Container(
                    width: 14,
                    height: 14,
                    decoration: BoxDecoration(
                      shape: BoxShape.rectangle,
                      borderRadius: DossierTheme.radius2px,
                      border: Border.all(
                        color: isSelected ? colors.signal : colors.rule,
                        width: 1.5,
                      ),
                      color: isSelected ? colors.signal : Colors.transparent,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Text(
                title,
                style: DossierTypography.displaySmall(color: colors.ink),
              ),
              const SizedBox(height: 6),
              Text(
                description,
                style: DossierTypography.bodySmall(color: colors.inkMuted),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
