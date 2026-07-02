import 'package:flutter/material.dart';

enum NotificationCategory { system, rfq, message, shipping, verification, trade }

class AppNotification {
  AppNotification({
    required this.id,
    required this.title,
    required this.body,
    required this.category,
    required this.createdAt,
    this.read = false,
  });

  final String id;
  final String title;
  final String body;
  final NotificationCategory category;
  final DateTime createdAt;
  bool read;

  Map<String, dynamic> toJson() => {
    'id': id,
    'title': title,
    'body': body,
    'category': category.name,
    'createdAt': createdAt.toIso8601String(),
    'read': read,
  };

  factory AppNotification.fromJson(Map<String, dynamic> json) {
    return AppNotification(
      id: json['id'] as String,
      title: json['title'] as String,
      body: json['body'] as String,
      category: NotificationCategory.values.firstWhere(
        (c) => c.name == json['category'],
        orElse: () => NotificationCategory.system,
      ),
      createdAt: DateTime.parse(json['createdAt'] as String),
      read: json['read'] as bool? ?? false,
    );
  }
}

IconData categoryIcon(NotificationCategory c) {
  switch (c) {
    case NotificationCategory.rfq:
      return Icons.request_quote_rounded;
    case NotificationCategory.message:
      return Icons.chat_bubble_outline_rounded;
    case NotificationCategory.shipping:
      return Icons.local_shipping_outlined;
    case NotificationCategory.verification:
      return Icons.verified_user_outlined;
    case NotificationCategory.trade:
      return Icons.shield_outlined;
    case NotificationCategory.system:
      return Icons.notifications_active_rounded;
  }
}

Color categoryColor(NotificationCategory c) {
  switch (c) {
    case NotificationCategory.rfq:
      return const Color(0xFF0461A5);
    case NotificationCategory.message:
      return const Color(0xFF7C3AED);
    case NotificationCategory.shipping:
      return const Color(0xFF04BB7B);
    case NotificationCategory.verification:
      return const Color(0xFFD4A910);
    case NotificationCategory.trade:
      return const Color(0xFF034E85);
    case NotificationCategory.system:
      return const Color(0xFF0461A5);
  }
}
