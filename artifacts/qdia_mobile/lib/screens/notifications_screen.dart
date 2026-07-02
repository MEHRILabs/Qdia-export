import 'package:flutter/material.dart';
import 'package:qdia_mobile/l10n/app_strings.dart';
import 'package:qdia_mobile/models/app_notification.dart';
import 'package:qdia_mobile/services/notification_prefs.dart';
import 'package:qdia_mobile/services/notification_store.dart';
import 'package:qdia_mobile/theme/qdia_theme.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key, this.onOpenSettings});

  final VoidCallback? onOpenSettings;

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  final _store = NotificationStore.instance;
  bool _enabled = true;
  bool _showUnreadOnly = false;

  @override
  void initState() {
    super.initState();
    _store.addListener(_onStoreChanged);
    _loadPrefs();
  }

  @override
  void dispose() {
    _store.removeListener(_onStoreChanged);
    super.dispose();
  }

  void _onStoreChanged() {
    if (mounted) setState(() {});
  }

  Future<void> _loadPrefs() async {
    final enabled = await NotificationPrefs.isEnabled();
    if (mounted) setState(() => _enabled = enabled);
  }

  List<AppNotification> get _visible {
    final list = _store.items;
    if (_showUnreadOnly) return list.where((n) => !n.read).toList();
    return list;
  }

  String _timeAgo(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 1) return 'À l\'instant';
    if (diff.inMinutes < 60) return 'Il y a ${diff.inMinutes} min';
    if (diff.inHours < 24) return 'Il y a ${diff.inHours} h';
    if (diff.inDays < 7) return 'Il y a ${diff.inDays} j';
    return '${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final items = _visible;
    final unread = _store.unreadCount;

    return Scaffold(
      backgroundColor: QdiaColors.pageBg,
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            expandedHeight: 120,
            pinned: true,
            backgroundColor: QdiaColors.primary,
            actions: [
              if (_enabled && items.isNotEmpty)
                TextButton(
                  onPressed: () => _store.markAllRead(),
                  child: Text(
                    context.tr('notifications.mark_all_read'),
                    style: const TextStyle(color: QdiaColors.gold, fontWeight: FontWeight.w700, fontSize: 12),
                  ),
                ),
            ],
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(colors: [QdiaColors.sidebar, QdiaColors.primary]),
                ),
                child: SafeArea(
                  bottom: false,
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(56, 8, 16, 0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          context.tr('notifications.title'),
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 22),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          _enabled
                              ? unread > 0
                                  ? context.tr('notifications.unread_count').replaceAll('{n}', '$unread')
                                  : context.tr('notifications.all_read')
                              : context.tr('notifications.disabled_hint'),
                          style: const TextStyle(color: Colors.white70, fontSize: 13),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
            title: Text(context.tr('notifications.title'), style: const TextStyle(fontWeight: FontWeight.w800)),
          ),
          if (_enabled)
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
                child: Row(
                  children: [
                    _FilterChip(
                      label: context.tr('notifications.all'),
                      selected: !_showUnreadOnly,
                      onTap: () => setState(() => _showUnreadOnly = false),
                    ),
                    const SizedBox(width: 8),
                    _FilterChip(
                      label: context.tr('notifications.unread'),
                      selected: _showUnreadOnly,
                      badge: unread > 0 ? '$unread' : null,
                      onTap: () => setState(() => _showUnreadOnly = true),
                    ),
                  ],
                ),
              ),
            ),
          if (!_enabled)
            SliverFillRemaining(
              hasScrollBody: false,
              child: _EmptyState(
                icon: Icons.notifications_off_outlined,
                title: context.tr('notifications.disabled_title'),
                subtitle: context.tr('notifications.disabled_subtitle'),
                actionLabel: context.tr('notifications.open_settings'),
                onAction: () {
                  Navigator.pop(context);
                  widget.onOpenSettings?.call();
                },
              ),
            )
          else if (items.isEmpty)
            SliverFillRemaining(
              hasScrollBody: false,
              child: _EmptyState(
                icon: Icons.notifications_none_rounded,
                title: context.tr('notifications.empty_title'),
                subtitle: context.tr('notifications.empty_subtitle'),
              ),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
              sliver: SliverList(
                delegate: SliverChildBuilderDelegate(
                  (context, index) {
                    final n = items[index];
                    return _NotificationTile(
                      notification: n,
                      timeLabel: _timeAgo(n.createdAt),
                      onTap: () => _store.markRead(n.id),
                      onDismiss: () => _store.delete(n.id),
                    );
                  },
                  childCount: items.length,
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  const _FilterChip({
    required this.label,
    required this.selected,
    required this.onTap,
    this.badge,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;
  final String? badge;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected ? QdiaColors.primary : Colors.white,
      borderRadius: BorderRadius.circular(20),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(20),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: selected ? QdiaColors.primary : QdiaColors.border),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                label,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: selected ? Colors.white : QdiaColors.textBody,
                ),
              ),
              if (badge != null) ...[
                const SizedBox(width: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: selected ? QdiaColors.gold : QdiaColors.danger,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    badge!,
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                      color: selected ? QdiaColors.navy : Colors.white,
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _NotificationTile extends StatelessWidget {
  const _NotificationTile({
    required this.notification,
    required this.timeLabel,
    required this.onTap,
    required this.onDismiss,
  });

  final AppNotification notification;
  final String timeLabel;
  final VoidCallback onTap;
  final VoidCallback onDismiss;

  @override
  Widget build(BuildContext context) {
    final color = categoryColor(notification.category);
    final icon = categoryIcon(notification.category);

    return Dismissible(
      key: ValueKey(notification.id),
      direction: DismissDirection.endToStart,
      onDismissed: (_) => onDismiss(),
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 20),
        margin: const EdgeInsets.only(bottom: 10),
        decoration: BoxDecoration(
          color: QdiaColors.danger.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(16),
        ),
        child: const Icon(Icons.delete_outline_rounded, color: QdiaColors.danger),
      ),
      child: Material(
        color: notification.read ? Colors.white : QdiaColors.primaryLight,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(16),
          child: Container(
            margin: const EdgeInsets.only(bottom: 10),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: notification.read ? QdiaColors.border : QdiaColors.primary.withValues(alpha: 0.25),
              ),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(icon, color: color, size: 22),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              notification.title,
                              style: TextStyle(
                                fontWeight: notification.read ? FontWeight.w600 : FontWeight.w800,
                                fontSize: 14,
                                color: QdiaColors.navy,
                              ),
                            ),
                          ),
                          if (!notification.read)
                            Container(
                              width: 8,
                              height: 8,
                              decoration: const BoxDecoration(color: QdiaColors.primary, shape: BoxShape.circle),
                            ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        notification.body,
                        style: const TextStyle(fontSize: 12, color: QdiaColors.textBody, height: 1.35),
                        maxLines: 3,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 6),
                      Text(timeLabel, style: const TextStyle(fontSize: 11, color: QdiaColors.textMuted)),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({
    required this.icon,
    required this.title,
    required this.subtitle,
    this.actionLabel,
    this.onAction,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              color: QdiaColors.primaryLight,
              shape: BoxShape.circle,
            ),
            child: Icon(icon, size: 40, color: QdiaColors.primary),
          ),
          const SizedBox(height: 20),
          Text(title, textAlign: TextAlign.center, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 17)),
          const SizedBox(height: 8),
          Text(subtitle, textAlign: TextAlign.center, style: const TextStyle(color: QdiaColors.textMuted, fontSize: 13)),
          if (actionLabel != null && onAction != null) ...[
            const SizedBox(height: 20),
            ElevatedButton.icon(
              onPressed: onAction,
              icon: const Icon(Icons.settings_rounded),
              label: Text(actionLabel!),
            ),
          ],
        ],
      ),
    );
  }
}
