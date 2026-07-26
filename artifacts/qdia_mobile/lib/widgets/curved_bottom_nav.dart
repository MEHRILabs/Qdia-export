import 'package:flutter/material.dart';
import 'package:qdia_mobile/l10n/app_strings.dart';
import 'package:qdia_mobile/theme/qdia_theme.dart';

class CurvedBottomNav extends StatefulWidget {
  const CurvedBottomNav({
    super.key,
    required this.currentIndex,
    required this.onTap,
    required this.onFabTap,
    this.hasMessageBadge = false,
    this.rfqCount = 0,
  });

  final int currentIndex;
  final ValueChanged<int> onTap;
  final VoidCallback onFabTap;
  final bool hasMessageBadge;
  final int rfqCount;

  @override
  State<CurvedBottomNav> createState() => _CurvedBottomNavState();
}

class _CurvedBottomNavState extends State<CurvedBottomNav> with TickerProviderStateMixin {
  late AnimationController _fabCtrl;
  late final List<AnimationController> _iconCtrls;

  @override
  void initState() {
    super.initState();
    _fabCtrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 1200))..repeat(reverse: true);
    _iconCtrls = List.generate(
      4,
      (i) => AnimationController(vsync: this, duration: Duration(milliseconds: 1600 + i * 200))..repeat(reverse: true),
    );
  }

  @override
  void dispose() {
    _fabCtrl.dispose();
    for (final c in _iconCtrls) {
      c.dispose();
    }
    super.dispose();
  }

  int _visualIndex(int logical) {
    if (logical < 2) return logical;
    if (logical == 4) return 3;
    return logical;
  }

  @override
  Widget build(BuildContext context) {
    final visual = _visualIndex(widget.currentIndex);

    return SizedBox(
      height: 78,
      child: Stack(
        clipBehavior: Clip.none,
        alignment: Alignment.bottomCenter,
        children: [
          CustomPaint(
            size: const Size(double.infinity, 68),
            painter: _NavBarPainter(),
          ),
          Positioned(
            left: 0,
            right: 0,
            bottom: 6,
            child: Row(
              children: [
                _NavItem(
                  icon: Icons.home_rounded,
                  label: context.tr('mobile.tab_home'),
                  active: visual == 0,
                  bounce: _iconCtrls[0],
                  onTap: () => widget.onTap(0),
                ),
                _NavItem(
                  icon: Icons.grid_view_rounded,
                  label: context.tr('mobile.tab_categories'),
                  active: visual == 1,
                  bounce: _iconCtrls[1],
                  onTap: () => widget.onTap(1),
                ),
                const SizedBox(width: 72),
                _NavItem(
                  icon: Icons.chat_bubble_rounded,
                  label: context.tr('mobile.tab_messages'),
                  active: visual == 2,
                  badge: widget.hasMessageBadge,
                  bounce: _iconCtrls[2],
                  onTap: () => widget.onTap(2),
                ),
                _NavItem(
                  icon: Icons.person_rounded,
                  label: context.tr('mobile.tab_account'),
                  active: visual == 3,
                  bounce: _iconCtrls[3],
                  onTap: () => widget.onTap(4),
                ),
              ],
            ),
          ),
          Positioned(
            bottom: 22,
            child: GestureDetector(
              onTap: widget.onFabTap,
              child: AnimatedBuilder(
                animation: _fabCtrl,
                builder: (_, child) => Transform.scale(
                  scale: 1.0 + _fabCtrl.value * 0.08,
                  child: Transform.rotate(angle: _fabCtrl.value * 0.12, child: child),
                ),
                child: Container(
                  width: 58,
                  height: 58,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: QdiaColors.navy,
                    boxShadow: [
                      BoxShadow(
                        color: QdiaColors.gold.withValues(alpha: 0.5),
                        blurRadius: 18,
                        spreadRadius: 2,
                      ),
                    ],
                    border: Border.all(color: QdiaColors.gold, width: 3),
                  ),
                  child: Container(
                    margin: const EdgeInsets.all(4),
                    decoration: const BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: LinearGradient(
                        colors: [QdiaColors.gold, Color(0xFFE0B015)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                    ),
                    child: const Icon(Icons.search_rounded, color: QdiaColors.navy, size: 28),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  const _NavItem({
    required this.icon,
    required this.label,
    required this.active,
    required this.bounce,
    required this.onTap,
    this.badge = false,
  });

  final IconData icon;
  final String label;
  final bool active;
  final Animation<double> bounce;
  final VoidCallback onTap;
  final bool badge;

  @override
  Widget build(BuildContext context) {
    final color = active ? QdiaColors.gold : Colors.white60;

    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        behavior: HitTestBehavior.opaque,
        child: AnimatedBuilder(
          animation: bounce,
          builder: (_, child) {
            final offset = active ? bounce.value * 3 : bounce.value * 1.5;
            return Transform.translate(
              offset: Offset(0, -offset),
              child: child,
            );
          },
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Stack(
                clipBehavior: Clip.none,
                children: [
                  AnimatedScale(
                    scale: active ? 1.2 : 1.0,
                    duration: const Duration(milliseconds: 300),
                    curve: Curves.elasticOut,
                    child: Container(
                      padding: const EdgeInsets.all(4),
                      decoration: active
                          ? BoxDecoration(
                              shape: BoxShape.circle,
                              color: QdiaColors.gold.withValues(alpha: 0.15),
                            )
                          : null,
                      child: Icon(icon, color: color, size: 22),
                    ),
                  ),
                  if (badge)
                    Positioned(
                      right: -2,
                      top: -2,
                      child: Container(
                        width: 8,
                        height: 8,
                        decoration: const BoxDecoration(
                          color: QdiaColors.danger,
                          shape: BoxShape.circle,
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 3),
              AnimatedDefaultTextStyle(
                duration: const Duration(milliseconds: 250),
                style: TextStyle(
                  fontSize: active ? 10 : 9,
                  fontWeight: active ? FontWeight.w800 : FontWeight.w500,
                  color: color,
                ),
                child: Text(label),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _NavBarPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..shader = const LinearGradient(
        colors: [Color(0xFF1A1A2E), QdiaColors.navy],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      ).createShader(Rect.fromLTWH(0, 0, size.width, size.height))
      ..style = PaintingStyle.fill;

    final path = Path();
    final w = size.width;
    final h = size.height;
    const r = 22.0;
    const notchW = 64.0;
    const notchD = 26.0;
    final cx = w / 2;

    path.moveTo(r, 0);
    path.lineTo(cx - notchW / 2 - 10, 0);
    path.quadraticBezierTo(cx - notchW / 2, 0, cx - notchW / 2 + 8, notchD * 0.4);
    path.quadraticBezierTo(cx - notchW / 4, notchD, cx, notchD);
    path.quadraticBezierTo(cx + notchW / 4, notchD, cx + notchW / 2 - 8, notchD * 0.4);
    path.quadraticBezierTo(cx + notchW / 2, 0, cx + notchW / 2 + 10, 0);
    path.lineTo(w - r, 0);
    path.quadraticBezierTo(w, 0, w, r);
    path.lineTo(w, h);
    path.lineTo(0, h);
    path.lineTo(0, r);
    path.quadraticBezierTo(0, 0, r, 0);
    path.close();

    canvas.drawShadow(path, Colors.black.withValues(alpha: 0.3), 10, false);
    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
