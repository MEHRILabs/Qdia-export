import 'package:flutter/material.dart';
import 'package:qdia_mobile/models/product.dart';
import 'package:qdia_mobile/screens/dashboard_screen.dart';
import 'package:qdia_mobile/screens/bulk_import_screen.dart';
import 'package:qdia_mobile/screens/cart_screen.dart';
import 'package:qdia_mobile/screens/favorites_screen.dart';
import 'package:qdia_mobile/screens/orders_screen.dart';
import 'package:qdia_mobile/screens/settings_screen.dart';
import 'package:qdia_mobile/screens/supplier_products_screen.dart';
import 'package:qdia_mobile/screens/tracking_screen.dart';
import 'package:qdia_mobile/screens/trade_assurance_screen.dart';
import 'package:qdia_mobile/screens/profile_screen.dart';
import 'package:qdia_mobile/screens/my_rfqs_screen.dart';
import 'package:qdia_mobile/screens/inquiries_screen.dart';
import 'package:qdia_mobile/screens/facturation_screen.dart';
import 'package:qdia_mobile/screens/verification_screen.dart';
import 'package:qdia_mobile/l10n/app_strings.dart';
import 'package:qdia_mobile/services/api_service.dart';
import 'package:qdia_mobile/theme/qdia_theme.dart';

class AccountScreen extends StatefulWidget {
  const AccountScreen({
    super.key,
    this.rfqCount = 0,
    this.loggedIn = false,
    this.onAuthChanged,
    this.onOpenRfq,
    this.onProductTap,
    this.onOpenMessages,
  });

  final int rfqCount;
  final bool loggedIn;
  final ValueChanged<bool>? onAuthChanged;
  final VoidCallback? onOpenRfq;
  final ValueChanged<Product>? onProductTap;
  final VoidCallback? onOpenMessages;

  @override
  State<AccountScreen> createState() => _AccountScreenState();
}

class _AccountScreenState extends State<AccountScreen> {
  String _productCount = '—';

  @override
  void initState() {
    super.initState();
    if (widget.loggedIn) _loadStats();
  }

  @override
  void didUpdateWidget(covariant AccountScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.loggedIn && !oldWidget.loggedIn) _loadStats();
    if (!widget.loggedIn) setState(() => _productCount = '—');
  }

  Future<void> _loadStats() async {
    try {
      final stats = await ApiService.instance.getDashboardStats();
      if (mounted) {
        setState(() => _productCount = '${stats['total_products'] ?? stats['active_listings'] ?? 0}');
      }
    } catch (_) {}
  }

  void _openSettings() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => SettingsScreen(
          loggedIn: widget.loggedIn,
          onAuthChanged: widget.onAuthChanged,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return CustomScrollView(
      slivers: [
        SliverAppBar(
          expandedHeight: 130,
          pinned: true,
          backgroundColor: QdiaColors.primary,
          flexibleSpace: FlexibleSpaceBar(
            background: Container(
              decoration: const BoxDecoration(
                gradient: LinearGradient(colors: [QdiaColors.sidebar, QdiaColors.primary]),
              ),
              child: SafeArea(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                  child: Row(
                    children: [
                      Container(
                        width: 56,
                        height: 56,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(color: QdiaColors.gold, width: 2),
                          color: Colors.white,
                        ),
                        child: const Icon(Icons.settings_rounded, size: 32, color: QdiaColors.primary),
                      ),
                      const SizedBox(width: 12),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            _AccountHeaderTitle(),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
        if (widget.loggedIn)
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
              child: Row(
                children: [
                  _StatCard(value: '${widget.rfqCount}', label: 'Devis'),
                  const SizedBox(width: 10),
                  _StatCard(value: _productCount, label: 'Produits'),
                  const SizedBox(width: 10),
                  const _StatCard(value: '4.8', label: 'Note'),
                ],
              ),
            ),
          ),
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(0, 8, 0, 110),
          sliver: SliverList(
            delegate: SliverChildListDelegate([
              if (widget.loggedIn) ...[
                _MenuTile(icon: Icons.dashboard_rounded, title: context.tr('nav.dashboard'), subtitle: context.tr('brand.tagline'), onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const DashboardScreen()))),
                _MenuTile(icon: Icons.inventory_2_outlined, title: context.tr('nav.products'), subtitle: context.tr('catalog.title'), onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const SupplierProductsScreen()))),
                _MenuTile(icon: Icons.cloud_upload_outlined, title: context.tr('mobile.bulk_import'), onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const BulkImportScreen()))),
                _MenuTile(icon: Icons.verified_user_outlined, title: context.tr('nav.verification'), onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const VerificationScreen()))),
                _MenuTile(icon: Icons.person_rounded, title: context.tr('nav.profile'), onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ProfileScreen()))),
                _MenuTile(icon: Icons.storefront_rounded, title: context.tr('header.supplier_space'), onTap: () => Navigator.pushNamed(context, '/agent-ia')),
                _MenuTile(icon: Icons.auto_awesome_rounded, title: context.tr('nav.agent_ia'), onTap: () => Navigator.pushNamed(context, '/agent-ia')),
                _MenuTile(icon: Icons.photo_camera_rounded, title: context.tr('nav.studio'), onTap: () => Navigator.pushNamed(context, '/studio')),
                _MenuTile(icon: Icons.request_quote_rounded, title: context.tr('mobile.my_rfqs'), trailing: '${widget.rfqCount}', onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const MyRfqsScreen()))),
                _MenuTile(icon: Icons.inbox_rounded, title: context.tr('nav.inquiries'), onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const InquiriesScreen()))),
                _MenuTile(icon: Icons.receipt_long_rounded, title: context.tr('nav.billing'), onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const FacturationScreen()))),
                _MenuTile(icon: Icons.chat_bubble_outline_rounded, title: context.tr('nav.messages'), onTap: widget.onOpenMessages),
                _MenuTile(icon: Icons.shopping_cart_outlined, title: context.tr('cart.title'), onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const CartScreen()))),
                _MenuTile(icon: Icons.local_shipping_rounded, title: context.tr('mobile.tracking'), onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const TrackingScreen()))),
                _MenuTile(icon: Icons.inventory_2_outlined, title: context.tr('mobile.orders'), onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const OrdersScreen()))),
                _MenuTile(icon: Icons.verified_user_outlined, title: context.tr('trade_assurance.title'), onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const TradeAssuranceScreen()))),
                _MenuTile(
                  icon: Icons.favorite_border_rounded,
                  title: context.tr('nav.favorites'),
                  onTap: widget.onProductTap != null
                      ? () => Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => FavoritesScreen(onProductTap: widget.onProductTap!),
                            ),
                          )
                      : null,
                ),
              ],
              _MenuTile(
                icon: Icons.settings_rounded,
                title: context.tr('mobile.settings'),
                subtitle: context.tr('header.lang'),
                highlight: true,
                onTap: _openSettings,
              ),
              if (widget.loggedIn)
                _MenuTile(
                  icon: Icons.logout_rounded,
                  title: context.tr('header.logout'),
                  onTap: () async {
                    await ApiService.instance.clearToken();
                    widget.onAuthChanged?.call(false);
                  },
                ),
            ]),
          ),
        ),
      ],
    );
  }
}

class _AccountHeaderTitle extends StatelessWidget {
  const _AccountHeaderTitle();

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Text(context.tr('mobile.settings'), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 18)),
        Text('${context.tr('header.lang')} · ${context.tr('profile.enable_notifications')}', style: const TextStyle(color: QdiaColors.gold, fontSize: 12, fontWeight: FontWeight.w600)),
      ],
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({required this.value, required this.label});

  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: QdiaColors.border),
        ),
        child: Column(
          children: [
            Text(value, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: QdiaColors.primary)),
            Text(label, style: const TextStyle(fontSize: 11, color: QdiaColors.textMuted)),
          ],
        ),
      ),
    );
  }
}

class _MenuTile extends StatelessWidget {
  const _MenuTile({
    required this.icon,
    required this.title,
    this.subtitle,
    this.trailing,
    this.highlight = false,
    this.onTap,
  });

  final IconData icon;
  final String title;
  final String? subtitle;
  final String? trailing;
  final bool highlight;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      onTap: onTap,
      leading: Container(
        width: 42,
        height: 42,
        decoration: BoxDecoration(
          color: highlight ? QdiaColors.gold.withValues(alpha: 0.2) : QdiaColors.primaryLight,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Icon(icon, color: highlight ? QdiaColors.goldDark : QdiaColors.primary, size: 22),
      ),
      title: Text(title, style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15, color: highlight ? QdiaColors.navy : null)),
      subtitle: subtitle != null ? Text(subtitle!, style: const TextStyle(fontSize: 11)) : null,
      trailing: trailing != null
          ? Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(color: QdiaColors.primaryLight, borderRadius: BorderRadius.circular(8)),
              child: Text(trailing!, style: const TextStyle(fontWeight: FontWeight.w800, color: QdiaColors.primary, fontSize: 12)),
            )
          : const Icon(Icons.chevron_right, color: QdiaColors.textMuted, size: 20),
    );
  }
}
