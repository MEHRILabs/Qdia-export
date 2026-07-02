# Rapport — Plateforme QDIA Export

**Destinataire :** Administration / Client
**Date :** 25 juin 2026
**Langage :** simple, sans termes techniques

---

## 1. C'est quoi le projet ?

QDIA Export est une **plateforme de commerce d'exportation** pour les produits algériens. Elle se compose de **3 parties** qui fonctionnent ensemble :

1. **Le site web** — où les acheteurs (clients étrangers) parcourent les produits, demandent des devis et passent commande.
2. **L'application mobile** — la même chose, mais sur téléphone (Android / iPhone).
3. **L'espace administration** — où vous gérez les produits, les prix, les commandes et les clients.

Le tout est relié à une **grande base de données** qui contient aujourd'hui **19 723 produits**.

---

## 2. Ce qui est DÉJÀ FAIT et fonctionne

### Le catalogue de produits
- Les **19 723 produits** ont été importés depuis votre fichier Excel.
- Chaque produit a été **rangé automatiquement dans la bonne catégorie** (Épicerie, Hygiène, Boissons, Papeterie, etc.).
- Comme votre fichier Excel **n'avait pas de prix**, le système **calcule les prix d'export automatiquement** (prix usine, prix port, prix avec transport et assurance) selon le poids et le type de produit.

### La recherche et les filtres
- L'acheteur peut **chercher un produit** par son nom, sa catégorie ou son code.
- Il peut **filtrer** par catégorie, par prix, par quantité minimum, par région d'origine, etc.
- La recherche est **rapide et instantanée** pendant qu'on tape.

### Le scanner (mobile)
- Sur le téléphone, on peut **scanner le code-barres ou le QR code** d'un produit pour l'afficher directement.
- Fonctionne avec les codes-barres classiques, les références produit et les QR codes.

### Les catégories
- Les vraies catégories de votre base sont affichées, avec le **nombre de produits** dans chacune.

### Les fonctions de vente
- Demandes de devis, panier, commandes, messagerie entre acheteur et vendeur, suivi de livraison, facturation — **tout est en place**.

### Application mobile
- Toutes les nouveautés du site ont été **ajoutées aussi sur l'application mobile** : recherche, filtres, catégories, scanner, et un espace pour l'exportateur (tableau de bord, import de catalogue, enrichissement des produits).

---

## 3. Ce qu'il RESTE À FAIRE

### A. Les photos des produits ⚠️ (point important)
- Pour l'instant, les produits affichent une **image « QDIA Photo » provisoire** (un cadre gris), pas de vraies photos.
- Le système peut **générer les photos automatiquement par intelligence artificielle**, MAIS le compte qui fournit ce service (OpenAI) **n'a plus de crédit**.
- **Action nécessaire :** recharger ce compte (paiement) OU fournir une autre clé valide. Une fois fait, les photos se généreront toutes seules.

### B. La mise en ligne (hébergement)
Aujourd'hui, tout fonctionne **sur l'ordinateur de développement uniquement**. Pour que le site soit accessible publiquement sur Internet (par exemple `qdiadz.com`), il faut :

1. **Louer un hébergement** (un espace sur Internet) pour le site, l'application et la base de données.
2. **Acheter le nom de domaine** (l'adresse `qdiadz.com`) et activer le « cadenas de sécurité » (HTTPS).
3. **Brancher le tout** sur cet hébergement.

> C'est une étape qui demande de **choisir un fournisseur** (il y a plusieurs options selon le budget) et de **payer un abonnement mensuel** (hébergement + domaine).

### C. Publication de l'application mobile
- Pour que les clients puissent télécharger l'app, il faut la **publier sur Google Play (Android) et l'App Store (Apple)**.
- Cela nécessite des **comptes développeur** (Google : ~25 $ une fois ; Apple : ~99 $ par an).

### D. Petits réglages techniques restants
- Quelques services optionnels à activer **si vous les voulez** : envoi d'e-mails automatiques, SMS de vérification, paiement par carte (Stripe).
- Quelques corrections internes pour un fonctionnement 100 % propre en production.

---

## 4. Résumé en une phrase

> **La plateforme est construite et fonctionne.** Il reste principalement **3 décisions/actions de votre côté** : (1) recharger le service de photos, (2) choisir et payer un hébergement + nom de domaine, (3) ouvrir les comptes pour publier l'application mobile.

---

## 5. Prochaine étape recommandée

1. **Décider du budget** pour l'hébergement et le nom de domaine.
2. **Recharger le service de photos** pour avoir de vraies images.
3. Une fois ces choix faits, la mise en ligne peut être réalisée **rapidement**.

---

*Pour toute question sur ce rapport, je reste disponible.*
