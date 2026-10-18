import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_typography.dart';
import '../theme/app_theme.dart';

enum DossierBadgeType {
  verified,
  pending,
  error,
  neutral,
}

class StatusBadge extends StatelessWidget {
  final String label;
  final DossierBadgeType type;

  const StatusBadge({
    super.key,
    required this.label,
    this.type = DossierBadgeType.neutral,
  });

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DossierThemeColors>() ?? DossierThemeColors.light;

    Color badgeColor;
    switch (type) {
      case DossierBadgeType.verified:
        badgeColor = colors.success;
        break;
      case DossierBadgeType.pending:
        badgeColor = colors.caution;
        break;
      case DossierBadgeType.error:
        badgeColor = colors.error;
        break;
      case DossierBadgeType.neutral:
        badgeColor = colors.inkMuted;
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: badgeColor.withOpacity(0.08),
        borderRadius: DossierTheme.radius2px,
        border: Border.all(color: badgeColor, width: 1),
      ),
      child: Text(
        label.toUpperCase(),
        style: DossierTypography.monoStamp(color: badgeColor, fontSize: 10),
      ),
    );
  }
}
