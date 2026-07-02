import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:qdia_mobile/l10n/app_strings.dart';
import 'package:qdia_mobile/theme/qdia_theme.dart';

class QrScanScreen extends StatefulWidget {
  const QrScanScreen({super.key, required this.onResult});

  final ValueChanged<String> onResult;

  @override
  State<QrScanScreen> createState() => _QrScanScreenState();
}

class _QrScanScreenState extends State<QrScanScreen> {
  final _controller = MobileScannerController(detectionSpeed: DetectionSpeed.normal);
  bool _handled = false;

  void _onDetect(BarcodeCapture capture) {
    if (_handled) return;
    final code = capture.barcodes.firstOrNull?.rawValue;
    if (code == null || code.trim().isEmpty) return;
    _handled = true;
    widget.onResult(code.trim());
    if (mounted) Navigator.pop(context, code.trim());
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        title: Text(context.tr('product.qr_title'), style: const TextStyle(fontWeight: FontWeight.w800)),
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
      ),
      body: Stack(
        fit: StackFit.expand,
        children: [
          MobileScanner(controller: _controller, onDetect: _onDetect),
          Center(
            child: Container(
              width: 260,
              height: 260,
              decoration: BoxDecoration(
                border: Border.all(color: QdiaColors.gold, width: 3),
                borderRadius: BorderRadius.circular(20),
              ),
            ),
          ),
          Positioned(
            left: 0,
            right: 0,
            bottom: 40,
            child: Column(
              children: [
                Container(
                  margin: const EdgeInsets.symmetric(horizontal: 24),
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.65),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Text(
                    context.tr('product.qr_scan_share'),
                    textAlign: TextAlign.center,
                    style: const TextStyle(color: Colors.white, fontSize: 13),
                  ),
                ),
                const SizedBox(height: 12),
                IconButton.filled(
                  onPressed: () => _controller.toggleTorch(),
                  icon: const Icon(Icons.flash_on_rounded),
                  style: IconButton.styleFrom(backgroundColor: QdiaColors.primary),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

String normalizeScanCode(String raw) => raw.trim().replaceAll(RegExp(r'\s+'), '');

int? parseProductIdFromQr(String raw) {
  final text = normalizeScanCode(raw);
  final direct = int.tryParse(text);
  if (direct != null) return direct;
  final match = RegExp(r'/products?/(\d+)', caseSensitive: false).firstMatch(text);
  if (match != null) return int.tryParse(match.group(1)!);
  final alt = RegExp(r'product[=/:](\d+)', caseSensitive: false).firstMatch(text);
  if (alt != null) return int.tryParse(alt.group(1)!);
  return null;
}
