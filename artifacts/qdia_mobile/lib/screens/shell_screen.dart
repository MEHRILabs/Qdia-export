import 'package:flutter/material.dart';
import 'package:qdia_mobile/models/product.dart';
import 'package:qdia_mobile/screens/facturation_screen.dart';
import 'package:qdia_mobile/screens/message_thread_screen.dart';
import 'package:qdia_mobile/screens/notifications_screen.dart';
import 'package:qdia_mobile/screens/qr_scan_screen.dart';
import 'package:qdia_mobile/screens/settings_screen.dart';
import 'package:qdia_mobile/screens/categories_screen.dart';
import 'package:qdia_mobile/screens/home_screen.dart';
import 'package:qdia_mobile/screens/login_screen.dart';
import 'package:qdia_mobile/screens/messages_screen.dart';
import 'package:qdia_mobile/screens/product_detail_screen.dart';
import 'package:qdia_mobile/screens/rfq_screen.dart';
import 'package:qdia_mobile/screens/search_screen.dart';
import 'package:qdia_mobile/screens/tracking_screen.dart';
import 'package:qdia_mobile/services/api_service.dart';
import 'package:qdia_mobile/services/favorites_service.dart';
import 'package:qdia_mobile/services/notification_prefs.dart';
import 'package:qdia_mobile/services/notification_store.dart';
import 'package:qdia_mobile/l10n/app_strings.dart';
import 'package:qdia_mobile/theme/qdia_theme.dart';
import 'package:qdia_mobile/widgets/curved_bottom_nav.dart';

class ShellScreen extends StatefulWidget {
  const ShellScreen({super.key});

  @override
  State<ShellScreen> createState() => _ShellScreenState();
}

class _ShellScreenState extends State<ShellScreen> {
  int _tab = 0;
  bool _loggedIn = false;
  final _rfqItems = <RfqItem>[];

  final _notificationStore = NotificationStore.instance;

  @override
  void initState() {
    super.initState();
    _notificationStore.load();
    _notificationStore.addListener(_onNotificationsChanged);
    _checkAuth();
  }

  @override
  void dispose() {
    _notificationStore.removeListener(_onNotificationsChanged);
    super.dispose();
  }

  void _onNotificationsChanged() {
    if (mounted) setState(() {});
  }

  void _openNotifications() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => NotificationsScreen(
          onOpenSettings: () => setState(() => _tab = 4),
        ),
      ),
    );
  }

  int get _notificationCount {
    if (!_loggedIn) return 0;
    return _notificationStore.unreadCount;
  }

  Future<void> _checkAuth() async {
    await ApiService.instance.loadToken();
    if (ApiService.instance.isLoggedIn) {
      await FavoritesService.instance.syncFromApi();
      final enabled = await NotificationPrefs.isEnabled();
      if (enabled && _notificationStore.items.isEmpty) {
        await _notificationStore.enable(userName: ApiService.instance.userName);
      }
    }
    if (mounted) setState(() => _loggedIn = ApiService.instance.isLoggedIn);
  }

  void _openLogin() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => LoginScreen(onLogin: () async {
          await FavoritesService.instance.syncFromApi();
          if (!mounted) return;
          setState(() => _loggedIn = true);
          Navigator.pop(context);
        }),
      ),
    );
  }

  void _openProduct(Product product) {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => ProductDetailScreen(
        product: product,
        onAddRfq: _addToRfq,
        onContactSupplier: _contactSupplier,
      )),
    );
  }

  void _contactSupplier(Product product) {
    if (!_loggedIn) {
      _openLogin();
      return;
    }
    final myId = ApiService.instance.userId ?? 1;
    final partnerId = myId == 1 ? 2 : 1;
    final partnerName = myId == 1 ? 'Admin QDIA' : product.supplierName;
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => MessageThreadScreen(
          partnerId: partnerId,
          partnerName: partnerName,
          partnerRole: myId == 1 ? 'admin' : 'supplier',
          productName: product.name,
          productId: product.id,
        ),
      ),
    );
  }

  void _openSearch() {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => SearchScreen(onProductTap: _openProduct)),
    );
  }

  Future<void> _openQrScan() async {
    final code = await Navigator.of(context).push<String>(
      MaterialPageRoute(builder: (_) => QrScanScreen(onResult: (_) {})),
    );
    if (code == null || !mounted) return;
    final normalized = normalizeScanCode(code);
    try {
      final productId = parseProductIdFromQr(normalized);
      final Map<String, dynamic> raw;
      if (productId != null) {
        raw = await ApiService.instance.getProduct(productId);
      } else {
        raw = await ApiService.instance.lookupProduct(normalized);
      }
      final json = raw['product'] as Map<String, dynamic>? ?? raw;
      if (!mounted) return;
      _openProduct(Product.fromJson(json));
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('${context.tr('common.error')}: code « $normalized » introuvable')),
      );
    }
  }

  void _addToRfq(Product product) {
    final existing = _rfqItems.indexWhere((e) => e.product.id == product.id);
    setState(() {
      if (existing >= 0) {
        final item = _rfqItems[existing];
        _rfqItems[existing] = RfqItem(product: item.product, quantity: item.quantity + product.moq);
      } else {
        _rfqItems.add(RfqItem(product: product, quantity: product.moq));
      }
    });
    NotificationPrefs.isEnabled().then((on) {
      if (on) NotificationStore.instance.pushRfqAdded(product.name);
    });
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('${product.name} ${context.tr('rfq.added_to_quote')}'),
        backgroundColor: QdiaColors.primary,
        behavior: SnackBarBehavior.floating,
        action: SnackBarAction(
          label: context.tr('common.view'),
          textColor: QdiaColors.gold,
          onPressed: () => Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => RfqScreen(
              items: _rfqItems,
              onRemove: (id) => setState(() => _rfqItems.removeWhere((e) => e.product.id == id)),
              onLoginRequired: _openLogin,
              onSubmitted: () => setState(() => _rfqItems.clear()),
            )),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final pages = [
      HomeScreen(
        onProductTap: _openProduct,
        onSearchTap: _openSearch,
        onQrTap: _openQrScan,
        onNotificationTap: _openNotifications,
        notificationCount: _notificationCount,
        onMessagesTap: () => setState(() => _tab = 2),
        onFacturationTap: () {
          if (!_loggedIn) {
            _openLogin();
            return;
          }
          Navigator.push(context, MaterialPageRoute(builder: (_) => const FacturationScreen()));
        },
        onTrackingTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const TrackingScreen())),
        isLoggedIn: _loggedIn,
        onLoginTap: _openLogin,
      ),
      CategoriesScreen(onProductTap: _openProduct, onSearchTap: _openSearch, onQrTap: _openQrScan),
      MessagesScreen(onLoginRequired: _openLogin),
      RfqScreen(
        items: _rfqItems,
        onRemove: (id) => setState(() => _rfqItems.removeWhere((e) => e.product.id == id)),
        onLoginRequired: _openLogin,
        onSubmitted: () => setState(() => _rfqItems.clear()),
      ),
      SettingsScreen(
        embedded: true,
        loggedIn: _loggedIn,
        onAuthChanged: (v) => setState(() => _loggedIn = v),
        onOpenMessages: () => setState(() => _tab = 2),
      ),
    ];

    return Scaffold(
      backgroundColor: QdiaColors.pageBg,
      body: IndexedStack(index: _tab, children: pages),
      extendBody: true,
      bottomNavigationBar: CurvedBottomNav(
        currentIndex: _tab,
        hasMessageBadge: _loggedIn,
        rfqCount: _rfqItems.length,
        onFabTap: () => Navigator.pushNamed(context, '/agent-ia'),
        onTap: (i) {
          if (i == 2) {
            setState(() => _tab = 2);
          } else if (i == 4) {
            setState(() => _tab = 4);
          } else {
            setState(() => _tab = i);
          }
        },
      ),
    );
  }
}
