import 'package:flutter/material.dart';
import 'package:qdia_mobile/l10n/app_strings.dart';
import 'package:qdia_mobile/services/api_service.dart';
import 'package:qdia_mobile/theme/qdia_theme.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  Map<String, dynamic>? _stats;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final stats = await ApiService.instance.getDashboardStats();
      setState(() => _stats = stats);
    } catch (e) {
      setState(() => _error = e.toString());
    }
    setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(context.tr('dashboard.title'), style: const TextStyle(fontWeight: FontWeight.w800)),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(_error!, style: const TextStyle(color: QdiaColors.danger)),
                      const SizedBox(height: 12),
                      ElevatedButton(onPressed: _load, child: Text(context.tr('common.retry'))),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(colors: [QdiaColors.sidebar, QdiaColors.primary]),
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: Text(
                          context.tr('dashboard.stats_header'),
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 16),
                        ),
                      ),
                      const SizedBox(height: 16),
                      GridView.count(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        crossAxisCount: 2,
                        mainAxisSpacing: 12,
                        crossAxisSpacing: 12,
                        childAspectRatio: 1.4,
                        children: [
                          _StatTile(
                            label: context.tr('dashboard.stats_products'),
                            value: '${_stats!['active_listings'] ?? 0}',
                            icon: Icons.inventory_2,
                          ),
                          _StatTile(
                            label: context.tr('dashboard.pending_rfqs'),
                            value: '${_stats!['pending_rfqs'] ?? 0}',
                            icon: Icons.request_quote,
                          ),
                          _StatTile(
                            label: context.tr('dashboard.export_value'),
                            value: '${_stats!['total_export_value'] ?? 0}',
                            icon: Icons.trending_up,
                          ),
                          _StatTile(
                            label: context.tr('dashboard.store_visits'),
                            value: '${_stats!['store_visits'] ?? 0}',
                            icon: Icons.visibility,
                          ),
                          _StatTile(
                            label: context.tr('dashboard.total_products'),
                            value: '${_stats!['total_products'] ?? 0}',
                            icon: Icons.storefront,
                          ),
                          _StatTile(
                            label: context.tr('dashboard.ai_suggestions'),
                            value: '${_stats!['ai_suggestions'] ?? 0}',
                            icon: Icons.auto_awesome,
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
    );
  }
}

class _StatTile extends StatelessWidget {
  const _StatTile({required this.label, required this.value, required this.icon});

  final String label;
  final String value;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
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
          Icon(icon, color: QdiaColors.primary, size: 22),
          const Spacer(),
          Text(value, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: QdiaColors.primary)),
          Text(label, style: const TextStyle(fontSize: 11, color: QdiaColors.textMuted)),
        ],
      ),
    );
  }
}
