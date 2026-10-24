import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../providers/safe_routes_provider.dart';
import '../../widgets/route_card.dart';

class SafeRoutesScreen extends StatefulWidget {
  const SafeRoutesScreen({super.key});

  @override
  State<SafeRoutesScreen> createState() => _SafeRoutesScreenState();
}

class _SafeRoutesScreenState extends State<SafeRoutesScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final provider = Provider.of<SafeRoutesProvider>(context, listen: false);
      if (provider.routes.isEmpty) {
        provider.compareRoutes();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<SafeRoutesProvider>(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Compare Travel Routes'),
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Origin & Destination Header Card
            Container(
              padding: const EdgeInsets.all(16),
              margin: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.cardBorderLight),
              ),
              child: Column(
                children: [
                  Row(
                    children: [
                      const Icon(Icons.circle, color: AppColors.safeGreen, size: 12),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          'Origin: ${provider.originName}',
                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
                        ),
                      ),
                    ],
                  ),
                  const Padding(
                    padding: EdgeInsets.only(left: 5),
                    child: Align(
                      alignment: Alignment.centerLeft,
                      child: SizedBox(
                        height: 16,
                        child: VerticalDivider(color: Colors.grey, thickness: 1.5),
                      ),
                    ),
                  ),
                  Row(
                    children: [
                      const Icon(Icons.location_on, color: AppColors.emergencyRed, size: 14),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          'Destination: ${provider.destinationName}',
                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 6),
                      minimumSize: const Size(double.infinity, 38),
                    ),
                    onPressed: () => provider.compareRoutes(),
                    icon: const Icon(Icons.refresh, size: 16),
                    label: const Text('Refresh Route Comparison'),
                  ),
                ],
              ),
            ),

            // Important Transparency Disclaimer Banner
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: AppColors.warningLightAmber,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppColors.warningAmber.withOpacity(0.3)),
              ),
              child: const Row(
                children: [
                  Icon(Icons.info_outline, size: 16, color: AppColors.warningAmber),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Scores reflect physical streetlighting and verified public facility density. Routes are NEVER guaranteed safe.',
                      style: TextStyle(
                        fontSize: 11,
                        color: AppColors.warningAmber,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 10),

            // Route Alternatives List
            Expanded(
              child: provider.isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : provider.routes.isEmpty
                      ? const Center(child: Text('No routes available for this corridor.'))
                      : ListView.builder(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                          itemCount: provider.routes.length,
                          itemBuilder: (context, idx) {
                            return RouteCard(
                              route: provider.routes[idx],
                              isSelected: provider.selectedRouteIndex == idx,
                              onSelected: () => provider.selectRoute(idx),
                            );
                          },
                        ),
            ),
          ],
        ),
      ),
    );
  }
}
