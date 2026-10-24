import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../providers/fake_call_provider.dart';
import 'fake_active_call_screen.dart';

class FakeIncomingCallScreen extends StatelessWidget {
  const FakeIncomingCallScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<FakeCallProvider>(context);

    // If countdown is still running
    if (provider.state == FakeCallState.countdown) {
      return Scaffold(
        backgroundColor: Colors.black,
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.timer_outlined, color: Colors.white70, size: 48),
              const SizedBox(height: 16),
              Text(
                'Incoming call in ${provider.countdownRemaining}s...',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Hold phone naturally or lock screen.',
                style: TextStyle(color: Colors.white54, fontSize: 13),
              ),
              const SizedBox(height: 28),
              OutlinedButton(
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.white,
                  side: const BorderSide(color: Colors.white38),
                ),
                onPressed: () {
                  provider.cancelSimulation();
                  Navigator.pop(context);
                },
                child: const Text('Cancel Simulation'),
              ),
            ],
          ),
        ),
      );
    }

    // Realistic Ringing Incoming Call Screen
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 36),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              // Caller Info
              Column(
                children: [
                  const SizedBox(height: 20),
                  CircleAvatar(
                    radius: 48,
                    backgroundColor: Colors.white.withOpacity(0.12),
                    child: Text(
                      provider.callerName.isNotEmpty ? provider.callerName[0] : 'C',
                      style: const TextStyle(
                        fontSize: 42,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                  Text(
                    provider.callerName,
                    style: const TextStyle(
                      fontSize: 26,
                      fontWeight: FontWeight.w800,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    provider.callerNumber,
                    style: const TextStyle(
                      fontSize: 16,
                      color: Colors.white70,
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Incoming Call...',
                    style: TextStyle(
                      fontSize: 14,
                      color: AppColors.safeGreen,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),

              // Answer / Decline Call Buttons
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  // Decline
                  Column(
                    children: [
                      GestureDetector(
                        onTap: () {
                          provider.declineOrEndCall();
                          Navigator.pop(context);
                        },
                        child: Container(
                          width: 72,
                          height: 72,
                          decoration: const BoxDecoration(
                            color: AppColors.emergencyRed,
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            Icons.call_end,
                            color: Colors.white,
                            size: 32,
                          ),
                        ),
                      ),
                      const SizedBox(height: 10),
                      const Text(
                        'Decline',
                        style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),

                  // Accept
                  Column(
                    children: [
                      GestureDetector(
                        onTap: () {
                          provider.answerCall();
                          Navigator.pushReplacement(
                            context,
                            MaterialPageRoute(
                              builder: (_) => const FakeActiveCallScreen(),
                            ),
                          );
                        },
                        child: Container(
                          width: 72,
                          height: 72,
                          decoration: const BoxDecoration(
                            color: AppColors.safeGreen,
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            Icons.call,
                            color: Colors.white,
                            size: 32,
                          ),
                        ),
                      ),
                      const SizedBox(height: 10),
                      const Text(
                        'Answer',
                        style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
