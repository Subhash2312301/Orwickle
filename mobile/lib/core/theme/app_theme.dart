import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'app_colors.dart';
import 'app_typography.dart';

class DossierTheme {
  // Strict 2px radius invariant (DESIGN.md v1.2)
  static final BorderRadius radius2px = BorderRadius.circular(2.0);

  // ── Light Theme: "Paper" ──────────────────────────────────────────────────
  static ThemeData get lightTheme {
    const colors = DossierThemeColors.light;

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      scaffoldBackgroundColor: colors.bg,
      colorScheme: ColorScheme.light(
        surface: colors.surface,
        onSurface: colors.ink,
        primary: colors.ink,
        onPrimary: colors.bg,
        secondary: colors.signal,
        onSecondary: Colors.white,
        error: colors.error,
        onError: Colors.white,
      ),
      extensions: const [colors],
      appBarTheme: AppBarTheme(
        backgroundColor: colors.bg,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        iconTheme: IconThemeData(color: colors.ink),
        titleTextStyle: DossierTypography.displayMedium(color: colors.ink),
        systemOverlayStyle: SystemUiOverlayStyle.dark.copyWith(
          statusBarColor: Colors.transparent,
          systemNavigationBarColor: colors.bg,
        ),
      ),
      dividerTheme: DividerThemeData(
        color: colors.rule,
        thickness: 1,
        space: 1,
      ),
      cardTheme: CardTheme(
        color: colors.surface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: radius2px,
          side: BorderSide(color: colors.rule, width: 1),
        ),
        margin: EdgeInsets.zero,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: colors.surface,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: radius2px,
          borderSide: BorderSide(color: colors.rule, width: 1),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: radius2px,
          borderSide: BorderSide(color: colors.rule, width: 1),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: radius2px,
          borderSide: BorderSide(color: colors.ink, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: radius2px,
          borderSide: BorderSide(color: colors.error, width: 1.5),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: radius2px,
          borderSide: BorderSide(color: colors.error, width: 2),
        ),
        labelStyle: DossierTypography.bodyMedium(color: colors.inkMuted),
        hintStyle: DossierTypography.bodyMedium(color: colors.inkMuted),
        errorStyle: DossierTypography.monoError(color: colors.error),
      ),
    );
  }

  // ── Dark Theme: "Night Ledger" ────────────────────────────────────────────
  static ThemeData get darkTheme {
    const colors = DossierThemeColors.dark;

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: colors.bg,
      colorScheme: ColorScheme.dark(
        surface: colors.surface,
        onSurface: colors.ink,
        primary: colors.ink,
        onPrimary: colors.bg,
        secondary: colors.signal,
        onSecondary: Colors.white,
        error: colors.error,
        onError: Colors.white,
      ),
      extensions: const [colors],
      appBarTheme: AppBarTheme(
        backgroundColor: colors.bg,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        iconTheme: IconThemeData(color: colors.ink),
        titleTextStyle: DossierTypography.displayMedium(color: colors.ink),
        systemOverlayStyle: SystemUiOverlayStyle.light.copyWith(
          statusBarColor: Colors.transparent,
          systemNavigationBarColor: colors.bg,
        ),
      ),
      dividerTheme: DividerThemeData(
        color: colors.rule,
        thickness: 1,
        space: 1,
      ),
      cardTheme: CardTheme(
        color: colors.surface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: radius2px,
          side: BorderSide(color: colors.rule, width: 1),
        ),
        margin: EdgeInsets.zero,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: colors.surface,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: radius2px,
          borderSide: BorderSide(color: colors.rule, width: 1),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: radius2px,
          borderSide: BorderSide(color: colors.rule, width: 1),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: radius2px,
          borderSide: BorderSide(color: colors.ink, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: radius2px,
          borderSide: BorderSide(color: colors.error, width: 1.5),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: radius2px,
          borderSide: BorderSide(color: colors.error, width: 2),
        ),
        labelStyle: DossierTypography.bodyMedium(color: colors.inkMuted),
        hintStyle: DossierTypography.bodyMedium(color: colors.inkMuted),
        errorStyle: DossierTypography.monoError(color: colors.error),
      ),
    );
  }
}
