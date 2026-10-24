import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../providers/fake_call_provider.dart';
import 'fake_incoming_call_screen.dart';

class FakeCallSetupScreen extends StatefulWidget {
  const FakeCallSetupScreen({super.key});

  @override
  State<FakeCallSetupScreen> createState() => _FakeCallSetupScreenState();
}

class _FakeCallSetupScreenState extends State<FakeCallSetupScreen> {
  final _callerController = TextEditingController(text: 'Appa (Dad)');
  final _numberController = TextEditingController(text: '+91 98401 12233');
  int _delaySeconds = 5;

  final List<Map<String, String>> _presets = [
    {'name': 'Appa (Dad)', 'number': '+91 98401 12233'},
    {'name': 'Brother Karthik', 'number': '+91 98409 98877'},
    {'name': 'Office Manager', 'number': '+91 99400 55443'},
    {'name': 'Friend Priya', 'number': '+91 98840 12345'},
  ];

  @override
  void dispose() {
    _callerController.dispose();
    _numberController.dispose();
    super.dispose();
  }

  void _startSimulation() {
    final provider = Provider.of<FakeCallProvider>(context, listen: false);
    provider.setCaller(_callerController.text.trim(), _numberController.text.trim());
    provider.setDelay(_delaySeconds);
    provider.startSimulation();

    // Navigate to incoming call screen
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const FakeIncomingCallScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Fake Call Simulator')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppColors.primaryNavy.withOpacity(0.06),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.shield_outlined, color: AppColors.primaryNavy),
                    SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'Simulates an incoming phone call to excuse yourself from uncomfortable or unsafe situations. Does NOT make any real phone calls.',
                        style: TextStyle(fontSize: 12, color: AppColors.textPrimaryLight),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),
              const Text('Quick Preset Callers', style: TextStyle(fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),

              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: _presets.map((p) {
                  final isSelected = _callerController.text == p['name'];
                  return ChoiceChip(
                    label: Text(p['name']!),
                    selected: isSelected,
                    onSelected: (val) {
                      if (val) {
                        setState(() {
                          _callerController.text = p['name']!;
                          _numberController.text = p['number']!;
                        });
                      }
                    },
                  );
                }).toList(),
              ),

              const SizedBox(height: 20),
              const Text('Caller Display Name', style: TextStyle(fontWeight: FontWeight.w700)),
              const SizedBox(height: 6),
              TextField(
                controller: _callerController,
                decoration: const InputDecoration(hintText: 'e.g. Dad, Police Officer'),
              ),

              const SizedBox(height: 18),
              const Text('Caller Phone Number', style: TextStyle(fontWeight: FontWeight.w700)),
              const SizedBox(height: 6),
              TextField(
                controller: _numberController,
                decoration: const InputDecoration(hintText: 'e.g. +91 98401 12233'),
              ),

              const SizedBox(height: 20),
              const Text('Call Trigger Delay', style: TextStyle(fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              Row(
                children: [
                  _delayChip(5, '5 Seconds'),
                  const SizedBox(width: 8),
                  _delayChip(10, '10 Seconds'),
                  const SizedBox(width: 8),
                  _delayChip(30, '30 Seconds'),
                ],
              ),

              const SizedBox(height: 32),
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.accentIndigo,
                  foregroundColor: Colors.white,
                ),
                onPressed: _startSimulation,
                icon: const Icon(Icons.ring_volume),
                label: const Text('Start Simulation'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _delayChip(int seconds, String label) {
    final isSelected = _delaySeconds == seconds;
    return Expanded(
      child: ChoiceChip(
        label: Text(label),
        selected: isSelected,
        onSelected: (val) {
          if (val) setState(() => _delaySeconds = seconds);
        },
      ),
    );
  }
}
