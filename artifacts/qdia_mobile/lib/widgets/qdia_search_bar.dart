import 'package:flutter/material.dart';
import 'package:qdia_mobile/l10n/app_strings.dart';
import 'package:qdia_mobile/theme/qdia_theme.dart';

class QdiaSearchBar extends StatelessWidget {
  const QdiaSearchBar({
    super.key,
    this.hint,
    this.onTap,
    this.readOnly = true,
    this.onChanged,
    this.onSubmitted,
    this.onQrTap,
    this.autofocus = false,
  });

  final String? hint;
  final VoidCallback? onTap;
  final bool readOnly;
  final ValueChanged<String>? onChanged;
  final ValueChanged<String>? onSubmitted;
  final VoidCallback? onQrTap;
  final bool autofocus;

  @override
  Widget build(BuildContext context) {
    final hintText = hint ?? context.tr('catalog.search_mobile');
    return Row(
      children: [
        Expanded(
          child: GestureDetector(
            onTap: onTap,
            child: AbsorbPointer(
              absorbing: onTap != null,
              child: TextField(
                readOnly: readOnly && onTap != null,
                autofocus: autofocus,
                onChanged: onChanged,
                onSubmitted: onSubmitted,
                style: const TextStyle(fontSize: 13, color: QdiaColors.textBody),
                decoration: InputDecoration(
                  hintText: hintText,
                  prefixIcon: const Icon(Icons.search, size: 20, color: QdiaColors.textMuted),
                ),
              ),
            ),
          ),
        ),
        if (onQrTap != null) ...[
          const SizedBox(width: 8),
          Material(
            color: QdiaColors.primaryLight,
            borderRadius: BorderRadius.circular(20),
            child: InkWell(
              onTap: onQrTap,
              borderRadius: BorderRadius.circular(20),
              child: const Padding(
                padding: EdgeInsets.all(10),
                child: Icon(Icons.qr_code_scanner, size: 20, color: QdiaColors.primary),
              ),
            ),
          ),
        ],
      ],
    );
  }
}
