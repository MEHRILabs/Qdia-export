import 'package:flutter/material.dart';
import 'package:qdia_mobile/l10n/app_strings.dart';
import 'package:qdia_mobile/models/product.dart';
import 'package:qdia_mobile/services/api_service.dart';
import 'package:qdia_mobile/services/favorites_service.dart';
import 'package:qdia_mobile/theme/qdia_theme.dart';
import 'package:qdia_mobile/widgets/product_card.dart';
import 'package:qdia_mobile/widgets/product_grid.dart';

class FavoritesScreen extends StatefulWidget {
  const FavoritesScreen({super.key, required this.onProductTap});

  final ValueChanged<Product> onProductTap;

  @override
  State<FavoritesScreen> createState() => _FavoritesScreenState();
}

class _FavoritesScreenState extends State<FavoritesScreen> {
  List<Product> _products = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final ids = await FavoritesService.instance.syncFromApi();
    try {
      final all = await ApiService.instance.getProducts();
      final products = all.map((e) => Product.fromJson(e as Map<String, dynamic>)).where((p) => ids.contains(p.id)).toList();
      setState(() => _products = products);
    } catch (_) {
      final cached = await ApiService.instance.loadCachedProducts();
      if (cached != null) {
        final products = cached
            .map((e) => Product.fromJson(e as Map<String, dynamic>))
            .where((p) => ids.contains(p.id))
            .toList();
        setState(() => _products = products);
      } else {
        setState(() => _products = []);
      }
    }
    setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(context.tr('nav.favorites'), style: const TextStyle(fontWeight: FontWeight.w800))),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: QdiaColors.primary))
          : _products.isEmpty
              ? Center(child: Text(context.tr('favorites.empty_short')))
              : GridView.builder(
                  padding: const EdgeInsets.all(12),
                  gridDelegate: kProductGridDelegate,
                  itemCount: _products.length,
                  itemBuilder: (_, i) => ProductCard(
                    product: _products[i],
                    onTap: () => widget.onProductTap(_products[i]),
                  ),
                ),
    );
  }
}
