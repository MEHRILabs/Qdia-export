import 'package:flutter/material.dart';
import 'package:qdia_mobile/l10n/app_strings.dart';
import 'package:qdia_mobile/services/api_service.dart';
import 'package:qdia_mobile/theme/qdia_theme.dart';

class TradeAssuranceScreen extends StatefulWidget {
  const TradeAssuranceScreen({super.key});

  @override
  State<TradeAssuranceScreen> createState() => _TradeAssuranceScreenState();
}

class _TradeAssuranceScreenState extends State<TradeAssuranceScreen> {
  List<Map<String, dynamic>> _disputes = [];
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
      final raw = await ApiService.instance.getDisputes();
      _disputes = raw.cast<Map<String, dynamic>>();
    } catch (e) {
      _error = e.toString();
    }
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _openCreateDialog() async {
    final reasonCtrl = TextEditingController();
    final descCtrl = TextEditingController();
    final txCtrl = TextEditingController();
    final orderCtrl = TextEditingController();

    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: Text(context.tr('trade_assurance.open_dispute')),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: txCtrl,
                keyboardType: TextInputType.number,
                decoration: InputDecoration(labelText: context.tr('trade_assurance.transaction_id')),
              ),
              TextField(
                controller: orderCtrl,
                keyboardType: TextInputType.number,
                decoration: InputDecoration(labelText: context.tr('trade_assurance.order_id')),
              ),
              TextField(
                controller: reasonCtrl,
                decoration: InputDecoration(labelText: context.tr('trade_assurance.reason')),
              ),
              TextField(
                controller: descCtrl,
                maxLines: 3,
                decoration: InputDecoration(labelText: context.tr('trade_assurance.description')),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: Text(context.tr('common.cancel'))),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text(context.tr('common.send')),
          ),
        ],
      ),
    );

    if (ok != true || !mounted) return;

    final txId = int.tryParse(txCtrl.text.trim());
    if (txId == null || reasonCtrl.text.trim().length < 3) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(context.tr('trade_assurance.invalid_form'))),
      );
      return;
    }

    try {
      await ApiService.instance.createDispute(
        transactionId: txId,
        reason: reasonCtrl.text.trim(),
        orderId: int.tryParse(orderCtrl.text.trim()),
        description: descCtrl.text.trim().isEmpty ? null : descCtrl.text.trim(),
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(context.tr('trade_assurance.dispute_created')), backgroundColor: QdiaColors.success),
        );
        _load();
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'open':
        return QdiaColors.warning;
      case 'resolved':
      case 'refunded':
        return QdiaColors.success;
      case 'rejected':
        return QdiaColors.danger;
      default:
        return QdiaColors.textMuted;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: QdiaColors.pageBg,
      appBar: AppBar(
        title: Text(context.tr('trade_assurance.title'), style: const TextStyle(fontWeight: FontWeight.w800)),
        backgroundColor: QdiaColors.primary,
        foregroundColor: Colors.white,
        actions: [
          IconButton(onPressed: _openCreateDialog, icon: const Icon(Icons.add)),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Text(_error!, style: const TextStyle(color: QdiaColors.textMuted)))
              : Column(
                  children: [
                    Container(
                      margin: const EdgeInsets.all(12),
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(colors: [QdiaColors.sidebar, QdiaColors.primary]),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.verified_user, color: QdiaColors.gold, size: 32),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(context.tr('trade_assurance.title'), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800)),
                                Text(context.tr('trade_assurance.subtitle'), style: const TextStyle(color: Colors.white70, fontSize: 11)),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    Expanded(
                      child: _disputes.isEmpty
                          ? Center(child: Text(context.tr('trade_assurance.no_disputes'), style: const TextStyle(color: QdiaColors.textMuted)))
                          : RefreshIndicator(
                              onRefresh: _load,
                              child: ListView.builder(
                                padding: const EdgeInsets.symmetric(horizontal: 12),
                                itemCount: _disputes.length,
                                itemBuilder: (_, i) {
                                  final d = _disputes[i];
                                  final status = d['status']?.toString() ?? '';
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
                                            Text('#${d['id']}', style: const TextStyle(fontWeight: FontWeight.w800)),
                                            Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                              decoration: BoxDecoration(
                                                color: _statusColor(status).withValues(alpha: 0.15),
                                                borderRadius: BorderRadius.circular(8),
                                              ),
                                              child: Text(status, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: _statusColor(status))),
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 6),
                                        Text(d['reason']?.toString() ?? '', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                                        if (d['description'] != null && d['description'].toString().isNotEmpty)
                                          Padding(
                                            padding: const EdgeInsets.only(top: 4),
                                            child: Text(d['description'].toString(), style: const TextStyle(fontSize: 11, color: QdiaColors.textMuted)),
                                          ),
                                        if (d['refund_amount'] != null)
                                          Padding(
                                            padding: const EdgeInsets.only(top: 4),
                                            child: Text('${context.tr('trade_assurance.refund')}: ${d['refund_amount']}', style: const TextStyle(fontSize: 11, color: QdiaColors.success)),
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
