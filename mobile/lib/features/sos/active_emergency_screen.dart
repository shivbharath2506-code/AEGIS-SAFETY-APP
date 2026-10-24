import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/constants/app_colors.dart';
import '../../providers/sos_provider.dart';
import '../../providers/emergency_contacts_provider.dart';

class ActiveEmergencyScreen extends StatefulWidget {
  const ActiveEmergencyScreen({super.key});

  @override
  State<ActiveEmergencyScreen> createState() => _ActiveEmergencyScreenState();
}

class _ActiveEmergencyScreenState extends State<ActiveEmergencyScreen> {
  final _resolutionNoteController = TextEditingController(
    text: 'Safe location reached. Threat resolved.',
  );
  bool _isResolving = false;

  @override
  void dispose() {
    _resolutionNoteController.dispose();
    super.dispose();
  }

  void _resolveAlert() async {
    final note = _resolutionNoteController.text.trim();
    setState(() => _isResolving = true);

    final provider = Provider.of<SosProvider>(context, listen: false);
    final success = await provider.resolveActiveAlert(note: note);

    setState(() => _isResolving = false);

    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Emergency alert resolved. Your safety status has been updated.'),
          backgroundColor: AppColors.safeGreen,
        ),
      );
      Navigator.pop(context);
    }
  }

  @override
  Widget build(BuildContext context) {
    final sosProvider = Provider.of<SosProvider>(context);
    final contactsProvider = Provider.of<EmergencyContactsProvider>(context);
    final alert = sosProvider.activeAlert;

    final primaryContact = contactsProvider.primaryContact;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Emergency In Progress'),
        automaticallyImplyLeading: true,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Active Status Alert Card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: AppColors.emergencyLightRed,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.emergencyRed, width: 2),
                ),
                child: Column(
                  children: [
                    const Icon(Icons.emergency, color: AppColors.emergencyRed, size: 48),
                    const SizedBox(height: 8),
                    const Text(
                      'SOS ALERT DISPATCHED',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w900,
                        color: AppColors.emergencyRed,
                        letterSpacing: 1.5,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      alert?.locationAvailable == true
                          ? 'GPS Coordinates: ${alert!.latitude!.toStringAsFixed(4)}, ${alert.longitude!.toStringAsFixed(4)}'
                          : 'GPS location unavailable. Alert sent with notice.',
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Alert ID: ${alert?.id ?? "Pending"}',
                      style: const TextStyle(fontSize: 10, color: AppColors.textSecondaryLight),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // Immediate Helpline Calls
              const Text(
                'Direct Call Assistance',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.emergencyRed,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                      onPressed: () => _callNumber('112'),
                      icon: const Icon(Icons.phone),
                      label: const Text('Call 112'),
                    ),
                  ),
                  if (primaryContact != null) ...[
                    const SizedBox(width: 10),
                    Expanded(
                      child: OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppColors.primaryNavy,
                          padding: const EdgeInsets.symmetric(vertical: 12),
                        ),
                        onPressed: () => _callNumber(primaryContact.phoneNumber),
                        icon: const Icon(Icons.person),
                        label: Text('Call ${primaryContact.displayName}'),
                      ),
                    ),
                  ],
                ],
              ),

              const SizedBox(height: 28),

              // Deliveries Status Tracker
              const Text(
                'Contact Delivery Status',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 6),
              const Text(
                'Real delivery state confirmed by provider dispatch logs:',
                style: TextStyle(fontSize: 12, color: AppColors.textSecondaryLight),
              ),
              const SizedBox(height: 12),

              if (alert?.deliveries.isEmpty ?? true)
                const Text('No deliveries registered yet.')
              else
                ListView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: alert!.deliveries.length,
                  itemBuilder: (context, idx) {
                    final delivery = alert.deliveries[idx];
                    final isSent = delivery.status == 'SENT_TO_PROVIDER' ||
                        delivery.status == 'DELIVERED';

                    return Card(
                      child: ListTile(
                        leading: CircleAvatar(
                          backgroundColor:
                              isSent ? AppColors.safeLightGreen : AppColors.warningLightAmber,
                          child: Icon(
                            isSent ? Icons.check : Icons.hourglass_top,
                            color: isSent ? AppColors.safeGreen : AppColors.warningAmber,
                            size: 18,
                          ),
                        ),
                        title: Text(
                          delivery.channel == 'SMS' ? 'SMS Emergency Dispatch' : 'Push Dispatch',
                          style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                        ),
                        subtitle: Text(
                          'Status: ${delivery.status} • Ref: ${delivery.providerRef ?? "Pending"}',
                          style: const TextStyle(fontSize: 11),
                        ),
                      ),
                    );
                  },
                ),

              const SizedBox(height: 32),

              // Resolve Alert Button
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.safeGreen,
                  foregroundColor: Colors.white,
                ),
                onPressed: _isResolving ? null : () => _showResolveDialog(context),
                child: _isResolving
                    ? const CircularProgressIndicator(color: Colors.white)
                    : const Text('I AM SAFE — RESOLVE ALERT'),
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }

  void _callNumber(String phone) async {
    final uri = Uri.parse('tel:$phone');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }

  void _showResolveDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Mark Emergency Resolved?'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Confirm that safety has been restored. An update can be logged to your emergency records.',
              style: TextStyle(fontSize: 13),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _resolutionNoteController,
              decoration: const InputDecoration(
                labelText: 'Resolution note (optional)',
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.safeGreen),
            onPressed: () {
              Navigator.pop(ctx);
              _resolveAlert();
            },
            child: const Text('Confirm Resolved'),
          ),
        ],
      ),
    );
  }
}
