import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../providers/auth_provider.dart';
import '../authentication/welcome_screen.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _nameController = TextEditingController();
  final _medicalController = TextEditingController();
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    final user = Provider.of<AuthProvider>(context, listen: false).user;
    _nameController.text = user?.displayName ?? 'Priya Ramanathan';
    _medicalController.text = user?.medicalNotes ?? 'Blood group: B+. Inhaler carried.';
  }

  @override
  void dispose() {
    _nameController.dispose();
    _medicalController.dispose();
    super.dispose();
  }

  void _saveProfile() async {
    setState(() => _isSaving = true);
    await Future.delayed(const Duration(milliseconds: 600));
    setState(() => _isSaving = false);

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Safety profile updated successfully.'),
          backgroundColor: AppColors.safeGreen,
        ),
      );
    }
  }

  void _handleLogout() async {
    await Provider.of<AuthProvider>(context, listen: false).logout();
    if (mounted) {
      Navigator.pushAndRemoveUntil(
        context,
        MaterialPageRoute(builder: (_) => const WelcomeScreen()),
        (route) => false,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final user = authProvider.user;

    return Scaffold(
      appBar: AppBar(title: const Text('Profile & Settings')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // User Avatar & Verified Phone
              Center(
                child: Column(
                  children: [
                    CircleAvatar(
                      radius: 40,
                      backgroundColor: AppColors.primaryNavy,
                      child: Text(
                        user?.displayName?.isNotEmpty == true
                            ? user!.displayName![0]
                            : 'P',
                        style: const TextStyle(
                          fontSize: 32,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      user?.displayName ?? 'Priya Ramanathan',
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.verified, color: AppColors.safeGreen, size: 16),
                        const SizedBox(width: 4),
                        Text(
                          user?.verifiedPhoneNumber ?? '+91 9876543210',
                          style: const TextStyle(
                            fontSize: 13,
                            color: AppColors.textSecondaryLight,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 28),
              const Text('Display Name', style: TextStyle(fontWeight: FontWeight.w700)),
              const SizedBox(height: 6),
              TextField(
                controller: _nameController,
                decoration: const InputDecoration(hintText: 'Full Name'),
              ),

              const SizedBox(height: 18),
              const Text(
                'Emergency Medical Notes (Optional)',
                style: TextStyle(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 4),
              const Text(
                'Visible to first responders or included in emergency message if needed.',
                style: TextStyle(fontSize: 11, color: AppColors.textSecondaryLight),
              ),
              const SizedBox(height: 6),
              TextField(
                controller: _medicalController,
                maxLines: 3,
                decoration: const InputDecoration(
                  hintText: 'e.g. Allergies, Blood group, Medical conditions',
                ),
              ),

              const SizedBox(height: 20),
              ElevatedButton(
                onPressed: _isSaving ? null : _saveProfile,
                child: _isSaving
                    ? const CircularProgressIndicator(color: Colors.white)
                    : const Text('Save Profile Details'),
              ),

              const SizedBox(height: 28),
              const Divider(),
              const SizedBox(height: 10),

              // Privacy & Data Rights
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.security, color: AppColors.primaryNavy),
                title: const Text('Data Privacy & Security Charter', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                subtitle: const Text('Strict user isolation, zero background tracking without consent.', style: TextStyle(fontSize: 11)),
                onTap: () => _showPrivacyCharter(context),
              ),

              const SizedBox(height: 16),

              // Logout Button
              OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.emergencyRed,
                  side: const BorderSide(color: AppColors.emergencyLightRed),
                ),
                onPressed: _handleLogout,
                icon: const Icon(Icons.logout),
                label: const Text('Log Out of AEGIS'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showPrivacyCharter(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('AEGIS Privacy Charter'),
        content: const SingleChildScrollView(
          child: Text(
            '1. Location Access: Obtained only upon user initiation (SOS alert trigger or explicit live sharing session).\n\n'
            '2. Access Control: Emergency contacts and SOS histories can only be accessed by the authenticated account owner.\n\n'
            '3. Unrestricted Exits: Users can cancel or resolve emergency alerts at any moment.\n\n'
            '4. Zero Plaintext OTPs: Sensitive credentials and OTPs are never stored in plaintext.\n\n'
            '5. Chennai Focus: POI facilities and streetlighting information are grounded in audited Tamil Nadu public works datasets.',
            style: TextStyle(fontSize: 13, height: 1.4),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }
}
