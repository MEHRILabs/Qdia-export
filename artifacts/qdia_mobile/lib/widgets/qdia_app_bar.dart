import 'package:flutter/material.dart';
import 'package:qdia_mobile/l10n/app_strings.dart';
import 'package:qdia_mobile/theme/qdia_theme.dart';

class QdiaAppBar extends StatelessWidget {
  const QdiaAppBar({
    super.key,
    required this.onSearchTap,
    this.onQrTap,
    this.showSearch = true,
    this.notificationCount = 0,
    this.onNotificationTap,
    this.isLoggedIn = false,
    this.onLoginTap,
  });

  final VoidCallback onSearchTap;
  final VoidCallback? onQrTap;
  final bool showSearch;
  final int notificationCount;
  final VoidCallback? onNotificationTap;
  final bool isLoggedIn;
  final VoidCallback? onLoginTap;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [QdiaColors.sidebar, QdiaColors.primary],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(12, 4, 8, 10),
          child: Column(
            children: [
              Row(
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(10),
                    child: Image.asset(
                      'assets/images/logo.png',
                      width: 38,
                      height: 38,
                      errorBuilder: (_, __, ___) => Container(
                        width: 38,
                        height: 38,
                        color: Colors.white,
                        child: const Icon(Icons.storefront, color: QdiaColors.primary, size: 22),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(context.tr('mobile.brand_short'), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 15, height: 1.1)),
                        Text(context.tr('mobile.brand_country'), style: const TextStyle(color: QdiaColors.gold, fontWeight: FontWeight.w800, fontSize: 11)),
                      ],
                    ),
                  ),
                  if (!isLoggedIn && onLoginTap != null) ...[
                    _LoginChip(onTap: onLoginTap!),
                    const SizedBox(width: 6),
                  ],
                  _AlibabaBell(count: notificationCount, onTap: onNotificationTap),
                ],
              ),
              if (showSearch) ...[
                const SizedBox(height: 8),
                Container(
                  height: 38,
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(color: Colors.black.withValues(alpha: 0.08), blurRadius: 6, offset: const Offset(0, 2)),
                    ],
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: GestureDetector(
                          onTap: onSearchTap,
                          behavior: HitTestBehavior.opaque,
                          child: Row(
                            children: [
                              const Icon(Icons.search, size: 18, color: QdiaColors.textMuted),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  context.tr('catalog.search_mobile'),
                                  style: const TextStyle(fontSize: 12, color: QdiaColors.textMuted),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      if (onQrTap != null)
                        Material(
                          color: Colors.transparent,
                          child: InkWell(
                            onTap: onQrTap,
                            borderRadius: BorderRadius.circular(16),
                            child: const Padding(
                              padding: EdgeInsets.all(6),
                              child: Icon(Icons.qr_code_scanner, size: 18, color: QdiaColors.primary),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _LoginChip extends StatefulWidget {
  const _LoginChip({required this.onTap});

  final VoidCallback onTap;

  @override
  State<_LoginChip> createState() => _LoginChipState();
}

class _LoginChipState extends State<_LoginChip> with SingleTickerProviderStateMixin {
  late AnimationController _pulse;

  @override
  void initState() {
    super.initState();
    _pulse = AnimationController(vsync: this, duration: const Duration(milliseconds: 1400))..repeat(reverse: true);
  }

  @override
  void dispose() {
    _pulse.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: widget.onTap,
      child: AnimatedBuilder(
        animation: _pulse,
        builder: (_, child) => Transform.scale(scale: 1.0 + _pulse.value * 0.04, child: child),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
          decoration: BoxDecoration(
            gradient: const LinearGradient(colors: [QdiaColors.gold, Color(0xFFE0B015)]),
            borderRadius: BorderRadius.circular(20),
            boxShadow: [
              BoxShadow(color: QdiaColors.gold.withValues(alpha: 0.4), blurRadius: 8, offset: const Offset(0, 2)),
            ],
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.login_rounded, size: 14, color: QdiaColors.navy),
              const SizedBox(width: 4),
              Text(context.tr('header.login'), style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: QdiaColors.navy)),
            ],
          ),
        ),
      ),
    );
  }
}

class _AlibabaBell extends StatefulWidget {
  const _AlibabaBell({required this.count, this.onTap});

  final int count;
  final VoidCallback? onTap;

  @override
  State<_AlibabaBell> createState() => _AlibabaBellState();
}

class _AlibabaBellState extends State<_AlibabaBell> with SingleTickerProviderStateMixin {
  late AnimationController _shake;

  @override
  void initState() {
    super.initState();
    _shake = AnimationController(vsync: this, duration: const Duration(milliseconds: 500));
    _loopShake();
  }

  void _loopShake() {
    Future.delayed(const Duration(seconds: 3), () {
      if (mounted && widget.count > 0) {
        _shake.forward(from: 0).then((_) => _loopShake());
      } else {
        _loopShake();
      }
    });
  }

  @override
  void dispose() {
    _shake.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: widget.onTap,
      child: AnimatedBuilder(
        animation: _shake,
        builder: (_, child) {
          final angle = _shake.value * 0.15 * (1 - _shake.value) * 6;
          return Transform.rotate(angle: angle, child: child);
        },
        child: Stack(
          clipBehavior: Clip.none,
          children: [
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.notifications_none_rounded, color: Colors.white, size: 22),
            ),
            if (widget.count > 0)
              Positioned(
                right: -2,
                top: -2,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                  decoration: BoxDecoration(
                    color: QdiaColors.danger,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: QdiaColors.sidebar, width: 1.5),
                  ),
                  child: Text(
                    '${widget.count}',
                    style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.w800),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
