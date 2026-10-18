# Orwickle Mobile Client — The Dealroom Dossier

Cross-platform mobile application for the **Orwickle FYP Dealroom Marketplace**, built with Flutter and strictly conforming to **"The Dealroom Dossier" Design Specification (DESIGN.md v1.2)** and architectural invariants documented in **DECISIONS.md (v2.0)**.

---

## 1. Architectural Highlights

### 1.1 Strict Design System Tokens (DESIGN.md v1.2)
- **Palette**:
  - Light Mode (*"Paper"*): `#F3EFE6` Canvas, `#FBF9F4` Surface, `#14110F` Ink, `#5B554C` Muted Ink, `#D9381E` Vermilion Signal, `#8E281B` Deep Brick Red Form Errors.
  - Dark Mode (*"Night Ledger"*): `#0F1512` Canvas, `#161E1A` Surface, `#ECE6D8` High-contrast Ink, `#FF6A3D` Vivid Signal, `#E05A47` Terracotta Error.
- **Strict 2px Geometry**: All interactive surfaces, inputs, cards, and buttons use `BorderRadius.circular(2.0)` (`radius2px`). No pill buttons or floating drop shadows.
- **Typography Triad**:
  - `Instrument Serif`: Editorial titles, display numbers, selective italic accents.
  - `Schibsted Grotesk`: High-legibility Swiss UI text, form labels, buttons.
  - `IBM Plex Mono`: Financial data, 6-cell perforated OTP inputs, timestamps, and `ERROR —` prefixes.
- **Accessibility**: Minimum 48dp touch targets on all interactive elements.

### 1.2 Authentication & Network Invariants
- **Transport Separation (ADR-002, ADR-014)**:
  - Access tokens injected via `Authorization: Bearer <token>`.
  - Refresh tokens transmitted in JSON request bodies (`{ "refresh_token": "..." }`).
  - No web cookies or `Origin` headers sent, avoiding CORS web administrative barriers.
- **10-Second Grace Window Automatic Retry (ADR-002)**:
  - If a 401 is received from a private endpoint, `AuthInterceptor` automatically calls `POST /api/v1/auth/refresh`.
  - Replays inside the 10-second grace window receive a fresh child token and seamlessly retry the original request without disrupting the user session.
- **Anti-Pre-Hijacking Verification (ADR-009)**:
  - `VerifyEmailScreen` requires both the 6-digit OTP code and account passphrase to prevent account pre-hijacking attacks.

---

## 2. Directory Structure

```text
mobile/
├── pubspec.yaml                 # Dependencies (Dio, secure_storage, provider, fonts)
├── analysis_options.yaml        # Flutter linter configuration
└── lib/
    ├── main.dart                # App bootstrap & provider injection
    ├── core/
    │   ├── network/
    │   │   ├── api_client.dart             # Dio HTTP client with platform loopback resolution
    │   │   ├── auth_interceptor.dart       # Bearer injection & 10s grace rotation retry
    │   │   └── secure_storage_service.dart # Keychain / EncryptedSharedPreferences storage
    │   ├── theme/
    │   │   ├── app_colors.dart             # ThemeExtension tokens (Paper & Night Ledger)
    │   │   ├── app_motion.dart             # 200/240/280ms duration & easeOutCubic curve
    │   │   ├── app_theme.dart              # ThemeData definitions & 2px radius invariants
    │   │   └── app_typography.dart         # Instrument Serif, Schibsted Grotesk, IBM Plex Mono
    │   └── widgets/
    │       ├── dossier_button.dart         # 48dp tactile button (primary, secondary, signal)
    │       ├── dossier_card.dart           # Hairline bordered card with section indexing
    │       ├── dossier_text_field.dart     # Form input with ERROR — prefix formatting
    │       ├── otp_input_row.dart          # 6-cell perforated code stub with 2px countdown bar
    │       ├── perforated_divider.dart     # CustomPainter dashed receipt perforation line
    │       └── status_badge.dart           # Monospace stamped badge (VERIFIED, PENDING, etc.)
    └── features/
        ├── auth/
        │   ├── models/
        │   │   └── user_model.dart         # Typed user model with role & status enums
        │   ├── providers/
        │   │   └── auth_provider.dart      # ChangeNotifier auth state machine
        │   ├── screens/
        │   │   ├── role_selection_screen.dart # Role designation onboarding (Student, Investor, Buyer)
        │   │   ├── signup_screen.dart         # Institutional registration form
        │   │   ├── verify_email_screen.dart   # OTP stub + passphrase pre-hijacking defense
        │   │   ├── login_screen.dart          # Credential authentication
        │   │   ├── login_otp_screen.dart      # 5-minute MFA challenge redemption
        │   │   ├── forgot_password_screen.dart# Recovery directive initiation
        │   │   └── reset_password_screen.dart # Single-use token reset & session revocation
        │   └── services/
        │       └── auth_api_service.dart   # REST API integration methods
        └── dashboard/
            └── screens/
                └── student_dashboard_screen.dart # Authenticated Dealroom Dossier ledger view
```

---

## 3. Running Locally

### Prerequisites
1. Flutter SDK (`>= 3.2.0`) installed on your system.
2. Backend Express service running on port 4000:
   ```bash
   cd backend && npm run dev
   ```

### Execution
```bash
cd mobile
flutter pub get
flutter run
```
- **Android Emulator**: Automatically routes to `http://10.0.2.2:4000/api/v1`.
- **iOS Simulator / macOS / Web / Windows**: Automatically routes to `http://localhost:4000/api/v1`.
