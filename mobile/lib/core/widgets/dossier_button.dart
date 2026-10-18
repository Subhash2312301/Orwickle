import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_typography.dart';
import '../theme/app_theme.dart';

enum DossierButtonVariant {
  primary,   // ink fill, bg text
  secondary, // transparent fill, rule border, ink text
  signal,    // vermilion accent fill, white text
}

class DossierButton extends StatelessWidget {
  final String text;
  final VoidCallback? onPressed;
  final DossierButtonVariant variant;
  final bool isLoading;
  final double height;
  final Widget? icon;

  const DossierButton({
    super.key,
    required this.text,
    required this.onPressed,
    this.variant = DossierButtonVariant.primary,
    this.isLoading = false,
    this.height = 48.0, // Strictly 48dp minimum accessibility target
    this.icon,
  });

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DossierThemeColors>() ?? DossierThemeColors.light;

    Color bg;
    Color fg;
    BorderSide borderSide = BorderSide.none;

    switch (variant) {
      case DossierButtonVariant.primary:
        bg = colors.ink;
        fg = colors.bg;
        break;
      case DossierButtonVariant.secondary:
        bg = Colors.transparent;
        fg = colors.ink;
        borderSide = BorderSide(color: colors.rule, width: 1);
        break;
      case DossierButtonVariant.signal:
        bg = colors.signal;
        fg = Colors.white;
        break;
    }

    return SizedBox(
      height: height,
      child: Material(
        color: bg,
        shape: RoundedRectangleBorder(
          borderRadius: DossierTheme.radius2px,
          side: borderSide,
        ),
        child: InkWell(
          onTap: isLoading ? null : onPressed,
          borderRadius: DossierTheme.radius2px,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Center(
              child: isLoading
                  ? SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation<Color>(fg),
                      ),
                    )
                  : Row(
                      mainAxisSize: MainAxisSize.min,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        if (icon != null) ...[
                          icon!,
                          const SizedBox(width: 8),
                        ],
                        Text(
                          text.toUpperCase(),
                          style: DossierTypography.buttonLabel(color: fg),
                        ),
                      ],
                    ),
            ),
          ),
        ),
      ),
    );
  }
}
