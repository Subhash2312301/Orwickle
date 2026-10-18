import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../theme/app_colors.dart';
import '../theme/app_typography.dart';
import '../theme/app_theme.dart';

class OtpInputRow extends StatefulWidget {
  final int length;
  final ValueChanged<String> onCompleted;
  final ValueChanged<String>? onChanged;
  final int totalSeconds;
  final VoidCallback? onResendRequested;

  const OtpInputRow({
    super.key,
    this.length = 6,
    required this.onCompleted,
    this.onChanged,
    this.totalSeconds = 600, // 10 minutes default
    this.onResendRequested,
  });

  @override
  State<OtpInputRow> createState() => _OtpInputRowState();
}

class _OtpInputRowState extends State<OtpInputRow> {
  late final List<TextEditingController> _controllers;
  late final List<FocusNode> _focusNodes;
  late int _remainingSeconds;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _controllers = List.generate(widget.length, (_) => TextEditingController());
    _focusNodes = List.generate(widget.length, (_) => FocusNode());
    _remainingSeconds = widget.totalSeconds;
    _startCountdown();
  }

  void _startCountdown() {
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_remainingSeconds > 0) {
        setState(() {
          _remainingSeconds--;
        });
      } else {
        timer.cancel();
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    for (final c in _controllers) {
      c.dispose();
    }
    for (final f in _focusNodes) {
      f.dispose();
    }
    super.dispose();
  }

  void _onCellChanged(int index, String value) {
    if (value.isNotEmpty) {
      // If user pasted multi-digit text
      if (value.length > 1) {
        final digits = value.replaceAll(RegExp(r'\D'), '');
        for (int i = 0; i < widget.length && i < digits.length; i++) {
          _controllers[i].text = digits[i];
        }
        _checkAndNotify();
        return;
      }

      if (index < widget.length - 1) {
        _focusNodes[index + 1].requestFocus();
      }
    }
    _checkAndNotify();
  }

  void _checkAndNotify() {
    final code = _controllers.map((c) => c.text).join();
    widget.onChanged?.call(code);
    if (code.length == widget.length) {
      widget.onCompleted(code);
    }
  }

  String _formatTimer(int seconds) {
    final minutes = seconds ~/ 60;
    final remaining = seconds % 60;
    return '${minutes.toString().padLeft(2, '0')}:${remaining.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DossierThemeColors>() ?? DossierThemeColors.light;
    final double progress = widget.totalSeconds > 0 ? _remainingSeconds / widget.totalSeconds : 0.0;

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // 6-Cell OTP Input
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: List.generate(widget.length, (index) {
            return SizedBox(
              width: 48,
              height: 56,
              child: KeyboardListener(
                focusNode: FocusNode(),
                onKeyEvent: (event) {
                  if (event is KeyDownEvent &&
                      event.logicalKey == LogicalKeyboardKey.backspace &&
                      _controllers[index].text.isEmpty &&
                      index > 0) {
                    _focusNodes[index - 1].requestFocus();
                  }
                },
                child: TextField(
                  controller: _controllers[index],
                  focusNode: _focusNodes[index],
                  keyboardType: TextInputType.number,
                  textAlign: TextAlign.center,
                  maxLength: 1,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                  style: DossierTypography.monoOtpCell(color: colors.ink),
                  decoration: InputDecoration(
                    counterText: '',
                    filled: true,
                    fillColor: colors.surface,
                    contentPadding: EdgeInsets.zero,
                    border: OutlineInputBorder(
                      borderRadius: DossierTheme.radius2px,
                      borderSide: BorderSide(color: colors.rule, width: 1),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: DossierTheme.radius2px,
                      borderSide: BorderSide(color: colors.signal, width: 1.5),
                    ),
                  ),
                  onChanged: (val) => _onCellChanged(index, val),
                ),
              ),
            );
          }),
        ),
        const SizedBox(height: 12),

        // 2px Countdown Bar (ADR-004)
        ClipRRect(
          borderRadius: DossierTheme.radius2px,
          child: LinearProgressIndicator(
            value: progress,
            minHeight: 2,
            backgroundColor: colors.rule,
            valueColor: AlwaysStoppedAnimation<Color>(colors.signal),
          ),
        ),
        const SizedBox(height: 8),

        // Timer and Resend Controls
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'EXPIRATION IN ${_formatTimer(_remainingSeconds)}',
              style: DossierTypography.monoStamp(
                color: _remainingSeconds < 60 ? colors.signal : colors.inkMuted,
                fontSize: 10,
              ),
            ),
            if (widget.onResendRequested != null)
              GestureDetector(
                onTap: _remainingSeconds == 0 ? widget.onResendRequested : null,
                child: Text(
                  'RESEND AUTHORIZATION',
                  style: DossierTypography.monoStamp(
                    color: _remainingSeconds == 0 ? colors.signal : colors.inkMuted.withOpacity(0.5),
                    fontSize: 10,
                  ),
                ),
              ),
          ],
        ),
      ],
    );
  }
}
