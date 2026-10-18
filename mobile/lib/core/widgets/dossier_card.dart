import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_typography.dart';
import '../theme/app_theme.dart';

class DossierCard extends StatelessWidget {
  final Widget child;
  final String? sectionIndex; // e.g. "01 / SECURITY"
  final EdgeInsetsGeometry padding;
  final VoidCallback? onTap;

  const DossierCard({
    super.key,
    required this.child,
    this.sectionIndex,
    this.padding = const EdgeInsets.all(16),
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DossierThemeColors>() ?? DossierThemeColors.light;

    Widget cardBody = Container(
      decoration: BoxDecoration(
        color: colors.surface,
        borderRadius: DossierTheme.radius2px,
        border: Border.all(color: colors.rule, width: 1),
      ),
      padding: padding,
      child: child,
    );

    if (onTap != null) {
      cardBody = InkWell(
        onTap: onTap,
        borderRadius: DossierTheme.radius2px,
        child: cardBody,
      );
    }

    if (sectionIndex != null) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Padding(
            padding: const EdgeInsets.only(left: 4, bottom: 8),
            child: Text(
              sectionIndex!.toUpperCase(),
              style: DossierTypography.monoStamp(color: colors.inkMuted, fontSize: 11),
            ),
          ),
          cardBody,
        ],
      );
    }

    return cardBody;
  }
}
