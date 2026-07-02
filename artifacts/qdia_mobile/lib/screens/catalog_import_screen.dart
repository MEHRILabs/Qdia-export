import 'dart:convert';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:qdia_mobile/services/api_service.dart';
import 'package:qdia_mobile/theme/qdia_theme.dart';

class CatalogImportScreen extends StatefulWidget {
  const CatalogImportScreen({super.key});

  @override
  State<CatalogImportScreen> createState() => _CatalogImportScreenState();
}

class _CatalogImportScreenState extends State<CatalogImportScreen> {
  bool _loading = false;
  String? _fileName;
  Map<String, dynamic>? _stats;
  Map<String, dynamic>? _lastImport;
  String? _status;

  @override
  void initState() {
    super.initState();
    _refreshStats();
  }

  Future<void> _refreshStats() async {
    try {
      final stats = await ApiService.instance.getCatalogStats();
      if (mounted) setState(() => _stats = stats);
    } catch (_) {
      if (mounted) setState(() => _stats = {'db_error': true});
    }
  }

  Future<void> _pickExcel() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['xlsx', 'xls'],
      withData: true,
    );
    if (result == null || result.files.isEmpty) return;
    final file = result.files.first;
    final bytes = file.bytes;
    if (bytes == null) return;

    setState(() {
      _loading = true;
      _fileName = file.name;
      _status = 'Import en cours…';
    });

    try {
      final r = await ApiService.instance.importCatalogExcel(fileBytes: bytes);
      setState(() {
        _lastImport = r;
        _status = 'Import terminé : ${r['inserted'] ?? 0} nouveaux, ${r['updated'] ?? 0} mis à jour, '
            '${r['publishable'] ?? 0} prêts à publier';
      });
      await _refreshStats();
    } catch (e) {
      setState(() => _status = 'Erreur import : $e');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _enrich() async {
    setState(() { _loading = true; _status = 'Enrichissement IA (prix + photos)…'; });
    try {
      final r = await ApiService.instance.enrichCatalog(limit: 30);
      setState(() => _status = 'IA : ${r['enriched'] ?? 0} enrichis, '
            '${r['photos_generated'] ?? 0} photos générées, ${r['skipped'] ?? 0} ignorés');
      await _refreshStats();
    } catch (e) {
      setState(() => _status = 'Erreur enrichissement : $e');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _publishReady() async {
    setState(() { _loading = true; _status = 'Publication des variantes complètes…'; });
    try {
      final r = await ApiService.instance.publishReadyCatalog(limit: 50);
      setState(() => _status = 'Publiés : ${r['published'] ?? 0}, échecs : ${r['failed'] ?? 0}');
      await _refreshStats();
    } catch (e) {
      setState(() => _status = 'Erreur publication : $e');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Widget _statTile(String label, dynamic value, {Color? color}) {
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
            Text('$value', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: color ?? QdiaColors.primary)),
            const SizedBox(height: 4),
            Text(label, textAlign: TextAlign.center, style: const TextStyle(fontSize: 11, color: QdiaColors.textMuted)),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final stats = _stats;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Catalogue Master Data', style: TextStyle(fontWeight: FontWeight.w800)),
        backgroundColor: QdiaColors.primary,
        foregroundColor: Colors.white,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text(
            'Importez votre Excel (base_de_donnees_finale.xlsx). '
            'L\'IA génère automatiquement le prix FOB, MOQ, HS et la photo produit, '
            'puis les enregistre dans la base.',
            style: TextStyle(color: QdiaColors.textMuted, fontSize: 13),
          ),
          const SizedBox(height: 16),
          if (stats != null) ...[
            Row(
              children: [
                _statTile('Total', stats['total'] ?? 0),
                const SizedBox(width: 8),
                _statTile('À valider', stats['a_valider'] ?? 0, color: QdiaColors.gold),
                const SizedBox(width: 8),
                _statTile('Publiés', stats['published'] ?? 0, color: QdiaColors.success),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                _statTile('Avec photo', stats['with_image'] ?? 0),
                const SizedBox(width: 8),
                _statTile('Avec FOB', stats['with_fob'] ?? 0),
              ],
            ),
            if (stats['db_error'] == true)
              const Padding(
                padding: EdgeInsets.only(top: 8),
                child: Text('PostgreSQL non connecté — stats à zéro', style: TextStyle(color: QdiaColors.danger, fontSize: 12)),
              ),
            const SizedBox(height: 20),
          ],
          FilledButton.icon(
            onPressed: _loading ? null : _pickExcel,
            icon: const Icon(Icons.upload_file_rounded),
            label: Text(_fileName ?? 'Choisir Excel (.xlsx)'),
            style: FilledButton.styleFrom(
              minimumSize: const Size.fromHeight(48),
              backgroundColor: QdiaColors.primary,
            ),
          ),
          const SizedBox(height: 10),
          OutlinedButton.icon(
            onPressed: _loading ? null : _enrich,
            icon: const Icon(Icons.auto_awesome_rounded),
            label: const Text('Enrichir 30 lignes (prix + photos IA)'),
            style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(46)),
          ),
          const SizedBox(height: 10),
          OutlinedButton.icon(
            onPressed: _loading ? null : _publishReady,
            icon: const Icon(Icons.publish_rounded),
            label: const Text('Publier les variantes complètes'),
            style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(46)),
          ),
          if (_loading)
            const Padding(
              padding: EdgeInsets.only(top: 16),
              child: Center(child: CircularProgressIndicator()),
            ),
          if (_status != null)
            Padding(
              padding: const EdgeInsets.only(top: 16),
              child: Text(_status!, style: const TextStyle(fontSize: 13)),
            ),
          if (_lastImport != null) ...[
            const SizedBox(height: 16),
            Text('Détail import', style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w800)),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: QdiaColors.pageBg,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: QdiaColors.border),
              ),
              child: Text(
                const JsonEncoder.withIndent('  ').convert(_lastImport),
                style: const TextStyle(fontSize: 11, fontFamily: 'monospace'),
              ),
            ),
          ],
          const SizedBox(height: 24),
          const _ChecklistCard(),
        ],
      ),
    );
  }
}

class _ChecklistCard extends StatelessWidget {
  const _ChecklistCard();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: QdiaColors.border),
      ),
      child: const Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Votre travail (Excel)', style: TextStyle(fontWeight: FontWeight.w900)),
          SizedBox(height: 8),
          Text('• Poids / carton / palette\n• Subvention confirmée (N/S)\n• Statut export = validé\n• FOB réel si vous l\'avez (sinon IA)', style: TextStyle(fontSize: 12, color: QdiaColors.textMuted, height: 1.5)),
          SizedBox(height: 12),
          Text('Notre travail (app + IA)', style: TextStyle(fontWeight: FontWeight.w900)),
          SizedBox(height: 8),
          Text('• Import 19 735 variantes\n• Génération photo IA → sauvegardée en base\n• Estimation FOB / MOQ / HS\n• Publication marketplace si complet', style: TextStyle(fontSize: 12, color: QdiaColors.textMuted, height: 1.5)),
        ],
      ),
    );
  }
}
