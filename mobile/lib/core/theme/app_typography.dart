import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Typography specification for "The Dealroom Dossier" (DESIGN.md v1.2)
class DossierTypography {
  // ── Instrument Serif (Headlines & Editorial Accents) ─────────────────────────
  static TextStyle displayLarge({required Color color}) => GoogleFonts.instrumentSerif(
        fontSize: 36,
        fontWeight: FontWeight.w400,
        height: 1.15,
        color: color,
      );

  static TextStyle displayMedium({required Color color}) => GoogleFonts.instrumentSerif(
        fontSize: 28,
        fontWeight: FontWeight.w400,
        height: 1.2,
        color: color,
      );

  static TextStyle displaySmall({required Color color}) => GoogleFonts.instrumentSerif(
        fontSize: 22,
        fontWeight: FontWeight.w400,
        height: 1.25,
        color: color,
      );

  static TextStyle editorialItalic({required Color color, double fontSize = 18}) =>
      GoogleFonts.instrumentSerif(
        fontSize: fontSize,
        fontStyle: FontStyle.italic,
        fontWeight: FontWeight.w400,
        color: color,
      );

  // ── Schibsted Grotesk (Body, Labels, Buttons, Interface Chrome) ────────────
  static TextStyle bodyLarge({required Color color}) => GoogleFonts.schibstedGrotesk(
        fontSize: 16,
        fontWeight: FontWeight.w400,
        height: 1.5,
        color: color,
      );

  static TextStyle bodyMedium({required Color color}) => GoogleFonts.schibstedGrotesk(
        fontSize: 14,
        fontWeight: FontWeight.w400,
        height: 1.45,
        color: color,
      );

  static TextStyle bodySmall({required Color color}) => GoogleFonts.schibstedGrotesk(
        fontSize: 12,
        fontWeight: FontWeight.w400,
        height: 1.4,
        color: color,
      );

  static TextStyle buttonLabel({required Color color}) => GoogleFonts.schibstedGrotesk(
        fontSize: 13,
        fontWeight: FontWeight.w600,
        letterSpacing: 1.2,
        color: color,
      );

  static TextStyle labelMedium({required Color color}) => GoogleFonts.schibstedGrotesk(
        fontSize: 13,
        fontWeight: FontWeight.w500,
        color: color,
      );

  // ── IBM Plex Mono (Financial Data, OTP Cells, Stamps, Error Prefixes) ───────
  static TextStyle monoLedger({required Color color, double fontSize = 14}) =>
      GoogleFonts.ibmPlexMono(
        fontSize: fontSize,
        fontWeight: FontWeight.w500,
        color: color,
      );

  static TextStyle monoOtpCell({required Color color}) => GoogleFonts.ibmPlexMono(
        fontSize: 24,
        fontWeight: FontWeight.w600,
        letterSpacing: 2.0,
        color: color,
      );

  static TextStyle monoStamp({required Color color, double fontSize = 11}) =>
      GoogleFonts.ibmPlexMono(
        fontSize: fontSize,
        fontWeight: FontWeight.w700,
        letterSpacing: 1.5,
        color: color,
      );

  static TextStyle monoError({required Color color}) => GoogleFonts.ibmPlexMono(
        fontSize: 12,
        fontWeight: FontWeight.w600,
        letterSpacing: 0.5,
        color: color,
      );
}
