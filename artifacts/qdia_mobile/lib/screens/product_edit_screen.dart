import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:qdia_mobile/l10n/app_strings.dart';
import 'package:qdia_mobile/services/api_service.dart';
import 'package:qdia_mobile/theme/qdia_theme.dart';
import 'package:qdia_mobile/widgets/product_image.dart';

class ProductEditScreen extends StatefulWidget {
  const ProductEditScreen({super.key, this.productId});

  final int? productId;

  @override
  State<ProductEditScreen> createState() => _ProductEditScreenState();
}

class _ProductEditScreenState extends State<ProductEditScreen> {
  final _nameCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  final _catCtrl = TextEditingController(text: 'Agriculture & Food');
  final _moqCtrl = TextEditingController(text: '100');
  final _unitCtrl = TextEditingController(text: 'kg');
  final _portCtrl = TextEditingController(text: 'Béjaïa');
  final _priceCtrl = TextEditingController(text: '0');
  String? _imageUrl;
  bool _loading = false;
  bool _saving = false;
  bool get _isNew => widget.productId == null;

  @override
  void initState() {
    super.initState();
    if (!_isNew) _load();
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _descCtrl.dispose();
    _catCtrl.dispose();
    _moqCtrl.dispose();
    _unitCtrl.dispose();
    _portCtrl.dispose();
    _priceCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final raw = await ApiService.instance.getProduct(widget.productId!);
      final p = raw['product'] as Map<String, dynamic>? ?? raw;
      _nameCtrl.text = p['name']?.toString() ?? '';
      _descCtrl.text = p['description']?.toString() ?? '';
      _catCtrl.text = p['category']?.toString() ?? '';
      _moqCtrl.text = '${p['moq'] ?? 100}';
      _unitCtrl.text = p['moq_unit']?.toString() ?? 'kg';
      _portCtrl.text = p['port_depart']?.toString() ?? 'Béjaïa';
      final prices = p['prices'] as Map<String, dynamic>?;
      _priceCtrl.text = '${prices?['fob'] ?? p['price_fob'] ?? 0}';
      _imageUrl = p['image_url']?.toString();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    }
    if (mounted) setState(() => _loading = false);
  }

  Map<String, dynamic> _body() => {
        'name': _nameCtrl.text.trim(),
        'description': _descCtrl.text.trim(),
        'category': _catCtrl.text.trim(),
        'moq': int.tryParse(_moqCtrl.text) ?? 100,
        'moq_unit': _unitCtrl.text.trim(),
        'port_depart': _portCtrl.text.trim(),
        'prices': {'fob': double.tryParse(_priceCtrl.text) ?? 0, 'cif': 0, 'exw': 0, 'cfr': 0, 'currency': 'USD', 'unit': 'per kg'},
        if (_isNew) 'export_status': 'pending',
      };

  Future<void> _save() async {
    if (_nameCtrl.text.trim().isEmpty) return;
    setState(() => _saving = true);
    try {
      if (_isNew) {
        await ApiService.instance.publishProduct(_body());
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(context.tr('product_edit.created'))));
          Navigator.pop(context, true);
        }
      } else {
        await ApiService.instance.updateProduct(widget.productId!, _body());
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(context.tr('product_edit.updated'))));
          Navigator.pop(context, true);
        }
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    }
    if (mounted) setState(() => _saving = false);
  }

  Future<void> _pickPhoto() async {
    if (_isNew) return;
    final file = await ImagePicker().pickImage(source: ImageSource.gallery, maxWidth: 1200, imageQuality: 85);
    if (file == null) return;
    final bytes = await file.readAsBytes();
    try {
      await ApiService.instance.uploadProductImage(widget.productId!, base64Encode(bytes));
      await _load();
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(context.tr('product_edit.photo_saved'))));
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    }
  }

  Future<void> _duplicate() async {
    if (_isNew) return;
    try {
      final copy = await ApiService.instance.duplicateProduct(widget.productId!);
      final newId = (copy['id'] as num?)?.toInt();
      if (mounted && newId != null) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(context.tr('product_edit.duplicated'))));
        Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => ProductEditScreen(productId: newId)));
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: QdiaColors.pageBg,
      appBar: AppBar(
        title: Text(_isNew ? context.tr('product_edit.new_title') : context.tr('product_edit.title'), style: const TextStyle(fontWeight: FontWeight.w800)),
        backgroundColor: QdiaColors.primary,
        foregroundColor: Colors.white,
        actions: [
          if (!_isNew)
            IconButton(
              icon: const Icon(Icons.content_copy),
              onPressed: _duplicate,
              tooltip: context.tr('product_edit.duplicate'),
            ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                if (!_isNew) ...[
                  Center(
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: ProductImage(src: _imageUrl ?? '', width: 120, height: 120),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      OutlinedButton.icon(onPressed: _pickPhoto, icon: const Icon(Icons.upload), label: Text(context.tr('product_edit.photo_upload'))),
                      const SizedBox(width: 8),
                      OutlinedButton.icon(
                        onPressed: () => Navigator.pushNamed(context, '/studio', arguments: {'productId': widget.productId}),
                        icon: const Icon(Icons.auto_fix_high),
                        label: Text(context.tr('product_edit.open_studio')),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                ],
                _field(context.tr('product_edit.name'), _nameCtrl),
                _field(context.tr('product_edit.description'), _descCtrl, maxLines: 3),
                _field(context.tr('product_edit.category'), _catCtrl),
                Row(
                  children: [
                    Expanded(child: _field(context.tr('product_edit.moq'), _moqCtrl, keyboard: TextInputType.number)),
                    const SizedBox(width: 8),
                    Expanded(child: _field(context.tr('product_edit.unit'), _unitCtrl)),
                  ],
                ),
                Row(
                  children: [
                    Expanded(child: _field(context.tr('product_edit.departure_port'), _portCtrl)),
                    const SizedBox(width: 8),
                    Expanded(child: _field(context.tr('product_edit.fob_price'), _priceCtrl, keyboard: const TextInputType.numberWithOptions(decimal: true))),
                  ],
                ),
                const SizedBox(height: 20),
                ElevatedButton(
                  onPressed: _saving ? null : _save,
                  style: ElevatedButton.styleFrom(minimumSize: const Size.fromHeight(48), backgroundColor: QdiaColors.gold, foregroundColor: QdiaColors.navy),
                  child: _saving
                      ? const SizedBox(height: 22, width: 22, child: CircularProgressIndicator(strokeWidth: 2))
                      : Text(context.tr('common.save'), style: const TextStyle(fontWeight: FontWeight.w800)),
                ),
              ],
            ),
    );
  }

  Widget _field(String label, TextEditingController ctrl, {int maxLines = 1, TextInputType? keyboard}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: TextField(
        controller: ctrl,
        maxLines: maxLines,
        keyboardType: keyboard,
        decoration: InputDecoration(labelText: label, filled: true, fillColor: Colors.white, border: OutlineInputBorder(borderRadius: BorderRadius.circular(10))),
      ),
    );
  }
}
