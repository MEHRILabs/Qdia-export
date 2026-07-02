import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import 'package:qdia_mobile/l10n/app_locale.dart';
import 'package:qdia_mobile/l10n/app_strings.dart';
import 'package:qdia_mobile/screens/agent_ia_screen.dart';
import 'package:qdia_mobile/screens/cart_screen.dart';
import 'package:qdia_mobile/screens/dashboard_screen.dart';
import 'package:qdia_mobile/screens/orders_screen.dart';
import 'package:qdia_mobile/screens/settings_screen.dart';
import 'package:qdia_mobile/screens/studio_screen.dart';
import 'package:qdia_mobile/screens/supplier_products_screen.dart';
import 'package:qdia_mobile/screens/tracking_screen.dart';
import 'package:qdia_mobile/screens/trade_assurance_screen.dart';
import 'package:qdia_mobile/screens/verification_screen.dart';
import 'package:qdia_mobile/screens/my_rfqs_screen.dart';
import 'package:qdia_mobile/screens/inquiries_screen.dart';
import 'package:qdia_mobile/screens/facturation_screen.dart';
import 'package:qdia_mobile/screens/profile_screen.dart';
import 'package:qdia_mobile/screens/notifications_screen.dart';
import 'package:qdia_mobile/screens/shell_screen.dart';
import 'package:qdia_mobile/services/api_service.dart';
import 'package:qdia_mobile/services/local_notification_service.dart';
import 'package:qdia_mobile/theme/qdia_theme.dart';

final GlobalKey<NavigatorState> appNavigatorKey = GlobalKey<NavigatorState>();

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await LocalNotificationService.instance.init(
    onTap: (_) {
      appNavigatorKey.currentState?.push(
        MaterialPageRoute(builder: (_) => const NotificationsScreen()),
      );
    },
  );
  await ApiService.instance.loadToken();
  final locale = await AppLocale.load();
  final strings = await AppStrings.load(locale.languageCode);
  runApp(QdiaApp(initialLocale: locale, initialStrings: strings));
}

class QdiaApp extends StatefulWidget {
  const QdiaApp({super.key, required this.initialLocale, required this.initialStrings});
  final Locale initialLocale;
  final AppStrings initialStrings;

  @override
  State<QdiaApp> createState() => _QdiaAppState();
}

class _QdiaAppState extends State<QdiaApp> {
  late Locale _locale = widget.initialLocale;
  late AppStrings _strings = widget.initialStrings;

  Future<void> setLocale(Locale locale) async {
    final strings = await AppStrings.load(locale.languageCode);
    setState(() {
      _locale = locale;
      _strings = strings;
    });
    await AppLocale.save(locale.languageCode);
  }

  @override
  Widget build(BuildContext context) {
    final rtl = _strings.isRtl;
    return AppStringsScope(
      strings: _strings,
      child: MaterialApp(
        navigatorKey: appNavigatorKey,
        title: 'QDIA Export DZ',
        debugShowCheckedModeBanner: false,
        locale: _locale,
        supportedLocales: AppLocale.supported,
        localizationsDelegates: const [
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        builder: (context, child) => Directionality(
          textDirection: rtl ? TextDirection.rtl : TextDirection.ltr,
          child: LocaleScope(
            setLocale: setLocale,
            locale: _locale,
            child: child ?? const SizedBox.shrink(),
          ),
        ),
        theme: buildQdiaTheme(),
        home: const ShellScreen(),
        routes: {
          '/agent-ia': (_) => const AgentIaScreen(),
          '/studio': (_) => const StudioScreen(),
          '/settings': (_) => const SettingsScreen(),
          '/dashboard': (_) => const DashboardScreen(),
          '/supplier-products': (_) => const SupplierProductsScreen(),
          '/verification': (_) => const VerificationScreen(),
          '/my-rfqs': (_) => const MyRfqsScreen(),
          '/inquiries': (_) => const InquiriesScreen(),
          '/facturation': (_) => const FacturationScreen(),
          '/profile': (_) => const ProfileScreen(),
          '/cart': (_) => const CartScreen(),
          '/orders': (_) => const OrdersScreen(),
          '/tracking': (_) => const TrackingScreen(),
          '/trade-assurance': (_) => const TradeAssuranceScreen(),
        },
      ),
    );
  }
}

/// Expose locale changer to settings screen
class LocaleScope extends InheritedWidget {
  const LocaleScope({
    super.key,
    required this.locale,
    required this.setLocale,
    required super.child,
  });

  final Locale locale;
  final Future<void> Function(Locale) setLocale;

  static LocaleScope? of(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<LocaleScope>();

  @override
  bool updateShouldNotify(LocaleScope old) => locale != old.locale;
}
