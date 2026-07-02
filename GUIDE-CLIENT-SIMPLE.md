# Guide simple — QDIA Export (pour le client)

**Pour qui :** toute personne qui teste ou utilise la plateforme, sans connaissances techniques.

---

## 1. Ouvrir le site

1. Demandez à votre développeur de **lancer le site** (ou ouvrez l’adresse qu’il vous donne).
2. En test sur l’ordinateur du développeur, l’adresse est souvent :
   - **http://localhost:25180**
3. Ouvrez cette adresse dans **Chrome** ou **Edge**.

---

## 2. Se connecter (3 façons)

### Option A — La plus simple (recommandée pour tester tout de suite)

1. Cliquez sur **Connexion** / **Se connecter**.
2. Choisissez l’onglet **Email**.
3. Entrez :
   - **Email :** `supplier@qdiadz.com`
   - **Mot de passe :** `demo1234`
4. Cliquez **Connexion**.

✅ Vous êtes connecté. Vous pouvez tester tout le site.

---

### Option B — Connexion avec Google (Gmail)

Si vous voyez l’erreur **« origin_mismatch »** ou **« l’appli ne respecte pas OAuth »**, ce n’est **pas un bug du site** : il faut **une configuration chez Google** (une seule fois).

**Étapes pour le responsable technique ou le client qui a accès à Google :**

1. Allez sur : https://console.cloud.google.com/apis/credentials  
2. Choisissez le projet **qdia-dz**.
3. Cliquez sur l’**ID client OAuth** (celui utilisé par QDIA).
4. Dans **« Origines JavaScript autorisées »**, cliquez **+ Ajouter un URI** et mettez **exactement** :
   ```
   http://localhost:25180
   ```
   (Si le site est en ligne plus tard, ajoutez aussi : `https://votre-domaine.com`)
5. Cliquez **Enregistrer**.
6. Allez dans **Écran de consentement OAuth** → **Utilisateurs test** → ajoutez l’email Gmail du client, par exemple :
   ```
   benaboudroqia03@gmail.com
   ```
7. Attendez **3 à 5 minutes**, puis sur le site : **Ctrl + Shift + R** (rafraîchir).
8. Retournez sur **Connexion** → onglet **Gmail** → bouton **Continuer avec Google**.

---

### Option C — Téléphone (SMS)

1. Onglet **Téléphone**.
2. Entrez un numéro algérien.
3. En mode test, le code peut être affiché par le développeur (ex. `123456`).

---

## 3. Que tester sur le site (checklist client)

Cochez au fur et à mesure :

| # | Action | Résultat attendu |
|---|--------|------------------|
| 1 | Page d’accueil | Le site s’affiche |
| 2 | **Catalogue** | Liste de produits visible |
| 3 | **Recherche** (ex. « huile », « épicerie ») | Des produits apparaissent |
| 4 | **Fiche produit** | Prix, description, fournisseur |
| 5 | **Agent IA** | Décrire un produit → fiche générée |
| 6 | **Calcul prix** | Prix en DZD, USD, EUR, AED |
| 7 | **Publier un produit** (si connecté) | Message de succès |
| 8 | **Panier / Devis** | Ajout possible |

---

## 4. L’IA — qu’est-ce qu’elle fait ? (en langage simple)

L’**intelligence artificielle** aide à vendre à l’export **sans tout taper à la main**.

| Ce que vous faites | Ce que l’IA fait pour vous |
|--------------------|----------------------------|
| Vous écrivez : « Huile d’olive de Béjaïa » | Elle écrit la **fiche produit** (nom, description en français, anglais, arabe) |
| Vous mettez un **coût** en dinars | Elle calcule les **prix d’export** (EXW, FOB, CFR, CIF) en plusieurs devises |
| Vous uploadez une **photo** | Elle **lit la photo** pour mieux décrire le produit |
| Vous avez **19 000 produits** sans photos | Elle peut **enrichir** texte et prix par lots (les vraies photos IA demandent un compte payant OpenAI) |

**Ce que l’IA ne fait pas encore seule :**
- Publier le site sur Internet (hébergement à prévoir).
- Générer toutes les photos si le compte OpenAI n’est pas rechargé.

---

## 5. Application mobile

- Même compte que le site.
- **Recherche**, **catégories**, **scanner** code-barres / QR.
- **Agent IA** et **espace exportateur** (tableau de bord, import catalogue).

L’adresse de l’API doit être configurée par le développeur sur le téléphone (même réseau Wi‑Fi que le PC en test).

---

## 6. Ce qu’il reste avant la mise en ligne « vraie »

| Étape | Qui | Statut |
|-------|-----|--------|
| Site fonctionne en local | Développeur | ✅ Fait |
| Connexion email test | Client | ✅ Peut tester |
| Connexion Google | Client + Google Cloud | ⚠️ À configurer (origines + utilisateur test) |
| Nom de domaine (ex. qdiadz.com) | Client | À acheter |
| Hébergement (serveur) | Client | À choisir |
| Photos IA pour tout le catalogue | Client (crédit OpenAI) | En attente |

---

## 7. En cas de problème

| Problème | Solution rapide |
|----------|-----------------|
| Google ne connecte pas | Utiliser **Email** : `supplier@qdiadz.com` / `demo1234` |
| Erreur `origin_mismatch` | Ajouter `http://localhost:25180` dans Google Cloud (section 2B) |
| Pas de produits | Vérifier que la base de données est lancée (développeur) |
| Photos grises « QDIA Photo » | Normal tant que les photos IA ne sont pas générées |

---

## 8. Contact développeur

Pour la mise en ligne, Google Cloud, ou l’import des 19 723 produits : contactez votre équipe technique QDIA.

---

*Document préparé pour le client QDIA Export — version simple.*
