import 'package:flutter/material.dart';
import 'package:qdia_mobile/l10n/app_strings.dart';
import 'package:qdia_mobile/models/product.dart';
import 'package:qdia_mobile/services/api_service.dart';
import 'package:qdia_mobile/theme/qdia_theme.dart';
import 'package:qdia_mobile/widgets/product_image.dart';

class RfqScreen extends StatefulWidget {
  const RfqScreen({
    super.key,
    required this.items,
    required this.onRemove,
    this.onLoginRequired,
    this.onSubmitted,
  });

  final List<RfqItem> items;
  final ValueChanged<int> onRemove;
  final VoidCallback? onLoginRequired;
  final VoidCallback? onSubmitted;

  @override
  State<RfqScreen> createState() => _RfqScreenState();
}

class _RfqScreenState extends State<RfqScreen> {
  bool _submitting = false;
  String _destination = 'FR';
  String _incoterm = 'FOB';

  Future<void> _submit() async {
    if (widget.items.isEmpty) return;

    await ApiService.instance.loadToken();
    if (!ApiService.instance.isLoggedIn) {
      if (mounted) {
        widget.onLoginRequired?.call();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(context.tr('rfq.login_required'))),
        );
      }
      return;
    }

    setState(() => _submitting = true);
    var ok = 0;
    try {
      for (final item in widget.items) {
        await ApiService.instance.createRfq({
          'product_name': item.product.name,
          'product_description': item.product.description,
          'product_id': item.product.id,
          'quantity': item.quantity,
          'quantity_unit': item.product.moqUnit,
          'destination_country': _destination,
          'requested_incoterm': _incoterm,
          'message': 'Demande via app mobile QDIA Export DZ',
        });
        ok++;
      }
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('$ok ${context.tr('rfq.submitted')}'),
            backgroundColor: QdiaColors.success,
          ),
        );
        widget.onSubmitted?.call();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString()), backgroundColor: QdiaColors.danger),
        );
      }
    }
    if (mounted) setState(() => _submitting = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(context.tr('rfq.title'), style: const TextStyle(fontWeight: FontWeight.w800)),
      ),
      body: widget.items.isEmpty
          ? Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.request_quote_outlined, size: 64, color: QdiaColors.border),
                  const SizedBox(height: 12),
                  Text(context.tr('rfq.empty_title'), style: const TextStyle(fontWeight: FontWeight.w600)),
                  const SizedBox(height: 4),
                  Text(context.tr('rfq.empty_hint'), style: const TextStyle(color: QdiaColors.textMuted, fontSize: 12)),
                ],
              ),
            )
          : Column(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
                  child: Row(
                    children: [
                      Expanded(
                        child: DropdownButtonFormField<String>(
                          value: _destination,
                          decoration: InputDecoration(labelText: context.tr('product.destination'), isDense: true),
                          items: [
                            DropdownMenuItem(value: 'FR', child: Text(context.tr('rfq.dest_france'))),
                            DropdownMenuItem(value: 'AE', child: Text(context.tr('rfq.dest_uae'))),
                            DropdownMenuItem(value: 'UK', child: Text(context.tr('rfq.dest_uk'))),
                          ],
                          onChanged: (v) => setState(() => _destination = v ?? 'FR'),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: DropdownButtonFormField<String>(
                          value: _incoterm,
                          decoration: InputDecoration(labelText: context.tr('rfq.incoterm'), isDense: true),
                          items: ['FOB', 'CIF', 'EXW', 'CFR']
                              .map((e) => DropdownMenuItem(value: e, child: Text(e)))
                              .toList(),
                          onChanged: (v) => setState(() => _incoterm = v ?? 'FOB'),
                        ),
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: ListView.separated(
                    padding: const EdgeInsets.all(12),
                    itemCount: widget.items.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                    itemBuilder: (_, i) {
                      final item = widget.items[i];
                      return Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: QdiaColors.border),
                        ),
                        child: Row(
                          children: [
                            ClipRRect(
                              borderRadius: BorderRadius.circular(8),
                              child: ProductImage(
                                src: item.product.displayImage,
                                width: 64,
                                height: 64,
                                fit: BoxFit.cover,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(item.product.name, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                                  const SizedBox(height: 4),
                                  Text(
                                    '${context.tr('product.fob')} ${item.product.prices.fob} ${item.product.prices.currency} · Qté ${item.quantity} ${item.product.moqUnit}',
                                    style: const TextStyle(fontSize: 11, color: QdiaColors.primary),
                                  ),
                                  Text(item.product.supplierName, style: const TextStyle(fontSize: 10, color: QdiaColors.textMuted)),
                                ],
                              ),
                            ),
                            IconButton(
                              onPressed: () => widget.onRemove(item.product.id),
                              icon: const Icon(Icons.delete_outline, color: QdiaColors.textMuted),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: const BoxDecoration(
                    color: Colors.white,
                    border: Border(top: BorderSide(color: QdiaColors.border)),
                  ),
                  child: SafeArea(
                    top: false,
                    child: Column(
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('${widget.items.length} ${context.tr('rfq.products_count')}', style: const TextStyle(fontWeight: FontWeight.w600)),
                            Text('${context.tr('rfq.incoterm')} $_incoterm', style: const TextStyle(fontSize: 12, color: QdiaColors.textMuted)),
                          ],
                        ),
                        const SizedBox(height: 12),
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            onPressed: _submitting ? null : _submit,
                            child: _submitting
                                ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                : Text(context.tr('rfq.submit')),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
    );
  }
}
