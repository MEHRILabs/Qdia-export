import 'package:flutter/material.dart';

class ProductPrices {
  const ProductPrices({
    required this.fob,
    required this.currency,
    required this.unit,
    this.exw,
    this.cif,
  });

  final double fob;
  final double? exw;
  final double? cif;
  final String currency;
  final String unit;
}

class Product {
  const Product({
    required this.id,
    required this.name,
    required this.description,
    required this.category,
    required this.imageAsset,
    required this.supplierName,
    required this.supplierLocation,
    required this.moq,
    required this.moqUnit,
    required this.prices,
    required this.rating,
    required this.reviewCount,
    this.certifications = const [],
    this.isFeatured = false,
    this.readyToShip = false,
    this.exportStatus,
    this.supplierId,
  });

  final int id;
  final String name;
  final String description;
  final String category;
  final String imageAsset;
  final String supplierName;
  final String supplierLocation;
  final int moq;
  final String moqUnit;
  final ProductPrices prices;
  final double rating;
  final int reviewCount;
  final List<String> certifications;
  final bool isFeatured;
  final bool readyToShip;
  final String? exportStatus;
  final int? supplierId;

  String get displayImage => imageAsset;

  bool get isNetworkImage =>
      imageAsset.startsWith('http') || imageAsset.startsWith('data:');

  factory Product.fromJson(Map<String, dynamic> json) {
    final pricesMap = json['prices'] as Map<String, dynamic>? ?? {};
    final images = json['images'] as List?;
    final imageUrl = json['image_url'] as String?;
    final imagePath = imageUrl ??
        (images != null && images.isNotEmpty ? images.first as String? : null) ??
        '';

    return Product(
      id: (json['id'] as num).toInt(),
      name: json['name'] as String? ?? '',
      description: json['description'] as String? ?? '',
      category: json['category'] as String? ?? '',
      imageAsset: imagePath,
      supplierName: json['supplier_name'] as String? ?? 'Fournisseur DZ',
      supplierLocation: json['supplier_location'] as String? ?? json['origin_wilaya'] as String? ?? 'Algérie',
      moq: (json['moq'] as num?)?.toInt() ?? 1,
      moqUnit: json['moq_unit'] as String? ?? 'unité',
      prices: ProductPrices(
        fob: (pricesMap['fob'] as num?)?.toDouble() ?? 0,
        exw: (pricesMap['exw'] as num?)?.toDouble(),
        cif: (pricesMap['cif'] as num?)?.toDouble(),
        currency: pricesMap['currency'] as String? ?? 'USD',
        unit: pricesMap['unit'] as String? ?? 'unité',
      ),
      rating: (json['rating'] as num?)?.toDouble() ?? 0,
      reviewCount: (json['review_count'] as num?)?.toInt() ?? 0,
      certifications: (json['certifications'] as List?)?.map((e) => e.toString()).toList() ?? const [],
      isFeatured: json['is_featured'] as bool? ?? false,
      readyToShip: json['export_status'] == 'published',
      exportStatus: json['export_status'] as String?,
      supplierId: (json['supplier_id'] as num?)?.toInt(),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'description': description,
        'category': category,
        'image_url': imageAsset.startsWith('http') ? imageAsset : null,
        'supplier_name': supplierName,
        'supplier_location': supplierLocation,
        'moq': moq,
        'moq_unit': moqUnit,
        'prices': {
          'fob': prices.fob,
          'exw': prices.exw,
          'cif': prices.cif,
          'currency': prices.currency,
          'unit': prices.unit,
        },
        'rating': rating,
        'review_count': reviewCount,
        'certifications': certifications,
        'is_featured': isFeatured,
      };
}

class CategoryItem {
  const CategoryItem({
    required this.id,
    required this.label,
    required this.icon,
    required this.subcategories,
  });

  final String id;
  final String label;
  final IconData icon;
  final List<String> subcategories;
}

class InquiryMessage {
  const InquiryMessage({
    required this.id,
    required this.supplierName,
    required this.productName,
    required this.preview,
    required this.time,
    this.unread = false,
  });

  final String id;
  final String supplierName;
  final String productName;
  final String preview;
  final String time;
  final bool unread;
}

class RfqItem {
  const RfqItem({
    required this.product,
    required this.quantity,
  });

  final Product product;
  final int quantity;
}
