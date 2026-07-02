import 'dart:io';

import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:qdia_mobile/models/app_notification.dart';
import 'package:qdia_mobile/services/notification_prefs.dart';

class LocalNotificationService {
  LocalNotificationService._();
  static final instance = LocalNotificationService._();

  static const _channelId = 'qdia_alerts';
  static const _channelName = 'Alertes QDIA Export';

  final FlutterLocalNotificationsPlugin _plugin = FlutterLocalNotificationsPlugin();
  bool _initialized = false;
  void Function(String? payload)? _onTap;

  Future<void> init({required void Function(String? payload) onTap}) async {
    if (_initialized) return;
    _onTap = onTap;

    const android = AndroidInitializationSettings('@mipmap/ic_launcher');
    await _plugin.initialize(
      const InitializationSettings(android: android),
      onDidReceiveNotificationResponse: (response) {
        _onTap?.call(response.payload);
      },
    );

    final androidPlugin = _plugin.resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();
    await androidPlugin?.createNotificationChannel(
      const AndroidNotificationChannel(
        _channelId,
        _channelName,
        description: 'RFQ, messages B2B, colis et vérification exportateur',
        importance: Importance.high,
        playSound: true,
        enableVibration: true,
      ),
    );

    _initialized = true;
  }

  Future<bool> requestPermission() async {
    if (!Platform.isAndroid) return true;

    final androidPlugin = _plugin.resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();
    final apiGranted = await androidPlugin?.requestNotificationsPermission();
    if (apiGranted == true) return true;

    final status = await Permission.notification.request();
    return status.isGranted;
  }

  Future<bool> hasPermission() async {
    if (!Platform.isAndroid) return true;
    return (await Permission.notification.status).isGranted;
  }

  Future<void> show(AppNotification notification) async {
    if (!_initialized) return;
    if (!await NotificationPrefs.isEnabled()) return;

    final id = notification.id.hashCode.abs() % 2147483646 + 1;
    final details = AndroidNotificationDetails(
      _channelId,
      _channelName,
      channelDescription: 'Alertes marketplace export QDIA',
      importance: Importance.high,
      priority: Priority.high,
      icon: '@mipmap/ic_launcher',
      styleInformation: BigTextStyleInformation(notification.body),
      category: AndroidNotificationCategory.message,
    );

    await _plugin.show(
      id,
      notification.title,
      notification.body,
      NotificationDetails(android: details),
      payload: notification.id,
    );
  }

  Future<void> showUnreadBatch(List<AppNotification> items) async {
    final unread = items.where((n) => !n.read).toList();
    for (var i = 0; i < unread.length; i++) {
      if (i > 0) await Future.delayed(const Duration(milliseconds: 700));
      await show(unread[i]);
    }
  }

  Future<void> cancelAll() async {
    await _plugin.cancelAll();
  }
}
