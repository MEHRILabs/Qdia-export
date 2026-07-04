import 'dart:convert';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:qdia_mobile/l10n/app_strings.dart';
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
      _status = context.tr('catalog_import.import_running');
    });

    try {
      final r = await ApiService.instance.importCatalogExcel(fileBytes: bytes);
      setState(() {
        _lastImport = r;
        _status = context.tr('catalog_import.import_done')
            .replaceAll('{inserted}', '${r['inserted'] ?? 0}')
            .replaceAll('{updated}', '${r['updated'] ?? 0}')
            .replaceAll('{publishable}', '${r['publishable'] ?? 0}');
      });
      await _refreshStats();
    } catch (e) {
      setState(() => _status = context.tr('catalog_import.import_error').replaceAll('{error}', '$e'));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _enrich() async {
    setState(() { _loading = true; _status = context.tr('catalog_import.enrich_running'); });
    try {
      final r = await ApiService.instance.enrichCatalog(limit: 30);
      setState(() => _status = context.tr('catalog_import.enrich_done')
            .replaceAll('{enriched}', '${r['enriched'] ?? 0}')
            .replaceAll('{photos}', '${r['photos_generated'] ?? 0}')
            .replaceAll('{skipped}', '${r['skipped'] ?? 0}'));
      await _refreshStats();
    } catch (e) {
      setState(() => _status = context.tr('catalog_import.enrich_error').replaceAll('{error}', '$e'));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _publishReady() async {
    setState(() { _loading = true; _status = context.tr('catalog_import.publish_running'); });
    try {
      final r = await ApiService.instance.publishReadyCatalog(limit: 50);
      setState(() => _status = context.tr('catalog_import.publish_done')
            .replaceAll('{published}', '${r['published'] ?? 0}')
            .replaceAll('{failed}', '${r['failed'] ?? 0}'));
      await _refreshStats();
    } catch (e) {
      setState(() => _status = context.tr('catalog_import.publish_error').replaceAll('{error}', '$e'));
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
        title: Text(context.tr('catalog_import.title'), style: const TextStyle(fontWeight: FontWeight.w800)),
        backgroundColor: QdiaColors.primary,
        foregroundColor: Colors.white,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(
            context.tr('catalog_import.intro'),
            style: const TextStyle(color: QdiaColors.textMuted, fontSize: 13),
          ),
          const SizedBox(height: 16),
          if (stats != null) ...[
            Row(
              children: [
                _statTile(context.tr('catalog_import.stat_total'), stats['total'] ?? 0),
                const SizedBox(width: 8),
                _statTile(context.tr('catalog_import.stat_to_validate'), stats['a_valider'] ?? 0, color: QdiaColors.gold),
                const SizedBox(width: 8),
                _statTile(context.tr('catalog_import.stat_published'), stats['published'] ?? 0, color: QdiaColors.success),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                _statTile(context.tr('catalog_import.stat_with_photo'), stats['with_image'] ?? 0),
                const SizedBox(width: 8),
                _statTile(context.tr('catalog_import.stat_with_fob'), stats['with_fob'] ?? 0),
              ],
            ),
            if (stats['db_error'] == true)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(context.tr('catalog_import.db_error'), style: const TextStyle(color: QdiaColors.danger, fontSize: 12)),
              ),
            const SizedBox(height: 20),
          ],
          FilledButton.icon(
            onPressed: _loading ? null : _pickExcel,
            icon: const Icon(Icons.upload_file_rounded),
            label: Text(_fileName ?? context.tr('catalog_import.choose_excel')),
            style: FilledButton.styleFrom(
              minimumSize: const Size.fromHeight(48),
              backgroundColor: QdiaColors.primary,
            ),
          ),
          const SizedBox(height: 10),
          OutlinedButton.icon(
            onPressed: _loading ? null : _enrich,
            icon: const Icon(Icons.auto_awesome_rounded),
            label: Text(context.tr('catalog_import.enrich_btn')),
            style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(46)),
          ),
          const SizedBox(height: 10),
          OutlinedButton.icon(
            onPressed: _loading ? null : _publishReady,
            icon: const Icon(Icons.publish_rounded),
            label: Text(context.tr('catalog_import.publish_btn')),
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
            Text(context.tr('catalog_import.import_detail'), style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w800)),
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
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(context.tr('catalog_import.your_work_title'), style: const TextStyle(fontWeight: FontWeight.w900)),
          const SizedBox(height: 8),
          Text(context.tr('catalog_import.your_work_body'), style: const TextStyle(fontSize: 12, color: QdiaColors.textMuted, height: 1.5)),
          const SizedBox(height: 12),
          Text(context.tr('catalog_import.our_work_title'), style: const TextStyle(fontWeight: FontWeight.w900)),
          const SizedBox(height: 8),
          Text(context.tr('catalog_import.our_work_body'), style: const TextStyle(fontSize: 12, color: QdiaColors.textMuted, height: 1.5)),
        ],
      ),
    );
  }
}
