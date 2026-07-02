import 'package:flutter/material.dart';
import 'package:qdia_mobile/l10n/app_strings.dart';
import 'package:qdia_mobile/services/api_service.dart';
import 'package:qdia_mobile/theme/qdia_theme.dart';

class VerificationScreen extends StatefulWidget {
  const VerificationScreen({super.key});

  @override
  State<VerificationScreen> createState() => _VerificationScreenState();
}

class _VerificationScreenState extends State<VerificationScreen> {
  Map<String, dynamic>? _status;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final status = await ApiService.instance.verificationStatus();
      setState(() => _status = status);
    } catch (_) {
      setState(() => _status = _fallbackStatus());
    }
    setState(() => _loading = false);
  }

  Map<String, dynamic> _fallbackStatus() => {
    'badge': 'Bronze',
    'level': 1,
    'progress_pct': 25,
    'steps': [
      {'label': 'Profil entreprise complété', 'done': true},
      {'label': 'Premier produit publié', 'done': false},
      {'label': 'Documents export (RC, NIF)', 'done': false},
      {'label': 'Réponse à une RFQ', 'done': false},
      {'label': 'Badge Or — 10 ventes export', 'done': false},
    ],
  };

  @override
  Widget build(BuildContext context) {
    final steps = (_status?['steps'] as List?) ?? [];
    final progress = (_status?['progress_pct'] as num?)?.toDouble() ?? 0;
    final badge = _status?['badge'] as String? ?? 'Bronze';
    final level = _status?['level'] as num? ?? 1;

    return Scaffold(
      backgroundColor: QdiaColors.pageBg,
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : CustomScrollView(
              slivers: [
                SliverAppBar(
                  expandedHeight: 170,
                  pinned: true,
                  backgroundColor: QdiaColors.primary,
                  flexibleSpace: FlexibleSpaceBar(
                    background: Container(
                      decoration: const BoxDecoration(
                        gradient: LinearGradient(colors: [QdiaColors.sidebar, QdiaColors.primary]),
                      ),
                      child: SafeArea(
                        child: Padding(
                          padding: const EdgeInsets.fromLTRB(20, 48, 20, 0),
                          child: Row(
                            children: [
                              CircleAvatar(
                                radius: 34,
                                backgroundColor: QdiaColors.gold,
                                child: Text('L$level', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 22, color: QdiaColors.navy)),
                              ),
                              const SizedBox(width: 14),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Text(
                                      context.tr('verification_page.title'),
                                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 17),
                                    ),
                                    Text(
                                      context.tr('verification.badge_label').replaceAll('{badge}', badge),
                                      style: const TextStyle(color: QdiaColors.gold, fontWeight: FontWeight.w700),
                                    ),
                                    Text(
                                      context.tr('verification.completed_pct').replaceAll('{pct}', progress.toStringAsFixed(0)),
                                      style: const TextStyle(color: Colors.white70, fontSize: 12),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                  title: Text(context.tr('verification.title'), style: const TextStyle(fontWeight: FontWeight.w800)),
                ),
                SliverPadding(
                  padding: const EdgeInsets.all(16),
                  sliver: SliverList(
                    delegate: SliverChildListDelegate([
                      Text(context.tr('verification_page.subtitle'), style: const TextStyle(fontSize: 13, color: QdiaColors.textBody)),
                      const SizedBox(height: 14),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: LinearProgressIndicator(
                          value: (progress / 100).clamp(0.0, 1.0),
                          backgroundColor: QdiaColors.border,
                          color: QdiaColors.gold,
                          minHeight: 10,
                        ),
                      ),
                      const SizedBox(height: 20),
                      Text(context.tr('verification.steps_title'), style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 15, color: QdiaColors.navy)),
                      const SizedBox(height: 10),
                      ...steps.asMap().entries.map((e) {
                        final step = e.value as Map<String, dynamic>;
                        final done = step['done'] as bool? ?? false;
                        return Container(
                          margin: const EdgeInsets.only(bottom: 10),
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: done ? QdiaColors.success.withValues(alpha: 0.4) : QdiaColors.border),
                          ),
                          child: Row(
                            children: [
                              Container(
                                width: 36,
                                height: 36,
                                decoration: BoxDecoration(
                                  color: done ? QdiaColors.success.withValues(alpha: 0.12) : QdiaColors.primaryLight,
                                  shape: BoxShape.circle,
                                ),
                                child: Icon(
                                  done ? Icons.check_circle_rounded : Icons.radio_button_unchecked_rounded,
                                  color: done ? QdiaColors.success : QdiaColors.textMuted,
                                  size: 22,
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(step['label'] as String? ?? '', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                                    Text(
                                      done ? context.tr('verification_page.validated') : context.tr('verification_page.in_progress'),
                                      style: TextStyle(fontSize: 11, color: done ? QdiaColors.success : QdiaColors.textMuted),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        );
                      }),
                      const SizedBox(height: 8),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton.icon(
                          onPressed: () => Navigator.pushNamed(context, '/agent-ia'),
                          icon: const Icon(Icons.publish_rounded),
                          label: Text(context.tr('verification_page.publish_product')),
                          style: ElevatedButton.styleFrom(minimumSize: const Size.fromHeight(48)),
                        ),
                      ),
                    ]),
                  ),
                ),
              ],
            ),
    );
  }
}
