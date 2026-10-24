import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../providers/sos_provider.dart';

class AlertHistoryScreen extends StatefulWidget {
  const AlertHistoryScreen({super.key});

  @override
  State<AlertHistoryScreen> createState() => _AlertHistoryScreenState();
}

class _AlertHistoryScreenState extends State<AlertHistoryScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<SosProvider>(context, listen: false).fetchAlertHistory();
    });
  }

  @override
  Widget build(BuildContext context) {
    final sosProvider = Provider.of<SosProvider>(context);

    return Scaffold(
      appBar: AppBar(title: const Text('Emergency Alert History')),
      body: SafeArea(
        child: sosProvider.alertHistory.isEmpty
            ? Center(
                child: Padding(
                  padding: const EdgeInsets.all(32),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      CircleAvatar(
                        radius: 36,
                        backgroundColor: AppColors.primaryNavy.withOpacity(0.08),
                        child: const Icon(Icons.history_toggle_off,
                            size: 36, color: AppColors.primaryNavy),
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        'No Emergency Alerts Recorded',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 6),
                      const Text(
                        'Past triggered SOS events, GPS coordinates, and contact delivery records will appear here.',
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 12, color: AppColors.textSecondaryLight),
                      ),
                    ],
                  ),
                ),
              )
            : ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: sosProvider.alertHistory.length,
                itemBuilder: (context, idx) {
                  final alert = sosProvider.alertHistory[idx];
                  final isResolved = alert.status == 'RESOLVED';

                  return Card(
                    child: Padding(
                      padding: const EdgeInsets.all(14),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'Alert #${alert.id.substring(0, 8)}',
                                style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(
                                  color: isResolved
                                      ? AppColors.safeLightGreen
                                      : AppColors.emergencyLightRed,
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  alert.status,
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                    color:
                                        isResolved ? AppColors.safeGreen : AppColors.emergencyRed,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Text(
                            'Created: ${alert.createdAt.substring(0, 10)} at ${alert.createdAt.substring(11, 16)} UTC',
                            style: const TextStyle(fontSize: 11, color: AppColors.textSecondaryLight),
                          ),
                          const SizedBox(height: 6),
                          Row(
                            children: [
                              Icon(
                                alert.locationAvailable ? Icons.location_on : Icons.location_off,
                                size: 14,
                                color: alert.locationAvailable
                                    ? AppColors.safeGreen
                                    : AppColors.textSecondaryLight,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                alert.locationAvailable
                                    ? 'GPS: ${alert.latitude!.toStringAsFixed(4)}, ${alert.longitude!.toStringAsFixed(4)}'
                                    : 'GPS location was unavailable',
                                style: const TextStyle(fontSize: 11),
                              ),
                            ],
                          ),
                          if (alert.resolutionNote != null) ...[
                            const SizedBox(height: 6),
                            Text(
                              'Resolution: ${alert.resolutionNote}',
                              style: const TextStyle(
                                fontSize: 11,
                                fontStyle: FontStyle.italic,
                                color: AppColors.textSecondaryLight,
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  );
                },
              ),
      ),
    );
  }
}
