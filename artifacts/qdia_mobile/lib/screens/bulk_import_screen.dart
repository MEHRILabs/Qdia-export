import 'dart:convert';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:qdia_mobile/l10n/app_strings.dart';
import 'package:qdia_mobile/services/api_service.dart';
import 'package:qdia_mobile/theme/qdia_theme.dart';

class BulkImportScreen extends StatefulWidget {
  const BulkImportScreen({super.key});

  @override
  State<BulkImportScreen> createState() => _BulkImportScreenState();
}

class _BulkImportScreenState extends State<BulkImportScreen> {
  bool _loading = false;
  String? _status;
  List<String> _urls = [];
  final _urlCtrl = TextEditingController();

  Future<void> _pickCsv() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['csv', 'xlsx', 'xls', 'txt'],
      withData: true,
    );
    if (result == null || result.files.isEmpty) return;
    final file = result.files.first;
    final bytes = file.bytes;
    if (bytes == null) return;
    final text = utf8.decode(bytes);
    final lines = text.split(RegExp(r'[\r\n]+')).where((l) => l.trim().isNotEmpty);
    setState(() {
      _urls = lines
          .map((l) => l.split(',').first.trim())
          .where((u) => u.startsWith('http'))
          .toList();
      _status = context.tr('bulk_import.urls_detected').replaceAll('{count}', '${_urls.length}');
    });
  }

  Future<void> _runImport() async {
    final urls = [
      ..._urls,
      if (_urlCtrl.text.trim().startsWith('http')) _urlCtrl.text.trim(),
    ];
    if (urls.isEmpty) {
      setState(() => _status = context.tr('bulk_import.add_url'));
      return;
    }
    setState(() { _loading = true; _status = context.tr('bulk_import.importing'); });
    try {
      final r = await ApiService.instance.bulkImport(urls: urls);
      setState(() => _status = context.tr('bulk_import.import_result')
          .replaceAll('{imported}', '${r['imported'] ?? 0}')
          .replaceAll('{errors}', '${(r['errors'] as List?)?.length ?? 0}'));
    } catch (e) {
      setState(() => _status = '${context.tr('bulk_import.error_prefix')} $e');
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(context.tr('mobile.bulk_import'), style: const TextStyle(fontWeight: FontWeight.w800)),
        backgroundColor: QdiaColors.primary,
        foregroundColor: Colors.white,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(
            context.tr('bulk_import.description'),
            style: const TextStyle(color: QdiaColors.textMuted, fontSize: 13),
          ),
          const SizedBox(height: 16),
          OutlinedButton.icon(
            onPressed: _loading ? null : _pickCsv,
            icon: const Icon(Icons.upload_file),
            label: Text(context.tr('bulk_import.choose_file')),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _urlCtrl,
            decoration: InputDecoration(
              labelText: context.tr('bulk_import.url_label'),
              border: const OutlineInputBorder(),
            ),
          ),
          if (_urls.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(context.tr('bulk_import.urls_ready').replaceAll('{count}', '${_urls.length}'), style: const TextStyle(fontSize: 12)),
            ),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: _loading ? null : _runImport,
            style: FilledButton.styleFrom(backgroundColor: QdiaColors.gold, foregroundColor: QdiaColors.navy),
            child: _loading
                ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
                : Text(context.tr('bulk_import.launch'), style: const TextStyle(fontWeight: FontWeight.w800)),
          ),
          if (_status != null) Padding(padding: const EdgeInsets.only(top: 12), child: Text(_status!)),
        ],
      ),
    );
  }
}
