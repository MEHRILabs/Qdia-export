import 'package:flutter/material.dart';
import 'package:qdia_mobile/l10n/app_strings.dart';
import 'package:qdia_mobile/screens/cart_screen.dart';
import 'package:qdia_mobile/screens/tracking_screen.dart';
import 'package:qdia_mobile/services/api_service.dart';
import 'package:qdia_mobile/theme/qdia_theme.dart';

class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key});

  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  List<Map<String, dynamic>> _orders = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final raw = await ApiService.instance.getOrders();
      _orders = raw.cast<Map<String, dynamic>>();
    } catch (e) {
      _error = e.toString();
    }
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _reorder(int orderId) async {
    try {
      await ApiService.instance.reorder(orderId);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(context.tr('orders.reorder_success')), backgroundColor: QdiaColors.success),
        );
        Navigator.push(context, MaterialPageRoute(builder: (_) => const CartScreen()));
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  Future<void> _fund(int txId) async {
    try {
      await ApiService.instance.fundPayment(txId);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(context.tr('transactions.payment_confirmed')), backgroundColor: QdiaColors.success),
        );
        _load();
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    }
  }

  String _statusLabel(String status) {
    final key = 'orders.status_$status';
    final translated = context.tr(key);
    return translated == key ? status : translated;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: QdiaColors.pageBg,
      appBar: AppBar(
        title: Text(context.tr('mobile.orders'), style: const TextStyle(fontWeight: FontWeight.w800)),
        backgroundColor: QdiaColors.primary,
        foregroundColor: Colors.white,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Text(_error!, style: const TextStyle(color: QdiaColors.textMuted)))
              : _orders.isEmpty
                  ? Center(child: Text(context.tr('orders.empty'), style: const TextStyle(color: QdiaColors.textMuted)))
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView.builder(
                        padding: const EdgeInsets.all(12),
                        itemCount: _orders.length,
                        itemBuilder: (_, i) {
                          final o = _orders[i];
                          final id = (o['id'] as num).toInt();
                          final status = o['status']?.toString() ?? '';
                          final total = (o['total_amount'] as num?)?.toDouble() ?? 0;
                          final currency = o['currency']?.toString() ?? 'USD';
                          final items = (o['items'] as List?) ?? [];
                          final tracking = o['tracking_number']?.toString();
                          final txId = (o['transaction_id'] as num?)?.toInt();
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
                                    Text('${context.tr('orders.order')} #$id', style: const TextStyle(fontWeight: FontWeight.w800)),
                                    Chip(
                                      label: Text(_statusLabel(status), style: const TextStyle(fontSize: 10)),
                                      backgroundColor: QdiaColors.primaryLight,
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 6),
                                Text('${items.length} ${context.tr('orders.items')} · $total $currency', style: const TextStyle(fontSize: 12, color: QdiaColors.textMuted)),
                                if (o['trade_assurance'] == true)
                                  Padding(
                                    padding: const EdgeInsets.only(top: 4),
                                    child: Row(
                                      children: [
                                        const Icon(Icons.verified_user, size: 14, color: QdiaColors.success),
                                        const SizedBox(width: 4),
                                        Text(context.tr('trade_assurance.badge'), style: const TextStyle(fontSize: 10, color: QdiaColors.success)),
                                      ],
                                    ),
                                  ),
                                if (tracking != null && tracking.isNotEmpty)
                                  Padding(
                                    padding: const EdgeInsets.only(top: 4),
                                    child: Text('${context.tr('tracking.number')} $tracking', style: const TextStyle(fontSize: 11, color: QdiaColors.primary)),
                                  ),
                                if (txId != null)
                                  Text('${context.tr('transactions.tx')} #$txId', style: const TextStyle(fontSize: 11, color: QdiaColors.textMuted)),
                                const SizedBox(height: 10),
                                Row(
                                  children: [
                                    if (status == 'pending_payment' && txId != null)
                                      Expanded(
                                        child: ElevatedButton(
                                          onPressed: () => _fund(txId),
                                          style: ElevatedButton.styleFrom(backgroundColor: QdiaColors.primary, foregroundColor: Colors.white),
                                          child: Text(context.tr('checkout.pay_escrow'), style: const TextStyle(fontSize: 11)),
                                        ),
                                      ),
                                    if (status == 'pending_payment' && txId != null) const SizedBox(width: 8),
                                    if (tracking != null && tracking.isNotEmpty)
                                      OutlinedButton.icon(
                                        onPressed: () => Navigator.push(
                                          context,
                                          MaterialPageRoute(builder: (_) => TrackingScreen(initialNumber: tracking)),
                                        ),
                                        icon: const Icon(Icons.local_shipping_outlined, size: 16),
                                        label: Text(context.tr('mobile.tracking'), style: const TextStyle(fontSize: 12)),
                                      ),
                                    const Spacer(),
                                    TextButton(
                                      onPressed: () => _reorder(id),
                                      child: Text(context.tr('orders.reorder')),
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
