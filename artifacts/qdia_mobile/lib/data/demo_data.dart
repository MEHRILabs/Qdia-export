import 'package:flutter/material.dart';
import 'package:qdia_mobile/models/product.dart';

const demoProducts = <Product>[
  Product(
    id: 1,
    name: "Huile d'olive extra vierge — Béjaïa",
    description:
        "Première pression à froid, acidité < 0,8 %. Origine Béjaïa, export premium vers l'UE.",
    category: 'Agriculture & Food',
    imageAsset: 'assets/images/olive-oil.png',
    supplierName: 'Coopérative Oléicole Béjaïa',
    supplierLocation: 'Béjaïa, Algérie',
    moq: 500,
    moqUnit: 'litres',
    prices: ProductPrices(fob: 5.1, exw: 4.2, cif: 7.0, currency: 'USD', unit: 'litre'),
    rating: 4.8,
    reviewCount: 23,
    certifications: ['Bio', 'ISO 22000', 'Halal'],
    isFeatured: true,
    readyToShip: true,
  ),
  Product(
    id: 2,
    name: 'Dattes Deglet Nour Premium',
    description: 'Dattes branche calibre A, origine Biskra. Qualité export.',
    category: 'Agriculture & Food',
    imageAsset: 'assets/images/dates.png',
    supplierName: 'Coopérative Biskra Export',
    supplierLocation: 'Biskra, Algérie',
    moq: 1000,
    moqUnit: 'kg',
    prices: ProductPrices(fob: 3.4, exw: 2.8, cif: 4.8, currency: 'USD', unit: 'kg'),
    rating: 4.6,
    reviewCount: 18,
    certifications: ['Halal', 'Phytosanitaire'],
    isFeatured: true,
    readyToShip: true,
  ),
  Product(
    id: 3,
    name: "Miel de Ghardaïa — Sahara",
    description: "Miel pur des oasis du M'Zab. Non pasteurisé, certifié Halal.",
    category: 'Agriculture & Food',
    imageAsset: 'assets/images/honey.png',
    supplierName: "Apiculteurs du M'Zab",
    supplierLocation: 'Ghardaïa, Algérie',
    moq: 200,
    moqUnit: 'kg',
    prices: ProductPrices(fob: 9.2, exw: 8.5, cif: 11.5, currency: 'USD', unit: 'kg'),
    rating: 4.7,
    reviewCount: 11,
    certifications: ['Halal', 'Bio'],
    readyToShip: false,
  ),
  Product(
    id: 4,
    name: 'Couscous traditionnel',
    description: 'Semoule de blé dur premium, préparation artisanale Constantine.',
    category: 'Agriculture & Food',
    imageAsset: 'assets/images/couscous.png',
    supplierName: 'Meunerie Constantine',
    supplierLocation: 'Constantine, Algérie',
    moq: 2000,
    moqUnit: 'kg',
    prices: ProductPrices(fob: 2.1, exw: 1.8, cif: 3.1, currency: 'USD', unit: 'kg'),
    rating: 4.5,
    reviewCount: 9,
    certifications: ['ISO 22000', 'Halal'],
    readyToShip: true,
  ),
  Product(
    id: 5,
    name: 'Tapis berbère — artisanat',
    description: 'Tapis tissé main, laine naturelle, motifs traditionnels kabyles.',
    category: 'Handicrafts & Decor',
    imageAsset: 'assets/images/rug.png',
    supplierName: 'Artisans de Kabylie',
    supplierLocation: 'Tizi Ouzou, Algérie',
    moq: 50,
    moqUnit: 'unités',
    prices: ProductPrices(fob: 45, exw: 38, cif: 55, currency: 'USD', unit: 'unité'),
    rating: 4.9,
    reviewCount: 7,
    certifications: ['Artisanat certifié'],
    isFeatured: true,
  ),
  Product(
    id: 6,
    name: 'Poterie kabyle',
    description: 'Poterie traditionnelle émaillée, fait main, origine Ath Yenni.',
    category: 'Handicrafts & Decor',
    imageAsset: 'assets/images/pottery.png',
    supplierName: 'Atelier Ath Yenni',
    supplierLocation: 'Tizi Ouzou, Algérie',
    moq: 100,
    moqUnit: 'unités',
    prices: ProductPrices(fob: 12, exw: 10, cif: 16, currency: 'USD', unit: 'unité'),
    rating: 4.6,
    reviewCount: 5,
    certifications: ['Artisanat certifié'],
  ),
];

const homeBanners = [
  (
    title: 'Export algérien certifié 🇩🇿',
    subtitle: 'Produits vérifiés · Pricing Incoterms · IA intégrée',
    gradient: [Color(0xFF073B74), Color(0xFF0461A5)],
  ),
  (
    title: 'Agent IA Export',
    subtitle: 'Publiez vos produits en 5 étapes depuis votre téléphone',
    gradient: [Color(0xFF1A1A2E), Color(0xFF073B74)],
  ),
  (
    title: 'Prêt à expédier',
    subtitle: 'Huile, dattes, couscous — stock disponible FOB Alger',
    gradient: [Color(0xFF034E85), Color(0xFF04BB7B)],
  ),
];

const categoryItems = <CategoryItem>[
  CategoryItem(
    id: 'agri',
    label: 'Agroalimentaire',
    icon: Icons.eco_outlined,
    subcategories: ['Huile d\'olive', 'Dattes', 'Miel', 'Couscous', 'Fruits secs'],
  ),
  CategoryItem(
    id: 'textile',
    label: 'Textiles',
    icon: Icons.checkroom_outlined,
    subcategories: ['Tapis', 'Broderie', 'Laine', 'Coton'],
  ),
  CategoryItem(
    id: 'artisanat',
    label: 'Artisanat',
    icon: Icons.palette_outlined,
    subcategories: ['Poterie', 'Cuivre', 'Bois', 'Maroquinerie'],
  ),
  CategoryItem(
    id: 'energie',
    label: 'Énergie',
    icon: Icons.bolt_outlined,
    subcategories: ['Phosphate', 'Dérivés', 'Engrais'],
  ),
  CategoryItem(
    id: 'construction',
    label: 'Construction',
    icon: Icons.foundation_outlined,
    subcategories: ['Ciment', 'Marbre', 'Céramique'],
  ),
  CategoryItem(
    id: 'pharma',
    label: 'Pharma',
    icon: Icons.medical_services_outlined,
    subcategories: ['Compléments', 'Plantes', 'Cosmétique'],
  ),
];

const homeShortcuts = [
  (icon: Icons.local_shipping_outlined, label: 'Prêt à expédier', color: Color(0xFF04BB7B)),
  (icon: Icons.verified_outlined, label: 'Fournisseurs vérifiés', color: Color(0xFF0461A5)),
  (icon: Icons.auto_awesome_outlined, label: 'Agent IA', color: Color(0xFFF5C518)),
  (icon: Icons.photo_camera_outlined, label: 'Studio photo', color: Color(0xFF073B74)),
  (icon: Icons.request_quote_outlined, label: 'Demande de prix', color: Color(0xFF0461A5)),
  (icon: Icons.flag_outlined, label: 'Made in 🇩🇿', color: Color(0xFF04BB7B)),
  (icon: Icons.warehouse_outlined, label: 'Stock Alger', color: Color(0xFF334257)),
  (icon: Icons.language_outlined, label: 'Export UE/USA', color: Color(0xFF0461A5)),
  (icon: Icons.shield_outlined, label: 'Certifié Halal', color: Color(0xFFF5C518)),
  (icon: Icons.trending_up_outlined, label: 'Top export', color: Color(0xFF04BB7B)),
];

/// Correspondance libellés catégories app → catégories produits
const categoryProductMap = <String, String>{
  'Agroalimentaire': 'Agriculture & Food',
  'Textiles': 'Textiles & Apparel',
  'Artisanat': 'Handicrafts & Decor',
  'Énergie': 'Energy',
  'Construction': 'Construction',
  'Pharma': 'Agriculture & Food',
};

const demoInquiries = <InquiryMessage>[
  InquiryMessage(
    id: '1',
    supplierName: 'Coopérative Oléicole Béjaïa',
    productName: "Huile d'olive extra vierge",
    preview: 'Bonjour, nous pouvons livrer 2000 L FOB Béjaïa...',
    time: '10:32',
    unread: true,
  ),
  InquiryMessage(
    id: '2',
    supplierName: 'Coopérative Biskra Export',
    productName: 'Dattes Deglet Nour',
    preview: 'MOQ 1000 kg confirmé. Certificat phytosanitaire inclus.',
    time: 'Hier',
  ),
  InquiryMessage(
    id: '3',
    supplierName: 'Artisans de Kabylie',
    productName: 'Tapis berbère',
    preview: 'Nouveau catalogue disponible — 50 pièces minimum.',
    time: 'Lun.',
  ),
];

Product? findProduct(int id) {
  for (final p in demoProducts) {
    if (p.id == id) return p;
  }
  return null;
}

List<Product> filterProducts({String? query, String? category}) {
  var list = demoProducts;
  if (category != null && category.isNotEmpty) {
    final mapped = categoryProductMap[category] ?? category;
    list = list.where((p) =>
      p.category.contains(mapped) ||
      p.name.toLowerCase().contains(mapped.toLowerCase()) ||
      p.category.toLowerCase().contains(category.toLowerCase()),
    ).toList();
    if (list.isEmpty) list = demoProducts;
  }
  if (query != null && query.isNotEmpty) {
    final q = query.toLowerCase();
    list = list
        .where((p) =>
            p.name.toLowerCase().contains(q) ||
            p.category.toLowerCase().contains(q) ||
            p.supplierLocation.toLowerCase().contains(q))
        .toList();
  }
  return list;
}
