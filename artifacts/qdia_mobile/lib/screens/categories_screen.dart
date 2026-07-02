import 'package:flutter/material.dart';
import 'package:qdia_mobile/models/product.dart';
import 'package:qdia_mobile/l10n/app_strings.dart';
import 'package:qdia_mobile/services/api_service.dart';
import 'package:qdia_mobile/theme/qdia_theme.dart';
import 'package:qdia_mobile/utils/category_icons.dart';
import 'package:qdia_mobile/widgets/product_card.dart';
import 'package:qdia_mobile/widgets/product_grid.dart';
import 'package:qdia_mobile/widgets/qdia_search_bar.dart';

class CategoriesScreen extends StatefulWidget {
  const CategoriesScreen({super.key, required this.onProductTap, this.onSearchTap, this.onQrTap});

  final ValueChanged<Product> onProductTap;
  final VoidCallback? onSearchTap;
  final VoidCallback? onQrTap;

  @override
  State<CategoriesScreen> createState() => _CategoriesScreenState();
}

class _CategoriesScreenState extends State<CategoriesScreen> {
  int _selected = 0;
  List<({String name, int count})> _categories = [];
  List<Product> _products = [];
  bool _loadingCats = true;
  bool _loadingProducts = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadCategories();
  }

  Future<void> _loadCategories() async {
    setState(() {
      _loadingCats = true;
      _error = null;
    });
    try {
      final raw = await ApiService.instance.getProductCategories();
      final cats = raw
          .map((e) {
            final m = e as Map<String, dynamic>;
            return (name: m['name']?.toString() ?? '', count: (m['count'] as num?)?.toInt() ?? 0);
          })
          .where((c) => c.name.isNotEmpty)
          .toList();
      if (mounted) {
        setState(() {
          _categories = cats;
          _loadingCats = false;
        });
        if (cats.isNotEmpty) _loadProducts(cats[_selected].name);
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _loadingCats = false;
          _error = e.toString();
        });
      }
    }
  }

  Future<void> _loadProducts(String category) async {
    setState(() => _loadingProducts = true);
    try {
      final raw = await ApiService.instance.getProducts(category: category, limit: 100);
      if (mounted) {
        setState(() {
          _products = raw.map((e) => Product.fromJson(e as Map<String, dynamic>)).toList();
          _loadingProducts = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _products = [];
          _loadingProducts = false;
          _error = e.toString();
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final category = _categories.isNotEmpty ? _categories[_selected] : null;

    return ColoredBox(
      color: QdiaColors.pageBg,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: double.infinity,
            padding: EdgeInsets.fromLTRB(16, MediaQuery.paddingOf(context).top + 8, 16, 12),
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
                Text(
                  context.tr('mobile.tab_categories'),
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 10),
                if (widget.onSearchTap != null)
                  QdiaSearchBar(onTap: widget.onSearchTap!, onQrTap: widget.onQrTap),
              ],
            ),
          ),
          if (_loadingCats)
            const Expanded(child: Center(child: CircularProgressIndicator(color: QdiaColors.primary)))
          else if (_categories.isEmpty)
            Expanded(
              child: Center(
                child: Text(
                  _error ?? 'Aucune catégorie',
                  style: const TextStyle(color: QdiaColors.textMuted),
                  textAlign: TextAlign.center,
                ),
              ),
            )
          else ...[
            SizedBox(
              height: 92,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.fromLTRB(12, 12, 12, 4),
                itemCount: _categories.length,
                itemBuilder: (_, i) {
                  final item = _categories[i];
                  final active = i == _selected;
                  final color = categoryColorFor(item.name);
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: Material(
                      color: active ? QdiaColors.primary : Colors.white,
                      borderRadius: BorderRadius.circular(14),
                      elevation: active ? 2 : 0,
                      child: InkWell(
                        onTap: () {
                          setState(() => _selected = i);
                          _loadProducts(item.name);
                        },
                        borderRadius: BorderRadius.circular(14),
                        child: Container(
                          width: 88,
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: active ? QdiaColors.primary : QdiaColors.border),
                          ),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                categoryIconFor(item.name),
                                size: 22,
                                color: active ? Colors.white : color,
                              ),
                              const SizedBox(height: 6),
                              Text(
                                item.name,
                                textAlign: TextAlign.center,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  fontSize: 9,
                                  fontWeight: FontWeight.w700,
                                  color: active ? Colors.white : QdiaColors.textBody,
                                  height: 1.1,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
            Expanded(
              child: _loadingProducts
                  ? const Center(child: CircularProgressIndicator(color: QdiaColors.primary))
                  : CustomScrollView(
                      slivers: [
                        SliverToBoxAdapter(
                          child: Padding(
                            padding: const EdgeInsets.fromLTRB(16, 4, 16, 10),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  category?.name ?? '',
                                  style: const TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.w900,
                                    color: QdiaColors.navy,
                                  ),
                                ),
                                if (category != null)
                                  Text(
                                    '${category.count} produits',
                                    style: const TextStyle(fontSize: 12, color: QdiaColors.textMuted),
                                  ),
                              ],
                            ),
                          ),
                        ),
                        if (_products.isEmpty)
                          const SliverFillRemaining(
                            child: Center(child: Text('Aucun produit dans cette catégorie', style: TextStyle(color: QdiaColors.textMuted))),
                          )
                        else
                          SliverPadding(
                            padding: const EdgeInsets.fromLTRB(12, 0, 12, 110),
                            sliver: SliverGrid(
                              gridDelegate: kProductGridDelegate,
                              delegate: SliverChildBuilderDelegate(
                                (_, i) => ProductCard(
                                  product: _products[i],
                                  onTap: () => widget.onProductTap(_products[i]),
                                ),
                                childCount: _products.length,
                              ),
                            ),
                          ),
                      ],
                    ),
            ),
          ],
        ],
      ),
    );
  }
}
