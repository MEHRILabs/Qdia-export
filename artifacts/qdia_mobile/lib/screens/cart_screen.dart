import 'package:flutter/material.dart';
import 'package:qdia_mobile/l10n/app_strings.dart';
import 'package:qdia_mobile/models/product.dart';
import 'package:qdia_mobile/screens/checkout_screen.dart';
import 'package:qdia_mobile/services/api_service.dart';
import 'package:qdia_mobile/theme/qdia_theme.dart';
import 'package:qdia_mobile/widgets/product_image.dart';

class CartScreen extends StatefulWidget {
  const CartScreen({super.key});

  @override
  State<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends State<CartScreen> {
  List<Map<String, dynamic>> _items = [];
  final Map<int, Product> _products = {};
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
      final raw = await ApiService.instance.getCart();
      _items = raw.cast<Map<String, dynamic>>();
      _products.clear();
      for (final item in _items) {
        final pid = (item['product_id'] as num).toInt();
        try {
          final p = await ApiService.instance.getProduct(pid);
          _products[pid] = Product.fromJson(p);
        } catch (_) {}
      }
    } catch (e) {
      _error = e.toString();
    }
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _remove(int itemId) async {
    try {
      await ApiService.instance.removeFromCart(itemId);
      await _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    }
  }

  double get _total {
    var sum = 0.0;
    for (final item in _items) {
      final pid = (item['product_id'] as num).toInt();
      final qty = (item['quantity'] as num?)?.toInt() ?? 1;
      final p = _products[pid];
      sum += (p?.prices.fob ?? 0) * qty;
    }
    return sum;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: QdiaColors.pageBg,
      appBar: AppBar(
        title: Text(context.tr('cart.title'), style: const TextStyle(fontWeight: FontWeight.w800)),
        backgroundColor: QdiaColors.primary,
        foregroundColor: Colors.white,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Text(_error!, style: const TextStyle(color: QdiaColors.textMuted)))
              : _items.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.shopping_cart_outlined, size: 48, color: QdiaColors.textMuted),
                          const SizedBox(height: 12),
                          Text(context.tr('cart.empty'), style: const TextStyle(color: QdiaColors.textMuted)),
                        ],
                      ),
                    )
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView(
                        padding: const EdgeInsets.fromLTRB(12, 12, 12, 100),
                        children: [
                          ..._items.map((item) {
                            final id = (item['id'] as num).toInt();
                            final pid = (item['product_id'] as num).toInt();
                            final qty = (item['quantity'] as num?)?.toInt() ?? 1;
                            final incoterm = item['incoterm']?.toString() ?? 'FOB';
                            final p = _products[pid];
                            return Container(
                              margin: const EdgeInsets.only(bottom: 10),
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: QdiaColors.border),
                              ),
                              child: Row(
                                children: [
                                  ClipRRect(
                                    borderRadius: BorderRadius.circular(8),
                                    child: SizedBox(
                                      width: 64,
                                      height: 64,
                                      child: p != null
                                          ? ProductImage(src: p.displayImage, fit: BoxFit.cover)
                                          : const ColoredBox(color: QdiaColors.primaryLight),
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(p?.name ?? '#$pid', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                                        Text('$incoterm · x$qty', style: const TextStyle(fontSize: 11, color: QdiaColors.textMuted)),
                                        if (p != null)
                                          Text(
                                            '${context.tr('product.fob')} ${(p.prices.fob * qty).toStringAsFixed(2)} ${p.prices.currency}',
                                            style: const TextStyle(fontWeight: FontWeight.w800, color: QdiaColors.primary, fontSize: 13),
                                          ),
                                      ],
                                    ),
                                  ),
                                  IconButton(
                                    onPressed: () => _remove(id),
                                    icon: const Icon(Icons.delete_outline, color: QdiaColors.danger, size: 20),
                                  ),
                                ],
                              ),
                            );
                          }),
                          Container(
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: QdiaColors.primaryLight,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(context.tr('cart.total'), style: const TextStyle(fontWeight: FontWeight.w700)),
                                Text('\$${_total.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18, color: QdiaColors.primary)),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
      bottomNavigationBar: _items.isEmpty
          ? null
          : SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: ElevatedButton(
                  onPressed: () async {
                    final ok = await Navigator.push<bool>(
                      context,
                      MaterialPageRoute(builder: (_) => CheckoutScreen(total: _total)),
                    );
                    if (ok == true && mounted) _load();
                  },
                  style: ElevatedButton.styleFrom(backgroundColor: QdiaColors.gold, foregroundColor: QdiaColors.navy),
                  child: Text(context.tr('cart.checkout'), style: const TextStyle(fontWeight: FontWeight.w800)),
                ),
              ),
            ),
    );
  }
}
