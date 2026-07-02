import 'dart:async';

import 'package:flutter/material.dart';
import 'package:qdia_mobile/models/product.dart';
import 'package:qdia_mobile/l10n/app_strings.dart';
import 'package:qdia_mobile/services/api_service.dart';
import 'package:qdia_mobile/theme/qdia_theme.dart';
import 'package:qdia_mobile/widgets/product_card.dart';
import 'package:qdia_mobile/widgets/product_grid.dart';
import 'package:qdia_mobile/widgets/qdia_search_bar.dart';

class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key, required this.onProductTap, this.initialCategory});

  final ValueChanged<Product> onProductTap;
  final String? initialCategory;

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  String _query = '';
  List<Product> _results = [];
  List<String> _popularTags = [];
  bool _loading = false;
  String? _error;
  double? _moqMin;
  double? _moqMax;
  double? _priceMin;
  double? _priceMax;
  String? _originWilaya;
  String? _incoterm;
  String? _category;
  int _activeFilters = 0;
  Timer? _debounce;

  @override
  void initState() {
    super.initState();
    _category = widget.initialCategory;
    _loadPopularTags();
    _search('');
  }

  @override
  void dispose() {
    _debounce?.cancel();
    super.dispose();
  }

  Future<void> _loadPopularTags() async {
    try {
      final cats = await ApiService.instance.getProductCategories();
      final tags = cats
          .map((e) => (e as Map<String, dynamic>)['name']?.toString() ?? '')
          .where((n) => n.isNotEmpty)
          .take(6)
          .toList();
      if (mounted && tags.isNotEmpty) setState(() => _popularTags = tags);
    } catch (_) {}
  }

  void _countFilters() {
    _activeFilters = [
      _moqMin,
      _moqMax,
      _priceMin,
      _priceMax,
      _originWilaya,
      _incoterm,
      _category,
    ].where((v) => v != null && v.toString().isNotEmpty).length;
  }

  void _scheduleSearch(String q) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 350), () => _search(q));
  }

  Future<void> _search(String q) async {
    setState(() {
      _query = q;
      _loading = true;
      _error = null;
      _countFilters();
    });
    try {
      final raw = await ApiService.instance.getProducts(
        search: q.isEmpty ? null : q,
        category: _category,
        moqMin: _moqMin,
        moqMax: _moqMax,
        priceMin: _priceMin,
        priceMax: _priceMax,
        originWilaya: _originWilaya,
        incoterm: _incoterm,
        limit: 100,
      );
      if (mounted) {
        setState(() {
          _results = raw.map((e) => Product.fromJson(e as Map<String, dynamic>)).toList();
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _results = [];
          _error = e.toString();
        });
      }
    }
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _openFilters() async {
    final moqMinCtrl = TextEditingController(text: _moqMin?.toString() ?? '');
    final moqMaxCtrl = TextEditingController(text: _moqMax?.toString() ?? '');
    final priceMinCtrl = TextEditingController(text: _priceMin?.toString() ?? '');
    final priceMaxCtrl = TextEditingController(text: _priceMax?.toString() ?? '');
    final originCtrl = TextEditingController(text: _originWilaya ?? '');
    var incoterm = _incoterm;
    var category = _category;
    List<String> categories = [];
    try {
      final raw = await ApiService.instance.getProductCategories();
      categories = raw
          .map((e) => (e as Map<String, dynamic>)['name']?.toString() ?? '')
          .where((n) => n.isNotEmpty)
          .toList();
    } catch (_) {}

    if (!mounted) return;
    final ok = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (_) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(context.tr('search.filters'), style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                const SizedBox(height: 12),
                if (categories.isNotEmpty)
                  DropdownButtonFormField<String>(
                    value: category,
                    decoration: const InputDecoration(labelText: 'Catégorie'),
                    items: [
                      DropdownMenuItem(value: null, child: Text(context.tr('common.all'))),
                      ...categories.map((c) => DropdownMenuItem(value: c, child: Text(c))),
                    ],
                    onChanged: (v) => category = v,
                  ),
                if (categories.isNotEmpty) const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(child: TextField(controller: moqMinCtrl, keyboardType: TextInputType.number, decoration: InputDecoration(labelText: context.tr('search.moq_min')))),
                    const SizedBox(width: 8),
                    Expanded(child: TextField(controller: moqMaxCtrl, keyboardType: TextInputType.number, decoration: InputDecoration(labelText: context.tr('search.moq_max')))),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(child: TextField(controller: priceMinCtrl, keyboardType: TextInputType.number, decoration: InputDecoration(labelText: context.tr('search.price_min')))),
                    const SizedBox(width: 8),
                    Expanded(child: TextField(controller: priceMaxCtrl, keyboardType: TextInputType.number, decoration: InputDecoration(labelText: context.tr('search.price_max')))),
                  ],
                ),
                const SizedBox(height: 8),
                TextField(controller: originCtrl, decoration: InputDecoration(labelText: context.tr('search.origin_wilaya'))),
                const SizedBox(height: 8),
                DropdownButtonFormField<String>(
                  value: incoterm,
                  decoration: InputDecoration(labelText: context.tr('rfq.incoterm')),
                  items: [
                    DropdownMenuItem(value: null, child: Text(context.tr('common.all'))),
                    ...['EXW', 'FOB', 'CFR', 'CIF'].map((e) => DropdownMenuItem(value: e, child: Text(e))),
                  ],
                  onChanged: (v) => incoterm = v,
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () {
                          _moqMin = null;
                          _moqMax = null;
                          _priceMin = null;
                          _priceMax = null;
                          _originWilaya = null;
                          _incoterm = null;
                          _category = null;
                          Navigator.pop(context, true);
                        },
                        child: Text(context.tr('search.clear_filters')),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: () {
                          _moqMin = double.tryParse(moqMinCtrl.text.trim());
                          _moqMax = double.tryParse(moqMaxCtrl.text.trim());
                          _priceMin = double.tryParse(priceMinCtrl.text.trim());
                          _priceMax = double.tryParse(priceMaxCtrl.text.trim());
                          _originWilaya = originCtrl.text.trim().isEmpty ? null : originCtrl.text.trim();
                          _incoterm = incoterm;
                          _category = category;
                          Navigator.pop(context, true);
                        },
                        child: Text(context.tr('common.filter')),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );

    if (ok == true && mounted) _search(_query);
  }

  @override
  Widget build(BuildContext context) {
    final tags = _popularTags.isNotEmpty
        ? _popularTags
        : [
            'Épicerie',
            'Hygiène',
            'Boissons',
            'Papeterie',
          ];
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.pop(context),
        ),
        title: QdiaSearchBar(
          readOnly: false,
          autofocus: true,
          hint: context.tr('search.hint'),
          onChanged: _scheduleSearch,
          onSubmitted: _search,
        ),
        titleSpacing: 0,
        actions: [
          Stack(
            children: [
              IconButton(onPressed: _openFilters, icon: const Icon(Icons.tune)),
              if (_activeFilters > 0)
                Positioned(
                  right: 8,
                  top: 8,
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: const BoxDecoration(color: QdiaColors.gold, shape: BoxShape.circle),
                    child: Text('$_activeFilters', style: const TextStyle(fontSize: 8, fontWeight: FontWeight.w800, color: QdiaColors.navy)),
                  ),
                ),
            ],
          ),
        ],
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (_query.isEmpty) ...[
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
              child: Text(context.tr('search.popular'), style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Wrap(
                spacing: 8,
                runSpacing: 8,
                children: tags.map((tag) {
                  return GestureDetector(
                    onTap: () {
                      setState(() => _category = tag);
                      _search(tag);
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                      decoration: BoxDecoration(
                        color: QdiaColors.primaryLight,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(tag, style: const TextStyle(fontSize: 12, color: QdiaColors.primary, fontWeight: FontWeight.w600)),
                    ),
                  );
                }).toList(),
              ),
            ),
            const SizedBox(height: 16),
          ],
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Text(
              _query.isEmpty
                  ? context.tr('search.all_products')
                  : context.tr('search.results').replaceAll('{count}', '${_results.length}'),
              style: const TextStyle(fontWeight: FontWeight.w700),
            ),
          ),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              child: Text(_error!, style: const TextStyle(color: Colors.red, fontSize: 12)),
            ),
          const SizedBox(height: 10),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator(color: QdiaColors.primary))
                : _results.isEmpty
                    ? Center(child: Text(context.tr('common.no_results'), style: const TextStyle(color: QdiaColors.textMuted)))
                    : GridView.builder(
                        padding: const EdgeInsets.fromLTRB(12, 0, 12, 20),
                        gridDelegate: kProductGridDelegate,
                        itemCount: _results.length,
                        itemBuilder: (_, i) => ProductCard(
                          product: _results[i],
                          onTap: () => widget.onProductTap(_results[i]),
                        ),
                      ),
          ),
        ],
      ),
    );
  }
}
