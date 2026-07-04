import 'package:flutter/material.dart';
import 'package:qdia_mobile/l10n/app_strings.dart';
import 'package:qdia_mobile/services/api_service.dart';
import 'package:qdia_mobile/theme/qdia_theme.dart';

class AnalyticsDashboardScreen extends StatefulWidget {
  const AnalyticsDashboardScreen({super.key});

  @override
  State<AnalyticsDashboardScreen> createState() => _AnalyticsDashboardScreenState();
}

class _AnalyticsDashboardScreenState extends State<AnalyticsDashboardScreen> {
  bool _loading = true;
  String? _error;
  Map<String, dynamic>? _data;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final data = await ApiService.instance.getAnalyticsOverview();
      if (mounted) setState(() { _data = data; _loading = false; });
    } catch (e) {
      if (mounted) setState(() { _error = '$e'; _loading = false; });
    }
  }

  String _fmt(num v) {
    final s = v.round().toString();
    final buf = StringBuffer();
    for (var i = 0; i < s.length; i++) {
      if (i > 0 && (s.length - i) % 3 == 0) buf.write(' ');
      buf.write(s[i]);
    }
    return buf.toString();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: QdiaColors.pageBg,
      appBar: AppBar(
        title: Text(context.tr('analytics.title'), style: const TextStyle(fontWeight: FontWeight.w800)),
        backgroundColor: QdiaColors.primary,
        foregroundColor: Colors.white,
        actions: [
          IconButton(onPressed: _loading ? null : _load, icon: const Icon(Icons.refresh_rounded)),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? _ErrorView(error: _error!, onRetry: _load)
              : _buildContent(),
    );
  }

  Widget _buildContent() {
    final data = _data!;
    final totaux = (data['totaux'] as Map<String, dynamic>?) ?? {};
    final ventes = (data['ventes_mensuelles'] as List?) ?? [];
    final achats = (data['achats_mensuels'] as List?) ?? [];
    final creances = (data['creances'] as List?) ?? [];
    final dettes = (data['dettes'] as List?) ?? [];
    final retards = (data['livraisons_retard'] as List?) ?? [];

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Row(
            children: [
              _kpiCard(context.tr('analytics.sales'), totaux['total_ventes_dzd'] ?? 0, QdiaColors.success, Icons.trending_up_rounded),
              const SizedBox(width: 8),
              _kpiCard(context.tr('analytics.purchases'), totaux['total_achats_dzd'] ?? 0, QdiaColors.primary, Icons.shopping_cart_outlined),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              _kpiCard(context.tr('analytics.receivables'), totaux['total_creances_dzd'] ?? 0, QdiaColors.gold, Icons.call_received_rounded),
              const SizedBox(width: 8),
              _kpiCard(context.tr('analytics.debts'), totaux['total_dettes_dzd'] ?? 0, QdiaColors.danger, Icons.call_made_rounded),
            ],
          ),
          const SizedBox(height: 20),
          _BarChartCard(title: context.tr('analytics.sales_monthly'), points: ventes, color: QdiaColors.success, fmt: _fmt),
          const SizedBox(height: 16),
          _BarChartCard(title: context.tr('analytics.purchases_monthly'), points: achats, color: QdiaColors.primary, fmt: _fmt),
          const SizedBox(height: 16),
          _ListCard(
            title: context.tr('analytics.receivables_clients'),
            emptyLabel: context.tr('analytics.no_receivable'),
            rows: creances,
            color: QdiaColors.gold,
            fmt: _fmt,
          ),
          const SizedBox(height: 16),
          _ListCard(
            title: context.tr('analytics.debts_suppliers'),
            emptyLabel: context.tr('analytics.no_debt'),
            rows: dettes,
            color: QdiaColors.danger,
            fmt: _fmt,
          ),
          const SizedBox(height: 16),
          _DelaysCard(rows: retards),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _kpiCard(String label, num value, Color color, IconData icon) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: QdiaColors.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: color, size: 22),
            const SizedBox(height: 8),
            Text('${_fmt(value)} DZD', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: color)),
            const SizedBox(height: 2),
            Text(label, style: const TextStyle(fontSize: 12, color: QdiaColors.textMuted)),
          ],
        ),
      ),
    );
  }
}

class _BarChartCard extends StatelessWidget {
  const _BarChartCard({required this.title, required this.points, required this.color, required this.fmt});

  final String title;
  final List<dynamic> points;
  final Color color;
  final String Function(num) fmt;

  @override
  Widget build(BuildContext context) {
    final values = points.map((p) => (p['total_dzd'] as num?)?.toDouble() ?? 0).toList();
    final maxVal = values.isEmpty ? 1.0 : values.reduce((a, b) => a > b ? a : b);

    return _Card(
      title: title,
      child: points.isEmpty
          ? _Empty(label: context.tr('analytics.no_data'))
          : SizedBox(
              height: 160,
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: points.map((p) {
                  final v = (p['total_dzd'] as num?)?.toDouble() ?? 0;
                  final mois = (p['mois'] as String?) ?? '';
                  final h = maxVal > 0 ? (v / maxVal) * 110 : 0.0;
                  return Expanded(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        Text(fmt(v), style: const TextStyle(fontSize: 9, color: QdiaColors.textMuted)),
                        const SizedBox(height: 4),
                        Container(
                          margin: const EdgeInsets.symmetric(horizontal: 3),
                          height: h < 4 ? 4 : h,
                          decoration: BoxDecoration(
                            color: color,
                            borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          mois.length >= 7 ? mois.substring(5) : mois,
                          style: const TextStyle(fontSize: 9, color: QdiaColors.textMuted),
                        ),
                      ],
                    ),
                  );
                }).toList(),
              ),
            ),
    );
  }
}

class _ListCard extends StatelessWidget {
  const _ListCard({required this.title, required this.rows, required this.emptyLabel, required this.color, required this.fmt});

  final String title;
  final List<dynamic> rows;
  final String emptyLabel;
  final Color color;
  final String Function(num) fmt;

  @override
  Widget build(BuildContext context) {
    return _Card(
      title: title,
      child: rows.isEmpty
          ? _Empty(label: emptyLabel)
          : Column(
              children: rows.take(6).map((r) {
                final montant = (r['montant_restant_dzd'] as num?)?.toDouble() ?? 0;
                final nom = (r['partenaire'] as String?) ?? '—';
                final echeance = (r['date_echeance'] as String?) ?? '';
                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: 6),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(nom, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                            if (echeance.isNotEmpty)
                              Text(context.tr('analytics.due').replaceAll('{date}', echeance), style: const TextStyle(fontSize: 11, color: QdiaColors.textMuted)),
                          ],
                        ),
                      ),
                      Text('${fmt(montant)} DZD', style: TextStyle(fontWeight: FontWeight.w800, color: color, fontSize: 13)),
                    ],
                  ),
                );
              }).toList(),
            ),
    );
  }
}

class _DelaysCard extends StatelessWidget {
  const _DelaysCard({required this.rows});

  final List<dynamic> rows;

  @override
  Widget build(BuildContext context) {
    return _Card(
      title: context.tr('analytics.deliveries_late'),
      child: rows.isEmpty
          ? _Empty(label: context.tr('analytics.no_delay'))
          : Column(
              children: rows.take(6).map((r) {
                final id = r['id_livraison'];
                final type = (r['type_commande'] as String?) ?? '';
                final statut = (r['statut_livraison'] as String?) ?? '';
                final prevue = (r['date_prevue'] as String?) ?? '';
                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: 6),
                  child: Row(
                    children: [
                      const Icon(Icons.local_shipping_outlined, color: QdiaColors.danger, size: 18),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                            context.tr('analytics.delivery')
                                .replaceAll('{id}', '$id')
                                .replaceAll('{type}', type)
                                .replaceAll('{status}', statut),
                            style: const TextStyle(fontSize: 13)),
                      ),
                      Text(prevue, style: const TextStyle(fontSize: 11, color: QdiaColors.danger)),
                    ],
                  ),
                );
              }).toList(),
            ),
    );
  }
}

class _Card extends StatelessWidget {
  const _Card({required this.title, required this.child});
  final String title;
  final Widget child;

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
          Text(title, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14)),
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }
}

class _Empty extends StatelessWidget {
  const _Empty({required this.label});
  final String label;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 16),
      child: Center(child: Text(label, style: const TextStyle(color: QdiaColors.textMuted, fontSize: 13))),
    );
  }
}

class _ErrorView extends StatelessWidget {
  const _ErrorView({required this.error, required this.onRetry});
  final String error;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, color: QdiaColors.danger, size: 40),
            const SizedBox(height: 12),
            Text(error, textAlign: TextAlign.center, style: const TextStyle(color: QdiaColors.textMuted)),
            const SizedBox(height: 16),
            FilledButton(onPressed: onRetry, child: Text(context.tr('common.retry'))),
          ],
        ),
      ),
    );
  }
}
