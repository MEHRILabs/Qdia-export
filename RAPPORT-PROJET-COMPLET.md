# Rapport complet du projet — QDIA Export

**Date :** 26 juin 2026
**Projet :** Plateforme marketplace d'exportation de produits algériens

---

## 1. Vue d'ensemble

QDIA Export est une **plateforme complète de commerce d'exportation** (B2B) qui met en relation les fournisseurs algériens avec des acheteurs internationaux.

Le projet est composé de **3 applications** reliées à une **base de données unique** :

| Application | Technologie | Rôle |
|-------------|-------------|------|
| **Site web** | React + Vite | Pour les acheteurs et les fournisseurs (navigateur) |
| **Application mobile** | Flutter (Android / iPhone) | Même usage, sur téléphone |
| **API / Serveur** | Node.js + Express | Le cerveau : gère toutes les données et règles métier |
| **Base de données** | PostgreSQL | Stocke produits, clients, commandes, etc. |

Le tout est organisé en **un seul dépôt** (monorepo) avec des **éléments partagés** entre le site et l'application (contrats de données, types).

---

## 2. Les chiffres clés

- **19 723 produits** importés et exploitables
- **~25 tables** de données (utilisateurs, produits, commandes, paiements, etc.)
- **3 applications** synchronisées (web, mobile, serveur)
- **Prix d'export calculés** automatiquement (EXW, FOB, CFR, CIF)
- **Catégories réelles** : Épicerie, Hygiène, Boissons, Papeterie, etc.

---

## 3. Les grandes fonctionnalités (ce que la plateforme sait faire)

### Pour les acheteurs
- **Parcourir le catalogue** avec recherche et filtres avancés (prix, quantité minimum, région, incoterm)
- **Voir la fiche détaillée** d'un produit (prix, certifications, fournisseur)
- **Scanner un code-barres / QR code** (mobile) pour trouver un produit
- **Demander un devis (RFQ)** et négocier
- **Panier et commande** avec réassort
- **Paiement sécurisé (escrow / Trade Assurance)** et carte bancaire (Stripe)
- **Messagerie** avec les fournisseurs (en temps réel)
- **Suivi de livraison** et **favoris**

### Pour les fournisseurs / exportateurs
- **Espace fournisseur** avec tableau de bord (ventes, achats, dettes, créances)
- **Ajout de produits** (manuel ou par import Excel)
- **Enrichissement automatique** : calcul des prix + génération de photos par IA
- **Assistant IA** pour créer des fiches produits
- **Studio d'images IA** pour les visuels
- **Facturation** automatique avec génération de PDF
- **Vitrine publique** avec avis et notation

### Logistique d'export
- **Ports** et calcul de fret
- **Tarifs douaniers** (droits de douane, TVA) selon le pays
- **Incoterms** : EXW, FOB, CFR, CIF
- **Suivi des colis**

### Administration
- **Statistiques** globales
- **Modération / validation** des produits
- **Alertes de conformité** et **benchmark de prix**

---

## 4. Détail technique par application

### A. Le serveur / API (`artifacts/api-server`)
C'est le moteur central. Il expose une trentaine de groupes de fonctions :

- **Authentification** : inscription, connexion, Google, SMS (OTP)
- **Produits** : liste, recherche, recommandations, import Excel, enrichissement
- **Devis (RFQ)**, **Panier / Commandes**, **Litiges**
- **Paiements** : escrow, Stripe, paiements manuels
- **Facturation** : factures + génération PDF
- **Ports / Douanes** : calculs logistiques
- **Messagerie** + **Notifications push** (Firebase)
- **IA** : création de fiches, calcul de prix, génération d'images
- **Catalogue Master Data** : import des 19k variantes, publication
- **Analytics** : tableaux de bord et vues statistiques

### B. Le site web (`artifacts/qdia-export`)
Une trentaine de pages, dont :
- Accueil, Catalogue, Fiche produit
- Panier, Commande, Commandes, Transactions
- Devis (RFQ), Mes RFQ, Demandes reçues
- Messagerie, Suivi, Favoris, Profil
- Espace fournisseur, Tableau de bord, Vitrine publique
- Assistant IA, Studio d'images, Validation admin
- Facturation, Trade Assurance, Vérification

### C. L'application mobile (`artifacts/qdia_mobile`)
Une trentaine d'écrans qui reprennent les mêmes fonctions que le site :
- Accueil, Recherche, Catégories, Fiche produit
- Panier, Commande, Suivi, Devis, Messagerie
- Connexion, Compte, Profil, Réglages
- **Espace exportateur** : tableau de bord, import catalogue, enrichissement produits
- **Scanner QR / code-barres**
- Notifications, Favoris, Facturation

### D. Les éléments partagés (`lib/`)
- **`lib/db`** : la base de données et son schéma
- **`lib/api-spec`** : le contrat officiel des données (OpenAPI)
- **`lib/api-zod`** : les types de données générés automatiquement
- **`lib/api-client-react`** : la connexion du site web à l'API

---

## 5. La base de données

Tables principales : `users`, `suppliers`, `products`, `categories`, `rfqs`, `cart_items`, `orders`, `transactions`, `invoices`, `messages`, `favorites`, `reviews`, `disputes`, `oem_requests`, `sample_requests`, `ports`, `customs_tariffs`, `ai_sessions`, `catalog_variants`, `product_views`, `fcm_tokens`, `tracking_events`, etc.

Un **schéma métier complémentaire** (en français) existe aussi avec : produits, articles, clients, grossistes, transitaires, commandes, factures, livraisons + des **vues statistiques** (ventes mensuelles, créances, dettes, retards de livraison).

---

## 6. Ce qui est FAIT ✅

- Import et catégorisation des **19 723 produits**
- **Calcul automatique des prix d'export** (le fichier Excel n'avait pas de prix)
- **Recherche, filtres et catégories** branchés sur la vraie base (web + mobile)
- **Scanner** code-barres / QR / référence produit (mobile)
- **Enrichissement produits** (interface web + mobile)
- Toutes les fonctions commerciales : devis, panier, commandes, paiements, messagerie, facturation, suivi
- **Synchronisation web ↔ mobile** : toutes les nouveautés ajoutées aux deux

---

## 7. Ce qu'il RESTE à faire ⚠️

### Priorité haute
1. **Photos des produits** — affichage provisoire « QDIA Photo » car le service de génération d'images (OpenAI) n'a plus de crédit. → **Recharger le compte** ou fournir une clé valide, puis lancer la génération automatique.
2. **Mise en ligne (hébergement)** — tout fonctionne actuellement sur l'ordinateur de développement. Pour rendre le site public, il faut :
   - Louer un hébergement pour le site, l'API et la base
   - Acheter le nom de domaine (`qdiadz.com`) + activer le HTTPS
   - Configurer les paramètres de production (`.env` : base, secret de sécurité, URL)

### Priorité moyenne
3. **Publier l'application mobile** sur Google Play (~25 $ une fois) et App Store (~99 $/an)
4. **Corrections internes** pour un build 100 % propre en production
5. **Services optionnels** à activer si souhaités : e-mails automatiques, SMS de vérification, paiement carte (Stripe en mode réel)

---

## 8. Conclusion

> **La plateforme est complète et fonctionnelle** sur le plan des fonctionnalités. Le travail technique principal est terminé.
>
> Les étapes restantes dépendent surtout de **décisions et de moyens côté client** : recharger le service de photos, choisir et payer un hébergement + nom de domaine, et ouvrir les comptes pour publier l'application mobile.

---

*Rapport préparé pour l'administration QDIA Export.*
