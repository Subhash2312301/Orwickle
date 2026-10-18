import 'package:flutter/animation.dart';

/// Motion tokens for "The Dealroom Dossier" (DESIGN.md v1.2)
class DossierMotion {
  static const Duration micro = Duration(milliseconds: 200);
  static const Duration standard = Duration(milliseconds: 240);
  static const Duration entrance = Duration(milliseconds: 280);

  static const Curve curve = Curves.easeOutCubic;
}
