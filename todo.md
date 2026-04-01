# Site E-commerce - Plan de développement MVP

## Fonctionnalités principales à implémenter :
1. **Page d'accueil** avec produits vedettes
2. **Catalogue de produits** avec filtres et recherche
3. **Page détail produit** avec images et description
4. **Panier d'achat** avec gestion des quantités
5. **Processus de commande** simplifié
6. **Navigation** et layout responsive

## Fichiers à créer/modifier :

### 1. **src/pages/Index.tsx** - Page d'accueil
- Hero section avec bannière
- Produits vedettes
- Catégories principales

### 2. **src/pages/Products.tsx** - Catalogue produits
- Liste des produits avec grille responsive
- Filtres par catégorie et prix
- Barre de recherche

### 3. **src/pages/ProductDetail.tsx** - Détail produit
- Images du produit
- Description complète
- Bouton ajout au panier
- Quantité sélectionnable

### 4. **src/components/Cart.tsx** - Panier d'achat
- Liste des articles
- Modification quantités
- Total et sous-total
- Bouton commande

### 5. **src/components/Header.tsx** - Navigation
- Logo et menu
- Icône panier avec compteur
- Barre de recherche

### 6. **src/lib/store.ts** - Gestion d'état
- Store pour produits
- Store pour panier
- Fonctions CRUD

### 7. **src/data/products.ts** - Données produits
- Liste des produits avec images
- Catégories et prix

### 8. **src/App.tsx** - Routing mis à jour
- Routes pour toutes les pages
- Layout avec header

## Technologies utilisées :
- React + TypeScript
- Shadcn/ui pour les composants
- Tailwind CSS pour le styling
- React Router pour la navigation
- LocalStorage pour la persistance