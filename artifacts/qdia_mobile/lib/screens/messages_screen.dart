import 'dart:async';

import 'package:flutter/material.dart';
import 'package:qdia_mobile/l10n/app_strings.dart';
import 'package:qdia_mobile/screens/message_thread_screen.dart';
import 'package:qdia_mobile/screens/login_screen.dart';
import 'package:qdia_mobile/services/api_service.dart';
import 'package:qdia_mobile/theme/qdia_theme.dart';

class MessagesScreen extends StatefulWidget {
  const MessagesScreen({super.key, this.onLoginRequired});

  final VoidCallback? onLoginRequired;

  @override
  State<MessagesScreen> createState() => _MessagesScreenState();
}

class _MessagesScreenState extends State<MessagesScreen> {
  List<Map<String, dynamic>> _threads = [];
  bool _loading = true;
  bool _needsLogin = false;
  QdiaWebSocket? _ws;
  StreamSubscription<Map<String, dynamic>>? _wsSub;
  final _searchCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
    _connectWs();
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    _wsSub?.cancel();
    _ws?.disconnect();
    super.dispose();
  }

  Future<void> _connectWs() async {
    await ApiService.instance.loadToken();
    if (!ApiService.instance.isLoggedIn) return;
    _ws = QdiaWebSocket();
    _wsSub = _ws!.events.listen((event) {
      final type = event['type']?.toString();
      if (type == 'message:new' || type == 'message:sent') {
        _load();
      }
    });
    await _ws!.connect();
  }

  Future<void> _load() async {
    await ApiService.instance.loadToken();
    if (!ApiService.instance.isLoggedIn) {
      setState(() {
        _loading = false;
        _needsLogin = true;
        _threads = [];
      });
      return;
    }
    setState(() {
      _loading = true;
      _needsLogin = false;
    });
    try {
      final raw = await ApiService.instance.getMessageThreads();
      setState(() => _threads = raw.cast<Map<String, dynamic>>());
    } catch (_) {
      setState(() => _threads = []);
    }
    if (mounted) setState(() => _loading = false);
  }

  List<Map<String, dynamic>> get _filteredThreads {
    final q = _searchCtrl.text.trim().toLowerCase();
    if (q.isEmpty) return _threads;
    return _threads
        .where((t) => (t['partner_name']?.toString().toLowerCase() ?? '').contains(q))
        .toList();
  }

  void _openLogin() {
    if (widget.onLoginRequired != null) {
      widget.onLoginRequired!();
      return;
    }
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => LoginScreen(onLogin: () {
        Navigator.pop(context);
        _load();
        _connectWs();
      })),
    );
  }

  void _openThread(Map<String, dynamic> t) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => MessageThreadScreen(
          partnerId: t['partner_id'] as int,
          partnerName: t['partner_name']?.toString() ?? context.tr('messages.contact'),
          partnerRole: t['partner_role']?.toString(),
          ws: _ws,
        ),
      ),
    ).then((_) => _load());
  }

  void _composeMessage() {
    if (_needsLogin) {
      _openLogin();
      return;
    }
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(context.tr('messages.start_from_product'))),
    );
  }

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: QdiaColors.pageBg,
      child: Column(
        children: [
          Container(
            width: double.infinity,
            padding: EdgeInsets.fromLTRB(16, MediaQuery.paddingOf(context).top + 10, 16, 14),
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [QdiaColors.sidebar, QdiaColors.primary],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        context.tr('mobile.tab_messages'),
                        style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w900),
                      ),
                    ),
                    if (_ws?.isConnected == true)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.circle, size: 8, color: QdiaColors.success),
                            const SizedBox(width: 4),
                            Text(context.tr('messages.online'), style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w700)),
                          ],
                        ),
                      ),
                    IconButton(
                      onPressed: _composeMessage,
                      icon: const Icon(Icons.edit_square, color: Colors.white),
                      tooltip: context.tr('messages.new_message'),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _searchCtrl,
                  onChanged: (_) => setState(() {}),
                  style: const TextStyle(fontSize: 13),
                  decoration: InputDecoration(
                    hintText: context.tr('messages.search_contact'),
                    prefixIcon: const Icon(Icons.search, size: 20),
                    filled: true,
                    fillColor: Colors.white,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
                    contentPadding: const EdgeInsets.symmetric(vertical: 0),
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _needsLogin
                    ? _EmptyState(
                        icon: Icons.lock_outline_rounded,
                        title: context.tr('messages.login_required'),
                        actionLabel: context.tr('auth.login'),
                        onAction: _openLogin,
                      )
                    : _filteredThreads.isEmpty
                        ? _EmptyState(
                            icon: Icons.chat_bubble_outline_rounded,
                            title: context.tr('messages.no_messages'),
                            actionLabel: context.tr('messages.new_message'),
                            onAction: _composeMessage,
                          )
                        : ListView.separated(
                            padding: const EdgeInsets.fromLTRB(12, 12, 12, 110),
                            itemCount: _filteredThreads.length,
                            separatorBuilder: (context, index) => const SizedBox(height: 8),
                            itemBuilder: (_, i) => _ThreadTile(
                              thread: _filteredThreads[i],
                              onTap: () => _openThread(_filteredThreads[i]),
                            ),
                          ),
          ),
        ],
      ),
    );
  }
}

class _ThreadTile extends StatelessWidget {
  const _ThreadTile({required this.thread, required this.onTap});

  final Map<String, dynamic> thread;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final name = thread['partner_name']?.toString() ?? '';
    final last = thread['last_message']?.toString() ?? '';
    final lastAt = thread['last_at']?.toString();
    final unread = (thread['unread'] as num?)?.toInt() ?? 0;
    final role = thread['partner_role']?.toString() ?? '';

    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: QdiaColors.border),
            boxShadow: [
              BoxShadow(color: Colors.black.withValues(alpha: 0.03), blurRadius: 8, offset: const Offset(0, 2)),
            ],
          ),
          child: Row(
            children: [
              CircleAvatar(
                radius: 24,
                backgroundColor: QdiaColors.primaryLight,
                child: Text(
                  name.isNotEmpty ? name.substring(0, 1).toUpperCase() : '?',
                  style: const TextStyle(color: QdiaColors.primary, fontWeight: FontWeight.w900, fontSize: 18),
                ),
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
                            name,
                            style: TextStyle(fontWeight: unread > 0 ? FontWeight.w900 : FontWeight.w700, fontSize: 14, color: QdiaColors.navy),
                          ),
                        ),
                        if (role.isNotEmpty)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: QdiaColors.primaryLight,
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(role, style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: QdiaColors.primary)),
                          ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      last,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontSize: 12, color: unread > 0 ? QdiaColors.textBody : QdiaColors.textMuted, fontWeight: unread > 0 ? FontWeight.w600 : FontWeight.w400),
                    ),
                    if (lastAt != null)
                      Text(_formatThreadTime(lastAt), style: const TextStyle(fontSize: 10, color: QdiaColors.textMuted)),
                  ],
                ),
              ),
              if (unread > 0)
                Container(
                  margin: const EdgeInsets.only(left: 8),
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: const BoxDecoration(color: QdiaColors.primary, borderRadius: BorderRadius.all(Radius.circular(12))),
                  child: Text('$unread', style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w800)),
                ),
            ],
          ),
        ),
      ),
    );
  }

  static String _formatThreadTime(String iso) {
    try {
      final dt = DateTime.parse(iso).toLocal();
      final now = DateTime.now();
      if (dt.year == now.year && dt.month == now.month && dt.day == now.day) {
        return '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
      }
      return '${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')}';
    } catch (_) {
      return '';
    }
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.icon, required this.title, required this.actionLabel, required this.onAction});

  final IconData icon;
  final String title;
  final String actionLabel;
  final VoidCallback onAction;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 56, color: QdiaColors.textMuted.withValues(alpha: 0.5)),
            const SizedBox(height: 16),
            Text(title, textAlign: TextAlign.center, style: const TextStyle(color: QdiaColors.textMuted, fontWeight: FontWeight.w600)),
            const SizedBox(height: 16),
            ElevatedButton(onPressed: onAction, child: Text(actionLabel)),
          ],
        ),
      ),
    );
  }
}
