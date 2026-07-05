import 'package:flutter/material.dart';
import 'package:qdia_mobile/l10n/app_strings.dart';
import 'package:qdia_mobile/screens/product_edit_screen.dart';
import 'package:qdia_mobile/models/product.dart';
import 'package:qdia_mobile/services/api_service.dart';
import 'package:qdia_mobile/theme/qdia_theme.dart';
import 'package:qdia_mobile/widgets/product_image.dart';

class SupplierProductsScreen extends StatefulWidget {
  const SupplierProductsScreen({super.key});

  @override
  State<SupplierProductsScreen> createState() => _SupplierProductsScreenState();
}

class _SupplierProductsScreenState extends State<SupplierProductsScreen> {
  List<Product> _products = [];
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
      final raw = await ApiService.instance.getProducts(scope: 'supplier');
      setState(() {
        _products = raw.map((e) => Product.fromJson(e as Map<String, dynamic>)).toList();
      });
    } catch (e) {
      setState(() => _error = e.toString());
    }
    setState(() => _loading = false);
  }

  Future<void> _deleteProduct(Product p) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(ctx.tr('supplier.delete_title')),
        content: Text(ctx.tr('supplier.delete_confirm').replaceAll('{name}', p.name)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: Text(ctx.tr('common.cancel'))),
          TextButton(onPressed: () => Navigator.pop(context, true), child: Text(ctx.tr('common.delete'))),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await ApiService.instance.deleteProduct(p.id);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(context.tr('supplier.deleted'))));
        _load();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(context.tr('nav.products'), style: const TextStyle(fontWeight: FontWeight.w800)),
        actions: [
          IconButton(
            onPressed: () => Navigator.pushNamed(context, '/product-edit'),
            icon: const Icon(Icons.add),
            tooltip: context.tr('product_edit.new_title'),
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Text(_error!, style: const TextStyle(color: QdiaColors.danger)))
              : _products.isEmpty
                  ? Center(child: Text(context.tr('supplier.empty_products')))
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView.separated(
                        padding: const EdgeInsets.all(12),
                        itemCount: _products.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 10),
                        itemBuilder: (_, i) {
                          final p = _products[i];
                          return Container(
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
                                  child: ProductImage(src: p.displayImage, width: 56, height: 56),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(p.name, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                                      Text(
                                        '${context.tr('product.fob')} ${p.prices.fob} ${p.prices.currency} · ${p.exportStatus ?? 'draft'}',
                                        style: const TextStyle(fontSize: 11, color: QdiaColors.primary),
                                      ),
                                    ],
                                  ),
                                ),
                                IconButton(
                                  onPressed: () async {
                                    final ok = await Navigator.push<bool>(
                                      context,
                                      MaterialPageRoute(builder: (_) => ProductEditScreen(productId: p.id)),
                                    );
                                    if (ok == true) _load();
                                  },
                                  icon: const Icon(Icons.edit_outlined, color: QdiaColors.primary),
                                ),
                                IconButton(
                                  onPressed: () async {
                                    try {
                                      await ApiService.instance.duplicateProduct(p.id);
                                      if (mounted) {
                                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(context.tr('product_edit.duplicated'))));
                                        _load();
                                      }
                                    } catch (e) {
                                      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
                                    }
                                  },
                                  icon: const Icon(Icons.content_copy, color: QdiaColors.primary),
                                ),
                                IconButton(
                                  onPressed: () => Navigator.pushNamed(context, '/studio', arguments: {'productId': p.id}),
                                  icon: const Icon(Icons.auto_fix_high, color: QdiaColors.primary),
                                ),
                                IconButton(
                                  onPressed: () => _deleteProduct(p),
                                  icon: const Icon(Icons.delete_outline, color: QdiaColors.danger),
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
