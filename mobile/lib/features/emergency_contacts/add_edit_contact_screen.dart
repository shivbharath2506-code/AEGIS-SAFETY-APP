import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../providers/emergency_contacts_provider.dart';
import '../../models/emergency_contact_model.dart';

class AddEditContactScreen extends StatefulWidget {
  final EmergencyContactModel? contact;

  const AddEditContactScreen({super.key, this.contact});

  @override
  State<AddEditContactScreen> createState() => _AddEditContactScreenState();
}

class _AddEditContactScreenState extends State<AddEditContactScreen> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _nameController;
  late TextEditingController _phoneController;
  String _relationship = 'FAMILY';
  bool _isPrimary = false;
  bool _isLoading = false;

  final List<String> _relationships = ['FAMILY', 'FRIEND', 'GUARDIAN', 'TRUSTED', 'OTHER'];

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.contact?.displayName ?? '');
    _phoneController = TextEditingController(
      text: widget.contact?.phoneNumber.replaceAll('+91', '') ?? '',
    );
    _relationship = widget.contact?.relationship ?? 'FAMILY';
    _isPrimary = widget.contact?.isPrimary ?? false;
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  void _saveContact() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);
    final provider = Provider.of<EmergencyContactsProvider>(context, listen: false);

    final rawPhone = _phoneController.text.trim();
    final formattedPhone = rawPhone.startsWith('+') ? rawPhone : '+91$rawPhone';

    bool success;
    if (widget.contact == null) {
      success = await provider.addContact(
        displayName: _nameController.text.trim(),
        phoneNumber: formattedPhone,
        relationship: _relationship,
        isPrimary: _isPrimary,
      );
    } else {
      success = await provider.updateContact(
        contactId: widget.contact!.id,
        displayName: _nameController.text.trim(),
        phoneNumber: formattedPhone,
        relationship: _relationship,
        isPrimary: _isPrimary,
      );
    }

    setState(() => _isLoading = false);

    if (success && mounted) {
      Navigator.pop(context);
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(provider.errorMessage ?? 'Failed to save contact.'),
          backgroundColor: AppColors.emergencyRed,
        ),
      );
    }
  }

  void _simulateContactImport() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Select from Device Contacts',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 6),
            const Text(
              'Permission requested strictly for manual contact import.',
              style: TextStyle(fontSize: 12, color: AppColors.textSecondaryLight),
            ),
            const SizedBox(height: 14),
            ListTile(
              leading: const CircleAvatar(child: Text('A')),
              title: const Text('Appa (Father)'),
              subtitle: const Text('+91 98401 12233'),
              onTap: () {
                setState(() {
                  _nameController.text = 'Appa (Father)';
                  _phoneController.text = '9840112233';
                  _relationship = 'FAMILY';
                });
                Navigator.pop(ctx);
              },
            ),
            ListTile(
              leading: const CircleAvatar(child: Text('K')),
              title: const Text('Karthik (Brother)'),
              subtitle: const Text('+91 98409 98877'),
              onTap: () {
                setState(() {
                  _nameController.text = 'Karthik (Brother)';
                  _phoneController.text = '9840998877';
                  _relationship = 'FAMILY';
                });
                Navigator.pop(ctx);
              },
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isEditing = widget.contact != null;

    return Scaffold(
      appBar: AppBar(
        title: Text(isEditing ? 'Edit Contact' : 'Add Emergency Contact'),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (!isEditing) ...[
                  OutlinedButton.icon(
                    onPressed: _simulateContactImport,
                    icon: const Icon(Icons.contacts, size: 18),
                    label: const Text('Pick from Device Contacts'),
                  ),
                  const SizedBox(height: 18),
                ],

                const Text('Contact Full Name', style: TextStyle(fontWeight: FontWeight.w700)),
                const SizedBox(height: 6),
                TextFormField(
                  controller: _nameController,
                  decoration: const InputDecoration(hintText: 'e.g. Amma, Brother Karthik'),
                  validator: (v) => v == null || v.trim().isEmpty ? 'Please enter name' : null,
                ),
                const SizedBox(height: 18),

                const Text('Mobile Phone Number', style: TextStyle(fontWeight: FontWeight.w700)),
                const SizedBox(height: 6),
                TextFormField(
                  controller: _phoneController,
                  keyboardType: TextInputType.phone,
                  maxLength: 10,
                  decoration: const InputDecoration(
                    prefixText: '+91 ',
                    hintText: '10-digit phone number',
                    counterText: '',
                  ),
                  validator: (v) {
                    if (v == null || v.trim().length != 10) {
                      return 'Enter 10 digit Indian number';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 18),

                const Text('Relationship', style: TextStyle(fontWeight: FontWeight.w700)),
                const SizedBox(height: 6),
                DropdownButtonFormField<String>(
                  value: _relationship,
                  items: _relationships
                      .map((r) => DropdownMenuItem(value: r, child: Text(r)))
                      .toList(),
                  onChanged: (val) {
                    if (val != null) setState(() => _relationship = val);
                  },
                  decoration: const InputDecoration(),
                ),
                const SizedBox(height: 18),

                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text(
                    'Set as Primary Contact',
                    style: TextStyle(fontWeight: FontWeight.w700),
                  ),
                  subtitle: const Text(
                    'Primary contacts are dialed first and appear at the top of emergency dispatches.',
                    style: TextStyle(fontSize: 12, color: AppColors.textSecondaryLight),
                  ),
                  value: _isPrimary,
                  onChanged: (val) => setState(() => _isPrimary = val),
                ),

                const SizedBox(height: 28),
                ElevatedButton(
                  onPressed: _isLoading ? null : _saveContact,
                  child: _isLoading
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                        )
                      : Text(isEditing ? 'Save Changes' : 'Add Emergency Contact'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
