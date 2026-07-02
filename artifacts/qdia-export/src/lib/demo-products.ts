import type { Product } from "@workspace/api-client-react";
import { IMAGES } from "@/lib/images";

/** IDs négatifs = produits demo (sans base de données) */
export const DEMO_PRODUCTS: Product[] = [
  {
    id: -1,
    name: "Huile d'olive extra vierge — Béjaïa",
    description: "Première pression à froid, acidité < 0,8 %. Origine Béjaïa, export premium vers l'UE. Conditionnement bidon 5 L ou bouteille verre 750 ml.",
    category: "Agriculture & Food",
    sku: "QDIA-OO-001",
    image_url: IMAGES.oliveOil,
    images: [IMAGES.oliveOil],
    supplier_id: 1,
    supplier_name: "Coopérative Oléicole Béjaïa",
    supplier_location: "Béjaïa, Algérie",
    moq: 500,
    moq_unit: "liters",
    port_depart: "Béjaïa",
    origin_wilaya: "Béjaïa",
    certifications: ["Bio Certified", "ISO 22000", "Halal Certificate"],
    packaging: "Bidon 5 L / bouteille 750 ml",
    processing: "Première pression à froid",
    export_status: "published",
    prices: { exw: 4.2, fob: 5.1, cfr: 6.8, cif: 7.0, currency: "USD", unit: "per liter" },
    rating: 4.8,
    review_count: 23,
    orders_fulfilled: 12,
    target_markets: ["FR", "DE", "ES"],
    is_featured: true,
  },
  {
    id: -2,
    name: "Dattes Deglet Nour Premium",
    description: "Dattes branche calibre A, origine Biskra. Qualité export, sucre naturel élevé, conservation optimisée.",
    category: "Agriculture & Food",
    sku: "QDIA-DT-002",
    image_url: IMAGES.dates,
    images: [IMAGES.dates],
    supplier_id: 1,
    supplier_name: "Coopérative Oléicole Béjaïa",
    supplier_location: "Biskra, Algérie",
    moq: 1000,
    moq_unit: "kg",
    port_depart: "Alger",
    origin_wilaya: "Biskra",
    certifications: ["Halal Certificate", "Phytosanitary Certificate"],
    packaging: "Carton 5 kg branche",
    processing: "Tri manuel calibre A",
    export_status: "published",
    prices: { exw: 2.8, fob: 3.4, cfr: 4.6, cif: 4.8, currency: "USD", unit: "per kg" },
    rating: 4.6,
    review_count: 18,
    orders_fulfilled: 8,
    target_markets: ["FR", "UK", "US"],
    is_featured: true,
  },
  {
    id: -3,
    name: "Miel de Ghardaïa — Sahara",
    description: "Miel pur des oasis du M'Zab. Non pasteurisé, notes florales intenses, certifié Halal.",
    category: "Agriculture & Food",
    sku: "QDIA-HN-003",
    image_url: IMAGES.honey,
    images: [IMAGES.honey],
    supplier_id: 1,
    supplier_name: "Apiculteurs du M'Zab",
    supplier_location: "Ghardaïa, Algérie",
    moq: 200,
    moq_unit: "kg",
    port_depart: "Ghardaïa",
    origin_wilaya: "Ghardaïa",
    certifications: ["Halal Certificate", "Organic"],
    packaging: "Pot verre 500 g / seau 25 kg",
    processing: "Filtration naturelle",
    export_status: "published",
    prices: { exw: 8.5, fob: 9.2, cfr: 11.0, cif: 11.5, currency: "USD", unit: "per kg" },
    rating: 4.7,
    review_count: 11,
    orders_fulfilled: 8,
    target_markets: ["FR", "DE", "SA"],
    is_featured: false,
  },
  {
    id: -4,
    name: "Couscous traditionnel",
    description: "Semoule de blé dur premium, préparation artisanale Constantine. Export grande distribution.",
    category: "Agriculture & Food",
    sku: "QDIA-CS-004",
    image_url: IMAGES.couscous,
    images: [IMAGES.couscous],
    supplier_id: 1,
    supplier_name: "Meunerie Constantine",
    supplier_location: "Constantine, Algérie",
    moq: 2000,
    moq_unit: "kg",
    port_depart: "Skikda",
    origin_wilaya: "Constantine",
    certifications: ["ISO 22000", "Halal Certificate"],
    packaging: "Sac 25 kg / sachet 1 kg",
    processing: "Mouture traditionnelle",
    export_status: "published",
    prices: { exw: 1.8, fob: 2.1, cfr: 2.9, cif: 3.1, currency: "USD", unit: "per kg" },
    rating: 4.5,
    review_count: 9,
    orders_fulfilled: 5,
    target_markets: ["FR", "IT"],
    is_featured: false,
  },
  {
    id: -5,
    name: "Tapis berbère — artisanat",
    description: "Tapis tissé main, laine naturelle, motifs traditionnels kabyles. Pièce unique ou série limitée.",
    category: "Handicrafts & Decor",
    sku: "QDIA-RG-005",
    image_url: IMAGES.textile,
    images: [IMAGES.textile],
    supplier_id: 1,
    supplier_name: "Artisans de Kabylie",
    supplier_location: "Tizi Ouzou, Algérie",
    moq: 50,
    moq_unit: "units",
    port_depart: "Alger",
    origin_wilaya: "Tizi Ouzou",
    certifications: ["Artisanat certifié"],
    packaging: "Roulé + tube carton",
    processing: "Tissage manuel",
    export_status: "published",
    prices: { exw: 38, fob: 45, cfr: 52, cif: 55, currency: "USD", unit: "per unit" },
    rating: 4.9,
    review_count: 7,
    orders_fulfilled: 3,
    target_markets: ["FR", "US"],
    is_featured: false,
  },
  {
    id: -6,
    name: "Poterie kabyle",
    description: "Poterie traditionnelle émaillée, usage décoratif et utilitaire. Fait main, origine Ath Yenni.",
    category: "Handicrafts & Decor",
    sku: "QDIA-PT-006",
    image_url: IMAGES.pottery,
    images: [IMAGES.pottery],
    supplier_id: 1,
    supplier_name: "Atelier Ath Yenni",
    supplier_location: "Tizi Ouzou, Algérie",
    moq: 100,
    moq_unit: "units",
    port_depart: "Alger",
    origin_wilaya: "Tizi Ouzou",
    certifications: ["Artisanat certifié"],
    packaging: "Carton renforcé individuel",
    processing: "Cuisson traditionnelle",
    export_status: "published",
    prices: { exw: 10, fob: 12, cfr: 15, cif: 16, currency: "USD", unit: "per unit" },
    rating: 4.6,
    review_count: 5,
    orders_fulfilled: 2,
    target_markets: ["FR", "DE"],
    is_featured: false,
  },
];

export function isDemoProductId(id: number): boolean {
  return id < 0;
}

export function getDemoProduct(id: number): Product | undefined {
  return DEMO_PRODUCTS.find(p => p.id === id);
}

export function mergeWithDemoProducts(apiProducts: Product[] | undefined): Product[] {
  if (apiProducts?.length) return apiProducts;
  return DEMO_PRODUCTS;
}

export function filterDemoProducts(search?: string, category?: string): Product[] {
  let list = [...DEMO_PRODUCTS];
  if (search) {
    const q = search.toLowerCase();
    list = list.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q),
    );
  }
  if (category) {
    list = list.filter(p => p.category === category);
  }
  return list;
}
