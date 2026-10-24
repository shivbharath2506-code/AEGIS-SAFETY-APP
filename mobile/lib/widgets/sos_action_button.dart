import 'package:flutter/material.dart';
import '../core/constants/app_colors.dart';

class SosActionButton extends StatefulWidget {
  final VoidCallback onActivated;
  final VoidCallback? onHoldStart;
  final VoidCallback? onHoldCancel;

  const SosActionButton({
    super.key,
    required this.onActivated,
    this.onHoldStart,
    this.onHoldCancel,
  });

  @override
  State<SosActionButton> createState() => _SosActionButtonState();
}

class _SosActionButtonState extends State<SosActionButton>
    with SingleTickerProviderStateMixin {
  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;
  bool _isHolding = false;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat(reverse: true);

    _pulseAnimation = Tween<double>(begin: 1.0, end: 1.08).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        AnimatedBuilder(
          animation: _pulseAnimation,
          builder: (context, child) {
            return Transform.scale(
              scale: _pulseAnimation.value,
              child: GestureDetector(
                onLongPressStart: (_) {
                  setState(() => _isHolding = true);
                  widget.onHoldStart?.call();
                },
                onLongPressEnd: (_) {
                  setState(() => _isHolding = false);
                  widget.onHoldCancel?.call();
                },
                onLongPress: () {
                  setState(() => _isHolding = false);
                  widget.onActivated();
                },
                onTap: () {
                  // Accessible tap alternative: confirms activation via dialog
                  _showAccessibleActivationDialog(context);
                },
                child: Container(
                  width: 160,
                  height: 160,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: const LinearGradient(
                      colors: [
                        AppColors.emergencyRed,
                        AppColors.emergencyDarkRed,
                      ],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.emergencyRed.withOpacity(0.4),
                        blurRadius: 24,
                        spreadRadius: 4,
                        offset: const Offset(0, 8),
                      ),
                    ],
                    border: Border.all(
                      color: Colors.white.withOpacity(0.3),
                      width: 4,
                    ),
                  ),
                  child: Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(
                          Icons.emergency,
                          color: Colors.white,
                          size: 42,
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          'SOS',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 32,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 2,
                          ),
                        ),
                        Text(
                          _isHolding ? 'HOLDING...' : 'HOLD 3 SEC',
                          style: TextStyle(
                            color: Colors.white.withOpacity(0.9),
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                            letterSpacing: 1,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            );
          },
        ),
        const SizedBox(height: 14),
        TextButton.icon(
          onPressed: () => _showAccessibleActivationDialog(context),
          icon: const Icon(Icons.touch_app, size: 16),
          label: const Text(
            'Accessible Tap to Activate',
            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
          ),
        ),
      ],
    );
  }

  void _showAccessibleActivationDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.warning_amber_rounded, color: AppColors.emergencyRed),
            SizedBox(width: 8),
            Text('Trigger Emergency SOS?'),
          ],
        ),
        content: const Text(
          'This will immediately alert your saved emergency contacts via SMS and push notification with your latest coordinates.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.emergencyRed,
              foregroundColor: Colors.white,
            ),
            onPressed: () {
              Navigator.pop(ctx);
              widget.onActivated();
            },
            child: const Text('CONFIRM SOS ALERT'),
          ),
        ],
      ),
    );
  }
}
