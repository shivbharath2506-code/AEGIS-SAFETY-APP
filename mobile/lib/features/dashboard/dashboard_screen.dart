import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/emergency_helplines.dart';
import '../../providers/auth_provider.dart';
import '../../providers/emergency_contacts_provider.dart';
import '../../providers/sos_provider.dart';
import '../../providers/location_provider.dart';
import '../../widgets/sos_action_button.dart';
import '../../widgets/status_badge.dart';

// Feature screens
import '../emergency_contacts/contacts_list_screen.dart';
import '../sos/active_emergency_screen.dart';
import '../live_location/live_location_screen.dart';
import '../safety_map/safety_map_screen.dart';
import '../safe_routes/safe_routes_screen.dart';
import '../nearby_services/nearby_services_screen.dart';
import '../fake_call/fake_call_setup_screen.dart';
import '../alert_history/alert_history_screen.dart';
import '../profile/profile_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadDashboardData();
    });
  }

  void _loadDashboardData() {
    Provider.of<EmergencyContactsProvider>(context, listen: false).fetchContacts();
    Provider.of<LocationProvider>(context, listen: false).refreshLocation();
    Provider.of<SosProvider>(context, listen: false).fetchAlertHistory();
  }

  void _triggerSos() async {
    final locProvider = Provider.of<LocationProvider>(context, listen: false);
    final sosProvider = Provider.of<SosProvider>(context, listen: false);

    final fix = locProvider.currentFix;
    final success = await sosProvider.triggerEmergencyAlert(
      latitude: fix?.latitude,
      longitude: fix?.longitude,
      accuracyMeters: fix?.accuracyMeters,
    );

    if (success && mounted) {
      Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => const ActiveEmergencyScreen()),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final contactsProvider = Provider.of<EmergencyContactsProvider>(context);
    final locationProvider = Provider.of<LocationProvider>(context);
    final sosProvider = Provider.of<SosProvider>(context);

    final hasContacts = contactsProvider.contacts.isNotEmpty;
    final hasGps = locationProvider.currentFix != null;

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: AppColors.primaryNavy,
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.shield, color: Colors.white, size: 20),
            ),
            const SizedBox(width: 10),
            const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'AEGIS',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 2,
                    color: AppColors.primaryNavy,
                  ),
                ),
                Text(
                  'Chennai Emergency Guard',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textSecondaryLight,
                  ),
                ),
              ],
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.history_rounded),
            tooltip: 'Alert History',
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const AlertHistoryScreen()),
              );
            },
          ),
          IconButton(
            icon: const Icon(Icons.person_outline_rounded),
            tooltip: 'Profile & Settings',
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const ProfileScreen()),
              );
            },
          ),
        ],
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async => _loadDashboardData(),
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                // 1. Active SOS Emergency Banner (if alert active)
                if (sosProvider.hasActiveAlert)
                  InkWell(
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const ActiveEmergencyScreen()),
                      );
                    },
                    borderRadius: BorderRadius.circular(14),
                    child: Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(14),
                      margin: const EdgeInsets.only(bottom: 16),
                      decoration: BoxDecoration(
                        color: AppColors.emergencyRed,
                        borderRadius: BorderRadius.circular(14),
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.emergencyRed.withOpacity(0.3),
                            blurRadius: 10,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: const Row(
                        children: [
                          Icon(Icons.warning_rounded, color: Colors.white, size: 28),
                          SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'EMERGENCY ALERT ACTIVE',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 14,
                                    fontWeight: FontWeight.w900,
                                    letterSpacing: 1,
                                  ),
                                ),
                                SizedBox(height: 2),
                                Text(
                                  'Tap to view per-recipient delivery statuses or mark safe.',
                                  style: TextStyle(color: Colors.white, fontSize: 11),
                                ),
                              ],
                            ),
                          ),
                          Icon(Icons.chevron_right, color: Colors.white),
                        ],
                      ),
                    ),
                  ),

                // 2. Status Indicators Row (Location & Contacts)
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    StatusBadge(
                      icon: hasGps ? Icons.gps_fixed : Icons.gps_off,
                      label: hasGps ? 'Chennai GPS Active' : 'Location Needed',
                      isPositive: hasGps,
                      onTap: () => locationProvider.refreshLocation(),
                    ),
                    const SizedBox(width: 10),
                    StatusBadge(
                      icon: Icons.people_outline,
                      label: hasContacts
                          ? '${contactsProvider.contacts.length} Trusted Contacts'
                          : 'Configure Contacts',
                      isPositive: hasContacts,
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const ContactsListScreen()),
                        );
                      },
                    ),
                  ],
                ),

                const SizedBox(height: 24),

                // 3. Central Prominent SOS Button
                SosActionButton(
                  onActivated: _triggerSos,
                ),

                const SizedBox(height: 24),

                // 4. Quick Safety Actions Grid (6 cards)
                const Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    'Safety Services & Navigation',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                      color: AppColors.textPrimaryLight,
                    ),
                  ),
                ),
                const SizedBox(height: 12),

                GridView.count(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  crossAxisCount: 2,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                  childAspectRatio: 1.35,
                  children: [
                    _actionCard(
                      icon: Icons.map_outlined,
                      iconColor: AppColors.primaryBlue,
                      title: 'Safety Map',
                      subtitle: 'Police, Hospitals, Lights',
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const SafetyMapScreen()),
                        );
                      },
                    ),
                    _actionCard(
                      icon: Icons.alt_route_rounded,
                      iconColor: AppColors.safeGreen,
                      title: 'Compare Routes',
                      subtitle: 'Lit roads & safety score',
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const SafeRoutesScreen()),
                        );
                      },
                    ),
                    _actionCard(
                      icon: Icons.local_police_outlined,
                      iconColor: AppColors.primaryBlue,
                      title: 'Nearby Police',
                      subtitle: 'Stations & control room',
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => const NearbyServicesScreen(initialCategory: 'POLICE'),
                          ),
                        );
                      },
                    ),
                    _actionCard(
                      icon: Icons.local_hospital_outlined,
                      iconColor: AppColors.emergencyRed,
                      title: 'Hospitals',
                      subtitle: '24x7 trauma centers',
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => const NearbyServicesScreen(initialCategory: 'HOSPITAL'),
                          ),
                        );
                      },
                    ),
                    _actionCard(
                      icon: Icons.share_location_outlined,
                      iconColor: AppColors.infoBlue,
                      title: 'Live Location',
                      subtitle: 'Time-limited private link',
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const LiveLocationScreen()),
                        );
                      },
                    ),
                    _actionCard(
                      icon: Icons.phone_callback_outlined,
                      iconColor: AppColors.accentIndigo,
                      title: 'Fake Call',
                      subtitle: 'Simulate escape call',
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const FakeCallSetupScreen()),
                        );
                      },
                    ),
                  ],
                ),

                const SizedBox(height: 24),

                // 5. Emergency Helplines Quick Access
                const Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    'Direct Emergency Helplines',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                      color: AppColors.textPrimaryLight,
                    ),
                  ),
                ),
                const SizedBox(height: 10),

                Row(
                  children: [
                    _helplineButton('112', 'National Emergency', AppColors.emergencyRed),
                    const SizedBox(width: 8),
                    _helplineButton('1091', 'Women Helpline', AppColors.accentIndigo),
                    const SizedBox(width: 8),
                    _helplineButton('100', 'TN Police', AppColors.primaryBlue),
                  ],
                ),

                const SizedBox(height: 20),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _actionCard({
    required IconData icon,
    required Color iconColor,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return Card(
      elevation: 0,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              CircleAvatar(
                radius: 18,
                backgroundColor: iconColor.withOpacity(0.12),
                child: Icon(icon, color: iconColor, size: 20),
              ),
              const SizedBox(height: 8),
              Text(
                title,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                subtitle,
                style: const TextStyle(
                  fontSize: 11,
                  color: AppColors.textSecondaryLight,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _helplineButton(String number, String label, Color color) {
    return Expanded(
      child: OutlinedButton(
        style: OutlinedButton.styleFrom(
          padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
          side: BorderSide(color: color.withOpacity(0.4)),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ),
        onPressed: () async {
          final uri = Uri.parse('tel:$number');
          if (await canLaunchUrl(uri)) {
            await launchUrl(uri);
          }
        },
        child: Column(
          children: [
            Text(
              number,
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w900,
                color: color,
              ),
            ),
            Text(
              label,
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w600,
                color: color,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }
}
