import 'package:flutter/material.dart';

/// Semantic Design Tokens for "The Dealroom Dossier" (DESIGN.md v1.2)
class DossierColors {
  // ── Light Mode: "Paper" ────────────────────────────────────────────────────
  static const Color paperBg = Color(0xFFF3EFE6);
  static const Color paperSurface = Color(0xFFFBF9F4);
  static const Color paperInk = Color(0xFF14110F);
  static const Color paperInkMuted = Color(0xFF5B554C);
  static const Color paperRule = Color(0xFFD9D2C3);
  static const Color paperSignal = Color(0xFFD9381E); // Vermilion
  static const Color paperError = Color(0xFF8E281B);  // Deep brick red
  static const Color paperSuccess = Color(0xFF1F6F5C);
  static const Color paperCaution = Color(0xFFB7791F);

  // ── Dark Mode: "Night Ledger" ──────────────────────────────────────────────
  static const Color ledgerBg = Color(0xFF0F1512);
  static const Color ledgerSurface = Color(0xFF161E1A);
  static const Color ledgerInk = Color(0xFFECE6D8);
  static const Color ledgerInkMuted = Color(0xFFA39C8D);
  static const Color ledgerRule = Color(0xFF2A3530);
  static const Color ledgerSignal = Color(0xFFFF6A3D);
  static const Color ledgerError = Color(0xFFE05A47);
  static const Color ledgerSuccess = Color(0xFF2EA083);
  static const Color ledgerCaution = Color(0xFFD4902A);
}

/// ThemeExtension allowing clean, reactive access to Dossier tokens via `Theme.of(context).extension<DossierThemeColors>()`
class DossierThemeColors extends ThemeExtension<DossierThemeColors> {
  final Color bg;
  final Color surface;
  final Color ink;
  final Color inkMuted;
  final Color rule;
  final Color signal;
  final Color error;
  final Color success;
  final Color caution;

  const DossierThemeColors({
    required this.bg,
    required this.surface,
    required this.ink,
    required this.inkMuted,
    required this.rule,
    required this.signal,
    required this.error,
    required this.success,
    required this.caution,
  });

  static const DossierThemeColors light = DossierThemeColors(
    bg: DossierColors.paperBg,
    surface: DossierColors.paperSurface,
    ink: DossierColors.paperInk,
    inkMuted: DossierColors.paperInkMuted,
    rule: DossierColors.paperRule,
    signal: DossierColors.paperSignal,
    error: DossierColors.paperError,
    success: DossierColors.paperSuccess,
    caution: DossierColors.paperCaution,
  );

  static const DossierThemeColors dark = DossierThemeColors(
    bg: DossierColors.ledgerBg,
    surface: DossierColors.ledgerSurface,
    ink: DossierColors.ledgerInk,
    inkMuted: DossierColors.ledgerInkMuted,
    rule: DossierColors.ledgerRule,
    signal: DossierColors.ledgerSignal,
    error: DossierColors.ledgerError,
    success: DossierColors.ledgerSuccess,
    caution: DossierColors.ledgerCaution,
  );

  @override
  DossierThemeColors copyWith({
    Color? bg,
    Color? surface,
    Color? ink,
    Color? inkMuted,
    Color? rule,
    Color? signal,
    Color? error,
    Color? success,
    Color? caution,
  }) {
    return DossierThemeColors(
      bg: bg ?? this.bg,
      surface: surface ?? this.surface,
      ink: ink ?? this.ink,
      inkMuted: inkMuted ?? this.inkMuted,
      rule: rule ?? this.rule,
      signal: signal ?? this.signal,
      error: error ?? this.error,
      success: success ?? this.success,
      caution: caution ?? this.caution,
    );
  }

  @override
  DossierThemeColors lerp(ThemeExtension<DossierThemeColors>? other, double t) {
    if (other is! DossierThemeColors) return this;
    return DossierThemeColors(
      bg: Color.lerp(bg, other.bg, t)!,
      surface: Color.lerp(surface, other.surface, t)!,
      ink: Color.lerp(ink, other.ink, t)!,
      inkMuted: Color.lerp(inkMuted, other.inkMuted, t)!,
      rule: Color.lerp(rule, other.rule, t)!,
      signal: Color.lerp(signal, other.signal, t)!,
      error: Color.lerp(error, other.error, t)!,
      success: Color.lerp(success, other.success, t)!,
      caution: Color.lerp(caution, other.caution, t)!,
    );
  }
}
