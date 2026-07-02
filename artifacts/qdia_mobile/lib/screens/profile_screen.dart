import 'package:flutter/material.dart';
import 'package:qdia_mobile/l10n/app_strings.dart';
import 'package:qdia_mobile/services/api_service.dart';
import 'package:qdia_mobile/theme/qdia_theme.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _nameCtrl = TextEditingController();
  final _companyCtrl = TextEditingController();
  final _wilayaCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  bool _saving = false;
  bool _loading = true;
  String _role = 'supplier';
  String _tier = 'bronze';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final data = await ApiService.instance.get('/api/auth/me');
      final u = data['user'] as Map<String, dynamic>?;
      if (u != null) {
        _nameCtrl.text = u['name']?.toString() ?? '';
        _companyCtrl.text = u['company_name']?.toString() ?? '';
        _wilayaCtrl.text = u['wilaya']?.toString() ?? '';
        _emailCtrl.text = u['email']?.toString() ?? '';
        _role = u['role']?.toString() ?? 'supplier';
        _tier = u['subscription_tier']?.toString() ?? 'bronze';
      }
    } catch (_) {
      _nameCtrl.text = ApiService.instance.userName ?? '';
      _emailCtrl.text = ApiService.instance.userEmail ?? '';
    }
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      await ApiService.instance.updateProfile({
        'name': _nameCtrl.text.trim(),
        'company_name': _companyCtrl.text.trim(),
        'wilaya': _wilayaCtrl.text.trim(),
      });
      await ApiService.instance.saveUser({
        'id': ApiService.instance.userId,
        'name': _nameCtrl.text.trim(),
        'email': _emailCtrl.text.trim(),
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(context.tr('profile.saved')), backgroundColor: QdiaColors.success),
        );
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    }
    if (mounted) setState(() => _saving = false);
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _companyCtrl.dispose();
    _wilayaCtrl.dispose();
    _emailCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: QdiaColors.pageBg,
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : CustomScrollView(
              slivers: [
                SliverAppBar(
                  expandedHeight: 176,
                  pinned: true,
                  backgroundColor: QdiaColors.primary,
                  flexibleSpace: FlexibleSpaceBar(
                    background: Container(
                      decoration: const BoxDecoration(
                        gradient: LinearGradient(colors: [QdiaColors.sidebar, QdiaColors.primary]),
                      ),
                      child: SafeArea(
                        bottom: false,
                        child: Align(
                          alignment: Alignment.topCenter,
                          child: Padding(
                            padding: const EdgeInsets.fromLTRB(20, 24, 20, 8),
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Container(
                                  width: 72,
                                  height: 72,
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    color: Colors.white,
                                    border: Border.all(color: QdiaColors.gold, width: 3),
                                  ),
                                  child: ClipOval(
                                    child: Image.asset('assets/images/logo.png', fit: BoxFit.cover),
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  _nameCtrl.text.isNotEmpty ? _nameCtrl.text : context.tr('nav.profile'),
                                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 17),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  _emailCtrl.text,
                                  style: const TextStyle(color: Colors.white70, fontSize: 12, height: 1.2),
                                ),
                                const SizedBox(height: 8),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    _BadgeChip(label: _role.toUpperCase()),
                                    const SizedBox(width: 8),
                                    _BadgeChip(label: _tier.toUpperCase(), gold: true),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                  title: Text(context.tr('profile.title'), style: const TextStyle(fontWeight: FontWeight.w800)),
                ),
                SliverPadding(
                  padding: const EdgeInsets.all(16),
                  sliver: SliverList(
                    delegate: SliverChildListDelegate([
                      _FieldCard(
                        icon: Icons.person_outline_rounded,
                        label: context.tr('profile.name'),
                        child: TextField(
                          controller: _nameCtrl,
                          decoration: const InputDecoration(border: InputBorder.none, isDense: true),
                        ),
                      ),
                      _FieldCard(
                        icon: Icons.email_outlined,
                        label: context.tr('auth.email_pro'),
                        child: TextField(
                          controller: _emailCtrl,
                          readOnly: true,
                          style: const TextStyle(color: QdiaColors.textMuted),
                          decoration: const InputDecoration(border: InputBorder.none, isDense: true),
                        ),
                      ),
                      _FieldCard(
                        icon: Icons.business_rounded,
                        label: context.tr('profile.company'),
                        child: TextField(
                          controller: _companyCtrl,
                          decoration: const InputDecoration(border: InputBorder.none, isDense: true),
                        ),
                      ),
                      _FieldCard(
                        icon: Icons.location_on_outlined,
                        label: context.tr('profile.wilaya'),
                        child: TextField(
                          controller: _wilayaCtrl,
                          decoration: const InputDecoration(border: InputBorder.none, isDense: true),
                        ),
                      ),
                      const SizedBox(height: 16),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton.icon(
                          onPressed: _saving ? null : _save,
                          icon: _saving
                              ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                              : const Icon(Icons.save_rounded),
                          label: Text(_saving ? context.tr('common.saving') : context.tr('common.save')),
                          style: ElevatedButton.styleFrom(minimumSize: const Size.fromHeight(50)),
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

class _BadgeChip extends StatelessWidget {
  const _BadgeChip({required this.label, this.gold = false});
  final String label;
  final bool gold;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: gold ? QdiaColors.gold : Colors.white.withValues(alpha: 0.2),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w800,
          color: gold ? QdiaColors.navy : Colors.white,
        ),
      ),
    );
  }
}

class _FieldCard extends StatelessWidget {
  const _FieldCard({required this.icon, required this.label, required this.child});

  final IconData icon;
  final String label;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: QdiaColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 18, color: QdiaColors.primary),
              const SizedBox(width: 8),
              Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: QdiaColors.textMuted)),
            ],
          ),
          const SizedBox(height: 6),
          child,
        ],
      ),
    );
  }
}
