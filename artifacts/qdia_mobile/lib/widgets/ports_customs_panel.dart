import 'package:flutter/material.dart';
import 'package:qdia_mobile/services/api_service.dart';
import 'package:qdia_mobile/theme/qdia_theme.dart';

class PortsCustomsPanel extends StatefulWidget {
  const PortsCustomsPanel({
    super.key,
    required this.productCategory,
    this.portDepart,
    this.fobPrice = 50000,
  });

  final String productCategory;
  final String? portDepart;
  final double fobPrice;

  @override
  State<PortsCustomsPanel> createState() => _PortsCustomsPanelState();
}

class _PortsCustomsPanelState extends State<PortsCustomsPanel> {
  Map<String, dynamic>? _ports;
  Map<String, dynamic>? _customs;
  String _dest = 'FR';
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final ports = await ApiService.instance.getPorts();
      setState(() => _ports = ports['grouped'] as Map<String, dynamic>?);
      await _calc();
    } catch (_) {}
  }

  Future<void> _calc() async {
    setState(() => _loading = true);
    try {
      final result = await ApiService.instance.calculateCustoms(
        category: widget.productCategory,
        destinationCode: _dest,
        cifValueDzd: widget.fobPrice * 1.15,
        portCode: _dest == 'FR' ? 'DZBJA' : _dest == 'AE' ? 'DZALG' : 'DZALG',
      );
      setState(() => _customs = result);
    } catch (_) {}
    setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    final algeria = (_ports?['algeria'] as List?) ?? [];
    final international = (_ports?['international'] as List?) ?? [];

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: QdiaColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.anchor, color: QdiaColors.primary, size: 20),
              SizedBox(width: 8),
              Text('Ports & douane', style: TextStyle(fontWeight: FontWeight.w800, color: QdiaColors.sidebar)),
            ],
          ),
          const SizedBox(height: 12),
          if (algeria.isNotEmpty) ...[
            const Text('Ports Algérie 🇩🇿', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: QdiaColors.primary)),
            const SizedBox(height: 6),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: algeria.take(6).map((p) {
                final port = p as Map<String, dynamic>;
                return Chip(
                  label: Text('${port['city']} · ${port['code']}', style: const TextStyle(fontSize: 10)),
                  backgroundColor: QdiaColors.primaryLight,
                  side: BorderSide.none,
                  visualDensity: VisualDensity.compact,
                );
              }).toList(),
            ),
            const SizedBox(height: 10),
          ],
          if (international.isNotEmpty) ...[
            const Text('International', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
            const SizedBox(height: 6),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: international.map((p) {
                final port = p as Map<String, dynamic>;
                return Chip(
                  label: Text('${port['country']} — ${port['city']}', style: const TextStyle(fontSize: 10)),
                  visualDensity: VisualDensity.compact,
                );
              }).toList(),
            ),
            const SizedBox(height: 12),
          ],
          Row(
            children: [
              _destBtn('FR', 'France 🇫🇷'),
              const SizedBox(width: 8),
              _destBtn('AE', 'UAE 🇦🇪'),
              const SizedBox(width: 8),
              _destBtn('DZ', 'Export DZ'),
            ],
          ),
          if (_customs != null) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: QdiaColors.appBg, borderRadius: BorderRadius.circular(10)),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Douane — ${_customs!['destination_country']}', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                  const SizedBox(height: 8),
                  Text('Total estimé : ${_customs!['total_customs_dzd']} DZD',
                      style: const TextStyle(fontWeight: FontWeight.w900, color: QdiaColors.primary)),
                  if (_customs!['notes'] != null)
                    Text('${_customs!['notes']}', style: const TextStyle(fontSize: 11, color: QdiaColors.textMuted, fontStyle: FontStyle.italic)),
                ],
              ),
            ),
          ],
          if (_loading) const Padding(padding: EdgeInsets.only(top: 8), child: LinearProgressIndicator()),
        ],
      ),
    );
  }

  Widget _destBtn(String code, String label) {
    final active = _dest == code;
    return Expanded(
      child: GestureDetector(
        onTap: () { setState(() => _dest = code); _calc(); },
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: active ? QdiaColors.primary : Colors.white,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: active ? QdiaColors.primary : QdiaColors.border),
          ),
          child: Text(label, textAlign: TextAlign.center,
              style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: active ? Colors.white : QdiaColors.textBody)),
        ),
      ),
    );
  }
}
