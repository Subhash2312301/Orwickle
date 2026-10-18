import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/dossier_button.dart';
import '../../../core/widgets/dossier_card.dart';
import '../../../core/widgets/perforated_divider.dart';
import '../../../core/widgets/status_badge.dart';
import '../../auth/providers/auth_provider.dart';
import '../../auth/screens/role_selection_screen.dart';

class StudentDashboardScreen extends StatefulWidget {
  const StudentDashboardScreen({super.key});

  @override
  State<StudentDashboardScreen> createState() => _StudentDashboardScreenState();
}

class _StudentDashboardScreenState extends State<StudentDashboardScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AuthProvider>().checkInitialAuth();
    });
  }

  void _logout() async {
    final auth = context.read<AuthProvider>();
    await auth.logout();
    if (mounted) {
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const RoleSelectionScreen()),
        (route) => false,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DossierThemeColors>() ?? DossierThemeColors.light;
    final auth = context.watch<AuthProvider>();
    final user = auth.currentUser;

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Text(
              'ORWICKLE DOSSIER',
              style: DossierTypography.monoStamp(color: colors.ink, fontSize: 13),
            ),
            const SizedBox(width: 4),
            Container(width: 5, height: 5, color: colors.signal),
          ],
        ),
        actions: [
          IconButton(
            icon: Icon(Icons.logout, size: 20, color: colors.ink),
            tooltip: 'Terminate Session',
            onPressed: _logout,
          ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Dossier Ledger Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'PORTFOLIO LEDGER',
                    style: DossierTypography.monoStamp(color: colors.inkMuted, fontSize: 10),
                  ),
                  const StatusBadge(
                    label: 'AUTHENTICATED',
                    type: DossierBadgeType.verified,
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                user?.displayName ?? 'Project Founder',
                style: DossierTypography.displayMedium(color: colors.ink),
              ),
              const SizedBox(height: 4),
              Text(
                user?.email ?? 'founder@szabist.pk',
                style: DossierTypography.monoLedger(color: colors.inkMuted, fontSize: 13),
              ),
              const SizedBox(height: 20),
              const PerforatedDivider(),
              const SizedBox(height: 24),

              // Section 01: Identification & Role
              DossierCard(
                sectionIndex: '01 / IDENTITY & PERMISSIONS',
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildMetaRow('System User ID', user?.id ?? 'e9329482-0192...', colors),
                    const SizedBox(height: 10),
                    _buildMetaRow('Assigned Role', (user?.role.name ?? 'student').toUpperCase(), colors),
                    const SizedBox(height: 10),
                    _buildMetaRow('Verification State', 'ACTIVE (PASSPHRASE & MFA BOUND)', colors),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Section 02: Active Security Session
              DossierCard(
                sectionIndex: '02 / SESSION LEDGER',
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildMetaRow('Session Transport', 'BEARER JWT + BODY REFRESH', colors),
                    const SizedBox(height: 10),
                    _buildMetaRow('Rotation Policy', '10S GRACE WINDOW (ADR-002)', colors),
                    const SizedBox(height: 10),
                    _buildMetaRow('Absolute Expiry', '90 DAYS (MANDATORY REAUTH)', colors),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Section 03: Dealroom Dossiers
              DossierCard(
                sectionIndex: '03 / CAPSTONE DOSSIERS',
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'AI Autonomous Dealroom Engine',
                      style: DossierTypography.displaySmall(color: colors.ink),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Next-generation institutional marketplace connecting university IP to private equity and verified angel investors.',
                      style: DossierTypography.bodySmall(color: colors.inkMuted),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        const StatusBadge(label: 'CONFIDENTIAL', type: DossierBadgeType.neutral),
                        const SizedBox(width: 8),
                        const StatusBadge(label: 'DRAFT TERM SHEET READY', type: DossierBadgeType.verified),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 32),

              // Terminate Session CTA
              DossierButton(
                text: 'TERMINATE AUTHORIZED SESSION',
                variant: DossierButtonVariant.secondary,
                onPressed: _logout,
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMetaRow(String label, String value, DossierThemeColors colors) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label.toUpperCase(),
          style: DossierTypography.monoStamp(color: colors.inkMuted, fontSize: 10),
        ),
        Text(
          value,
          style: DossierTypography.monoLedger(color: colors.ink, fontSize: 12),
        ),
      ],
    );
  }
}
