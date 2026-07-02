import 'package:flutter/material.dart';
import 'package:qdia_mobile/l10n/app_strings.dart';
import 'package:qdia_mobile/services/api_service.dart';
import 'package:qdia_mobile/theme/qdia_theme.dart';
import 'package:qdia_mobile/widgets/mobile_ui.dart';

class FacturationScreen extends StatefulWidget {
  const FacturationScreen({super.key});

  @override
  State<FacturationScreen> createState() => _FacturationScreenState();
}

class _FacturationScreenState extends State<FacturationScreen> {
  List<dynamic> _lines = [];
  List<dynamic> _products = [];
  List<dynamic> _invoices = [];
  bool _loading = false;
  bool _loadingInvoices = true;
  int? _selectedProductId;
  final _buyerCtrl = TextEditingController(text: 'Importateur international');
  final _buyerAddrCtrl = TextEditingController();
  String _incoterm = 'FOB';
  String _portDepart = 'Béjaïa';
  String _portArrival = 'Marseille';
  final _invoiceNumber = 'QDIA-${DateTime.now().year}-${DateTime.now().millisecondsSinceEpoch % 10000}';

  @override
  void initState() {
    super.initState();
    _loadProducts();
    _loadInvoices();
  }

  @override
  void dispose() {
    _buyerCtrl.dispose();
    _buyerAddrCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadProducts() async {
    try {
      _products = await ApiService.instance.getProducts(scope: 'supplier');
      if (mounted) setState(() {});
    } catch (_) {}
  }

  Future<void> _loadInvoices() async {
    setState(() => _loadingInvoices = true);
    try {
      final res = await ApiService.instance.getInvoices();
      _invoices = (res['data'] as List?) ?? [];
    } catch (_) {
      _invoices = [];
    }
    if (mounted) setState(() => _loadingInvoices = false);
  }

  Map<String, dynamic>? get _selectedProduct {
    if (_selectedProductId == null) return null;
    try {
      return _products.firstWhere((x) => x['id'] == _selectedProductId) as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }

  double get _total => _lines.fold<double>(0, (s, l) => s + ((l['total'] as num?)?.toDouble() ?? 0));
  double get _commission => _total * 0.03;
  double get _net => _total - _commission;

  Future<void> _fillAi() async {
    if (_selectedProductId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(context.tr('facturation.choose_product'))),
      );
      return;
    }
    setState(() => _loading = true);
    try {
      final p = _selectedProduct!;
      final res = await ApiService.instance.invoiceAiLines({
        'product_id': _selectedProductId,
        'product_name': p['name'],
        'category': p['category'],
        'price_fob': p['prices']?['fob'],
        'moq': p['moq'],
        'moq_unit': p['moq_unit'],
        'incoterm': _incoterm,
        'port_depart': _portDepart,
        'port_arrival': _portArrival,
        'currency': p['prices']?['currency'] ?? 'USD',
      });
      _lines = res['lines'] as List<dynamic>? ?? [];
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    }
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _downloadPdf() async {
    if (_lines.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(context.tr('facturation.fill_first'))),
      );
      return;
    }
    try {
      final ok = await ApiService.instance.downloadInvoicePreviewPdf({
        'number': _invoiceNumber,
        'product_name': _selectedProduct?['name'] ?? 'Export algérien',
        'amount': _total,
        'commission_amount': _commission,
        'net_amount': _net,
        'currency': _selectedProduct?['prices']?['currency'] ?? 'USD',
        'port_depart': _portDepart,
        'port_arrival': _portArrival,
        'incoterm': _incoterm,
        'buyer_name': _buyerCtrl.text.trim(),
        'buyer_address': _buyerAddrCtrl.text.trim(),
        'lines': _lines,
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(ok ? context.tr('facturation.pdf_ok') : context.tr('facturation.pdf_fail')),
            backgroundColor: ok ? QdiaColors.success : null,
          ),
        );
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: QdiaColors.pageBg,
      body: CustomScrollView(
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
                  bottom: false,
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(56, 8, 16, 0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(context.tr('facturation.title'), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 20)),
                        const SizedBox(height: 4),
                        Text(context.tr('facturation.subtitle'), style: const TextStyle(color: Colors.white70, fontSize: 12)),
                      ],
                    ),
                  ),
                ),
              ),
            ),
            title: Text(context.tr('facturation.title'), style: const TextStyle(fontWeight: FontWeight.w800)),
          ),
          SliverPadding(
            padding: const EdgeInsets.all(16),
            sliver: SliverList(
              delegate: SliverChildListDelegate([
                _StepRow(steps: [
                  context.tr('facturation.step1'),
                  context.tr('facturation.step2'),
                  context.tr('facturation.step3'),
                ]),
                const SizedBox(height: 16),
                _SectionCard(
                  title: context.tr('facturation.new_invoice'),
                  subtitle: _invoiceNumber,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(context.tr('facturation.choose_product'), style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                      const SizedBox(height: 8),
                      DropdownButtonFormField<int>(
                        isExpanded: true,
                        value: _selectedProductId,
                        decoration: InputDecoration(
                          hintText: context.tr('facturation.export_product'),
                          filled: true,
                          fillColor: QdiaColors.pageBg,
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        items: _products.map((p) {
                          final m = p as Map<String, dynamic>;
                          return DropdownMenuItem(value: m['id'] as int, child: Text(m['name']?.toString() ?? ''));
                        }).toList(),
                        onChanged: (v) => setState(() => _selectedProductId = v),
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: _buyerCtrl,
                        decoration: InputDecoration(
                          labelText: context.tr('facturation.buyer'),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                      const SizedBox(height: 8),
                      TextField(
                        controller: _buyerAddrCtrl,
                        decoration: InputDecoration(
                          labelText: context.tr('facturation.buyer_address'),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Expanded(
                            child: DropdownButtonFormField<String>(
                              value: _incoterm,
                              decoration: InputDecoration(labelText: 'Incoterm', border: OutlineInputBorder(borderRadius: BorderRadius.circular(12))),
                              items: ['EXW', 'FOB', 'CFR', 'CIF'].map((e) => DropdownMenuItem(value: e, child: Text(e))).toList(),
                              onChanged: (v) => setState(() => _incoterm = v ?? 'FOB'),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: TextFormField(
                              initialValue: _portDepart,
                              decoration: InputDecoration(labelText: context.tr('facturation.port_depart'), border: OutlineInputBorder(borderRadius: BorderRadius.circular(12))),
                              onChanged: (v) => _portDepart = v,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      ElevatedButton.icon(
                        onPressed: _loading ? null : _fillAi,
                        icon: _loading
                            ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                            : const Icon(Icons.auto_awesome),
                        label: Text(context.tr('facturation.ai_fill')),
                        style: ElevatedButton.styleFrom(minimumSize: const Size.fromHeight(48)),
                      ),
                    ],
                  ),
                ),
                if (_lines.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  _SectionCard(
                    title: context.tr('facturation.invoice_lines'),
                    child: Column(
                      children: [
                        ..._lines.map((l) {
                          final m = l as Map<String, dynamic>;
                          return Container(
                            margin: const EdgeInsets.only(bottom: 8),
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: QdiaColors.pageBg,
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: QdiaColors.border),
                            ),
                            child: Row(
                              children: [
                                Expanded(child: Text(m['description']?.toString() ?? '', style: const TextStyle(fontSize: 12))),
                                Text('\$${m['total']}', style: const TextStyle(fontWeight: FontWeight.w800, color: QdiaColors.primary)),
                              ],
                            ),
                          );
                        }),
                        const Divider(),
                        _TotalRow(label: context.tr('facturation.total'), value: '\$${_total.toStringAsFixed(2)}'),
                        _TotalRow(label: context.tr('facturation.commission'), value: '-\$${_commission.toStringAsFixed(2)}', muted: true),
                        _TotalRow(label: context.tr('facturation.net'), value: '\$${_net.toStringAsFixed(2)}', bold: true),
                        const SizedBox(height: 12),
                        OutlinedButton.icon(
                          onPressed: _downloadPdf,
                          icon: const Icon(Icons.picture_as_pdf_outlined),
                          label: Text(context.tr('facturation.download_pdf')),
                          style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(46)),
                        ),
                      ],
                    ),
                  ),
                ],
                const SizedBox(height: 16),
                MobileSectionHeader(title: context.tr('facturation.history')),
                if (_loadingInvoices)
                  const Padding(padding: EdgeInsets.all(24), child: Center(child: CircularProgressIndicator()))
                else if (_invoices.isEmpty)
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: QdiaColors.border)),
                    child: Text(context.tr('facturation.no_invoices'), style: const TextStyle(color: QdiaColors.textMuted, fontSize: 13)),
                  )
                else
                  ..._invoices.take(10).map((inv) {
                    final m = inv as Map<String, dynamic>;
                    return Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: QdiaColors.border),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.receipt_long_rounded, color: QdiaColors.primary),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(m['number']?.toString() ?? '—', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
                                Text(m['product_name']?.toString() ?? '', style: const TextStyle(fontSize: 11, color: QdiaColors.textMuted)),
                              ],
                            ),
                          ),
                          Text(
                            '${m['amount']} ${m['currency'] ?? 'USD'}',
                            style: const TextStyle(fontWeight: FontWeight.w800, color: QdiaColors.primary),
                          ),
                        ],
                      ),
                    );
                  }),
              ]),
            ),
          ),
        ],
      ),
    );
  }
}

class _StepRow extends StatelessWidget {
  const _StepRow({required this.steps});
  final List<String> steps;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: List.generate(steps.length, (i) {
        return Expanded(
          child: Container(
            margin: EdgeInsets.only(right: i < steps.length - 1 ? 6 : 0),
            padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 6),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: QdiaColors.border),
            ),
            child: Column(
              children: [
                CircleAvatar(
                  radius: 12,
                  backgroundColor: QdiaColors.primaryLight,
                  child: Text('${i + 1}', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: QdiaColors.primary)),
                ),
                const SizedBox(height: 6),
                Text(steps[i], textAlign: TextAlign.center, style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w600)),
              ],
            ),
          ),
        );
      }),
    );
  }
}

class _SectionCard extends StatelessWidget {
  const _SectionCard({required this.title, required this.child, this.subtitle});
  final String title;
  final String? subtitle;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: QdiaColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: Text(title, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 15))),
              if (subtitle != null) Text(subtitle!, style: const TextStyle(fontSize: 11, color: QdiaColors.gold, fontWeight: FontWeight.w700)),
            ],
          ),
          const SizedBox(height: 14),
          child,
        ],
      ),
    );
  }
}

class _TotalRow extends StatelessWidget {
  const _TotalRow({required this.label, required this.value, this.muted = false, this.bold = false});
  final String label;
  final String value;
  final bool muted;
  final bool bold;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(fontSize: bold ? 14 : 12, fontWeight: bold ? FontWeight.w900 : FontWeight.w500, color: muted ? QdiaColors.textMuted : QdiaColors.navy)),
          Text(value, style: TextStyle(fontSize: bold ? 16 : 12, fontWeight: bold ? FontWeight.w900 : FontWeight.w700, color: bold ? QdiaColors.primary : QdiaColors.textBody)),
        ],
      ),
    );
  }
}
