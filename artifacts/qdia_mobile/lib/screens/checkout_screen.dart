import 'package:flutter/material.dart';
import 'package:qdia_mobile/l10n/app_strings.dart';
import 'package:qdia_mobile/services/api_service.dart';
import 'package:qdia_mobile/theme/qdia_theme.dart';

class CheckoutScreen extends StatefulWidget {
  const CheckoutScreen({super.key, required this.total});

  final double total;

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  String _payment = 'escrow';
  bool _submitting = false;

  Future<void> _confirm() async {
    setState(() => _submitting = true);
    try {
      final result = await ApiService.instance.checkoutCart(paymentMethod: _payment);
      if (mounted) {
        final txId = result['transaction_id'];
        await showDialog<void>(
          context: context,
          builder: (ctx) => AlertDialog(
            title: Text(ctx.tr('checkout.success')),
            content: Text(
              txId != null
                  ? ctx.tr('checkout.transaction_created').replaceAll('{id}', '$txId')
                  : ctx.tr('checkout.success'),
            ),
            actions: [
              if (txId != null)
                TextButton(
                  onPressed: () {
                    Navigator.pop(ctx);
                    Navigator.pop(context, true);
                    Navigator.pushNamed(context, '/transactions');
                  },
                  child: Text(ctx.tr('checkout.view_transaction')),
                ),
              TextButton(
                onPressed: () {
                  Navigator.pop(ctx);
                  Navigator.pop(context, true);
                  Navigator.pushNamed(context, '/orders');
                },
                child: Text(ctx.tr('checkout.view_orders')),
              ),
            ],
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    }
    if (mounted) setState(() => _submitting = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: QdiaColors.pageBg,
      appBar: AppBar(
        title: Text(context.tr('checkout.title'), style: const TextStyle(fontWeight: FontWeight.w800)),
        backgroundColor: QdiaColors.primary,
        foregroundColor: Colors.white,
      ),
      body: ListView(
        padding: const EdgeInsets.all(12),
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: QdiaColors.border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(context.tr('checkout.summary'), style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(context.tr('cart.total')),
                    Text('\$${widget.total.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 20, color: QdiaColors.primary)),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    const Icon(Icons.verified_user, size: 16, color: QdiaColors.success),
                    const SizedBox(width: 6),
                    Expanded(child: Text(context.tr('checkout.trade_assurance'), style: const TextStyle(fontSize: 11, color: QdiaColors.textMuted))),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Text(context.tr('checkout.payment_method'), style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13, color: QdiaColors.primary)),
          const SizedBox(height: 8),
          _PaymentTile(
            id: 'escrow',
            icon: Icons.shield,
            label: context.tr('payment.escrow'),
            desc: context.tr('product.escrow_desc'),
            selected: _payment,
            onSelect: (v) => setState(() => _payment = v),
          ),
          _PaymentTile(
            id: 'swift',
            icon: Icons.account_balance,
            label: context.tr('payment.swift'),
            desc: context.tr('product.swift_desc'),
            selected: _payment,
            onSelect: (v) => setState(() => _payment = v),
          ),
          _PaymentTile(
            id: 'lc',
            icon: Icons.description,
            label: context.tr('payment.lc'),
            desc: context.tr('product.lc_desc'),
            selected: _payment,
            onSelect: (v) => setState(() => _payment = v),
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: ElevatedButton(
            onPressed: _submitting ? null : _confirm,
            style: ElevatedButton.styleFrom(backgroundColor: QdiaColors.gold, foregroundColor: QdiaColors.navy),
            child: _submitting
                ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: QdiaColors.navy))
                : Text(context.tr('checkout.confirm'), style: const TextStyle(fontWeight: FontWeight.w800)),
          ),
        ),
      ),
    );
  }
}

class _PaymentTile extends StatelessWidget {
  const _PaymentTile({
    required this.id,
    required this.icon,
    required this.label,
    required this.desc,
    required this.selected,
    required this.onSelect,
  });

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
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border.all(color: active ? QdiaColors.primary : QdiaColors.border, width: active ? 1.5 : 1),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            Icon(icon, color: QdiaColors.primary),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label, style: const TextStyle(fontWeight: FontWeight.w700)),
                  Text(desc, style: const TextStyle(fontSize: 11, color: QdiaColors.textMuted)),
                ],
              ),
            ),
            if (active) const Icon(Icons.check_circle, color: QdiaColors.primary),
          ],
        ),
      ),
    );
  }
}
