import 'package:flutter/material.dart';
import 'package:qdia_mobile/l10n/app_strings.dart';
import 'package:qdia_mobile/services/api_service.dart';
import 'package:qdia_mobile/theme/qdia_theme.dart';

class SupplierOrdersScreen extends StatefulWidget {
  const SupplierOrdersScreen({super.key});

  @override
  State<SupplierOrdersScreen> createState() => _SupplierOrdersScreenState();
}

class _SupplierOrdersScreenState extends State<SupplierOrdersScreen> {
  List<Map<String, dynamic>> _orders = [];
  bool _loading = true;
  final _trackingCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _trackingCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final raw = await ApiService.instance.getOrders();
      _orders = raw.cast<Map<String, dynamic>>();
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _patch(int id, Map<String, dynamic> body) async {
    try {
      await ApiService.instance.patchOrder(id, body);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(context.tr('supplier_orders.updated')), backgroundColor: QdiaColors.success),
        );
        _load();
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    }
  }

  void _shipDialog(int id) {
    _trackingCtrl.clear();
    showModalBottomSheet(
      context: context,
      builder: (ctx) => Padding(
        padding: EdgeInsets.fromLTRB(16, 16, 16, MediaQuery.of(ctx).viewInsets.bottom + 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: _trackingCtrl,
              decoration: InputDecoration(labelText: ctx.tr('supplier_orders.tracking')),
            ),
            const SizedBox(height: 12),
            ElevatedButton(
              onPressed: () {
                Navigator.pop(ctx);
                _patch(id, {'status': 'shipped', 'tracking_number': _trackingCtrl.text.trim(), 'carrier': 'DHL'});
              },
              child: Text(ctx.tr('supplier_orders.ship')),
            ),
          ],
        ),
      ),
    );
  }

  String _statusLabel(String status) {
    final key = 'orders.status_$status';
    final t = context.tr(key);
    return t == key ? status : t;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: QdiaColors.pageBg,
      appBar: AppBar(
        title: Text(context.tr('supplier_orders.title'), style: const TextStyle(fontWeight: FontWeight.w800)),
        backgroundColor: QdiaColors.primary,
        foregroundColor: Colors.white,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _orders.isEmpty
              ? Center(child: Text(context.tr('supplier_orders.empty'), style: const TextStyle(color: QdiaColors.textMuted)))
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(12),
                    itemCount: _orders.length,
                    itemBuilder: (_, i) {
                      final o = _orders[i];
                      final id = (o['id'] as num).toInt();
                      final status = o['status']?.toString() ?? '';
                      final buyer = o['buyer_name']?.toString() ?? '';
                      final total = (o['total_amount'] as num?)?.toDouble() ?? 0;
                      final items = (o['items'] as List?) ?? [];
                      return Container(
                        margin: const EdgeInsets.only(bottom: 10),
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: QdiaColors.border),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text('#$id', style: const TextStyle(fontWeight: FontWeight.w800)),
                                Chip(label: Text(_statusLabel(status), style: const TextStyle(fontSize: 10))),
                              ],
                            ),
                            if (buyer.isNotEmpty)
                              Text('${context.tr('supplier_orders.buyer')}: $buyer', style: const TextStyle(fontSize: 12, color: QdiaColors.textMuted)),
                            Text('$total ${o['currency'] ?? 'USD'} · ${items.length} ${context.tr('orders.items')}', style: const TextStyle(fontSize: 12)),
                            const SizedBox(height: 8),
                            Wrap(
                              spacing: 8,
                              runSpacing: 6,
                              children: [
                                if (status == 'pending_payment')
                                  ElevatedButton(
                                    onPressed: () => _patch(id, {'status': 'confirmed'}),
                                    style: ElevatedButton.styleFrom(backgroundColor: QdiaColors.success, foregroundColor: Colors.white),
                                    child: Text(context.tr('supplier_orders.accept'), style: const TextStyle(fontSize: 12)),
                                  ),
                                if (status == 'pending_payment' || status == 'confirmed')
                                  OutlinedButton(
                                    onPressed: () => _patch(id, {'status': 'cancelled'}),
                                    child: Text(context.tr('supplier_orders.reject'), style: const TextStyle(fontSize: 12)),
                                  ),
                                if (status == 'confirmed')
                                  OutlinedButton(
                                    onPressed: () => _shipDialog(id),
                                    child: Text(context.tr('supplier_orders.ship'), style: const TextStyle(fontSize: 12)),
                                  ),
                              ],
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}
