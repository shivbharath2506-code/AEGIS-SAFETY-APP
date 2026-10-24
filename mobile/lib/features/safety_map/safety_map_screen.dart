import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../providers/nearby_services_provider.dart';
import '../../widgets/facility_card.dart';

class SafetyMapScreen extends StatefulWidget {
  const SafetyMapScreen({super.key});

  @override
  State<SafetyMapScreen> createState() => _SafetyMapScreenState();
}

class _SafetyMapScreenState extends State<SafetyMapScreen> {
  String _activeTab = 'ALL';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<NearbyServicesProvider>(context, listen: false).fetchNearbyFacilities();
    });
  }

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<NearbyServicesProvider>(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Chennai Safety Map'),
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Interactive Map Canvas Simulation (Chennai Coordinates)
            Container(
              height: 220,
              width: double.infinity,
              color: const Color(0xFFE2E8F0),
              child: Stack(
                children: [
                  Positioned.fill(
                    child: CustomPaint(
                      painter: _MapGridPainter(),
                    ),
                  ),
                  // Current user location pin
                  const Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.my_location, color: AppColors.primaryBlue, size: 28),
                        Text(
                          'You (Chennai Central)',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            backgroundColor: Colors.white,
                          ),
                        ),
                      ],
                    ),
                  ),
                  // Police Marker
                  const Positioned(
                    top: 40,
                    left: 60,
                    child: Icon(Icons.local_police, color: AppColors.primaryBlue, size: 22),
                  ),
                  // Hospital Marker
                  const Positioned(
                    bottom: 40,
                    right: 70,
                    child: Icon(Icons.local_hospital, color: AppColors.emergencyRed, size: 22),
                  ),
                  // Street Lighting Marker
                  const Positioned(
                    top: 60,
                    right: 90,
                    child: Icon(Icons.lightbulb, color: AppColors.warningAmber, size: 18),
                  ),
                  Positioned(
                    bottom: 8,
                    left: 12,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.9),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: const Text(
                        'OSM PostGIS Layer • Chennai 13.0827, 80.2707',
                        style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // Category Filter Chips
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    _filterChip('ALL', 'All Facilities'),
                    const SizedBox(width: 8),
                    _filterChip('POLICE', 'Police Stations'),
                    const SizedBox(width: 8),
                    _filterChip('HOSPITAL', 'Hospitals'),
                    const SizedBox(width: 8),
                    _filterChip('PHARMACY', '24x7 Pharmacies'),
                  ],
                ),
              ),
            ),

            // Facility List View
            Expanded(
              child: provider.isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : provider.facilities.isEmpty
                      ? const Center(child: Text('No emergency facilities found in this radius.'))
                      : ListView.builder(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                          itemCount: provider.facilities.length,
                          itemBuilder: (context, idx) {
                            return FacilityCard(facility: provider.facilities[idx]);
                          },
                        ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _filterChip(String category, String label) {
    final provider = Provider.of<NearbyServicesProvider>(context);
    final isSelected = provider.selectedCategory == category;
    return ChoiceChip(
      label: Text(label),
      selected: isSelected,
      onSelected: (val) {
        if (val) provider.setCategory(category);
      },
    );
  }
}

class _MapGridPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final roadPaint = Paint()
      ..color = Colors.white
      ..strokeWidth = 4;

    final secondaryPaint = Paint()
      ..color = const Color(0xFFCBD5E1)
      ..strokeWidth = 2;

    // Draw arterial road grid
    canvas.drawLine(Offset(0, size.height * 0.45), Offset(size.width, size.height * 0.55), roadPaint);
    canvas.drawLine(Offset(size.width * 0.4, 0), Offset(size.width * 0.5, size.height), roadPaint);
    canvas.drawLine(Offset(0, size.height * 0.2), Offset(size.width, size.height * 0.25), secondaryPaint);
    canvas.drawLine(Offset(size.width * 0.7, 0), Offset(size.width * 0.75, size.height), secondaryPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
