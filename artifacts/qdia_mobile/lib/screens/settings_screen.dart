import 'package:flutter/material.dart';
import 'package:qdia_mobile/l10n/app_locale.dart';
import 'package:qdia_mobile/l10n/app_strings.dart';
import 'package:qdia_mobile/main.dart';
import 'package:qdia_mobile/screens/info_screens.dart';
import 'package:qdia_mobile/screens/login_screen.dart';
import 'package:qdia_mobile/screens/analytics_dashboard_screen.dart';
import 'package:qdia_mobile/screens/catalog_import_screen.dart';
import 'package:qdia_mobile/screens/product_enrichment_screen.dart';
import 'package:qdia_mobile/screens/facturation_screen.dart';
import 'package:qdia_mobile/screens/my_rfqs_screen.dart';
import 'package:qdia_mobile/screens/profile_screen.dart';
import 'package:qdia_mobile/screens/tracking_screen.dart';
import 'package:qdia_mobile/screens/verification_screen.dart';
import 'package:qdia_mobile/services/api_service.dart';
import 'package:qdia_mobile/services/local_notification_service.dart';
import 'package:qdia_mobile/services/notification_prefs.dart';
import 'package:qdia_mobile/services/notification_store.dart';
import 'package:qdia_mobile/theme/qdia_theme.dart';
import 'package:qdia_mobile/widgets/mobile_ui.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key, this.loggedIn = false, this.onAuthChanged, this.embedded = false, this.onOpenMessages});

  final bool loggedIn;
  final ValueChanged<bool>? onAuthChanged;
  final bool embedded;
  final VoidCallback? onOpenMessages;

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  bool _notifications = false;
  bool _darkMode = false;
  bool _notifLoading = false;

  @override
  void initState() {
    super.initState();
    _loadNotifPref();
  }

  Future<void> _loadNotifPref() async {
    final enabled = await NotificationPrefs.isEnabled();
    if (mounted) setState(() => _notifications = enabled);
  }

  void _openLogin() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => LoginScreen(onLogin: () async {
          await ApiService.instance.loadToken();
          widget.onAuthChanged?.call(true);
          if (mounted) {
            Navigator.pop(context);
            setState(() {});
          }
        }),
      ),
    );
  }

  Future<void> _toggleNotifications(bool enabled) async {
    setState(() {
      _notifications = enabled;
      _notifLoading = true;
    });
    if (enabled) {
      if (!ApiService.instance.isLoggedIn) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(context.tr('settings.fcm_login_required'))),
        );
        setState(() {
          _notifications = false;
          _notifLoading = false;
        });
        await NotificationPrefs.setEnabled(false);
        return;
      }
      final granted = await LocalNotificationService.instance.requestPermission();
      if (!granted) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(context.tr('settings.notifications_permission_denied'))),
          );
        }
        setState(() {
          _notifications = false;
          _notifLoading = false;
        });
        await NotificationPrefs.setEnabled(false);
        return;
      }
      await NotificationStore.instance.enable(userName: ApiService.instance.userName);
      try {
        await ApiService.instance.registerFcmToken('local-${DateTime.now().millisecondsSinceEpoch}');
      } catch (_) {}
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(context.tr('settings.notifications_on')),
            backgroundColor: QdiaColors.success,
          ),
        );
      }
    } else {
      await NotificationStore.instance.disable();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(context.tr('settings.notifications_off'))),
        );
      }
    }
    if (mounted) setState(() => _notifLoading = false);
  }

  Future<void> _signOut() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: Text(context.tr('header.logout')),
        content: Text(context.tr('settings.logout_confirm')),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: Text(context.tr('common.cancel'))),
          TextButton(onPressed: () => Navigator.pop(context, true), child: Text(context.tr('header.logout'))),
        ],
      ),
    );
    if (ok != true) return;
    await ApiService.instance.clearToken();
    widget.onAuthChanged?.call(false);
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final loggedIn = widget.loggedIn || ApiService.instance.isLoggedIn;
    final localeScope = LocaleScope.of(context);
    final currentLang = localeScope != null ? AppLocale.label(localeScope.locale) : 'Français';
    final userName = ApiService.instance.userName ?? context.tr('auth.login');
    final userEmail = ApiService.instance.userEmail ?? '';

    return Scaffold(
      backgroundColor: QdiaColors.pageBg,
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            expandedHeight: 180,
            pinned: true,
            backgroundColor: QdiaColors.primary,
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(colors: [QdiaColors.sidebar, QdiaColors.primary]),
                ),
                child: SafeArea(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
                    child: Row(
                      children: [
                        Container(
                          width: 64,
                          height: 64,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: Colors.white,
                            border: Border.all(color: QdiaColors.gold, width: 2),
                          ),
                          child: ClipOval(child: Image.asset('assets/images/logo.png', fit: BoxFit.cover)),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(userName, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 18)),
                              if (userEmail.isNotEmpty) Text(userEmail, style: const TextStyle(color: Colors.white70, fontSize: 12)),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
            automaticallyImplyLeading: !widget.embedded,
            title: Text(context.tr('mobile.settings'), style: const TextStyle(fontWeight: FontWeight.w800)),
          ),
          SliverPadding(
            padding: EdgeInsets.fromLTRB(16, 12, 16, widget.embedded ? 110 : 32),
            sliver: SliverList(
              delegate: SliverChildListDelegate([
                if (!loggedIn)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: ElevatedButton.icon(
                      onPressed: _openLogin,
                      icon: const Icon(Icons.login_rounded),
                      label: Text(context.tr('auth.login')),
                      style: ElevatedButton.styleFrom(minimumSize: const Size.fromHeight(48)),
                    ),
                  ),
                MobileSettingsGroup(
                  title: context.tr('settings.section_account'),
                  children: [
                    MobileSettingsTile(
                      icon: Icons.person_rounded,
                      title: context.tr('nav.profile'),
                      onTap: loggedIn
                          ? () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ProfileScreen()))
                          : _openLogin,
                    ),
                    if (loggedIn)
                      MobileSettingsTile(
                        icon: Icons.badge_outlined,
                        title: context.tr('verification.title'),
                        onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const VerificationScreen())),
                      ),
                    MobileSettingsTile(
                      icon: Icons.local_shipping_outlined,
                      title: context.tr('mobile.tracking'),
                      subtitle: context.tr('tracking.placeholder'),
                      onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const TrackingScreen())),
                    ),
                  ],
                ),
                MobileSettingsGroup(
                  title: context.tr('settings.section_exporter'),
                  children: [
                    MobileSettingsTile(
                      icon: Icons.bar_chart_rounded,
                      title: context.tr('settings.dashboard'),
                      subtitle: context.tr('settings.dashboard_desc'),
                      onTap: loggedIn
                          ? () => Navigator.push(context, MaterialPageRoute(builder: (_) => const AnalyticsDashboardScreen()))
                          : _openLogin,
                    ),
                    MobileSettingsTile(
                      icon: Icons.inventory_2_outlined,
                      title: context.tr('settings.master_data'),
                      subtitle: context.tr('settings.master_data_desc'),
                      onTap: loggedIn
                          ? () => Navigator.push(context, MaterialPageRoute(builder: (_) => const CatalogImportScreen()))
                          : _openLogin,
                    ),
                    MobileSettingsTile(
                      icon: Icons.auto_fix_high_rounded,
                      title: context.tr('settings.enrichment'),
                      subtitle: context.tr('settings.enrichment_desc'),
                      onTap: loggedIn
                          ? () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ProductEnrichmentScreen()))
                          : _openLogin,
                    ),
                    MobileSettingsTile(
                      icon: Icons.receipt_long_rounded,
                      title: context.tr('nav.billing'),
                      subtitle: context.tr('facturation.subtitle'),
                      onTap: loggedIn
                          ? () => Navigator.push(context, MaterialPageRoute(builder: (_) => const FacturationScreen()))
                          : _openLogin,
                    ),
                    MobileSettingsTile(
                      icon: Icons.request_quote_outlined,
                      title: context.tr('mobile.my_rfqs'),
                      onTap: loggedIn
                          ? () => Navigator.push(context, MaterialPageRoute(builder: (_) => const MyRfqsScreen()))
                          : _openLogin,
                    ),
                    MobileSettingsTile(
                      icon: Icons.chat_bubble_outline_rounded,
                      title: context.tr('mobile.tab_messages'),
                      subtitle: context.tr('messages.start_from_product'),
                      onTap: () {
                        if (!loggedIn) {
                          _openLogin();
                          return;
                        }
                        widget.onOpenMessages?.call();
                      },
                      showDivider: false,
                    ),
                  ],
                ),
                MobileSettingsGroup(
                  title: context.tr('settings.section_preferences'),
                  children: [
                    MobileSettingsTile(
                      icon: Icons.language_rounded,
                      title: context.tr('header.lang'),
                      trailing: currentLang,
                      onTap: _pickLanguage,
                    ),
                    MobileSettingsTile(
                      icon: Icons.notifications_active_rounded,
                      title: context.tr('profile.enable_notifications'),
                      trailingWidget: _notifLoading
                          ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2))
                          : Switch(
                              value: _notifications,
                              activeThumbColor: QdiaColors.gold,
                              onChanged: _toggleNotifications,
                            ),
                    ),
                    MobileSettingsTile(
                      icon: Icons.dark_mode_rounded,
                      title: context.tr('settings.dark_mode'),
                      trailingWidget: Switch(
                        value: _darkMode,
                        activeThumbColor: QdiaColors.gold,
                        onChanged: (v) => setState(() => _darkMode = v),
                      ),
                      showDivider: false,
                    ),
                  ],
                ),
                MobileSettingsGroup(
                  title: context.tr('settings.section_app'),
                  children: [
                    MobileSettingsTile(
                      icon: Icons.info_outline_rounded,
                      title: context.tr('settings.about'),
                      onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const AboutScreen())),
                    ),
                    MobileSettingsTile(
                      icon: Icons.description_outlined,
                      title: context.tr('footer.terms'),
                      onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const TermsScreen())),
                    ),
                    MobileSettingsTile(
                      icon: Icons.privacy_tip_outlined,
                      title: context.tr('footer.privacy'),
                      onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const PrivacyScreen())),
                    ),
                    MobileSettingsTile(
                      icon: Icons.help_outline_rounded,
                      title: context.tr('settings.help_center'),
                      onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const HelpScreen())),
                    ),
                    MobileSettingsTile(
                      icon: Icons.phone_outlined,
                      title: context.tr('settings.support'),
                      trailing: '+213 555 12 34 56',
                      onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const HelpScreen())),
                      showDivider: false,
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: QdiaColors.border),
                  ),
                  child: const Row(
                    children: [
                      Icon(Icons.verified_rounded, color: QdiaColors.primary, size: 28),
                      SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('QDIA Export DZ', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 15)),
                            Text('Version 0.1.0 (beta)', style: TextStyle(fontSize: 12, color: QdiaColors.textMuted)),
                            Text('Made in Algeria 🇩🇿', style: TextStyle(fontSize: 11, color: QdiaColors.primary, fontWeight: FontWeight.w600)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                if (loggedIn) ...[
                  const SizedBox(height: 20),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: _signOut,
                      icon: const Icon(Icons.logout_rounded, color: QdiaColors.danger),
                      label: Text(context.tr('header.logout'), style: const TextStyle(color: QdiaColors.danger, fontWeight: FontWeight.w800)),
                      style: OutlinedButton.styleFrom(
                        minimumSize: const Size.fromHeight(50),
                        side: const BorderSide(color: QdiaColors.danger),
                      ),
                    ),
                  ),
                ],
              ]),
            ),
          ),
        ],
      ),
    );
  }

  void _pickLanguage() {
    final localeScope = LocaleScope.of(context);
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Text(context.tr('header.lang'), style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16)),
            ),
            ...[
              ('fr', 'Français'),
              ('ar', 'العربية'),
              ('en', 'English'),
            ].map((entry) {
              final code = entry.$1;
              final lang = entry.$2;
              final selected = localeScope?.locale.languageCode == code;
              return ListTile(
                title: Text(lang, style: TextStyle(fontWeight: selected ? FontWeight.w800 : FontWeight.w500)),
                trailing: selected ? const Icon(Icons.check_circle, color: QdiaColors.primary) : null,
                onTap: () async {
                  Navigator.pop(context);
                  await localeScope?.setLocale(Locale(code));
                },
              );
            }),
          ],
        ),
      ),
    );
  }
}
