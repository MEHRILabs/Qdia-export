import 'package:flutter/material.dart';
import 'package:qdia_mobile/theme/qdia_theme.dart';

IconData categoryIconFor(String name) {
  final n = name.toLowerCase();
  if (n.contains('épicer') || n.contains('epicer') || n.contains('agro')) return Icons.restaurant_rounded;
  if (n.contains('hygi') || n.contains('beaut')) return Icons.spa_rounded;
  if (n.contains('boisson')) return Icons.local_drink_rounded;
  if (n.contains('papet')) return Icons.description_rounded;
  if (n.contains('textile') || n.contains('tiss')) return Icons.checkroom_rounded;
  if (n.contains('cosm')) return Icons.face_retouching_natural_rounded;
  if (n.contains('ménag') || n.contains('menag')) return Icons.cleaning_services_rounded;
  if (n.contains('électr') || n.contains('electr')) return Icons.electrical_services_rounded;
  return Icons.category_rounded;
}

Color categoryColorFor(String name) {
  final n = name.toLowerCase();
  if (n.contains('épicer') || n.contains('epicer')) return const Color(0xFF2E7D32);
  if (n.contains('hygi')) return const Color(0xFF00838F);
  if (n.contains('boisson')) return const Color(0xFF1565C0);
  if (n.contains('papet')) return const Color(0xFF6A1B9A);
  return QdiaColors.primary;
}
