import 'package:flutter/material.dart';
import 'package:qdia_mobile/l10n/app_strings.dart';
import 'package:qdia_mobile/services/api_service.dart';
import 'package:qdia_mobile/theme/qdia_theme.dart';

const _demoNumbers = [
  ('DHL', 'DHL1234567890'),
  ('FedEx', 'FX9876543210'),
  ('Maersk', 'MSK4455667788'),
];

class TrackingScreen extends StatefulWidget {
  const TrackingScreen({super.key, this.initialNumber});

  final String? initialNumber;

  @override
  State<TrackingScreen> createState() => _TrackingScreenState();
}

class _TrackingScreenState extends State<TrackingScreen> {
  final _numberCtrl = TextEditingController();
  Map<String, dynamic>? _result;
  bool _loading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    if (widget.initialNumber != null) {
      _numberCtrl.text = widget.initialNumber!;
      _track();
    }
  }

  @override
  void dispose() {
    _numberCtrl.dispose();
    super.dispose();
  }

  Future<void> _track() async {
    final number = _numberCtrl.text.trim();
    if (number.isEmpty) return;
    setState(() {
      _loading = true;
      _error = null;
      _result = null;
    });
    try {
      _result = await ApiService.instance.trackParcel(number: number);
    } catch (e) {
      _error = e.toString();
    }
    if (mounted) setState(() => _loading = false);
  }

  String _eventLabel(String status) {
    final key = 'tracking.event_$status';
    final t = context.tr(key);
    return t == key ? status : t;
  }

  @override
  Widget build(BuildContext context) {
    final events = (_result?['events'] as List?)?.cast<Map<String, dynamic>>() ?? [];

    return Scaffold(
      backgroundColor: QdiaColors.pageBg,
      appBar: AppBar(
        title: Text(context.tr('mobile.tracking'), style: const TextStyle(fontWeight: FontWeight.w800)),
        backgroundColor: QdiaColors.primary,
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: [QdiaColors.sidebar, QdiaColors.primary]),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  context.tr('tracking.title'),
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 16),
                ),
                const SizedBox(height: 6),
                Text(
                  context.tr('tracking.subtitle'),
                  style: const TextStyle(color: Colors.white70, fontSize: 12),
                ),
                const SizedBox(height: 14),
                TextField(
                  controller: _numberCtrl,
                  style: const TextStyle(fontSize: 14),
                  decoration: InputDecoration(
                    hintText: context.tr('tracking.placeholder'),
                    filled: true,
                    fillColor: Colors.white,
                    prefixIcon: const Icon(Icons.qr_code_2_rounded),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
                  ),
                  onSubmitted: (_) => _track(),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: _loading ? null : _track,
                    icon: _loading
                        ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Icon(Icons.search_rounded),
                    label: Text(context.tr('tracking.track')),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: QdiaColors.gold,
                      foregroundColor: QdiaColors.navy,
                      minimumSize: const Size.fromHeight(46),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          Text(
            context.tr('tracking.examples'),
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: QdiaColors.textMuted),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _demoNumbers.map((item) {
              return ActionChip(
                avatar: const Icon(Icons.local_shipping_outlined, size: 16, color: QdiaColors.primary),
                label: Text('${item.$1} · ${item.$2}', style: const TextStyle(fontSize: 11)),
                onPressed: () {
                  _numberCtrl.text = item.$2;
                  _track();
                },
              );
            }).toList(),
          ),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(top: 16),
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: QdiaColors.danger.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: QdiaColors.danger.withValues(alpha: 0.3)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.error_outline, color: QdiaColors.danger, size: 20),
                    const SizedBox(width: 8),
                    Expanded(child: Text(_error!, style: const TextStyle(color: QdiaColors.danger, fontSize: 12))),
                  ],
                ),
              ),
            ),
          if (_result != null) ...[
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: QdiaColors.border),
                boxShadow: [
                  BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 10, offset: const Offset(0, 3)),
                ],
              ),
              child: Row(
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: QdiaColors.primaryLight,
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: const Icon(Icons.local_shipping_rounded, color: QdiaColors.primary),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(_result!['carrier']?.toString() ?? '', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 15)),
                        Text('${context.tr('tracking.number')} ${_result!['tracking_number']}', style: const TextStyle(fontSize: 12, color: QdiaColors.textMuted)),
                        const SizedBox(height: 4),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: QdiaColors.success.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            _eventLabel(_result!['status']?.toString() ?? ''),
                            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: QdiaColors.success),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Text(context.tr('tracking.timeline'), style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14, color: QdiaColors.navy)),
            const SizedBox(height: 10),
            ...events.asMap().entries.map((e) {
              final ev = e.value;
              final isLast = e.key == events.length - 1;
              return IntrinsicHeight(
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Column(
                      children: [
                        Container(
                          width: 28,
                          height: 28,
                          decoration: BoxDecoration(
                            color: isLast ? QdiaColors.primary : QdiaColors.success,
                            shape: BoxShape.circle,
                          ),
                          child: Icon(
                            isLast ? Icons.local_shipping_rounded : Icons.check_rounded,
                            size: 14,
                            color: Colors.white,
                          ),
                        ),
                        if (!isLast)
                          Expanded(
                            child: Container(width: 2, margin: const EdgeInsets.symmetric(vertical: 4), color: QdiaColors.border),
                          ),
                      ],
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Container(
                        margin: const EdgeInsets.only(bottom: 14),
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: isLast ? QdiaColors.primary.withValues(alpha: 0.3) : QdiaColors.border),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(_eventLabel(ev['status']?.toString() ?? ''), style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
                            const SizedBox(height: 4),
                            Text(ev['description']?.toString() ?? '', style: const TextStyle(fontSize: 12, color: QdiaColors.textBody)),
                            if ((ev['location']?.toString() ?? '').isNotEmpty) ...[
                              const SizedBox(height: 4),
                              Row(
                                children: [
                                  const Icon(Icons.place_outlined, size: 14, color: QdiaColors.primary),
                                  const SizedBox(width: 4),
                                  Text(ev['location']?.toString() ?? '', style: const TextStyle(fontSize: 11, color: QdiaColors.primary, fontWeight: FontWeight.w600)),
                                ],
                              ),
                            ],
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              );
            }),
          ],
        ],
      ),
    );
  }
}
