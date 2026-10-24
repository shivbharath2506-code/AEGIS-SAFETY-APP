import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:aegis_safety/features/authentication/welcome_screen.dart';

void main() {
  testWidgets('WelcomeScreen renders AEGIS title and action buttons', (WidgetTester tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: WelcomeScreen(),
      ),
    );

    expect(find.text('AEGIS'), findsOneWidget);
    expect(find.text('Advanced Emergency and Intelligent Safety'), findsOneWidget);
    expect(find.text('Instant SOS Alert System'), findsOneWidget);
    expect(find.text('Get Started with Mobile OTP'), findsOneWidget);
  });
}
