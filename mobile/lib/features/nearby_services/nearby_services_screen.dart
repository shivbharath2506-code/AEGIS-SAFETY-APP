import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/nearby_services_provider.dart';
import '../../widgets/facility_card.dart';

class NearbyServicesScreen extends StatefulWidget {
  final String initialCategory;

  const NearbyServicesScreen({super.key, this.initialCategory = 'ALL'});

  @override
  State<NearbyServicesScreen> createState() => _NearbyServicesScreenState();
}

class _NearbyServicesScreenState extends State<NearbyServicesScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final provider = Provider.of<NearbyServicesProvider>(context, listen: false);
      provider.setCategory(widget.initialCategory);
      provider.fetchNearbyFacilities();
    });
  }

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<NearbyServicesProvider>(context);

    String title;
    switch (provider.selectedCategory) {
      case 'POLICE':
        title = 'Nearby Police Stations';
        break;
      case 'HOSPITAL':
        title = 'Nearby Emergency Hospitals';
        break;
      case 'PHARMACY':
        title = 'Nearby 24x7 Pharmacies';
        break;
      default:
        title = 'Nearby Emergency Services';
        break;
    }

    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    _categoryChip('ALL', 'All Facilities'),
                    const SizedBox(width: 8),
                    _categoryChip('POLICE', 'Police Stations'),
                    const SizedBox(width: 8),
                    _categoryChip('HOSPITAL', 'Hospitals'),
                    const SizedBox(width: 8),
                    _categoryChip('PHARMACY', 'Pharmacies'),
                  ],
                ),
              ),
            ),
            Expanded(
              child: provider.isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : provider.facilities.isEmpty
                      ? const Center(child: Text('No facilities found for this category.'))
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

  Widget _categoryChip(String category, String label) {
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
