import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../providers/emergency_contacts_provider.dart';
import '../../models/emergency_contact_model.dart';
import 'add_edit_contact_screen.dart';

class ContactsListScreen extends StatelessWidget {
  const ContactsListScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final contactsProvider = Provider.of<EmergencyContactsProvider>(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Trusted Contacts'),
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.primaryNavy,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.person_add_alt_1),
        label: const Text('Add Contact'),
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const AddEditContactScreen()),
          );
        },
      ),
      body: contactsProvider.isLoading
          ? const Center(child: CircularProgressIndicator())
          : contactsProvider.contacts.isEmpty
              ? _emptyState(context)
              : ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                  itemCount: contactsProvider.contacts.length,
                  itemBuilder: (context, index) {
                    final contact = contactsProvider.contacts[index];
                    return _contactCard(context, contact, contactsProvider);
                  },
                ),
    );
  }

  Widget _emptyState(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircleAvatar(
              radius: 40,
              backgroundColor: AppColors.primaryNavy.withOpacity(0.08),
              child: const Icon(Icons.people_outline, size: 40, color: AppColors.primaryNavy),
            ),
            const SizedBox(height: 18),
            const Text(
              'No Emergency Contacts Yet',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 6),
            const Text(
              'Add at least two trusted family members or guardians who should receive your emergency SOS alerts and live location.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 13, color: AppColors.textSecondaryLight),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const AddEditContactScreen()),
                );
              },
              icon: const Icon(Icons.add),
              label: const Text('Add First Contact'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _contactCard(
    BuildContext context,
    EmergencyContactModel contact,
    EmergencyContactsProvider provider,
  ) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          children: [
            CircleAvatar(
              backgroundColor: contact.isPrimary
                  ? AppColors.emergencyRed.withOpacity(0.12)
                  : AppColors.primaryNavy.withOpacity(0.08),
              child: Icon(
                contact.isPrimary ? Icons.star_rounded : Icons.person_rounded,
                color: contact.isPrimary ? AppColors.emergencyRed : AppColors.primaryNavy,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        contact.displayName,
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      if (contact.isPrimary) ...[
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppColors.emergencyRed,
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: const Text(
                            'PRIMARY',
                            style: TextStyle(
                              fontSize: 9,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    contact.phoneNumber,
                    style: const TextStyle(
                      fontSize: 13,
                      color: AppColors.textSecondaryLight,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: AppColors.primaryNavy.withOpacity(0.06),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      contact.relationship,
                      style: const TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: AppColors.primaryNavy,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            PopupMenuButton<String>(
              onSelected: (value) {
                if (value == 'edit') {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => AddEditContactScreen(contact: contact),
                    ),
                  );
                } else if (value == 'delete') {
                  _confirmDelete(context, contact, provider);
                } else if (value == 'primary') {
                  provider.updateContact(
                    contactId: contact.id,
                    isPrimary: true,
                  );
                }
              },
              itemBuilder: (context) => [
                if (!contact.isPrimary)
                  const PopupMenuItem(
                    value: 'primary',
                    child: Row(
                      children: [
                        Icon(Icons.star_outline, size: 18),
                        SizedBox(width: 8),
                        Text('Set as Primary'),
                      ],
                    ),
                  ),
                const PopupMenuItem(
                  value: 'edit',
                  child: Row(
                    children: [
                      Icon(Icons.edit_outlined, size: 18),
                      SizedBox(width: 8),
                      Text('Edit Details'),
                    ],
                  ),
                ),
                const PopupMenuItem(
                  value: 'delete',
                  child: Row(
                    children: [
                      Icon(Icons.delete_outline, size: 18, color: AppColors.emergencyRed),
                      SizedBox(width: 8),
                      Text('Delete', style: TextStyle(color: AppColors.emergencyRed)),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _confirmDelete(
    BuildContext context,
    EmergencyContactModel contact,
    EmergencyContactsProvider provider,
  ) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Contact?'),
        content: Text('Remove ${contact.displayName} from your emergency alerts?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.emergencyRed),
            onPressed: () {
              Navigator.pop(ctx);
              provider.deleteContact(contact.id);
            },
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }
}
