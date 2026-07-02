import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// Traductions FR / EN / AR chargées depuis assets/l10n/*.json
class AppStrings {
  AppStrings._(this.locale, this._flat);

  final String locale;
  final Map<String, String> _flat;

  static AppStrings? _of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<AppStringsScope>();
    return scope?.strings;
  }

  static AppStrings of(BuildContext context) {
    final s = _of(context);
    assert(s != null, 'AppStringsScope manquant');
    return s!;
  }

  String t(String key) => _flat[key] ?? key;

  bool get isRtl => locale == 'ar';

  static Future<AppStrings> load(String localeCode) async {
    final code = ['fr', 'en', 'ar'].contains(localeCode) ? localeCode : 'fr';
    Map<String, dynamic> json;
    try {
      final raw = await rootBundle.loadString('assets/l10n/$code.json');
      json = jsonDecode(raw) as Map<String, dynamic>;
    } catch (_) {
      final raw = await rootBundle.loadString('assets/l10n/fr.json');
      json = jsonDecode(raw) as Map<String, dynamic>;
    }
    return AppStrings._(code, _flatten(json));
  }

  static Map<String, String> _flatten(Map<String, dynamic> obj, [String prefix = '']) {
    final out = <String, String>{};
    obj.forEach((k, v) {
      final key = prefix.isEmpty ? k : '$prefix.$k';
      if (v is Map) {
        out.addAll(_flatten(Map<String, dynamic>.from(v), key));
      } else if (v is String) {
        out[key] = v;
      }
    });
    return out;
  }
}

class AppStringsScope extends InheritedWidget {
  const AppStringsScope({
    super.key,
    required this.strings,
    required super.child,
  });

  final AppStrings strings;

  @override
  bool updateShouldNotify(AppStringsScope old) => strings.locale != old.strings.locale;
}

/// Helper pour accéder aux traductions : `context.tr('nav.home')`
extension AppStringsContext on BuildContext {
  String tr(String key) {
    final s = AppStrings._of(this);
    return s?.t(key) ?? key;
  }

  bool get isRtl => AppStrings._of(this)?.isRtl ?? false;
}
