import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:qdia_mobile/models/app_notification.dart';
import 'package:qdia_mobile/services/notification_prefs.dart';
import 'package:qdia_mobile/services/local_notification_service.dart';
import 'package:shared_preferences/shared_preferences.dart';

class NotificationStore extends ChangeNotifier {
  NotificationStore._();
  static final instance = NotificationStore._();

  static const _storageKey = 'qdia_notifications_list';

  List<AppNotification> _items = [];
  bool _loaded = false;

  List<AppNotification> get items => List.unmodifiable(_items);
  int get unreadCount => _items.where((n) => !n.read).length;
  bool get isLoaded => _loaded;

  Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_storageKey);
    if (raw != null) {
      try {
        final list = (jsonDecode(raw) as List).cast<Map<String, dynamic>>();
        _items = list.map(AppNotification.fromJson).toList()
          ..sort((a, b) => b.createdAt.compareTo(a.createdAt));
      } catch (_) {
        _items = [];
      }
    }
    _loaded = true;
    notifyListeners();
  }

  Future<void> _persist() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      _storageKey,
      jsonEncode(_items.map((n) => n.toJson()).toList()),
    );
    notifyListeners();
  }

  List<AppNotification> seedNotifications({String? userName}) {
    final now = DateTime.now();
    final name = userName?.trim().isNotEmpty == true ? userName!.trim() : 'Exportateur';
    return [
      AppNotification(
        id: 'welcome',
        title: 'Bienvenue sur QDIA Export DZ 🇩🇿',
        body: 'Bonjour $name — votre espace export B2B est prêt. Explorez le catalogue et publiez vos produits.',
        category: NotificationCategory.system,
        createdAt: now.subtract(const Duration(minutes: 2)),
      ),
      AppNotification(
        id: 'rfq-1',
        title: 'Nouvelle demande de devis (RFQ)',
        body: 'Un acheteur en France demande 500 L d\'huile d\'olive extra vierge — répondez sous 48 h.',
        category: NotificationCategory.rfq,
        createdAt: now.subtract(const Duration(hours: 1)),
      ),
      AppNotification(
        id: 'msg-1',
        title: 'Message B2B — Importateur Paris',
        body: '« Bonjour, nous souhaitons un échantillon et vos certificats halal pour export UE. »',
        category: NotificationCategory.message,
        createdAt: now.subtract(const Duration(hours: 3)),
      ),
      AppNotification(
        id: 'ship-1',
        title: 'Colis en transit — DHL #QDIA-2847',
        body: 'Votre envoi est parti du port de Béjaïa. Arrivée estimée à Marseille sous 5 jours.',
        category: NotificationCategory.shipping,
        createdAt: now.subtract(const Duration(hours: 6)),
      ),
      AppNotification(
        id: 'verif-1',
        title: 'Vérification exportateur — étape 2/5',
        body: 'Téléversez votre RC et NIF pour débloquer le badge Argent et plus de visibilité.',
        category: NotificationCategory.verification,
        createdAt: now.subtract(const Duration(hours: 12)),
        read: true,
      ),
      AppNotification(
        id: 'trade-1',
        title: 'Trade Assurance activée',
        body: 'Vos transactions sont couvertes jusqu\'à 10 000 USD. Paiement escrow disponible.',
        category: NotificationCategory.trade,
        createdAt: now.subtract(const Duration(days: 1)),
        read: true,
      ),
    ];
  }

  Future<void> enable({String? userName}) async {
    await NotificationPrefs.setEnabled(true);
    if (_items.isEmpty) {
      _items = seedNotifications(userName: userName);
      await _persist();
      await LocalNotificationService.instance.showUnreadBatch(_items);
    } else {
      notifyListeners();
    }
  }

  Future<void> disable() async {
    await NotificationPrefs.setEnabled(false);
    await LocalNotificationService.instance.cancelAll();
    _items = [];
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_storageKey);
    notifyListeners();
  }

  Future<void> add(AppNotification notification) async {
    if (!await NotificationPrefs.isEnabled()) return;
    _items.insert(0, notification);
    await _persist();
    await LocalNotificationService.instance.show(notification);
  }

  Future<void> markRead(String id) async {
    final i = _items.indexWhere((n) => n.id == id);
    if (i < 0 || _items[i].read) return;
    _items[i].read = true;
    await _persist();
  }

  Future<void> markAllRead() async {
    for (final n in _items) {
      n.read = true;
    }
    await _persist();
  }

  Future<void> delete(String id) async {
    _items.removeWhere((n) => n.id == id);
    await _persist();
  }

  Future<void> pushRfqAdded(String productName) async {
    await add(AppNotification(
      id: 'rfq-local-${DateTime.now().millisecondsSinceEpoch}',
      title: 'Produit ajouté au devis',
      body: '$productName a été ajouté à votre panier RFQ.',
      category: NotificationCategory.rfq,
      createdAt: DateTime.now(),
    ));
  }
}
