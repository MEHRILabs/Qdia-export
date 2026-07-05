import 'package:flutter/material.dart';
import 'package:qdia_mobile/l10n/app_strings.dart';
import 'package:qdia_mobile/services/api_service.dart';
import 'package:qdia_mobile/theme/qdia_theme.dart';

class TransactionsScreen extends StatefulWidget {
  const TransactionsScreen({super.key});

  @override
  State<TransactionsScreen> createState() => _TransactionsScreenState();
}

class _TransactionsScreenState extends State<TransactionsScreen> {
  List<Map<String, dynamic>> _txs = [];
  bool _loading = true;
  String _filter = 'all';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final raw = await ApiService.instance.getTransactions();
      _txs = raw.cast<Map<String, dynamic>>();
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  List<Map<String, dynamic>> get _filtered {
    if (_filter == 'all') return _txs;
    return _txs.where((t) => t['status']?.toString() == _filter).toList();
  }

  double get _totalVolume => _txs.fold(0.0, (s, t) => s + ((t['amount'] as num?)?.toDouble() ?? 0));

  Future<void> _fund(int id) async {
    try {
      await ApiService.instance.fundPayment(id);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(context.tr('transactions.payment_confirmed')), backgroundColor: QdiaColors.success),
        );
        _load();
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    }
  }

  Future<void> _release(int id) async {
    try {
      await ApiService.instance.releasePayment(id);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(context.tr('transactions.funds_released')), backgroundColor: QdiaColors.success),
        );
        _load();
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final filters = [
      ('all', context.tr('transactions.filter_all')),
      ('pending', context.tr('transactions.filter_pending')),
      ('funded', context.tr('transactions.filter_funded')),
      ('released', context.tr('transactions.filter_released')),
    ];

    return Scaffold(
      backgroundColor: QdiaColors.pageBg,
      appBar: AppBar(
        title: Text(context.tr('transactions.title'), style: const TextStyle(fontWeight: FontWeight.w800)),
        backgroundColor: QdiaColors.primary,
        foregroundColor: Colors.white,
      ),
      body: Column(
        children: [
          if (_txs.isNotEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
              child: Row(
                children: [
                  Expanded(
                    child: _StatChip(
                      label: context.tr('transactions.total_volume'),
                      value: '\$${_totalVolume.toStringAsFixed(0)}',
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _StatChip(
                      label: context.tr('transactions.count'),
                      value: '${_txs.length}',
                    ),
                  ),
                ],
              ),
            ),
          SizedBox(
            height: 44,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              children: filters.map((f) {
                final active = _filter == f.$1;
                return Padding(
                  padding: const EdgeInsets.only(right: 6),
                  child: FilterChip(
                    label: Text(f.$2, style: TextStyle(fontSize: 11, color: active ? Colors.white : QdiaColors.navy)),
                    selected: active,
                    onSelected: (_) => setState(() => _filter = f.$1),
                    selectedColor: QdiaColors.primary,
                    backgroundColor: Colors.white,
                  ),
                );
              }).toList(),
            ),
          ),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _filtered.isEmpty
                    ? Center(child: Text(context.tr('transactions.empty'), style: const TextStyle(color: QdiaColors.textMuted)))
                    : RefreshIndicator(
                        onRefresh: _load,
                        child: ListView.builder(
                          padding: const EdgeInsets.all(12),
                          itemCount: _filtered.length,
                          itemBuilder: (_, i) {
                            final tx = _filtered[i];
                            final id = (tx['id'] as num).toInt();
                            final status = tx['status']?.toString() ?? '';
                            final amount = (tx['amount'] as num?)?.toDouble() ?? 0;
                            final currency = tx['currency']?.toString() ?? 'USD';
                            final method = tx['payment_method']?.toString() ?? '';
                            return Container(
                              margin: const EdgeInsets.only(bottom: 10),
                              padding: const EdgeInsets.all(14),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: QdiaColors.border),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text('${context.tr('transactions.tx')} #$id', style: const TextStyle(fontWeight: FontWeight.w800)),
                                      Chip(label: Text(status, style: const TextStyle(fontSize: 10))),
                                    ],
                                  ),
                                  const SizedBox(height: 6),
                                  Text('$amount $currency · $method', style: const TextStyle(fontSize: 12, color: QdiaColors.textMuted)),
                                  if (tx['rfq_id'] != null)
                                    Text('RFQ #${tx['rfq_id']}', style: const TextStyle(fontSize: 11, color: QdiaColors.primary)),
                                  const SizedBox(height: 8),
                                  Wrap(
                                    spacing: 8,
                                    children: [
                                      if (status == 'pending')
                                        ElevatedButton(
                                          onPressed: () => _fund(id),
                                          style: ElevatedButton.styleFrom(backgroundColor: QdiaColors.primary, foregroundColor: Colors.white),
                                          child: Text(context.tr('transactions.confirm_payment'), style: const TextStyle(fontSize: 12)),
                                        ),
                                      if (status == 'funded')
                                        OutlinedButton(
                                          onPressed: () => _release(id),
                                          child: Text(context.tr('transactions.release_funds'), style: const TextStyle(fontSize: 12)),
                                        ),
                                    ],
                                  ),
                                ],
                              ),
                            );
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }
}

class _StatChip extends StatelessWidget {
  const _StatChip({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: QdiaColors.border),
      ),
      child: Column(
        children: [
          Text(value, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: QdiaColors.primary)),
          Text(label, textAlign: TextAlign.center, style: const TextStyle(fontSize: 9, color: QdiaColors.textMuted)),
        ],
      ),
    );
  }
}
