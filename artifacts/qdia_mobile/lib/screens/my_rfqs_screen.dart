import 'package:flutter/material.dart';
import 'package:qdia_mobile/l10n/app_strings.dart';
import 'package:qdia_mobile/services/api_service.dart';
import 'package:qdia_mobile/theme/qdia_theme.dart';

class MyRfqsScreen extends StatefulWidget {
  const MyRfqsScreen({super.key});

  @override
  State<MyRfqsScreen> createState() => _MyRfqsScreenState();
}

class _MyRfqsScreenState extends State<MyRfqsScreen> {
  List<dynamic> _rfqs = [];
  bool _loading = true;
  String _filter = 'all';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      _rfqs = await ApiService.instance.getRfqs();
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  List<dynamic> get _filtered {
    if (_filter == 'all') return _rfqs;
    return _rfqs.where((r) => (r as Map)['status']?.toString() == _filter).toList();
  }

  Future<void> _accept(int id) async {
    final method = await showModalBottomSheet<String>(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(ctx.tr('my_rfqs_page.choose_payment'), style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16)),
              const SizedBox(height: 12),
              ListTile(
                leading: const Icon(Icons.lock_outline, color: QdiaColors.primary),
                title: Text(ctx.tr('payment.escrow')),
                onTap: () => Navigator.pop(ctx, 'escrow'),
              ),
              ListTile(
                leading: const Icon(Icons.account_balance, color: QdiaColors.primary),
                title: Text(ctx.tr('payment.swift')),
                onTap: () async {
                  Navigator.pop(ctx);
                  final ref = await _promptRef(ctx.tr('my_rfqs_page.swift_ref'));
                  if (ref != null && mounted) await _acceptWithPayment(id, 'swift', swiftRef: ref);
                },
              ),
              ListTile(
                leading: const Icon(Icons.description_outlined, color: QdiaColors.primary),
                title: Text(ctx.tr('payment.lc')),
                onTap: () async {
                  Navigator.pop(ctx);
                  final ref = await _promptRef(ctx.tr('my_rfqs_page.lc_number'));
                  if (ref != null && mounted) await _acceptWithPayment(id, 'lc', lcNumber: ref);
                },
              ),
            ],
          ),
        ),
      ),
    );
    if (method == 'escrow') await _acceptWithPayment(id, 'escrow');
  }

  Future<String?> _promptRef(String label) async {
    final ctrl = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(label),
        content: TextField(controller: ctrl, decoration: InputDecoration(hintText: label)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(ctx.tr('common.cancel'))),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: Text(ctx.tr('common.confirm'))),
        ],
      ),
    );
    if (ok != true) return null;
    return ctrl.text.trim().isEmpty ? null : ctrl.text.trim();
  }

  Future<void> _acceptWithPayment(int id, String method, {String? swiftRef, String? lcNumber}) async {
    try {
      await ApiService.instance.acceptRfqWithPayment(id, method, swiftRef: swiftRef, lcNumber: lcNumber);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(context.tr('my_rfqs_page.quote_accepted')), backgroundColor: QdiaColors.success),
        );
        _load();
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    }
  }

  Future<void> _reject(int id) async {
    await ApiService.instance.rejectRfq(id);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(context.tr('my_rfqs_page.quote_rejected'))));
      _load();
    }
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'quoted':
        return QdiaColors.gold;
      case 'accepted':
      case 'shipped':
        return QdiaColors.success;
      case 'rejected':
      case 'cancelled':
        return QdiaColors.danger;
      default:
        return QdiaColors.primary;
    }
  }

  @override
  Widget build(BuildContext context) {
    final filters = [
      ('all', context.tr('supplier_page.filter_all')),
      ('pending', context.tr('supplier_page.filter_pending')),
      ('quoted', context.tr('my_rfqs_page.filter_quoted')),
      ('accepted', context.tr('my_rfqs_page.filter_accepted')),
      ('shipped', context.tr('my_rfqs_page.filter_shipped')),
    ];

    return Scaffold(
      appBar: AppBar(
        title: Text(context.tr('mobile.my_rfqs')),
        backgroundColor: QdiaColors.primary,
        foregroundColor: Colors.white,
      ),
      body: Column(
        children: [
          SizedBox(
            height: 44,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              children: filters.map((f) {
                final active = _filter == f.$1;
                return Padding(
                  padding: const EdgeInsets.only(right: 6),
                  child: FilterChip(
                    label: Text(f.$2, style: TextStyle(fontSize: 11, color: active ? Colors.white : QdiaColors.navy)),
                    selected: active,
                    onSelected: (_) => setState(() => _filter = f.$1),
                    selectedColor: QdiaColors.primary,
                    backgroundColor: Colors.white,
                  ),
                );
              }).toList(),
            ),
          ),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : RefreshIndicator(
                    onRefresh: _load,
                    child: _filtered.isEmpty
                        ? ListView(children: [
                            const SizedBox(height: 80),
                            Center(child: Text(context.tr('my_rfqs_page.empty'), style: const TextStyle(color: QdiaColors.textMuted))),
                          ])
                        : ListView.builder(
                            padding: const EdgeInsets.all(12),
                            itemCount: _filtered.length,
                            itemBuilder: (_, i) {
                              final r = _filtered[i] as Map<String, dynamic>;
                              final status = r['status']?.toString() ?? '';
                              return Card(
                                margin: const EdgeInsets.only(bottom: 10),
                                child: Padding(
                                  padding: const EdgeInsets.all(14),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Expanded(
                                            child: Text(
                                              r['product_name']?.toString() ?? '',
                                              style: const TextStyle(fontWeight: FontWeight.bold),
                                            ),
                                          ),
                                          Chip(
                                            label: Text(status, style: const TextStyle(fontSize: 10, color: Colors.white)),
                                            backgroundColor: _statusColor(status),
                                          ),
                                        ],
                                      ),
                                      Text(
                                        '${r['destination_country'] ?? ''} · ${r['quantity'] ?? ''} ${r['quantity_unit'] ?? ''}',
                                        style: const TextStyle(fontSize: 12, color: QdiaColors.textMuted),
                                      ),
                                      if (r['quote_price'] != null)
                                        Padding(
                                          padding: const EdgeInsets.only(top: 6),
                                          child: Text(
                                            '${context.tr('my_rfqs_page.quote_received')} \$${r['quote_price']} — ${r['quote_message'] ?? ''}',
                                            style: const TextStyle(fontSize: 12),
                                          ),
                                        ),
                                      if (r['tracking_number'] != null)
                                        Padding(
                                          padding: const EdgeInsets.only(top: 6),
                                          child: Text(
                                            '${context.tr('my_rfqs_page.tracking')} ${r['tracking_number']}',
                                            style: const TextStyle(color: QdiaColors.primary, fontWeight: FontWeight.w600, fontSize: 12),
                                          ),
                                        ),
                                      if (status == 'quoted')
                                        Padding(
                                          padding: const EdgeInsets.only(top: 8),
                                          child: Row(
                                            children: [
                                              Expanded(
                                                child: ElevatedButton(
                                                  onPressed: () => _accept(r['id'] as int),
                                                  child: Text(context.tr('payment.accept_quote')),
                                                ),
                                              ),
                                              const SizedBox(width: 8),
                                              OutlinedButton(
                                                onPressed: () => _reject(r['id'] as int),
                                                child: Text(context.tr('my_rfqs_page.reject')),
                                              ),
                                            ],
                                          ),
                                        ),
                                    ],
                                  ),
                                ),
                              );
                            },
                          ),
                  ),
          ),
        ],
      ),
    );
  }
}
