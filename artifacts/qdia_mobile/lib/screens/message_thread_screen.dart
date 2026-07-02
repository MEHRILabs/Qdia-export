import 'dart:async';

import 'package:flutter/material.dart';
import 'package:qdia_mobile/l10n/app_strings.dart';
import 'package:qdia_mobile/models/app_notification.dart';
import 'package:qdia_mobile/services/api_service.dart';
import 'package:qdia_mobile/services/notification_prefs.dart';
import 'package:qdia_mobile/services/notification_store.dart';
import 'package:qdia_mobile/theme/qdia_theme.dart';

/// Ouvre une conversation B2B avec un partenaire (depuis fiche produit ou liste).
class MessageThreadScreen extends StatefulWidget {
  const MessageThreadScreen({
    super.key,
    required this.partnerId,
    required this.partnerName,
    this.partnerRole,
    this.ws,
    this.productName,
    this.productId,
  });

  final int partnerId;
  final String partnerName;
  final String? partnerRole;
  final QdiaWebSocket? ws;
  final String? productName;
  final int? productId;

  @override
  State<MessageThreadScreen> createState() => _MessageThreadScreenState();
}

class _MessageThreadScreenState extends State<MessageThreadScreen> {
  List<Map<String, dynamic>> _msgs = [];
  final _ctrl = TextEditingController();
  final _scrollCtrl = ScrollController();
  bool _partnerTyping = false;
  bool _sending = false;
  StreamSubscription<Map<String, dynamic>>? _wsSub;

  List<String> _quickReplies(BuildContext context) => [
    context.tr('messages.quick_rfq'),
    context.tr('messages.quick_sample'),
    context.tr('messages.quick_halal'),
    context.tr('messages.quick_moq'),
  ];

  @override
  void initState() {
    super.initState();
    _load();
    _wsSub = widget.ws?.events.listen(_handleWsEvent);
  }

  @override
  void dispose() {
    _wsSub?.cancel();
    _ctrl.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  void _handleWsEvent(Map<String, dynamic> event) {
    final type = event['type']?.toString();
    if (type == 'typing' && event['sender_id'] == widget.partnerId) {
      if (mounted) setState(() => _partnerTyping = true);
      Future.delayed(const Duration(seconds: 2), () {
        if (mounted) setState(() => _partnerTyping = false);
      });
      return;
    }
    if (type != 'message:new' && type != 'message:sent') return;
    final msg = event['message'] as Map<String, dynamic>?;
    if (msg == null) return;
    final sender = msg['sender_id'] as int?;
    final receiver = msg['receiver_id'] as int?;
    if (sender == widget.partnerId || receiver == widget.partnerId) {
      if (mounted) {
        setState(() {
          if (!_msgs.any((m) => m['id'] == msg['id'])) {
            _msgs.add(msg);
          }
        });
        _scrollToBottom();
        if (sender == widget.partnerId) _notifyIncoming(msg);
      }
    }
  }

  Future<void> _notifyIncoming(Map<String, dynamic> msg) async {
    if (!await NotificationPrefs.isEnabled()) return;
    await NotificationStore.instance.add(AppNotification(
      id: 'msg-${msg['id']}',
      title: 'Message — ${widget.partnerName}',
      body: msg['body']?.toString() ?? '',
      category: NotificationCategory.message,
      createdAt: DateTime.now(),
    ));
  }

  Future<void> _load() async {
    try {
      final raw = await ApiService.instance.getMessageThread(widget.partnerId);
      if (mounted) {
        setState(() => _msgs = raw.cast<Map<String, dynamic>>());
        _scrollToBottom();
      }
    } catch (_) {}
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollCtrl.hasClients) {
        _scrollCtrl.animateTo(
          _scrollCtrl.position.maxScrollExtent,
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _send([String? preset]) async {
    final text = (preset ?? _ctrl.text).trim();
    if (text.isEmpty || _sending) return;
    setState(() => _sending = true);
    if (preset == null) _ctrl.clear();

    final myId = ApiService.instance.userId ?? 1;
    final optimistic = {
      'id': DateTime.now().millisecondsSinceEpoch,
      'sender_id': myId,
      'receiver_id': widget.partnerId,
      'body': text,
      'created_at': DateTime.now().toIso8601String(),
      'read': false,
    };
    setState(() => _msgs.add(optimistic));
    _scrollToBottom();

    try {
      await ApiService.instance.sendMessage(receiverId: widget.partnerId, body: text);
      await _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    }
    if (mounted) setState(() => _sending = false);
  }

  void _onTyping(String _) => widget.ws?.sendTyping(widget.partnerId);

  bool _isMine(Map<String, dynamic> m) {
    final sender = (m['sender_id'] as num?)?.toInt();
    final myId = ApiService.instance.userId;
    return myId != null && sender == myId;
  }

  String _formatTime(String? iso) {
    if (iso == null) return '';
    try {
      final dt = DateTime.parse(iso).toLocal();
      return '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
    } catch (_) {
      return '';
    }
  }

  String _dateLabel(String? iso) {
    if (iso == null) return '';
    try {
      final dt = DateTime.parse(iso).toLocal();
      final now = DateTime.now();
      if (dt.year == now.year && dt.month == now.month && dt.day == now.day) {
        return "Aujourd'hui";
      }
      return '${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')}/${dt.year}';
    } catch (_) {
      return '';
    }
  }

  void _showAttachMenu() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.request_quote_rounded, color: QdiaColors.primary),
              title: Text(ctx.tr('messages.attach_rfq')),
              onTap: () {
                Navigator.pop(ctx);
                _send(ctx.tr('messages.attach_rfq_body'));
              },
            ),
            ListTile(
              leading: const Icon(Icons.description_outlined, color: QdiaColors.primary),
              title: Text(ctx.tr('messages.attach_cert')),
              onTap: () {
                Navigator.pop(ctx);
                _send(ctx.tr('messages.attach_cert_body'));
              },
            ),
            ListTile(
              leading: const Icon(Icons.local_shipping_outlined, color: QdiaColors.primary),
              title: Text(ctx.tr('messages.attach_shipping')),
              onTap: () {
                Navigator.pop(ctx);
                _send(ctx.tr('messages.attach_shipping_body'));
              },
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: QdiaColors.pageBg,
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(widget.partnerName, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
            if (widget.partnerRole != null)
              Text(widget.partnerRole!, style: const TextStyle(fontSize: 11, color: Colors.white70)),
          ],
        ),
        backgroundColor: QdiaColors.primary,
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: Column(
        children: [
          if (widget.productName != null)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              color: QdiaColors.primaryLight,
              child: Row(
                children: [
                  const Icon(Icons.shopping_bag_outlined, size: 18, color: QdiaColors.primary),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      context.tr('messages.product_context').replaceAll('{product}', widget.productName!),
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: QdiaColors.primary),
                    ),
                  ),
                ],
              ),
            ),
          if (_partnerTyping)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              color: QdiaColors.primaryLight,
              child: Text(context.tr('messages.typing'), style: const TextStyle(fontSize: 11, color: QdiaColors.primary, fontWeight: FontWeight.w600)),
            ),
          Expanded(
            child: ListView.builder(
              controller: _scrollCtrl,
              padding: const EdgeInsets.fromLTRB(14, 14, 14, 8),
              itemCount: _msgs.length,
              itemBuilder: (_, i) {
                final m = _msgs[i];
                final mine = _isMine(m);
                final time = _formatTime(m['created_at']?.toString());
                final showDate = i == 0 ||
                    _dateLabel(m['created_at']?.toString()) !=
                        _dateLabel(_msgs[i - 1]['created_at']?.toString());

                return Column(
                  children: [
                    if (showDate)
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        child: Text(
                          _dateLabel(m['created_at']?.toString()),
                          style: const TextStyle(fontSize: 11, color: QdiaColors.textMuted, fontWeight: FontWeight.w600),
                        ),
                      ),
                    Align(
                      alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
                      child: Container(
                        constraints: BoxConstraints(maxWidth: MediaQuery.sizeOf(context).width * 0.78),
                        margin: const EdgeInsets.only(bottom: 6),
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        decoration: BoxDecoration(
                          color: mine ? QdiaColors.primary : Colors.white,
                          borderRadius: BorderRadius.only(
                            topLeft: const Radius.circular(16),
                            topRight: const Radius.circular(16),
                            bottomLeft: Radius.circular(mine ? 16 : 4),
                            bottomRight: Radius.circular(mine ? 4 : 16),
                          ),
                          border: mine ? null : Border.all(color: QdiaColors.border),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Align(
                              alignment: Alignment.centerLeft,
                              child: Text(
                                m['body']?.toString() ?? '',
                                style: TextStyle(fontSize: 14, color: mine ? Colors.white : QdiaColors.navy, height: 1.35),
                              ),
                            ),
                            const SizedBox(height: 4),
                            Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(time, style: TextStyle(fontSize: 10, color: mine ? Colors.white70 : QdiaColors.textMuted)),
                                if (mine) ...[
                                  const SizedBox(width: 4),
                                  Icon(
                                    m['read'] == true ? Icons.done_all : Icons.done,
                                    size: 14,
                                    color: m['read'] == true ? QdiaColors.gold : Colors.white70,
                                  ),
                                ],
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                );
              },
            ),
          ),
          Container(
            padding: const EdgeInsets.fromLTRB(12, 6, 12, 0),
            color: Colors.white,
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: _quickReplies(context).map((q) {
                  return Padding(
                    padding: const EdgeInsets.only(right: 8, bottom: 6),
                    child: ActionChip(
                      label: Text(q, style: const TextStyle(fontSize: 11)),
                      onPressed: () => _send(q),
                      backgroundColor: QdiaColors.primaryLight,
                      side: BorderSide.none,
                    ),
                  );
                }).toList(),
              ),
            ),
          ),
          Container(
            padding: EdgeInsets.fromLTRB(12, 4, 12, MediaQuery.paddingOf(context).bottom + 8),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 12, offset: const Offset(0, -2)),
              ],
            ),
            child: Row(
              children: [
                IconButton(
                  onPressed: _showAttachMenu,
                  icon: const Icon(Icons.attach_file_rounded, color: QdiaColors.primary),
                ),
                Expanded(
                  child: TextField(
                    controller: _ctrl,
                    onChanged: _onTyping,
                    minLines: 1,
                    maxLines: 4,
                    textInputAction: TextInputAction.send,
                    onSubmitted: (_) => _send(),
                    decoration: InputDecoration(
                      hintText: context.tr('messages.placeholder'),
                      filled: true,
                      fillColor: QdiaColors.pageBg,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(24), borderSide: BorderSide.none),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Material(
                  color: QdiaColors.primary,
                  borderRadius: BorderRadius.circular(14),
                  child: InkWell(
                    onTap: _sending ? null : () => _send(),
                    borderRadius: BorderRadius.circular(14),
                    child: SizedBox(
                      width: 48,
                      height: 48,
                      child: _sending
                          ? const Padding(padding: EdgeInsets.all(12), child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : const Icon(Icons.send_rounded, color: Colors.white),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
