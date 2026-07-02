import 'package:flutter/material.dart';
import 'package:qdia_mobile/l10n/app_strings.dart';
import 'package:qdia_mobile/services/api_service.dart';
import 'package:qdia_mobile/theme/qdia_theme.dart';

class MyRfqsScreen extends StatefulWidget {
  const MyRfqsScreen({super.key});

  @override
  State<MyRfqsScreen> createState() => _MyRfqsScreenState();
}

class _MyRfqsScreenState extends State<MyRfqsScreen> {
  List<dynamic> _rfqs = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      _rfqs = await ApiService.instance.getRfqs();
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _accept(int id) async {
    try {
      await ApiService.instance.acceptRfqWithPayment(id, 'escrow');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Devis accepté — Escrow créé')));
        _load();
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    }
  }

  Future<void> _reject(int id) async {
    await ApiService.instance.rejectRfq(id);
    _load();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(context.tr('mobile.my_rfqs')), backgroundColor: QdiaColors.primary, foregroundColor: Colors.white),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: _rfqs.isEmpty
                  ? ListView(children: const [SizedBox(height: 80), Center(child: Text('Aucune RFQ'))])
                  : ListView.builder(
                      padding: const EdgeInsets.all(12),
                      itemCount: _rfqs.length,
                      itemBuilder: (_, i) {
                        final r = _rfqs[i] as Map<String, dynamic>;
                        final status = r['status']?.toString() ?? '';
                        return Card(
                          margin: const EdgeInsets.only(bottom: 10),
                          child: Padding(
                            padding: const EdgeInsets.all(14),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Expanded(child: Text(r['product_name']?.toString() ?? '', style: const TextStyle(fontWeight: FontWeight.bold))),
                                    Chip(label: Text(status, style: const TextStyle(fontSize: 10))),
                                  ],
                                ),
                                Text('${r['destination_country'] ?? ''} · ${r['quantity'] ?? ''} ${r['quantity_unit'] ?? ''}', style: const TextStyle(fontSize: 12, color: QdiaColors.textMuted)),
                                if (r['quote_price'] != null)
                                  Text('Devis: \$${r['quote_price']} — ${r['quote_message'] ?? ''}', style: const TextStyle(fontSize: 12)),
                                if (r['tracking_number'] != null)
                                  Padding(
                                    padding: const EdgeInsets.only(top: 6),
                                    child: Text('Suivi: ${r['tracking_number']}', style: const TextStyle(color: QdiaColors.primary, fontWeight: FontWeight.w600, fontSize: 12)),
                                  ),
                                if (status == 'quoted')
                                  Padding(
                                    padding: const EdgeInsets.only(top: 8),
                                    child: Row(
                                      children: [
                                        ElevatedButton(onPressed: () => _accept(r['id'] as int), child: Text(context.tr('payment.accept_quote'))),
                                        const SizedBox(width: 8),
                                        OutlinedButton(onPressed: () => _reject(r['id'] as int), child: Text(context.tr('common.cancel'))),
                                      ],
                                    ),
                                  ),
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
