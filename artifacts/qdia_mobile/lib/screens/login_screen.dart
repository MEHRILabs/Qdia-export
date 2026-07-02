import 'package:flutter/material.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:qdia_mobile/config/app_config.dart';
import 'package:qdia_mobile/l10n/app_strings.dart';
import 'package:qdia_mobile/services/api_service.dart';
import 'package:qdia_mobile/theme/qdia_theme.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key, required this.onLogin});

  final VoidCallback onLogin;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> with SingleTickerProviderStateMixin {
  late final TabController _tabs;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  Stack(
                    clipBehavior: Clip.none,
                    children: [
                      Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          color: QdiaColors.primaryLight,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(Icons.notifications_none_rounded, color: QdiaColors.primary, size: 22),
                      ),
                      Positioned(
                        right: -2,
                        top: -2,
                        child: Container(
                          width: 16,
                          height: 16,
                          decoration: const BoxDecoration(color: QdiaColors.danger, shape: BoxShape.circle),
                          child: const Center(child: Text('1', style: TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.w800))),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),
            ClipRRect(
              borderRadius: BorderRadius.circular(20),
              child: Image.asset(
                'assets/images/logo.png',
                width: 88,
                height: 88,
                errorBuilder: (_, __, ___) => Container(
                  width: 88,
                  height: 88,
                  decoration: BoxDecoration(color: QdiaColors.primaryLight, borderRadius: BorderRadius.circular(20)),
                  child: const Icon(Icons.storefront_rounded, size: 48, color: QdiaColors.primary),
                ),
              ),
            ),
            const SizedBox(height: 14),
            Text(context.tr('brand.name'), style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: QdiaColors.navy)),
            const SizedBox(height: 4),
            Text(context.tr('auth.login_subtitle'), style: const TextStyle(fontSize: 13, color: QdiaColors.textMuted)),
            const SizedBox(height: 20),
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 24),
              decoration: BoxDecoration(
                color: QdiaColors.pageBg,
                borderRadius: BorderRadius.circular(12),
              ),
              child: TabBar(
                controller: _tabs,
                indicator: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(10)),
                indicatorSize: TabBarIndicatorSize.tab,
                dividerColor: Colors.transparent,
                labelColor: QdiaColors.primary,
                unselectedLabelColor: QdiaColors.textMuted,
                labelStyle: const TextStyle(fontWeight: FontWeight.w800, fontSize: 12),
                tabs: [
                  Tab(text: context.tr('auth.tab_email')),
                  Tab(text: context.tr('auth.tab_gmail')),
                  Tab(text: context.tr('auth.tab_sms')),
                ],
              ),
            ),
            Expanded(
              child: TabBarView(
                controller: _tabs,
                children: [
                  _EmailForm(onLogin: widget.onLogin),
                  _SocialLogin(provider: context.tr('auth.tab_gmail'), onLogin: widget.onLogin),
                  _PhoneForm(onLogin: widget.onLogin),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _EmailForm extends StatefulWidget {
  const _EmailForm({required this.onLogin});
  final VoidCallback onLogin;
  @override
  State<_EmailForm> createState() => _EmailFormState();
}

class _EmailFormState extends State<_EmailForm> {
  final _email = TextEditingController(text: 'supplier@qdiadz.com');
  final _password = TextEditingController(text: 'demo1234');
  bool _loading = false;

  Future<void> _submit() async {
    setState(() => _loading = true);
    try {
      final res = await ApiService.instance.login(_email.text, _password.text);
      await ApiService.instance.saveSession(res);
      widget.onLogin();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
    if (mounted) setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          TextField(controller: _email, decoration: InputDecoration(labelText: context.tr('auth.email_pro'), filled: true, fillColor: QdiaColors.pageBg, border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none))),
          const SizedBox(height: 12),
          TextField(controller: _password, obscureText: true, decoration: InputDecoration(labelText: context.tr('auth.password'), filled: true, fillColor: QdiaColors.pageBg, border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none))),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            height: 48,
            child: ElevatedButton(
              onPressed: _loading ? null : _submit,
              style: ElevatedButton.styleFrom(backgroundColor: QdiaColors.primary, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
              child: _loading ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : Text(context.tr('auth.login'), style: const TextStyle(fontWeight: FontWeight.w800)),
            ),
          ),
        ],
      ),
    );
  }
}

class _PhoneForm extends StatefulWidget {
  const _PhoneForm({required this.onLogin});
  final VoidCallback onLogin;
  @override
  State<_PhoneForm> createState() => _PhoneFormState();
}

class _PhoneFormState extends State<_PhoneForm> {
  final _phone = TextEditingController(text: '+213555123456');
  final _code = TextEditingController();
  String? _demoCode;

  Future<void> _send() async {
    try {
      final res = await ApiService.instance.sendOtp(_phone.text);
      setState(() => _demoCode = res['demo_code'] as String? ?? '123456');
    } catch (_) {
      setState(() => _demoCode = '123456');
    }
  }

  Future<void> _verify() async {
    try {
      final res = await ApiService.instance.verifyOtp(_phone.text, _code.text);
      await ApiService.instance.saveSession(res);
      widget.onLogin();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          TextField(controller: _phone, keyboardType: TextInputType.phone, decoration: InputDecoration(labelText: context.tr('auth.phone_hint'), filled: true, fillColor: QdiaColors.pageBg, border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none))),
          const SizedBox(height: 12),
          TextField(controller: _code, keyboardType: TextInputType.number, decoration: InputDecoration(labelText: context.tr('auth.otp_code'), hintText: _demoCode, filled: true, fillColor: QdiaColors.pageBg, border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none))),
          const SizedBox(height: 8),
          TextButton(onPressed: _send, child: Text(context.tr('auth.send_otp'))),
          const SizedBox(height: 12),
          SizedBox(width: double.infinity, height: 48, child: ElevatedButton(onPressed: _verify, child: Text(context.tr('auth.verify')))),
        ],
      ),
    );
  }
}

class _SocialLogin extends StatefulWidget {
  const _SocialLogin({required this.provider, required this.onLogin});
  final String provider;
  final VoidCallback onLogin;

  @override
  State<_SocialLogin> createState() => _SocialLoginState();
}

class _SocialLoginState extends State<_SocialLogin> {
  bool _loading = false;

  Future<void> _signInWithGoogle() async {
    setState(() => _loading = true);
    try {
      final googleSignIn = GoogleSignIn(
        clientId: AppConfig.googleClientId,
        scopes: ['email', 'profile'],
      );
      final account = await googleSignIn.signIn();
      if (account == null) {
        setState(() => _loading = false);
        return;
      }
      final res = await ApiService.instance.loginGoogle(
        account.email,
        account.displayName ?? 'Utilisateur Google',
        googleId: account.id,
      );
      await ApiService.instance.saveSession(res);
      widget.onLogin();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    }
    if (mounted) setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(color: QdiaColors.primaryLight, borderRadius: BorderRadius.circular(16)),
            child: const Icon(Icons.g_mobiledata_rounded, size: 40, color: QdiaColors.primary),
          ),
          const SizedBox(height: 16),
          Text('${context.tr('auth.continue_with')} ${widget.provider}', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            height: 48,
            child: ElevatedButton(
              onPressed: _loading ? null : _signInWithGoogle,
              style: ElevatedButton.styleFrom(backgroundColor: QdiaColors.gold, foregroundColor: QdiaColors.navy, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
              child: _loading
                  ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
                  : Text('${context.tr('auth.login_with')} ${widget.provider}', style: const TextStyle(fontWeight: FontWeight.w800)),
            ),
          ),
        ],
      ),
    );
  }
}
