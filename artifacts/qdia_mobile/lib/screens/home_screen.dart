import 'package:flutter/material.dart';
import 'package:qdia_mobile/data/demo_data.dart';
import 'package:qdia_mobile/models/product.dart';
import 'package:qdia_mobile/services/api_service.dart';
import 'package:qdia_mobile/l10n/app_strings.dart';
import 'package:qdia_mobile/theme/qdia_theme.dart';
import 'package:qdia_mobile/widgets/banner_carousel.dart';
import 'package:qdia_mobile/widgets/category_shortcuts.dart';
import 'package:qdia_mobile/widgets/mobile_ui.dart';
import 'package:qdia_mobile/widgets/product_card.dart';
import 'package:qdia_mobile/widgets/product_grid.dart';
import 'package:qdia_mobile/widgets/qdia_app_bar.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({
    super.key,
    required this.onProductTap,
    required this.onSearchTap,
    this.onQrTap,
    this.onNotificationTap,
    this.onMessagesTap,
    this.onTrackingTap,
    this.onFacturationTap,
    this.isLoggedIn = false,
    this.onLoginTap,
    this.notificationCount = 0,
  });

  final ValueChanged<Product> onProductTap;
  final VoidCallback onSearchTap;
  final VoidCallback? onQrTap;
  final VoidCallback? onNotificationTap;
  final int notificationCount;
  final VoidCallback? onMessagesTap;
  final VoidCallback? onTrackingTap;
  final VoidCallback? onFacturationTap;
  final bool isLoggedIn;
  final VoidCallback? onLoginTap;

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  List<Product> _products = demoProducts;
  bool _loading = true;
  bool _offline = false;

  @override
  void initState() {
    super.initState();
    _loadProducts();
  }

  Future<void> _loadProducts() async {
    setState(() => _loading = true);
    try {
      final raw = await ApiService.instance.getProducts(limit: 50);
      await ApiService.instance.cacheProducts(raw);
      if (mounted) {
        setState(() {
          _products = raw.map((e) => Product.fromJson(e as Map<String, dynamic>)).toList();
          _offline = false;
          _loading = false;
        });
      }
    } catch (_) {
      final cached = await ApiService.instance.loadCachedProducts();
      if (mounted) {
        setState(() {
          if (cached != null && cached.isNotEmpty) {
            _products = cached.map((e) => Product.fromJson(e as Map<String, dynamic>)).toList();
          } else {
            _products = demoProducts;
          }
          _offline = true;
          _loading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: _loadProducts,
      color: QdiaColors.primary,
      child: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: QdiaAppBar(
              onSearchTap: widget.onSearchTap,
              onQrTap: widget.onQrTap,
              onNotificationTap: widget.onNotificationTap,
              notificationCount: widget.notificationCount,
              isLoggedIn: widget.isLoggedIn,
              onLoginTap: widget.onLoginTap,
            ),
          ),
          if (_offline)
            const SliverToBoxAdapter(
              child: Padding(
                padding: EdgeInsets.fromLTRB(14, 4, 14, 0),
                child: _OfflineBanner(),
              ),
            ),
          const SliverToBoxAdapter(child: SizedBox(height: 8)),
          const SliverToBoxAdapter(child: BannerCarousel()),
          const SliverToBoxAdapter(child: SizedBox(height: 12)),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14),
              child: Row(
                children: [
                  MobileQuickAction(
                    icon: Icons.receipt_long_outlined,
                    label: context.tr('nav.billing'),
                    onTap: widget.onFacturationTap ?? () => Navigator.pushNamed(context, '/facturation'),
                  ),
                  const SizedBox(width: 10),
                  MobileQuickAction(
                    icon: Icons.local_shipping_outlined,
                    label: context.tr('mobile.tracking'),
                    onTap: widget.onTrackingTap ?? () => Navigator.pushNamed(context, '/tracking'),
                  ),
                  const SizedBox(width: 10),
                  MobileQuickAction(
                    icon: Icons.chat_bubble_outline_rounded,
                    label: context.tr('mobile.tab_messages'),
                    onTap: widget.onMessagesTap ?? () {},
                  ),
                ],
              ),
            ),
          ),
          const SliverToBoxAdapter(child: SizedBox(height: 10)),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14),
              child: Row(
                children: [
                  MobileQuickAction(
                    icon: Icons.verified_user_outlined,
                    label: context.tr('trade_assurance.title'),
                    color: QdiaColors.success,
                    onTap: () => Navigator.pushNamed(context, '/trade-assurance'),
                  ),
                ],
              ),
            ),
          ),
          const SliverToBoxAdapter(child: SizedBox(height: 12)),
          SliverToBoxAdapter(child: CategoryShortcuts(onCategoryTap: (_) => widget.onSearchTap())),
          const SliverToBoxAdapter(child: SizedBox(height: 8)),
          SliverToBoxAdapter(
            child: MobileSectionHeader(
              title: context.tr('home.products_title'),
              action: _loading
                  ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                  : null,
            ),
          ),
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
    );
  }
}

class _OfflineBanner extends StatelessWidget {
  const _OfflineBanner();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: QdiaColors.gold.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: QdiaColors.gold.withValues(alpha: 0.4)),
      ),
      child: Row(
        children: [
          const Icon(Icons.cloud_off, size: 16, color: QdiaColors.goldDark),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              context.tr('home.offline_mode'),
              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: QdiaColors.navy),
            ),
          ),
        ],
      ),
    );
  }
}
