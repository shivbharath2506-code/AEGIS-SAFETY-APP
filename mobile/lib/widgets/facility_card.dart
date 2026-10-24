import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../models/nearby_service_model.dart';
import '../core/constants/app_colors.dart';

class FacilityCard extends StatelessWidget {
  final NearbyServiceModel facility;

  const FacilityCard({super.key, required this.facility});

  @override
  Widget build(BuildContext context) {
    IconData icon;
    Color iconColor;

    switch (facility.category) {
      case 'POLICE':
        icon = Icons.local_police;
        iconColor = AppColors.primaryBlue;
        break;
      case 'HOSPITAL':
        icon = Icons.local_hospital;
        iconColor = AppColors.emergencyRed;
        break;
      case 'PHARMACY':
      default:
        icon = Icons.medication;
        iconColor = AppColors.safeGreen;
        break;
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  backgroundColor: iconColor.withOpacity(0.12),
                  child: Icon(icon, color: iconColor, size: 22),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        facility.name,
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: iconColor.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              facility.category,
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                color: iconColor,
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            facility.distanceFormatted,
                            style: const TextStyle(
                              fontSize: 12,
                              color: AppColors.textSecondaryLight,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
            if (facility.address != null) ...[
              const SizedBox(height: 10),
              Text(
                facility.address!,
                style: const TextStyle(
                  fontSize: 12,
                  color: AppColors.textSecondaryLight,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],
            const SizedBox(height: 12),
            Row(
              children: [
                if (facility.phoneNumber != null)
                  Expanded(
                    child: OutlinedButton.icon(
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.primaryNavy,
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        minimumSize: const Size(0, 40),
                      ),
                      onPressed: () => _callPhoneNumber(facility.phoneNumber!),
                      icon: const Icon(Icons.phone, size: 16),
                      label: Text('Call ${facility.phoneNumber}'),
                    ),
                  ),
                const SizedBox(width: 8),
                Expanded(
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primaryNavy,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      minimumSize: const Size(0, 40),
                    ),
                    onPressed: () => _openMapsDirections(facility.latitude, facility.longitude),
                    icon: const Icon(Icons.directions, size: 16),
                    label: const Text('Directions'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _callPhoneNumber(String phone) async {
    final uri = Uri.parse('tel:$phone');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }

  void _openMapsDirections(double lat, double lng) async {
    final uri = Uri.parse('https://www.google.com/maps/dir/?api=1&destination=$lat,$lng');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }
}
