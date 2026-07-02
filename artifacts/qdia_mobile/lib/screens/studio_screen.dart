import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:qdia_mobile/l10n/app_strings.dart';
import 'package:qdia_mobile/services/api_service.dart';
import 'package:qdia_mobile/theme/qdia_theme.dart';
import 'package:qdia_mobile/widgets/product_image.dart';

class StudioScreen extends StatefulWidget {
  const StudioScreen({super.key});

  @override
  State<StudioScreen> createState() => _StudioScreenState();
}

class _StudioScreenState extends State<StudioScreen> {
  String? _sessionId;
  String? _resultMessage;
  String? _imageBase64;
  String? _previewPath;
  bool _loading = false;

  final _picker = ImagePicker();

  List<(String, String, IconData)> _actions(BuildContext context) => [
    ('remove_background', context.tr('studio.cutout'), Icons.crop_free),
    ('enhance', context.tr('studio.enhance'), Icons.auto_fix_high),
    ('white_background', context.tr('studio.export_white_bg'), Icons.verified),
  ];

  @override
  void initState() {
    super.initState();
    _initSession();
  }

  Future<void> _initSession() async {
    try {
      final res = await ApiService.instance.createAiSession();
      setState(() => _sessionId = res['id'] as String? ?? res['session_id'] as String?);
    } catch (_) {}
  }

  Future<void> _pickImage(ImageSource source) async {
    final file = await _picker.pickImage(source: source, maxWidth: 1200, imageQuality: 85);
    if (file == null) return;
    final bytes = await file.readAsBytes();
    setState(() {
      _previewPath = file.path;
      _imageBase64 = base64Encode(bytes);
    });
  }

  Future<void> _process(String action) async {
    if (_sessionId == null) return;
    if (_imageBase64 == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(context.tr('studio.select_photo_first'))),
      );
      return;
    }
    setState(() {
      _loading = true;
      _resultMessage = null;
    });
    try {
      final res = await ApiService.instance.studioProcess(
        sessionId: _sessionId!,
        imageBase64: _imageBase64!,
        action: action,
        productName: 'Produit export DZ',
      );
      final resultB64 = res['image_base64'] as String?;
      setState(() {
        _resultMessage = res['message'] as String? ?? context.tr('studio.processed_success');
        if (resultB64 != null) {
          _imageBase64 = resultB64;
          _previewPath = 'data:image/png;base64,$resultB64';
        }
      });
    } catch (e) {
      setState(() => _resultMessage = e.toString());
    }
    setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    final actions = _actions(context);
    return Scaffold(
      appBar: AppBar(title: Text(context.tr('studio.title'), style: const TextStyle(fontWeight: FontWeight.w800))),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Container(
              height: 220,
              width: double.infinity,
              decoration: BoxDecoration(
                color: QdiaColors.primaryLight,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: QdiaColors.border),
              ),
              child: _previewPath != null
                  ? ClipRRect(
                      borderRadius: BorderRadius.circular(13),
                      child: ProductImage(src: _previewPath!, fit: BoxFit.contain),
                    )
                  : Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.image_outlined, size: 64, color: QdiaColors.primary),
                        const SizedBox(height: 8),
                        Text(context.tr('studio.preview'), style: const TextStyle(color: QdiaColors.textMuted)),
                      ],
                    ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _pickImage(ImageSource.camera),
                    icon: const Icon(Icons.photo_camera),
                    label: Text(context.tr('studio.camera')),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _pickImage(ImageSource.gallery),
                    icon: const Icon(Icons.photo_library),
                    label: Text(context.tr('studio.gallery')),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            ...actions.map((a) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: _loading ? null : () => _process(a.$1),
                      icon: Icon(a.$3),
                      label: Text(a.$2),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: a.$1 == 'white_background' ? QdiaColors.gold : QdiaColors.primary,
                        foregroundColor: a.$1 == 'white_background' ? QdiaColors.navy : Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                      ),
                    ),
                  ),
                )),
            if (_resultMessage != null) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: QdiaColors.appBg, borderRadius: BorderRadius.circular(10)),
                child: Text(_resultMessage!, style: const TextStyle(fontSize: 13)),
              ),
            ],
            if (_loading) const Padding(padding: EdgeInsets.only(top: 12), child: CircularProgressIndicator()),
          ],
        ),
      ),
    );
  }
}
