import 'package:flutter/material.dart';
import 'package:qdia_mobile/l10n/app_strings.dart';
import 'package:qdia_mobile/services/api_service.dart';
import 'package:qdia_mobile/theme/qdia_theme.dart';

class ProductEnrichmentScreen extends StatefulWidget {
  const ProductEnrichmentScreen({super.key});

  @override
  State<ProductEnrichmentScreen> createState() => _ProductEnrichmentScreenState();
}

class _ProductEnrichmentScreenState extends State<ProductEnrichmentScreen> {
  bool _loading = false;
  Map<String, dynamic>? _status;
  String? _message;

  @override
  void initState() {
    super.initState();
    _refresh();
  }

  Future<void> _refresh() async {
    try {
      final status = await ApiService.instance.getProductEnrichmentStatus();
      if (mounted) setState(() => _status = status);
    } catch (e) {
      if (mounted) setState(() => _message = context.tr('enrichment.status_error').replaceAll('{error}', '$e'));
    }
  }

  Future<void> _enrich(int limit, {bool photos = true}) async {
    setState(() {
      _loading = true;
      _message = context.tr('enrichment.enrich_running').replaceAll('{limit}', '$limit');
    });
    try {
      final r = await ApiService.instance.enrichProducts(limit: limit, generatePhotos: photos);
      setState(() {
        _message = context.tr('enrichment.enrich_done')
            .replaceAll('{enriched}', '${r['enriched'] ?? 0}')
            .replaceAll('{photos}', '${r['photos_generated'] ?? 0}')
            .replaceAll('{pricing}', '${r['pricing_updated'] ?? 0}');
      });
      await _refresh();
    } catch (e) {
      setState(() => _message = context.tr('enrichment.error').replaceAll('{error}', '$e'));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Widget _statTile(String label, dynamic value) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: QdiaColors.border),
        ),
        child: Column(
          children: [
            Text('$value', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: QdiaColors.navy)),
            const SizedBox(height: 4),
            Text(label, textAlign: TextAlign.center, style: const TextStyle(fontSize: 10, color: QdiaColors.textMuted)),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final s = _status;
    return Scaffold(
      appBar: AppBar(
        title: Text(context.tr('enrichment.title'), style: const TextStyle(fontWeight: FontWeight.w800)),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(
            context.tr('enrichment.intro'),
            style: const TextStyle(color: QdiaColors.textMuted, fontSize: 13),
          ),
          const SizedBox(height: 16),
          if (s != null) ...[
            Row(
              children: [
                _statTile(context.tr('enrichment.stat_total'), s['total'] ?? 0),
                const SizedBox(width: 8),
                _statTile(context.tr('enrichment.stat_without_photo'), s['without_photo'] ?? 0),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                _statTile(context.tr('enrichment.stat_without_pricing'), s['without_pricing'] ?? 0),
                const SizedBox(width: 8),
                _statTile(context.tr('enrichment.stat_published'), s['published'] ?? 0),
              ],
            ),
          ],
          const SizedBox(height: 20),
          ElevatedButton.icon(
            onPressed: _loading ? null : () => _enrich(50),
            icon: const Icon(Icons.auto_fix_high_rounded),
            label: Text(context.tr('enrichment.enrich_50')),
          ),
          const SizedBox(height: 8),
          OutlinedButton.icon(
            onPressed: _loading ? null : () => _enrich(200, photos: false),
            icon: const Icon(Icons.payments_outlined),
            label: Text(context.tr('enrichment.price_only_200')),
          ),
          const SizedBox(height: 8),
          OutlinedButton.icon(
            onPressed: _loading ? null : () => _refresh(),
            icon: const Icon(Icons.refresh_rounded),
            label: Text(context.tr('enrichment.refresh_stats')),
          ),
          if (_loading) ...[
            const SizedBox(height: 24),
            const Center(child: CircularProgressIndicator(color: QdiaColors.primary)),
          ],
          if (_message != null) ...[
            const SizedBox(height: 16),
            Text(_message!, style: const TextStyle(fontSize: 13)),
          ],
        ],
      ),
    );
  }
}
