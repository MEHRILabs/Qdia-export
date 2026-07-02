import 'package:flutter/material.dart';
import 'package:qdia_mobile/services/api_service.dart';
import 'package:qdia_mobile/theme/qdia_theme.dart';

class ProductImage extends StatelessWidget {
  const ProductImage({
    super.key,
    required this.src,
    this.fit = BoxFit.cover,
    this.width,
    this.height,
  });

  final String src;
  final BoxFit fit;
  final double? width;
  final double? height;

  String get _resolvedSrc {
    if (src.startsWith('/')) return '${ApiConfig.baseUrl}$src';
    return src;
  }

  bool get _isNetwork =>
      _resolvedSrc.startsWith('http') || _resolvedSrc.startsWith('data:');

  bool get _isMissing => src.trim().isEmpty;

  Widget _placeholder() => Container(
        width: width,
        height: height,
        color: QdiaColors.primaryLight,
        alignment: Alignment.center,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.photo_camera_outlined, color: QdiaColors.primary, size: 28),
            const SizedBox(height: 6),
            Text(
              'QDIA Photo',
              style: TextStyle(
                color: QdiaColors.primary,
                fontWeight: FontWeight.w800,
                fontSize: width != null && width! < 120 ? 10 : 12,
              ),
            ),
            if (width == null || width! >= 120)
              const Text(
                'Photo IA à générer',
                style: TextStyle(color: QdiaColors.textMuted, fontSize: 9),
              ),
          ],
        ),
      );

  @override
  Widget build(BuildContext context) {
    if (_isMissing) return _placeholder();

    final error = _placeholder();

    if (_isNetwork) {
      return Image.network(
        _resolvedSrc,
        width: width,
        height: height,
        fit: fit,
        errorBuilder: (_, __, ___) => error,
      );
    }

    return Image.asset(
      src,
      width: width,
      height: height,
      fit: fit,
      errorBuilder: (_, __, ___) => error,
    );
  }
}
