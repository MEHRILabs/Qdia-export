import 'package:flutter/material.dart';

/// Grille produits — ratio adapté aux cartes compactes (évite les overflows).
const kProductGridDelegate = SliverGridDelegateWithFixedCrossAxisCount(
  crossAxisCount: 2,
  mainAxisSpacing: 12,
  crossAxisSpacing: 12,
  childAspectRatio: 0.54,
);
