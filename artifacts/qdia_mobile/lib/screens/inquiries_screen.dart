import 'package:flutter/material.dart';
import 'package:qdia_mobile/l10n/app_strings.dart';
import 'package:qdia_mobile/services/api_service.dart';
import 'package:qdia_mobile/theme/qdia_theme.dart';

class InquiriesScreen extends StatefulWidget {
  const InquiriesScreen({super.key});

  @override
  State<InquiriesScreen> createState() => _InquiriesScreenState();
}

class _InquiriesScreenState extends State<InquiriesScreen> {
  List<dynamic> _rfqs = [];
  bool _loading = true;
  final _priceCtrl = TextEditingController();
  final _msgCtrl = TextEditingController();
  final _trackCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _priceCtrl.dispose();
    _msgCtrl.dispose();
    _trackCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      _rfqs = await ApiService.instance.getRfqs();
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _quote(int id) async {
    final price = double.tryParse(_priceCtrl.text);
    if (price == null) return;
    await ApiService.instance.quoteRfq(id, quotePrice: price, quoteMessage: _msgCtrl.text);
    if (mounted) {
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(context.tr('inquiries.quote_sent'))));
      _load();
    }
  }

  Future<void> _ship(int id) async {
    if (_trackCtrl.text.isEmpty) return;
    await ApiService.instance.shipRfq(id, _trackCtrl.text);
    if (mounted) {
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(context.tr('inquiries.ship_registered'))));
      _load();
    }
  }

  void _showQuote(int id) {
    _priceCtrl.clear();
    _msgCtrl.clear();
    showModalBottomSheet(
      context: context,
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: _priceCtrl, keyboardType: TextInputType.number, decoration: InputDecoration(labelText: ctx.tr('inquiries.quote_price'))),
            TextField(controller: _msgCtrl, decoration: InputDecoration(labelText: ctx.tr('inquiries.message'))),
            const SizedBox(height: 12),
            ElevatedButton(onPressed: () => _quote(id), child: Text(ctx.tr('inquiries.send_quote'))),
          ],
        ),
      ),
    );
  }

  void _showShip(int id) {
    _trackCtrl.clear();
    showModalBottomSheet(
      context: context,
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: _trackCtrl, decoration: InputDecoration(labelText: ctx.tr('inquiries.tracking_number'))),
            const SizedBox(height: 12),
            ElevatedButton(onPressed: () => _ship(id), child: Text(ctx.tr('inquiries.confirm_ship'))),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(context.tr('inquiries.export_title')), backgroundColor: QdiaColors.primary, foregroundColor: Colors.white),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: _rfqs.isEmpty
                  ? ListView(children: [const SizedBox(height: 80), Center(child: Text(context.tr('inquiries.no_requests')))])
                  : ListView.builder(
                      padding: const EdgeInsets.all(12),
                      itemCount: _rfqs.length,
                      itemBuilder: (_, i) {
                        final r = _rfqs[i] as Map<String, dynamic>;
                        final status = r['status']?.toString() ?? '';
                        final id = r['id'] as int;
                        return Card(
                          margin: const EdgeInsets.only(bottom: 10),
                          child: Padding(
                            padding: const EdgeInsets.all(14),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(r['product_name']?.toString() ?? '', style: const TextStyle(fontWeight: FontWeight.bold)),
                                const SizedBox(height: 4),
                                Text('${r['quantity']} ${r['quantity_unit']} → ${r['destination_country']}', style: const TextStyle(fontSize: 12, color: QdiaColors.textMuted)),
                                Chip(label: Text(status, style: const TextStyle(fontSize: 10))),
                                if (status == 'pending')
                                  TextButton(onPressed: () => _showQuote(id), child: Text(context.tr('inquiries.send_quote'))),
                                if (status == 'accepted')
                                  TextButton(onPressed: () => _showShip(id), child: Text(context.tr('inquiries.ship'))),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
            ),
    );
  }
}
