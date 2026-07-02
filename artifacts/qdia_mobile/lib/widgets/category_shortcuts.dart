import 'package:flutter/material.dart';
import 'package:qdia_mobile/data/demo_data.dart';
import 'package:qdia_mobile/theme/qdia_theme.dart';

class CategoryShortcuts extends StatefulWidget {
  const CategoryShortcuts({super.key, this.onCategoryTap});

  final ValueChanged<String>? onCategoryTap;

  @override
  State<CategoryShortcuts> createState() => _CategoryShortcutsState();
}

class _CategoryShortcutsState extends State<CategoryShortcuts> with TickerProviderStateMixin {
  late final List<AnimationController> _controllers;

  @override
  void initState() {
    super.initState();
    _controllers = List.generate(
      homeShortcuts.length,
      (i) => AnimationController(
        vsync: this,
        duration: Duration(milliseconds: 1800 + i * 120),
      )..repeat(reverse: true),
    );
  }

  @override
  void dispose() {
    for (final c in _controllers) {
      c.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final rows = [homeShortcuts.sublist(0, 5), homeShortcuts.sublist(5)];

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 12),
      padding: const EdgeInsets.fromLTRB(10, 10, 10, 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: QdiaColors.border),
        boxShadow: [
          BoxShadow(
            color: QdiaColors.primary.withValues(alpha: 0.06),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const _TruckHeroStrip(),
          const SizedBox(height: 8),
          for (var r = 0; r < rows.length; r++) ...[
            if (r > 0) const SizedBox(height: 6),
            Row(
              children: List.generate(5, (i) {
                final item = rows[r][i];
                final globalIndex = r * 5 + i;
                return Expanded(
                  child: _ShortcutTile(
                    item: item,
                    bounce: _controllers[globalIndex],
                    onTap: () => widget.onCategoryTap?.call(item.label),
                  ),
                );
              }),
            ),
          ],
        ],
      ),
    );
  }
}

class _ShortcutTile extends StatelessWidget {
  const _ShortcutTile({required this.item, required this.bounce, this.onTap});

  final ({IconData icon, String label, Color color}) item;
  final Animation<double> bounce;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedBuilder(
        animation: bounce,
        builder: (_, child) {
          final lift = bounce.value * 4;
          return Transform.translate(
            offset: Offset(0, -lift),
            child: Transform(
              alignment: Alignment.center,
              transform: Matrix4.identity()
                ..setEntry(3, 2, 0.001)
                ..rotateX(bounce.value * 0.08),
              child: child,
            ),
          );
        },
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    item.color.withValues(alpha: 0.18),
                    item.color.withValues(alpha: 0.06),
                  ],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(12),
                boxShadow: [
                  BoxShadow(
                    color: item.color.withValues(alpha: 0.25),
                    blurRadius: 6,
                    offset: const Offset(0, 3),
                  ),
                ],
              ),
              child: Icon(item.icon, size: 21, color: item.color),
            ),
            const SizedBox(height: 4),
            Text(
              item.label,
              textAlign: TextAlign.center,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: QdiaColors.textBody, height: 1.1),
            ),
          ],
        ),
      ),
    );
  }
}

class _TruckHeroStrip extends StatefulWidget {
  const _TruckHeroStrip();

  @override
  State<_TruckHeroStrip> createState() => _TruckHeroStripState();
}

class _TruckHeroStripState extends State<_TruckHeroStrip> with SingleTickerProviderStateMixin {
  late AnimationController _drive;

  @override
  void initState() {
    super.initState();
    _drive = AnimationController(vsync: this, duration: const Duration(seconds: 4))..repeat();
  }

  @override
  void dispose() {
    _drive.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 52,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        gradient: const LinearGradient(
          colors: [Color(0xFF073B74), Color(0xFF0461A5)],
          begin: Alignment.centerLeft,
          end: Alignment.centerRight,
        ),
      ),
      clipBehavior: Clip.antiAlias,
      child: Stack(
        children: [
          AnimatedBuilder(
            animation: _drive,
            builder: (_, __) {
              return Positioned(
                left: -40 + _drive.value * (MediaQuery.sizeOf(context).width * 0.55),
                top: 10,
                child: Transform(
                  alignment: Alignment.center,
                  transform: Matrix4.identity()
                    ..setEntry(3, 2, 0.002)
                    ..rotateY(0.15),
                  child: Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: QdiaColors.gold,
                      borderRadius: BorderRadius.circular(10),
                      boxShadow: [
                        BoxShadow(color: Colors.black.withValues(alpha: 0.25), blurRadius: 8, offset: const Offset(0, 4)),
                      ],
                    ),
                    child: const Icon(Icons.local_shipping_rounded, color: QdiaColors.navy, size: 26),
                  ),
                ),
              );
            },
          ),
          const Positioned(
            left: 14,
            top: 10,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Export express 🇩🇿', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 12)),
                Text('Livraison · Ports · Douane', style: TextStyle(color: QdiaColors.gold, fontSize: 9, fontWeight: FontWeight.w600)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class SectionHeader extends StatelessWidget {
  const SectionHeader({
    super.key,
    required this.title,
    this.subtitle,
    this.action,
    this.onAction,
  });

  final String title;
  final String? subtitle;
  final String? action;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(14, 18, 14, 10),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (subtitle != null)
                  Text(
                    subtitle!,
                    style: const TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w700,
                      color: QdiaColors.primary,
                      letterSpacing: 1,
                    ),
                  ),
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w900,
                    color: QdiaColors.navy,
                  ),
                ),
              ],
            ),
          ),
          if (action != null)
            GestureDetector(
              onTap: onAction,
              child: Row(
                children: [
                  Text(action!, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: QdiaColors.primary)),
                  const Icon(Icons.chevron_right, size: 18, color: QdiaColors.primary),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
