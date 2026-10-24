import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../providers/auth_provider.dart';
import '../dashboard/dashboard_screen.dart';

class OnboardingScreen extends StatelessWidget {
  const OnboardingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Safety & Permissions'),
        automaticallyImplyLeading: false,
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          child: Column(
            children: [
              Expanded(
                child: SingleChildScrollView(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Your Safety, Privacy & Consent',
                        style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'AEGIS is designed around explicit user consent. We never track your location silently or sell personal data.',
                        style: TextStyle(fontSize: 13, color: AppColors.textSecondaryLight),
                      ),
                      const SizedBox(height: 24),

                      _permissionItem(
                        Icons.location_on_outlined,
                        'GPS Location',
                        'Used to attach coordinates to your emergency SOS messages and calculate safe routes in Chennai. Never tracked in background without your active consent.',
                        isRequired: true,
                      ),
                      const SizedBox(height: 16),
                      _permissionItem(
                        Icons.notifications_outlined,
                        'Emergency Notifications',
                        'Delivers real-time status updates on whether your emergency contacts received your SOS alert.',
                        isRequired: true,
                      ),
                      const SizedBox(height: 16),
                      _permissionItem(
                        Icons.contacts_outlined,
                        'Device Contacts Access',
                        'Requested on-demand only if you choose to import family or guardians directly from your phone contact list.',
                        isRequired: false,
                      ),
                      const SizedBox(height: 20),

                      Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: AppColors.safeLightGreen,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppColors.safeGreen.withOpacity(0.3)),
                        ),
                        child: const Row(
                          children: [
                            Icon(Icons.lock_outline, color: AppColors.safeGreen, size: 20),
                            SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                'All emergency contacts and live location tokens are securely encrypted. You retain complete control to stop sharing at any time.',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: AppColors.safeGreen,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              ElevatedButton(
                onPressed: () async {
                  await Provider.of<AuthProvider>(context, listen: false).completeOnboarding();
                  if (context.mounted) {
                    Navigator.pushReplacement(
                      context,
                      MaterialPageRoute(builder: (_) => const DashboardScreen()),
                    );
                  }
                },
                child: const Text('I Understand & Continue'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _permissionItem(
    IconData icon,
    String title,
    String description, {
    required bool isRequired,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: AppColors.cardBorderLight),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CircleAvatar(
            backgroundColor: AppColors.primaryNavy.withOpacity(0.08),
            child: Icon(icon, color: AppColors.primaryNavy, size: 22),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: isRequired ? AppColors.emergencyLightRed : AppColors.cardBorderLight,
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        isRequired ? 'REQUIRED' : 'OPTIONAL',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: isRequired ? AppColors.emergencyRed : AppColors.textSecondaryLight,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  description,
                  style: const TextStyle(fontSize: 12, color: AppColors.textSecondaryLight),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
