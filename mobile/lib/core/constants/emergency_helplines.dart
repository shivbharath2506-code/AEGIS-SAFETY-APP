class HelplineItem {
  final String title;
  final String number;
  final String description;
  final String category;

  const HelplineItem({
    required this.title,
    required this.number,
    required this.description,
    required this.category,
  });
}

class EmergencyHelplines {
  static const List<HelplineItem> all = [
    HelplineItem(
      title: 'National Emergency Number',
      number: '112',
      description: 'Single emergency contact number for Police, Fire, and Ambulance.',
      category: 'ALL',
    ),
    HelplineItem(
      title: 'Tamil Nadu Police Emergency',
      number: '100',
      description: 'Direct Tamil Nadu Police control room dispatch.',
      category: 'POLICE',
    ),
    HelplineItem(
      title: 'Women Helpline (India / Tamil Nadu)',
      number: '1091',
      description: '24x7 dedicated emergency assistance and distress relief for women.',
      category: 'WOMEN',
    ),
    HelplineItem(
      title: 'Emergency Medical Ambulance',
      number: '108',
      description: 'Government 108 emergency trauma care and ambulance service.',
      category: 'MEDICAL',
    ),
    HelplineItem(
      title: 'National Commission for Women (NCW)',
      number: '7827170170',
      description: '24/7 dedicated helpline for women in distress.',
      category: 'WOMEN',
    ),
    HelplineItem(
      title: 'Child Helpline',
      number: '1098',
      description: 'Emergency assistance and protection for children.',
      category: 'CHILD',
    ),
  ];
}
