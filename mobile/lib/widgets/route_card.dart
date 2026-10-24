import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../models/route_comparison_model.dart';
import '../core/constants/app_colors.dart';

class RouteCard extends StatelessWidget {
  final RouteAlternativeModel route;
  final bool isSelected;
  final VoidCallback onSelected;

  const RouteCard({
    super.key,
    required this.route,
    required this.isSelected,
    required this.onSelected,
  });

  @override
  Widget build(BuildContext context) {
    final assessment = route.safetyAssessment;
    final hasScore = assessment.safetyScore != null;

    Color badgeColor;
    if (!hasScore) {
      badgeColor = Colors.grey;
    } else if (assessment.safetyScore! >= 8.0) {
      badgeColor = AppColors.safeGreen;
    } else if (assessment.safetyScore! >= 6.0) {
      badgeColor = AppColors.warningAmber;
    } else {
      badgeColor = AppColors.emergencyRed;
    }

    return Card(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(
          color: isSelected ? AppColors.primaryNavy : AppColors.cardBorderLight,
          width: isSelected ? 2 : 1,
        ),
      ),
      child: InkWell(
        onTap: onSelected,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      route.name,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: badgeColor.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: badgeColor.withOpacity(0.4)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          hasScore ? Icons.verified_user : Icons.help_outline,
                          size: 13,
                          color: badgeColor,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          hasScore
                              ? '${assessment.safetyScore!.toStringAsFixed(1)} / 10'
                              : 'NO DATA',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: badgeColor,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                route.summary,
                style: const TextStyle(
                  fontSize: 13,
                  color: AppColors.textSecondaryLight,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 10),
              // Factor badges
              Wrap(
                spacing: 8,
                runSpacing: 4,
                children: [
                  _factorPill(
                    Icons.security,
                    '${assessment.verifiedFacilitiesNearbyCount} Facilities',
                  ),
                  _factorPill(
                    Icons.lightbulb_outline,
                    '${(assessment.lightingAvailabilityRatio * 100).toInt()}% Streetlit',
                  ),
                  if (assessment.hasIsolatedWarnings)
                    _factorPill(
                      Icons.warning_amber,
                      'Canal Segment Caution',
                      isWarning: true,
                    ),
                ],
              ),
              const SizedBox(height: 10),
              Text(
                assessment.transparencyNote,
                style: const TextStyle(
                  fontSize: 11,
                  fontStyle: FontStyle.italic,
                  color: AppColors.textSecondaryLight,
                ),
              ),
              const SizedBox(height: 10),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton.icon(
                    onPressed: () => _launchNavigation(route.navigationHandoffUrl),
                    icon: const Icon(Icons.navigation, size: 16),
                    label: const Text('Navigate in Maps'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _factorPill(IconData icon, String text, {bool isWarning = false}) {
    final color = isWarning ? AppColors.emergencyRed : AppColors.textSecondaryLight;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
      decoration: BoxDecoration(
        color: color.withOpacity(0.08),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: color),
          const SizedBox(width: 4),
          Text(
            text,
            style: TextStyle(fontSize: 11, color: color, fontWeight: FontWeight.w500),
          ),
        ],
      ),
    );
  }

  void _launchNavigation(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }
}
