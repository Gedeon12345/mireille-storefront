# Torque — Back-end (Node.js · Express · MongoDB)

API de la boutique de pièces automobiles. Projet séparé du front-end (`torque-frontend`).

## Démarrer

Prérequis : Node.js 22 ou plus, et une base MongoDB (Atlas gratuit ou locale).

```bash
npm install
cp .env.example .env      # puis renseignez MONGODB_URI et JWT_SECRET (voir plus bas)
npm run seed              # charge les 8 catégories et 13 produits de démonstration
npm run dev               # http://localhost:4000/api/health
npm test                  # tests unitaires (sans base de données)
```

### MongoDB Atlas en 5 minutes

1. Créez un cluster gratuit (M0) sur mongodb.com/atlas.
2. *Database Access* : créez un utilisateur avec un mot de passe (évitez les caractères spéciaux).
3. *Network Access* : autorisez votre IP (ou `0.0.0.0/0` pour tester).
4. *Connect → Drivers* : copiez l'URI dans `.env` (`MONGODB_URI`), en ajoutant `/torque` avant le `?`.

Les commandes (voir plus bas) utilisent des transactions, qui exigent un MongoDB en *replica set* :
c'est le cas d'Atlas, y compris le plan gratuit. Un MongoDB installé localement sans replica set
ne les supportera pas.

## Routes

### Catalogue (public)

| Méthode | Route | Description |
| --- | --- | --- |
| GET | `/api/health` | État de l'API et de la base |
| GET | `/api/categories` | Catégories + nombre de produits |
| GET | `/api/categories/:slug` | Une catégorie |
| GET | `/api/products` | Liste filtrable et paginée |
| GET | `/api/products/:idOrSlug` | Fiche produit (id Mongo ou slug) |
| GET | `/api/products/:idOrSlug/related` | Produits de la même catégorie |

Paramètres de `GET /api/products` :

| Paramètre | Exemple | Rôle |
| --- | --- | --- |
| `q` | `plaquettes corolla` | Tous les mots doivent correspondre (sans accents ni casse) |
| `category` | `freinage` | Slug de catégorie |
| `brand` | `Peugeot` | Marque du véhicule (inclut les pièces universelles) |
| `sort` | `price-asc` · `price-desc` · `rating` · `relevance` | Tri |
| `page`, `limit` | `2`, `12` | Pagination (limit max 48) |

Réponse : `{ "data": [...], "meta": { "page", "limit", "total", "totalPages" } }`.
Erreur : `{ "error": { "message": "...", "details": [...] } }`.

```bash
curl "http://localhost:4000/api/products?category=freinage&sort=price-asc"
```

Les montants sont en **centimes d'euro** (`priceCents: 5490` = 54,90 €). Le stock exact n'apparaît
que côté administration ; le catalogue public montre seulement `stockStatus`
(`in-stock`, `low-stock`, `out-of-stock`) et `discountPercent`.

### Comptes

| Méthode | Route | Corps JSON | Description |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | `email`, `password`, `firstName`, `lastName`, `phone?` | Crée un compte, renvoie `{ user, token }` (201) |
| POST | `/api/auth/login` | `email`, `password` | Renvoie `{ user, token }` |
| GET | `/api/auth/me` | — | Profil (jeton requis) |
| PATCH | `/api/auth/me` | `firstName?`, `lastName?`, `phone?` | Modifie le profil |
| PATCH | `/api/auth/password` | `currentPassword`, `newPassword` | Change le mot de passe, renvoie un nouveau jeton |

Les routes protégées attendent l'en-tête `Authorization: Bearer <token>`.

Exemple PowerShell :

```powershell
$body = @{ email = "test@example.com"; password = "MotDePasse123"; firstName = "Test"; lastName = "Client" } | ConvertTo-Json
$res = Invoke-RestMethod -Method Post -Uri http://localhost:4000/api/auth/register -ContentType "application/json" -Body $body
Invoke-RestMethod -Uri http://localhost:4000/api/auth/me -Headers @{ Authorization = "Bearer $($res.data.token)" }
```

### Sécurité des comptes

- Mots de passe hachés avec **scrypt** (intégré à Node), sel aléatoire, jamais renvoyés par l'API. Minimum 8 caractères.
- Jeton **JWT signé HS256**, valable `JWT_EXPIRES_IN` (7 jours par défaut). Il ne contient que l'identifiant : le rôle et l'état du compte sont relus en base à chaque requête.
- Changer de mot de passe invalide tous les anciens jetons.
- Connexion : message identique pour un e-mail inconnu et un mauvais mot de passe, temps de réponse comparable, et 20 échecs maximum par IP et par 15 minutes.
- Le rôle (`customer` / `admin`) ne peut pas être choisi à l'inscription.
- Déconnexion = le front-end oublie le jeton (pas de liste noire côté serveur).
- Pas encore de « mot de passe oublié » : il demande l'envoi d'e-mails, à prévoir plus tard.

### Commandes — compte obligatoire

Le catalogue est consultable sans compte (site vitrine). Les 4 routes suivantes exigent
`Authorization: Bearer <jeton>` — sans compte, impossible de commander.

| Méthode | Route | Description |
| --- | --- | --- |
| POST | `/api/orders` | Crée une commande (201) |
| GET | `/api/orders` | Mes commandes, de la plus récente à la plus ancienne (`page`, `limit`) |
| GET | `/api/orders/:idOrNumber` | Une de mes commandes (identifiant ou numéro `TQ-20260921-K7M2X`) |
| POST | `/api/orders/:idOrNumber/cancel` | Annule ma commande si elle est « en attente » |

Corps de `POST /api/orders` :

```json
{
  "items": [{ "productId": "<id du produit>", "quantity": 2 }],
  "shippingAddress": {
    "fullName": "Jean Dupont", "phone": "+33 6 00 00 00 00",
    "line1": "12 rue des Lilas", "city": "Lyon", "country": "France"
  },
  "note": "Sonner deux fois"
}
```

Règles appliquées par le serveur :

- Les **prix viennent de la base**, jamais du client. Seuls l'identifiant et la quantité du produit sont lus.
- Les lignes du même produit sont fusionnées (99 maximum par produit).
- Le **stock est décrémenté de façon atomique** dans une transaction : si un seul produit manque, rien n'est débité
  et l'API répond `409` avec le détail (`requested` / `available`).
- Chaque ligne garde une **copie** du nom, de la référence et du prix au moment de l'achat.
- Total = sous-total + frais de livraison fixes (`SHIPPING_FEE_CENTS`, 0 par défaut).
- Statuts : `pending` → `confirmed` → `shipped` → `delivered`, ou `cancelled`. L'historique est dans `statusHistory`.
  Le client ne peut annuler que tant que la commande est `pending` ; le stock est alors restitué.
- Une commande d'un autre client répond `404`, pas `403` (on ne révèle pas qu'elle existe).
- Pas de paiement en ligne pour l'instant : la commande est simplement enregistrée.

### Administration — rôle admin obligatoire

Tout `/api/admin/*` exige `Authorization: Bearer <jeton>` **et** un compte avec le rôle `admin`.
Un client normal reçoit `403`.

**Créer le premier administrateur** (aucune route ne le permet, pour qu'un client ne puisse pas se l'attribuer) :

```bash
# 1. Inscrivez-vous normalement via POST /api/auth/register
# 2. Donnez-vous le rôle admin :
npm run make-admin -- votre@email.com
# Pour le retirer :
npm run make-admin -- votre@email.com --revoke
```

| Méthode | Route | Description |
| --- | --- | --- |
| GET | `/api/admin/stats` | Tableau de bord : commandes par statut, chiffre d'affaires, stock bas |
| GET | `/api/admin/products` | Produits, **y compris archivés** (`q`, `category`, `status`, `stock=low`) |
| POST | `/api/admin/products` | Crée un produit |
| GET / PATCH | `/api/admin/products/:id` | Consulte / modifie un produit |
| DELETE | `/api/admin/products/:id` | **Archive** le produit (`isActive: false`) ; aucune suppression définitive |
| POST | `/api/admin/categories` | Crée une catégorie |
| PATCH | `/api/admin/categories/:slug` | Modifie une catégorie |
| DELETE | `/api/admin/categories/:slug` | Supprime une catégorie vide (refusé si des produits y sont encore rattachés) |
| GET | `/api/admin/orders` | Toutes les commandes (`status`, `q` = numéro ou e-mail du client) |
| GET | `/api/admin/orders/:idOrNumber` | Détail d'une commande |
| PATCH | `/api/admin/orders/:idOrNumber/status` | Change le statut (`status`, `note?`) selon les transitions autorisées |
| GET | `/api/admin/users` | Liste des comptes (`q`, `role`) |
| PATCH | `/api/admin/users/:id/status` | Active / désactive un compte (coupe son accès aussitôt) |

**Transitions de statut autorisées :** `pending → confirmed | cancelled`, `confirmed → shipped | cancelled`,
`shipped → delivered`. `delivered` et `cancelled` sont définitifs. Toute autre transition est refusée (409).
Annuler restitue le stock des articles concernés.

**Autres règles :**
- "Supprimer" un produit l'**archive** plutôt que de l'effacer : l'historique des commandes reste exact.
  Pour le réactiver : `PATCH /api/admin/products/:id` avec `{ "isActive": true }`.
- Le stock exact (`stockQuantity`) n'apparaît **que** sur les routes `/api/admin/*` ; le catalogue public ne
  montre que `stockStatus` (en stock / stock limité / épuisé), sans le chiffre précis.
- Un administrateur ne peut pas désactiver son propre compte par erreur.

## Structure

```
src/
├── config/        env (validation du .env) · db
├── models/        Category · Product · User · Order
├── routes/        une route = un fichier (admin/ regroupe les routes réservées au rôle admin)
├── controllers/   logique de chaque route (admin/ : produits, catégories, commandes, utilisateurs, stats)
├── services/      catalogQuery · token (JWT) · authRules · orderRules · orderService
├── validators/    schémas zod des paramètres
├── middleware/    validate · requireAuth · requireRole · rateLimiters · notFound · errorHandler
├── utils/         ApiError · password · text · stock · serializers
├── seed/          seed.js + data/*.json
├── scripts/       make-admin.js
├── app.js         application Express (helmet, cors, limitation de débit)
└── server.js      connexion à la base + démarrage
```

## Déploiement

Vercel convient au front-end, pas à ce serveur Express connecté en continu à MongoDB.
Utilisez plutôt Render, Railway ou Fly.io : commande `npm start`, variables d'environnement du `.env.example`,
`TRUST_PROXY=true`, et `CORS_ORIGINS` avec l'URL Vercel du front-end.

## Feuille de route

- [x] B1 : fondations, modèles, catalogue en lecture, seed, sécurité de base
- [x] B2 : comptes clients (inscription, connexion, JWT, mots de passe hachés)
- [x] B3 : commandes (prix recalculés côté serveur, stock atomique, annulation)
- [x] B4 : administration (produits, catégories, commandes, utilisateurs, stats) protégée par rôle
- [ ] B5 : branchement du front-end sur l'API (remplacement des données mockées, pages connexion/inscription/mes commandes)
