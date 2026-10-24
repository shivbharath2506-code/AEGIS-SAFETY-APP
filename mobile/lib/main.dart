import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

// Providers
import 'providers/auth_provider.dart';
import 'providers/emergency_contacts_provider.dart';
import 'providers/sos_provider.dart';
import 'providers/location_provider.dart';
import 'providers/safe_routes_provider.dart';
import 'providers/nearby_services_provider.dart';
import 'providers/fake_call_provider.dart';

// App Widget
import 'app/app.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()..checkAuthStatus()),
        ChangeNotifierProvider(create: (_) => EmergencyContactsProvider()),
        ChangeNotifierProvider(create: (_) => SosProvider()),
        ChangeNotifierProvider(create: (_) => LocationProvider()),
        ChangeNotifierProvider(create: (_) => SafeRoutesProvider()),
        ChangeNotifierProvider(create: (_) => NearbyServicesProvider()),
        ChangeNotifierProvider(create: (_) => FakeCallProvider()),
      ],
      child: const AegisApp(),
    ),
  );
}
