import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class AppLocale {
  static const _key = 'qdia_locale';

  static Future<Locale> load() async {
    final prefs = await SharedPreferences.getInstance();
    final code = prefs.getString(_key) ?? 'fr';
    return Locale(code);
  }

  static Future<void> save(String code) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_key, code);
  }

  static const supported = [
    Locale('fr'),
    Locale('en'),
    Locale('ar'),
  ];

  static String label(Locale l) {
    switch (l.languageCode) {
      case 'en':
        return 'English';
      case 'ar':
        return 'العربية';
      default:
        return 'Français';
    }
  }
}
