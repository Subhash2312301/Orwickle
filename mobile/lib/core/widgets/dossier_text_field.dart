import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_typography.dart';
import '../theme/app_theme.dart';

class DossierTextField extends StatelessWidget {
  final TextEditingController? controller;
  final String label;
  final String? hint;
  final String? errorText;
  final bool obscureText;
  final TextInputType keyboardType;
  final Widget? suffixIcon;
  final Widget? prefixIcon;
  final ValueChanged<String>? onChanged;
  final FormFieldValidator<String>? validator;

  const DossierTextField({
    super.key,
    required this.label,
    this.controller,
    this.hint,
    this.errorText,
    this.obscureText = false,
    this.keyboardType = TextInputType.text,
    this.suffixIcon,
    this.prefixIcon,
    this.onChanged,
    this.validator,
  });

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DossierThemeColors>() ?? DossierThemeColors.light;

    // Strict non-colour cues invariant: prefix with ERROR —
    final formattedError = errorText != null && errorText!.isNotEmpty
        ? (errorText!.startsWith('ERROR —') ? errorText! : 'ERROR — $errorText')
        : null;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          label.toUpperCase(),
          style: DossierTypography.monoStamp(color: colors.inkMuted, fontSize: 11),
        ),
        const SizedBox(height: 6),
        TextFormField(
          controller: controller,
          obscureText: obscureText,
          keyboardType: keyboardType,
          onChanged: onChanged,
          validator: validator,
          style: DossierTypography.bodyMedium(color: colors.ink),
          decoration: InputDecoration(
            hintText: hint,
            errorText: formattedError,
            prefixIcon: prefixIcon,
            suffixIcon: suffixIcon,
            filled: true,
            fillColor: colors.surface,
            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
            border: OutlineInputBorder(
              borderRadius: DossierTheme.radius2px,
              borderSide: BorderSide(color: colors.rule, width: 1),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: DossierTheme.radius2px,
              borderSide: BorderSide(color: colors.rule, width: 1),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: DossierTheme.radius2px,
              borderSide: BorderSide(color: colors.ink, width: 1.5),
            ),
            errorBorder: OutlineInputBorder(
              borderRadius: DossierTheme.radius2px,
              borderSide: BorderSide(color: colors.error, width: 1.5),
            ),
            focusedErrorBorder: OutlineInputBorder(
              borderRadius: DossierTheme.radius2px,
              borderSide: BorderSide(color: colors.error, width: 2),
            ),
            errorStyle: DossierTypography.monoError(color: colors.error),
          ),
        ),
      ],
    );
  }
}
