import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:qdia_mobile/config/app_config.dart';
import 'package:qdia_mobile/models/product.dart';
import 'package:qdia_mobile/screens/cart_screen.dart';
import 'package:qdia_mobile/services/api_service.dart';
import 'package:qdia_mobile/services/favorites_service.dart';
import 'package:qdia_mobile/l10n/app_strings.dart';
import 'package:qdia_mobile/theme/qdia_theme.dart';
import 'package:qdia_mobile/widgets/ports_customs_panel.dart';
import 'package:qdia_mobile/widgets/product_card.dart';
import 'package:qdia_mobile/widgets/product_image.dart';

const _algeriaPortKeys = [
  ('DZALG', 'product.port_algiers'),
  ('DZBJA', 'product.port_bejaia'),
  ('DZORN', 'product.port_oran'),
  ('DZAAE', 'product.port_annaba'),
  ('DZSKI', 'product.port_skikda'),
];

const _destinationKeys = [
  ('FR', 'product.dest_france'),
  ('AE', 'product.dest_uae'),
  ('DZ', 'product.dest_dz'),
];

const _trackingStepKeys = [
  ('product.track_confirmed', 'product.track_confirmed_desc', true),
  ('product.track_prep', 'product.track_prep_desc', true),
  ('product.track_departure', 'product.track_departure_desc', false),
  ('product.track_transit', 'product.track_transit_desc', false),
  ('product.track_customs', 'product.track_customs_desc', false),
];

class ProductDetailScreen extends StatefulWidget {
  const ProductDetailScreen({
    super.key,
    required this.product,
    required this.onAddRfq,
    this.onContactSupplier,
  });

  final Product product;
  final ValueChanged<Product> onAddRfq;
  final void Function(Product product)? onContactSupplier;

  @override
  State<ProductDetailScreen> createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends State<ProductDetailScreen> {
  int _tab = 0;
  String _port = 'DZBJA';
  String _destination = 'FR';
  String _payment = 'swift';
  String _incoterm = 'FOB';
  bool _isFavorite = false;
  List<String> _complianceAlerts = [];
  bool _loadingCompliance = false;
  List<Map<String, dynamic>> _reviews = [];
  double _reviewAvg = 0;
  int _reviewCount = 0;
  int _userRating = 5;
  final _reviewComment = TextEditingController();
  bool _submittingReview = false;
  List<Product> _recommendations = [];
  List<Map<String, dynamic>> _supplierReviews = [];
  double _supplierReviewAvg = 0;
  int _supplierReviewCount = 0;
  bool _addingToCart = false;
  int _cartQty = 1;

  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    await ApiService.instance.loadToken();
    await _loadFavorite();
    _loadCompliance();
    _loadReviews();
    _loadRecommendations();
    _loadSupplierReviews();
  }

  @override
  void dispose() {
    _reviewComment.dispose();
    super.dispose();
  }

  Future<void> _loadFavorite() async {
    final fav = await FavoritesService.instance.isFavorite(widget.product.id);
    if (mounted) setState(() => _isFavorite = fav);
  }

  Future<void> _toggleFavorite() async {
    final added = await FavoritesService.instance.toggle(widget.product.id);
    if (mounted) {
      setState(() => _isFavorite = added);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(added ? context.tr('product.added_favorite') : context.tr('product.removed_favorite'))),
      );
    }
  }

  Future<void> _loadCompliance() async {
    setState(() => _loadingCompliance = true);
    try {
      final res = await ApiService.instance.complianceAlerts(_destination, widget.product.category);
      if (mounted) {
        setState(() => _complianceAlerts = (res['alerts'] as List?)?.cast<String>() ?? []);
      }
    } catch (_) {
      if (mounted) setState(() => _complianceAlerts = []);
    }
    if (mounted) setState(() => _loadingCompliance = false);
  }

  Future<void> _loadReviews() async {
    try {
      final res = await ApiService.instance.getReviews(widget.product.id);
      if (mounted) {
        setState(() {
          _reviewAvg = (res['average'] as num?)?.toDouble() ?? widget.product.rating;
          _reviewCount = (res['count'] as num?)?.toInt() ?? widget.product.reviewCount;
          _reviews = (res['reviews'] as List?)?.cast<Map<String, dynamic>>() ?? [];
        });
      }
    } catch (_) {}
  }

  Future<void> _submitReview() async {
    if (!ApiService.instance.isLoggedIn) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(context.tr('product.login_for_review'))),
      );
      return;
    }
    setState(() => _submittingReview = true);
    try {
      await ApiService.instance.postReview(
        widget.product.id,
        _userRating,
        comment: _reviewComment.text.trim().isEmpty ? null : _reviewComment.text.trim(),
      );
      _reviewComment.clear();
      await _loadReviews();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(context.tr('product.review_published')), backgroundColor: QdiaColors.success),
        );
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
    if (mounted) setState(() => _submittingReview = false);
  }

  Future<void> _loadRecommendations() async {
    try {
      final raw = await ApiService.instance.getRecommendations(productId: widget.product.id, limit: 6);
      if (mounted) {
        setState(() {
          _recommendations = raw
              .map((e) => Product.fromJson(e as Map<String, dynamic>))
              .where((p) => p.id != widget.product.id)
              .toList();
        });
      }
    } catch (_) {}
  }

  Future<void> _loadSupplierReviews() async {
    final sid = widget.product.supplierId;
    if (sid == null) return;
    try {
      final res = await ApiService.instance.getSupplierReviews(sid);
      if (mounted) {
        setState(() {
          _supplierReviewAvg = (res['average'] as num?)?.toDouble() ?? 0;
          _supplierReviewCount = (res['count'] as num?)?.toInt() ?? 0;
          _supplierReviews = (res['reviews'] as List?)?.cast<Map<String, dynamic>>() ?? [];
        });
      }
    } catch (_) {}
  }

  Future<void> _addToCart() async {
    if (!ApiService.instance.isLoggedIn) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(context.tr('cart.login_required'))));
      return;
    }
    setState(() => _addingToCart = true);
    try {
      await ApiService.instance.addToCart(
        productId: widget.product.id,
        quantity: _cartQty,
        incoterm: _incoterm,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(context.tr('cart.added')),
            action: SnackBarAction(
              label: context.tr('cart.view'),
              onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const CartScreen())),
            ),
          ),
        );
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
    if (mounted) setState(() => _addingToCart = false);
  }

  Future<void> _showOemDialog() async {
    final specsCtrl = TextEditingController();
    final qtyCtrl = TextEditingController(text: '${widget.product.moq}');
    var requestType = 'oem';
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => StatefulBuilder(
        builder: (ctx, setDlg) => AlertDialog(
          title: Text(context.tr('oem.title')),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                DropdownButtonFormField<String>(
                  value: requestType,
                  decoration: InputDecoration(labelText: context.tr('oem.type')),
                  items: [
                    DropdownMenuItem(value: 'oem', child: Text(context.tr('oem.type_oem'))),
                    DropdownMenuItem(value: 'odm', child: Text(context.tr('oem.type_odm'))),
                  ],
                  onChanged: (v) => setDlg(() => requestType = v ?? 'oem'),
                ),
                TextField(controller: specsCtrl, maxLines: 3, decoration: InputDecoration(labelText: context.tr('oem.specs'))),
                TextField(controller: qtyCtrl, keyboardType: TextInputType.number, decoration: InputDecoration(labelText: context.tr('oem.quantity'))),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(context.tr('common.cancel'))),
            ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: Text(context.tr('common.send'))),
          ],
        ),
      ),
    );
    if (ok != true || !mounted) return;
    if (!ApiService.instance.isLoggedIn) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(context.tr('cart.login_required'))));
      return;
    }
    try {
      await ApiService.instance.createOemRequest(
        productId: widget.product.id,
        requestType: requestType,
        specs: specsCtrl.text.trim(),
        supplierId: widget.product.supplierId,
        quantity: int.tryParse(qtyCtrl.text.trim()),
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(context.tr('oem.sent')), backgroundColor: QdiaColors.success),
        );
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  Future<void> _showSampleDialog() async {
    final addrCtrl = TextEditingController();
    final qtyCtrl = TextEditingController(text: '1');
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: Text(context.tr('sample.title')),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: addrCtrl, maxLines: 2, decoration: InputDecoration(labelText: context.tr('sample.address'))),
            TextField(controller: qtyCtrl, keyboardType: TextInputType.number, decoration: InputDecoration(labelText: context.tr('sample.quantity'))),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: Text(context.tr('common.cancel'))),
          ElevatedButton(onPressed: () => Navigator.pop(context, true), child: Text(context.tr('common.send'))),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    if (!ApiService.instance.isLoggedIn) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(context.tr('cart.login_required'))));
      return;
    }
    if (addrCtrl.text.trim().length < 5) return;
    try {
      await ApiService.instance.createSampleRequest(
        productId: widget.product.id,
        shippingAddress: addrCtrl.text.trim(),
        quantity: int.tryParse(qtyCtrl.text.trim()) ?? 1,
        supplierId: widget.product.supplierId,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(context.tr('sample.sent')), backgroundColor: QdiaColors.success),
        );
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  void _onDestinationChange(String dest) {
    setState(() => _destination = dest);
    _loadCompliance();
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.product;
    final productUrl = '${AppConfig.productWebBase}/${p.id}';

    return Scaffold(
      backgroundColor: QdiaColors.pageBg,
      appBar: AppBar(
        title: Text(p.name, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700), maxLines: 1, overflow: TextOverflow.ellipsis),
        actions: [
          IconButton(onPressed: () {}, icon: const Icon(Icons.share_outlined, size: 20)),
          IconButton(
            onPressed: _toggleFavorite,
            icon: Icon(_isFavorite ? Icons.favorite : Icons.favorite_border, size: 20, color: _isFavorite ? QdiaColors.gold : Colors.white),
          ),
        ],
      ),
      bottomNavigationBar: Container(
        padding: const EdgeInsets.all(10),
        decoration: const BoxDecoration(color: Colors.white, border: Border(top: BorderSide(color: QdiaColors.border))),
        child: SafeArea(
          top: false,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                children: [
                  IconButton(
                    onPressed: _cartQty > 1 ? () => setState(() => _cartQty--) : null,
                    icon: const Icon(Icons.remove_circle_outline, size: 20),
                  ),
                  Text('$_cartQty', style: const TextStyle(fontWeight: FontWeight.w800)),
                  IconButton(
                    onPressed: () => setState(() => _cartQty++),
                    icon: const Icon(Icons.add_circle_outline, size: 20),
                  ),
                  const Spacer(),
                  TextButton(onPressed: _showOemDialog, child: Text(context.tr('oem.short'), style: const TextStyle(fontSize: 11))),
                  TextButton(onPressed: _showSampleDialog, child: Text(context.tr('sample.short'), style: const TextStyle(fontSize: 11))),
                ],
              ),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _addingToCart ? null : _addToCart,
                      icon: _addingToCart
                          ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                          : const Icon(Icons.shopping_cart_outlined, size: 16),
                      label: Text(context.tr('cart.add'), style: const TextStyle(fontSize: 12)),
                      style: OutlinedButton.styleFrom(foregroundColor: QdiaColors.primary, padding: const EdgeInsets.symmetric(vertical: 12)),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    flex: 2,
                    child: ElevatedButton(
                      onPressed: () {
                        widget.onAddRfq(p);
                        Navigator.pop(context);
                      },
                      style: ElevatedButton.styleFrom(backgroundColor: QdiaColors.gold, foregroundColor: QdiaColors.navy, padding: const EdgeInsets.symmetric(vertical: 12)),
                      child: Text(context.tr('product.pay_quote'), style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.only(bottom: 16),
        children: [
          AspectRatio(
            aspectRatio: 1.1,
            child: ProductImage(src: p.displayImage, fit: BoxFit.cover),
          ),
          _Card(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(p.name, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w900, color: QdiaColors.navy)),
                const SizedBox(height: 6),
                Text('${context.tr('product.fob')} ${p.prices.fob} ${p.prices.currency} / ${p.prices.unit}', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: QdiaColors.primary)),
                const SizedBox(height: 4),
                Text('${context.tr('product.moq')} ${p.moq} ${p.moqUnit} · EXW ${p.prices.exw ?? '-'} · CIF ${p.prices.cif ?? '-'}', style: const TextStyle(fontSize: 11, color: QdiaColors.textMuted)),
                const SizedBox(height: 8),
                Row(children: [
                  const Icon(Icons.star, size: 14, color: QdiaColors.gold),
                  Text(' $_reviewAvg (${context.tr('product.reviews')})', style: const TextStyle(fontSize: 11)),
                  if (p.readyToShip) ...[const SizedBox(width: 8), _Badge(context.tr('product.ready_to_ship'), QdiaColors.success)],
                ]),
                const SizedBox(height: 8),
                Wrap(spacing: 4, runSpacing: 4, children: p.certifications.map((c) => _Badge(c, QdiaColors.primary)).toList()),
              ],
            ),
          ),
          _Card(
            child: Row(children: [
              CircleAvatar(backgroundColor: QdiaColors.primaryLight, child: Text(p.supplierName[0], style: const TextStyle(color: QdiaColors.primary, fontWeight: FontWeight.w800))),
              const SizedBox(width: 10),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(p.supplierName, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
                Text(p.supplierLocation, style: const TextStyle(fontSize: 11, color: QdiaColors.textMuted)),
                if (_supplierReviewCount > 0)
                  Row(children: [
                    const Icon(Icons.star, size: 12, color: QdiaColors.gold),
                    Text(' $_supplierReviewAvg ($_supplierReviewCount)', style: const TextStyle(fontSize: 10)),
                  ]),
              ])),
              if (widget.onContactSupplier != null)
                IconButton(
                  onPressed: () => widget.onContactSupplier!(p),
                  icon: const Icon(Icons.chat_bubble_outline_rounded, color: QdiaColors.primary),
                  tooltip: context.tr('messages.contact_supplier'),
                ),
              const Icon(Icons.verified, color: QdiaColors.success, size: 18),
            ]),
          ),
          if (_supplierReviews.isNotEmpty) ...[
            _SectionLabel(context.tr('supplier_reviews.title')),
            _Card(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: _supplierReviews.take(3).map((r) => Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: List.generate(5, (i) => Icon(
                                  i < (r['rating'] as num? ?? 0) ? Icons.star : Icons.star_border,
                                  size: 14,
                                  color: QdiaColors.gold,
                                )),
                          ),
                          const SizedBox(width: 8),
                          Expanded(child: Text(r['comment'] as String? ?? '—', style: const TextStyle(fontSize: 11))),
                        ],
                      ),
                    )).toList(),
              ),
            ),
          ],
          _SectionLabel(context.tr('product.qr_title')),
          _Card(
            child: Row(
              children: [
                QrImageView(
                  data: productUrl,
                  version: QrVersions.auto,
                  size: 88,
                  eyeStyle: const QrEyeStyle(eyeShape: QrEyeShape.square, color: QdiaColors.primary),
                  dataModuleStyle: const QrDataModuleStyle(dataModuleShape: QrDataModuleShape.square, color: QdiaColors.navy),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(context.tr('product.qr_sheet'), style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
                      const SizedBox(height: 4),
                      Text(productUrl, style: const TextStyle(fontSize: 10, color: QdiaColors.textMuted)),
                      const SizedBox(height: 4),
                      Text(context.tr('product.qr_scan_share'), style: const TextStyle(fontSize: 10, color: QdiaColors.primary)),
                    ],
                  ),
                ),
              ],
            ),
          ),
          _SectionLabel(context.tr('product.logistics_ports')),
          _Card(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(context.tr('product.departure_port'), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
              const SizedBox(height: 6),
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: _algeriaPortKeys.map((port) {
                  final active = _port == port.$1;
                  return GestureDetector(
                    onTap: () => setState(() => _port = port.$1),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: active ? QdiaColors.primary : QdiaColors.primaryLight,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(context.tr(port.$2), style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: active ? Colors.white : QdiaColors.primary)),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 12),
              Text(context.tr('product.destination'), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
              const SizedBox(height: 6),
              Wrap(
                spacing: 6,
                children: _destinationKeys.map((d) {
                  final active = _destination == d.$1;
                  return GestureDetector(
                    onTap: () => _onDestinationChange(d.$1),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        border: Border.all(color: active ? QdiaColors.primary : QdiaColors.border),
                        color: active ? QdiaColors.primaryLight : Colors.white,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(context.tr(d.$2), style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: active ? QdiaColors.primary : QdiaColors.textBody)),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 10),
              DropdownButtonFormField<String>(
                value: _incoterm,
                decoration: InputDecoration(labelText: context.tr('rfq.incoterm'), isDense: true, border: const OutlineInputBorder()),
                items: ['EXW', 'FOB', 'CFR', 'CIF'].map((e) => DropdownMenuItem(value: e, child: Text(e))).toList(),
                onChanged: (v) => setState(() => _incoterm = v ?? 'FOB'),
              ),
            ]),
          ),
          _SectionLabel(context.tr('product.compliance_alerts')),
          _Card(
            child: _loadingCompliance
                ? const Center(child: Padding(padding: EdgeInsets.all(12), child: CircularProgressIndicator(strokeWidth: 2)))
                : _complianceAlerts.isEmpty
                    ? Text(context.tr('product.no_compliance_alert'), style: const TextStyle(fontSize: 12, color: QdiaColors.textMuted))
                    : Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: _complianceAlerts.map((a) => Padding(
                              padding: const EdgeInsets.only(bottom: 6),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Icon(Icons.warning_amber_rounded, size: 16, color: QdiaColors.goldDark),
                                  const SizedBox(width: 8),
                                  Expanded(child: Text(a, style: const TextStyle(fontSize: 12))),
                                ],
                              ),
                            )).toList(),
                      ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 10),
            child: PortsCustomsPanel(productCategory: p.category, portDepart: _port, fobPrice: p.prices.fob * 10000),
          ),
          _SectionLabel(context.tr('product.secure_payment')),
          _Card(
            child: Column(
              children: [
                _PaymentOption(id: 'swift', icon: Icons.account_balance, label: context.tr('payment.swift'), desc: context.tr('product.swift_desc'), selected: _payment, onSelect: (v) => setState(() => _payment = v)),
                _PaymentOption(id: 'lc', icon: Icons.description, label: context.tr('payment.lc'), desc: context.tr('product.lc_desc'), selected: _payment, onSelect: (v) => setState(() => _payment = v)),
                _PaymentOption(id: 'escrow', icon: Icons.shield, label: context.tr('payment.escrow'), desc: context.tr('product.escrow_desc'), selected: _payment, onSelect: (v) => setState(() => _payment = v)),
              ],
            ),
          ),
          _SectionLabel(context.tr('product.package_tracking')),
          _Card(
            child: Column(
              children: _trackingStepKeys.asMap().entries.map((e) {
                final done = e.value.$3;
                return Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Column(children: [
                      Icon(done ? Icons.check_circle : Icons.radio_button_unchecked, size: 18, color: done ? QdiaColors.success : QdiaColors.border),
                      if (e.key < _trackingStepKeys.length - 1) Container(width: 2, height: 24, color: done ? QdiaColors.success.withValues(alpha: 0.3) : QdiaColors.border),
                    ]),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text(context.tr(e.value.$1), style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12, color: done ? QdiaColors.navy : QdiaColors.textMuted)),
                          Text(context.tr(e.value.$2), style: const TextStyle(fontSize: 10, color: QdiaColors.textMuted)),
                        ]),
                      ),
                    ),
                  ],
                );
              }).toList(),
            ),
          ),
          _SectionLabel(context.tr('product.client_reviews')),
          _Card(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (_reviews.isEmpty)
                  Text(context.tr('product.no_reviews'), style: const TextStyle(fontSize: 12, color: QdiaColors.textMuted))
                else
                  ..._reviews.take(3).map((r) => Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: List.generate(5, (i) => Icon(
                                    i < (r['rating'] as num? ?? 0) ? Icons.star : Icons.star_border,
                                    size: 14,
                                    color: QdiaColors.gold,
                                  )),
                            ),
                            const SizedBox(width: 8),
                            Expanded(child: Text(r['comment'] as String? ?? '—', style: const TextStyle(fontSize: 11))),
                          ],
                        ),
                      )),
                const Divider(),
                Text(context.tr('product.your_review'), style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12)),
                const SizedBox(height: 6),
                Row(
                  children: List.generate(5, (i) => IconButton(
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(),
                        onPressed: () => setState(() => _userRating = i + 1),
                        icon: Icon(i < _userRating ? Icons.star : Icons.star_border, color: QdiaColors.gold, size: 24),
                      )),
                ),
                TextField(
                  controller: _reviewComment,
                  maxLines: 2,
                  decoration: InputDecoration(hintText: context.tr('product.comment_optional'), isDense: true, border: const OutlineInputBorder()),
                ),
                const SizedBox(height: 8),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _submittingReview ? null : _submitReview,
                    child: _submittingReview
                        ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : Text(context.tr('product.publish_review')),
                  ),
                ),
              ],
            ),
          ),
          _Card(
            child: Column(
              children: [
                Row(children: [
                  _DetailTab(label: context.tr('product.description_tab'), index: 0, selected: _tab, onTap: () => setState(() => _tab = 0)),
                  _DetailTab(label: context.tr('product.specs_tab'), index: 1, selected: _tab, onTap: () => setState(() => _tab = 1)),
                ]),
                const SizedBox(height: 10),
                Text(
                  _tab == 0
                      ? p.description
                      : context.tr('product.specs_summary')
                          .replaceAll('{category}', p.category)
                          .replaceAll('{incoterm}', _incoterm)
                          .replaceAll('{port}', _port)
                          .replaceAll('{destination}', _destination)
                          .replaceAll('{payment}', _payment),
                  style: const TextStyle(fontSize: 12, height: 1.5, color: QdiaColors.textBody),
                ),
              ],
            ),
          ),
          if (_recommendations.isNotEmpty) ...[
            _SectionLabel(context.tr('recommendations.title')),
            SizedBox(
              height: 220,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 10),
                itemCount: _recommendations.length,
                separatorBuilder: (_, __) => const SizedBox(width: 10),
                itemBuilder: (_, i) => SizedBox(
                  width: 150,
                  child: ProductCard(
                    product: _recommendations[i],
                    onTap: () {
                      Navigator.pushReplacement(
                        context,
                        MaterialPageRoute(
                          builder: (_) => ProductDetailScreen(
                            product: _recommendations[i],
                            onAddRfq: widget.onAddRfq,
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _Card extends StatelessWidget {
  const _Card({required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(10, 0, 10, 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: QdiaColors.border)),
      child: child,
    );
  }
}

class _SectionLabel extends StatelessWidget {
  const _SectionLabel(this.text);
  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(14, 6, 14, 4),
      child: Text(text, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: QdiaColors.primary)),
    );
  }
}

class _Badge extends StatelessWidget {
  const _Badge(this.text, this.color);
  final String text;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(6)),
      child: Text(text, style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: color)),
    );
  }
}

class _PaymentOption extends StatelessWidget {
  const _PaymentOption({required this.id, required this.icon, required this.label, required this.desc, required this.selected, required this.onSelect});

  final String id;
  final IconData icon;
  final String label;
  final String desc;
  final String selected;
  final ValueChanged<String> onSelect;

  @override
  Widget build(BuildContext context) {
    final active = selected == id;
    return GestureDetector(
      onTap: () => onSelect(id),
      child: Container(
        margin: const EdgeInsets.only(bottom: 6),
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          border: Border.all(color: active ? QdiaColors.primary : QdiaColors.border, width: active ? 1.5 : 1),
          borderRadius: BorderRadius.circular(10),
          color: active ? QdiaColors.primaryLight : Colors.white,
        ),
        child: Row(children: [
          Icon(icon, color: QdiaColors.primary, size: 20),
          const SizedBox(width: 10),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(label, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12)),
            Text(desc, style: const TextStyle(fontSize: 10, color: QdiaColors.textMuted)),
          ])),
          if (active) const Icon(Icons.check_circle, color: QdiaColors.primary, size: 18),
        ]),
      ),
    );
  }
}

class _DetailTab extends StatelessWidget {
  const _DetailTab({required this.label, required this.index, required this.selected, required this.onTap});

  final String label;
  final int index;
  final int selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final active = index == selected;
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(border: Border(bottom: BorderSide(color: active ? QdiaColors.primary : QdiaColors.border, width: active ? 2 : 1))),
          child: Text(label, textAlign: TextAlign.center, style: TextStyle(fontWeight: active ? FontWeight.w800 : FontWeight.w500, color: active ? QdiaColors.primary : QdiaColors.textMuted, fontSize: 12)),
        ),
      ),
    );
  }
}
