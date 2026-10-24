import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../providers/location_provider.dart';

class LiveLocationScreen extends StatefulWidget {
  const LiveLocationScreen({super.key});

  @override
  State<LiveLocationScreen> createState() => _LiveLocationScreenState();
}

class _LiveLocationScreenState extends State<LiveLocationScreen> {
  int _selectedDurationMinutes = 60;

  @override
  Widget build(BuildContext context) {
    final locationProvider = Provider.of<LocationProvider>(context);
    final session = locationProvider.activeSession;
    final isSharing = locationProvider.hasActiveSession;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Live Location Sharing'),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header Card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: isSharing ? AppColors.safeLightGreen : Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: isSharing ? AppColors.safeGreen : AppColors.cardBorderLight,
                  ),
                ),
                child: Column(
                  children: [
                    CircleAvatar(
                      radius: 28,
                      backgroundColor:
                          isSharing ? AppColors.safeGreen : AppColors.primaryNavy.withOpacity(0.08),
                      child: Icon(
                        isSharing ? Icons.share_location : Icons.location_on_outlined,
                        color: isSharing ? Colors.white : AppColors.primaryNavy,
                        size: 30,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      isSharing ? 'LIVE SHARING ACTIVE' : 'Private Location Sharing',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: isSharing ? AppColors.safeGreen : AppColors.textPrimaryLight,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      isSharing
                          ? 'Sharing coordinates with protected unguessable token link.'
                          : 'Generate an encrypted, time-limited link accessible only with a secure access token.',
                      textAlign: TextAlign.center,
                      style: const TextStyle(fontSize: 12, color: AppColors.textSecondaryLight),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              if (isSharing && session != null) ...[
                const Text(
                  'Your Private Sharing Link',
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.backgroundLight,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.cardBorderLight),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(
                          session.shareUrl,
                          style: const TextStyle(fontSize: 12, fontFamily: 'monospace'),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.copy, size: 20),
                        tooltip: 'Copy Link',
                        onPressed: () {
                          Clipboard.setData(ClipboardData(text: session.shareUrl));
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Private live link copied to clipboard.')),
                          );
                        },
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  'Session valid until: ${session.expiresAt.substring(11, 16)} IST',
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textSecondaryLight,
                  ),
                ),
                const SizedBox(height: 28),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.emergencyRed,
                    foregroundColor: Colors.white,
                  ),
                  onPressed: locationProvider.isSessionLoading
                      ? null
                      : () => locationProvider.stopLiveSharing(),
                  child: locationProvider.isSessionLoading
                      ? const CircularProgressIndicator(color: Colors.white)
                      : const Text('Stop Sharing Location'),
                ),
              ] else ...[
                const Text(
                  'Select Sharing Duration',
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    _durationChip(15, '15 Minutes'),
                    const SizedBox(width: 8),
                    _durationChip(60, '1 Hour'),
                    const SizedBox(width: 8),
                    _durationChip(240, '4 Hours'),
                  ],
                ),
                const SizedBox(height: 28),
                ElevatedButton(
                  onPressed: locationProvider.isSessionLoading
                      ? null
                      : () {
                          locationProvider.startLiveSharing(
                            durationMinutes: _selectedDurationMinutes,
                          );
                        },
                  child: locationProvider.isSessionLoading
                      ? const CircularProgressIndicator(color: Colors.white)
                      : const Text('Start Live Location Session'),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _durationChip(int minutes, String label) {
    final isSelected = _selectedDurationMinutes == minutes;
    return Expanded(
      child: ChoiceChip(
        label: Text(label),
        selected: isSelected,
        onSelected: (val) {
          if (val) setState(() => _selectedDurationMinutes = minutes);
        },
      ),
    );
  }
}
