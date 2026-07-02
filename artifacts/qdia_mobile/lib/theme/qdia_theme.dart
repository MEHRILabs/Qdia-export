import 'package:flutter/material.dart';

/// Charte QDIA Export — identique au site web
class QdiaColors {
  static const primary = Color(0xFF0461A5);
  static const primaryDark = Color(0xFF034E85);
  static const sidebar = Color(0xFF073B74);
  static const primaryLight = Color(0xFFE8F2FB);
  static const gold = Color(0xFFF5C518);
  static const goldDark = Color(0xFFD4A910);
  static const navy = Color(0xFF1A1A2E);
  static const success = Color(0xFF04BB7B);
  static const warning = Color(0xFFFFBB38);
  static const danger = Color(0xFFFF4040);
  static const pageBg = Color(0xFFF7F8FA);
  static const appBg = Color(0xFFF0F4FF);
  static const border = Color(0xFFE5E7EB);
  static const textMuted = Color(0xFF6B7280);
  static const textBody = Color(0xFF334257);
}

ThemeData buildQdiaTheme() {
  return ThemeData(
    useMaterial3: true,
    scaffoldBackgroundColor: QdiaColors.pageBg,
    colorScheme: ColorScheme.fromSeed(
      seedColor: QdiaColors.primary,
      primary: QdiaColors.primary,
      secondary: QdiaColors.gold,
      surface: Colors.white,
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: QdiaColors.primary,
      foregroundColor: Colors.white,
      elevation: 0,
      centerTitle: false,
    ),
    bottomNavigationBarTheme: const BottomNavigationBarThemeData(
      backgroundColor: Colors.white,
      selectedItemColor: QdiaColors.primary,
      unselectedItemColor: QdiaColors.textMuted,
      type: BottomNavigationBarType.fixed,
      elevation: 8,
      selectedLabelStyle: TextStyle(fontSize: 10, fontWeight: FontWeight.w700),
      unselectedLabelStyle: TextStyle(fontSize: 10),
    ),
    cardTheme: CardThemeData(
      color: Colors.white,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: QdiaColors.border),
      ),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: QdiaColors.primary,
        foregroundColor: Colors.white,
        elevation: 0,
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(24),
        borderSide: BorderSide.none,
      ),
      hintStyle: const TextStyle(color: QdiaColors.textMuted, fontSize: 13),
    ),
  );
}
