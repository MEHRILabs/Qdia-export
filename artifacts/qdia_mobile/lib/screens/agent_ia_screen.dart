import 'package:flutter/material.dart';
import 'package:qdia_mobile/l10n/app_strings.dart';
import 'package:qdia_mobile/services/api_service.dart';
import 'package:qdia_mobile/theme/qdia_theme.dart';

class AgentIaScreen extends StatefulWidget {
  const AgentIaScreen({super.key});

  @override
  State<AgentIaScreen> createState() => _AgentIaScreenState();
}

class _AgentIaScreenState extends State<AgentIaScreen> {
  final _descCtrl = TextEditingController();
  final _chatCtrl = TextEditingController();
  String? _sessionId;
  int _step = 0;
  Map<String, dynamic>? _generated;
  Map<String, dynamic>? _pricing;
  bool _loading = false;
  String? _error;
  int? _publishedId;
  final _chatMessages = <({bool user, String text})>[];

  List<String> _steps(BuildContext context) => [
    context.tr('agent.step_describe'),
    context.tr('agent.step_generate'),
    context.tr('agent.step_pricing'),
    context.tr('agent.step_studio'),
    context.tr('agent.step_publish'),
  ];

  Future<void> _start() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res = await ApiService.instance.createAiSession();
      setState(() {
        _sessionId = res['id'] as String? ?? res['session_id'] as String?;
        _step = 0;
      });
    } catch (e) {
      setState(() => _error = e.toString());
    }
    setState(() => _loading = false);
  }

  Future<void> _generate() async {
    if (_sessionId == null || _descCtrl.text.isEmpty) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res = await ApiService.instance.generateProduct(_sessionId!, _descCtrl.text);
      setState(() {
        _generated = res;
        _step = 2;
      });
    } catch (e) {
      setState(() => _error = e.toString());
    }
    setState(() => _loading = false);
  }

  Future<void> _runPricing() async {
    if (_sessionId == null) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final name = _generated?['name_fr'] ?? _generated?['name'] ?? _descCtrl.text;
      final res = await ApiService.instance.calculatePricing(_sessionId!, {
        'product_name': name,
        'cost_dzd': 450,
        'quantity': 500,
        'quantity_unit': _generated?['suggested_moq_unit'] ?? 'litres',
        'destination_country': 'FR',
        'port_code': _generated?['suggested_port'] ?? 'DZBJA',
      });
      setState(() {
        _pricing = res;
        _step = 3;
      });
    } catch (e) {
      setState(() => _error = e.toString());
    }
    setState(() => _loading = false);
  }

  Future<void> _publish() async {
    if (_generated == null) {
      setState(() => _error = context.tr('agent.generate_first'));
      return;
    }
    await ApiService.instance.loadToken();
    if (!ApiService.instance.isLoggedIn) {
      setState(() => _error = context.tr('agent.login_to_publish'));
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final specs = _generated!['specs'] as Map<String, dynamic>? ?? {};
      final res = await ApiService.instance.publishProduct({
        'name': _generated!['name_fr'] ?? _generated!['name'] ?? _descCtrl.text,
        'description': [
          _generated!['description_fr'],
          _generated!['description_en'],
        ].whereType<String>().join('\n\n'),
        'category': _generated!['category'] ?? 'Agriculture & Food',
        'moq': _generated!['suggested_moq'] ?? 500,
        'moq_unit': _generated!['suggested_moq_unit'] ?? 'litres',
        'port_depart': _generated!['suggested_port'] ?? 'DZBJA',
        'origin_wilaya': specs['Origine'] ?? specs['origine'],
        'certifications': _generated!['certifications'] ?? [],
        'prices': {
          'exw': _pricing?['exw_usd'] ?? 0,
          'fob': _pricing?['fob_usd'] ?? 0,
          'cfr': _pricing?['cfr_usd'] ?? 0,
          'cif': _pricing?['cif_usd'] ?? 0,
          'currency': 'USD',
          'unit': 'per ${_generated!['suggested_moq_unit'] ?? context.tr('common.unit')}',
        },
        'export_status': 'pending',
      });
      setState(() {
        _publishedId = (res['id'] as num?)?.toInt();
        _step = 4;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(context.tr('agent.product_submitted').replaceAll('{id}', '${_publishedId ?? '—'}')),
            backgroundColor: QdiaColors.success,
          ),
        );
      }
    } catch (e) {
      setState(() => _error = e.toString());
    }
    setState(() => _loading = false);
  }

  Future<void> _sendChat() async {
    final msg = _chatCtrl.text.trim();
    if (msg.isEmpty) return;
    _chatCtrl.clear();
    setState(() => _chatMessages.add((user: true, text: msg)));
    final reply = await ApiService.instance.aiChat(msg, sessionId: _sessionId);
    if (mounted) {
      setState(() => _chatMessages.add((user: false, text: reply)));
    }
  }

  @override
  void initState() {
    super.initState();
    _start();
  }

  @override
  void dispose() {
    _descCtrl.dispose();
    _chatCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final genName = _generated?['name_fr'] ?? _generated?['name'] ?? _generated?['product_name'];
    final steps = _steps(context);

    return Scaffold(
      backgroundColor: QdiaColors.pageBg,
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            expandedHeight: 140,
            pinned: true,
            backgroundColor: QdiaColors.primary,
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(colors: [QdiaColors.sidebar, QdiaColors.primary]),
                ),
                child: SafeArea(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 48, 20, 12),
                    child: Row(
                      children: [
                        Container(
                          width: 48,
                          height: 48,
                          decoration: BoxDecoration(
                            color: QdiaColors.gold,
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: const Icon(Icons.auto_awesome_rounded, color: QdiaColors.navy, size: 28),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(context.tr('agent.title'), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 17)),
                              Text(context.tr('agent.hero_banner'), style: const TextStyle(color: Colors.white70, fontSize: 11), maxLines: 2),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
            title: Text(context.tr('nav.agent_ia'), style: const TextStyle(fontWeight: FontWeight.w800)),
          ),
          SliverPadding(
            padding: const EdgeInsets.all(16),
            sliver: SliverList(
              delegate: SliverChildListDelegate([
                SizedBox(
                  height: 72,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: steps.length,
                    separatorBuilder: (_, __) => const SizedBox(width: 8),
                    itemBuilder: (_, i) {
                      final active = i <= _step;
                      final current = i == _step;
                      return Container(
                        width: 108,
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: current ? QdiaColors.primary : Colors.white,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: active ? QdiaColors.primary : QdiaColors.border),
                        ),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              [Icons.edit_note, Icons.auto_fix_high, Icons.payments, Icons.photo_camera, Icons.publish][i],
                              size: 18,
                              color: current ? Colors.white : (active ? QdiaColors.primary : QdiaColors.textMuted),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              steps[i],
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                fontSize: 8,
                                fontWeight: FontWeight.w700,
                                color: current ? Colors.white : (active ? QdiaColors.primary : QdiaColors.textMuted),
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ),
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: QdiaColors.border),
                  ),
                  child: TextField(
                    controller: _descCtrl,
                    maxLines: 4,
                    decoration: InputDecoration(
                      labelText: context.tr('agent.describe_label'),
                      hintText: context.tr('agent.describe_hint'),
                      border: InputBorder.none,
                    ),
                  ),
                ),
                if (genName != null) ...[
                  const SizedBox(height: 12),
                  _ResultCard(icon: Icons.inventory_2_outlined, title: 'Produit généré', value: genName.toString()),
                ],
                if (_pricing != null) ...[
                  const SizedBox(height: 12),
                  _ResultCard(
                    icon: Icons.local_shipping_outlined,
                    title: context.tr('agent.step_pricing'),
                    value: 'FOB ${_pricing!['fob_dzd'] ?? '-'} DZD · '
                        '${_pricing!['fob_usd'] ?? '-'} USD · '
                        '${_pricing!['fob_eur'] ?? '-'} EUR · '
                        '${_pricing!['fob_aed'] ?? '-'} AED',
                  ),
                ],
                if (_publishedId != null) ...[
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: QdiaColors.success.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: QdiaColors.success.withValues(alpha: 0.3)),
                    ),
                    child: Text(
                      context.tr('agent.pending_validation').replaceAll('{id}', '$_publishedId'),
                      style: const TextStyle(fontWeight: FontWeight.w700, color: QdiaColors.success),
                    ),
                  ),
                ],
                if (_error != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 10),
                    child: Text(_error!, style: const TextStyle(color: QdiaColors.danger, fontSize: 12)),
                  ),
                const SizedBox(height: 14),
                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: _loading ? null : _generate,
                        icon: const Icon(Icons.auto_fix_high, size: 18),
                        label: Text(context.tr('agent.generate_sheet')),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: _loading || _generated == null ? null : _runPricing,
                        style: ElevatedButton.styleFrom(backgroundColor: QdiaColors.gold, foregroundColor: QdiaColors.navy),
                        icon: const Icon(Icons.calculate_outlined, size: 18),
                        label: Text(context.tr('agent.step_pricing')),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                OutlinedButton.icon(
                  onPressed: () => Navigator.pushNamed(context, '/studio'),
                  icon: const Icon(Icons.photo_camera_outlined),
                  label: Text(context.tr('agent.open_studio')),
                ),
                const SizedBox(height: 8),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: _loading || _generated == null ? null : _publish,
                    icon: const Icon(Icons.publish_rounded),
                    label: Text(context.tr('agent.publish_product')),
                    style: ElevatedButton.styleFrom(backgroundColor: QdiaColors.success, minimumSize: const Size.fromHeight(46)),
                  ),
                ),
                const SizedBox(height: 16),
                Text(context.tr('agent.chat_title'), style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 15, color: QdiaColors.navy)),
                const SizedBox(height: 8),
                Container(
                  height: 180,
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: QdiaColors.border),
                  ),
                  child: _chatMessages.isEmpty
                      ? Center(child: Text(context.tr('agent.chat_placeholder'), style: const TextStyle(color: QdiaColors.textMuted, fontSize: 12)))
                      : ListView(
                          children: _chatMessages.map((m) {
                            return Align(
                              alignment: m.user ? Alignment.centerRight : Alignment.centerLeft,
                              child: Container(
                                margin: const EdgeInsets.only(bottom: 6),
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                decoration: BoxDecoration(
                                  color: m.user ? QdiaColors.primary : QdiaColors.pageBg,
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Text(m.text, style: TextStyle(fontSize: 12, color: m.user ? Colors.white : QdiaColors.navy)),
                              ),
                            );
                          }).toList(),
                        ),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _chatCtrl,
                        decoration: InputDecoration(
                          hintText: context.tr('agent.chat_placeholder'),
                          filled: true,
                          fillColor: Colors.white,
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(24), borderSide: BorderSide.none),
                        ),
                        onSubmitted: (_) => _sendChat(),
                      ),
                    ),
                    const SizedBox(width: 8),
                    IconButton.filled(
                      onPressed: _sendChat,
                      icon: const Icon(Icons.send_rounded),
                      style: IconButton.styleFrom(backgroundColor: QdiaColors.primary),
                    ),
                  ],
                ),
                if (_loading) const Padding(padding: EdgeInsets.only(top: 12), child: LinearProgressIndicator()),
              ]),
            ),
          ),
        ],
      ),
    );
  }
}

class _ResultCard extends StatelessWidget {
  const _ResultCard({required this.icon, required this.title, required this.value});

  final IconData icon;
  final String title;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: QdiaColors.primaryLight,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Icon(icon, color: QdiaColors.primary),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontSize: 11, color: QdiaColors.textMuted, fontWeight: FontWeight.w600)),
                Text(value, style: const TextStyle(fontWeight: FontWeight.w800, color: QdiaColors.navy)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
