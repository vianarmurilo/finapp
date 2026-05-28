import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../models/envelope_item.dart';

class EnvelopeCard extends StatefulWidget {
  const EnvelopeCard({
    super.key,
    required this.envelope,
    this.onTap,
    this.onLongPress,
  });

  final EnvelopeItem envelope;
  final VoidCallback? onTap;
  final VoidCallback? onLongPress;

  @override
  State<EnvelopeCard> createState() => _EnvelopeCardState();
}

class _EnvelopeCardState extends State<EnvelopeCard>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 700),
    );
    if (widget.envelope.isOverBudget) {
      _controller.repeat(reverse: true);
    }
  }

  @override
  void didUpdateWidget(covariant EnvelopeCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.envelope.isOverBudget && !_controller.isAnimating) {
      _controller.repeat(reverse: true);
    } else if (!widget.envelope.isOverBudget && _controller.isAnimating) {
      _controller.stop();
      _controller.reset();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Color _progressColor(double progress) {
    if (progress < 0.6) {
      return const Color(0xFF2A9D8F);
    }
    if (progress < 0.85) {
      return const Color(0xFFF4A261);
    }
    return const Color(0xFFE76F51);
  }

  @override
  Widget build(BuildContext context) {
    final envelope = widget.envelope;
    final budget = envelope.budgetAmount <= 0 ? 1 : envelope.budgetAmount;
    final progress = (envelope.currentSpent / budget).clamp(
      0.0,
      envelope.isOverBudget ? 1.15 : 1.0,
    );
    final isOverBudget = envelope.isOverBudget;
    final percentText = '${(progress * 100).clamp(0, 999).toStringAsFixed(0)}%';
    final currency = NumberFormat.currency(locale: 'pt_BR', symbol: 'R\$');
    final baseColor = envelope.baseColor;

    return AnimatedBuilder(
      animation: _controller,
      builder: (context, _) {
        final shake = isOverBudget
            ? math.sin(_controller.value * math.pi * 2) * 6
            : 0.0;
        final glow = isOverBudget ? 0.08 + (_controller.value * 0.16) : 0.0;

        return Transform.translate(
          offset: Offset(shake, 0),
          child: GestureDetector(
            onTap: widget.onTap,
            onLongPress: widget.onLongPress,
            child: Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(24),
                gradient: LinearGradient(
                  colors: [
                    baseColor.withValues(alpha: 0.96),
                    Color.lerp(baseColor, Colors.black, 0.18) ?? baseColor,
                  ],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                boxShadow: [
                  BoxShadow(
                    color: isOverBudget
                        ? Colors.red.withValues(alpha: glow)
                        : baseColor.withValues(alpha: 0.16),
                    blurRadius: isOverBudget ? 24 : 16,
                    spreadRadius: isOverBudget ? 1 : 0,
                    offset: const Offset(0, 10),
                  ),
                ],
              ),
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        width: 42,
                        height: 42,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: Colors.white.withValues(alpha: 0.16),
                        ),
                        child: Icon(
                          envelope.iconData,
                          color: Colors.white,
                          size: 22,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              envelope.name,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 15,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              envelope.categoryName ?? 'Categoria manual',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                color: Colors.white70,
                                fontSize: 11,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Text(
                    '${currency.format(envelope.currentSpent)} / ${currency.format(envelope.budgetAmount)}',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 17,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 10),
                  TweenAnimationBuilder<double>(
                    tween: Tween<double>(
                      begin: 0,
                      end: progress.clamp(0.0, 1.0),
                    ),
                    duration: const Duration(milliseconds: 700),
                    curve: Curves.easeOutCubic,
                    builder: (context, animatedProgress, _) {
                      return ClipRRect(
                        borderRadius: BorderRadius.circular(999),
                        child: LinearProgressIndicator(
                          value: animatedProgress,
                          minHeight: 10,
                          backgroundColor: Colors.white.withValues(alpha: 0.18),
                          valueColor: AlwaysStoppedAnimation<Color>(
                            _progressColor(progress),
                          ),
                        ),
                      );
                    },
                  ),
                  const SizedBox(height: 10),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        percentText,
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      Text(
                        isOverBudget
                            ? 'Ultrapassou'
                            : 'Restam ${currency.format(envelope.remainingAmount)}',
                        style: const TextStyle(
                          color: Colors.white70,
                          fontSize: 11,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}
