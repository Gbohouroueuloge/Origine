import {useState, useMemo, useRef} from 'react';
import { useQuery } from '@tanstack/react-query';
import {Link, useNavigate, useSearchParams} from 'react-router-dom';
import { Star, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useCartStore, useSearchStore } from '@/lib/store';
import { toast } from '@/components/ui/sonner';
import { Heart } from 'lucide-react';
import { useEffect } from 'react';
import { useAuthStore } from '@/lib/authStore';

export default function Products() {
  const [searchParams] = useSearchParams();
  const categoryFromUrl = searchParams.get('category') || '';
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const {
    searchQuery,
    selectedCategory,
    priceRange,
    setSearchQuery,
    setSelectedCategory,
    setPriceRange,
    resetFilters
  } = useSearchStore();

  const [sortBy, setSortBy] = useState('name');
  const [wishlist, setWishlist] = useState([]);
  useEffect(() => {
    if (user) {
      const token = useAuthStore.getState().userToken; // ou une variable équivalente dans ton store
      fetch(`http://localhost:4000/wishlist/${user.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
        .then(res => res.json())
        .then(setWishlist);
    }
  }, [user]);
  const isInWishlist = (productId) => wishlist.some((p) => p.id === productId);

  // Pagination
  const [page, setPage] = useState(1);

  // Utilise la pagination côté API pour charger moins de données
  const pageSize = 12;
  const { data: productsData, isLoading: loadingProducts, error: productsError } = useQuery({
    queryKey: ['products', page, selectedCategory, searchQuery, priceRange, sortBy],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('pageSize', String(pageSize));
      if (selectedCategory) params.append('category', selectedCategory);
      if (searchQuery) params.append('search', searchQuery);
      if (priceRange && priceRange.length === 2) {
        params.append('minPrice', String(priceRange[0]));
        params.append('maxPrice', String(priceRange[1]));
      }
      if (sortBy) params.append('sortBy', sortBy);
      const res = await fetch(`http://localhost:4000/products?${params.toString()}`);
      if (!res.ok) throw new Error("Erreur lors du chargement des produits.");
      return await res.json();
    }
  });
  const { data: categories, isLoading: loadingCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await fetch('http://localhost:4000/categories');
      if (!res.ok) throw new Error("Erreur lors du chargement des catégories.");
      return await res.json();
    }
  });
  const products = productsData?.products || [];
  const loading = loadingProducts || loadingCategories;
  const totalPages = productsData?.total ? Math.ceil(productsData.total / pageSize) : 1;

  // Valeurs par défaut si le store est vide
  const effectiveSearchQuery = searchQuery ?? '';
  const effectiveSelectedCategory = selectedCategory ?? '';
  const effectivePriceRange = priceRange ?? [0, 10000000];

  // Sauvegarde les filtres en base si connecté
  useEffect(() => {
    if (user) {
      const token = useAuthStore.getState().userToken; // ou une variable équivalente dans ton store
      fetch(`http://localhost:4000/users/${user.id}/preferences`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          filters: {
            searchQuery,
            selectedCategory,
            priceRange,
            sortBy
          }
        })
      });
    }
    // eslint-disable-next-line
  }, [searchQuery, selectedCategory, priceRange, sortBy, user]);

  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);

  // Initialiser la catégorie depuis l'URL ou les préférences utilisateur
  useEffect(() => {
    if (categoryFromUrl && categoryFromUrl !== selectedCategory) {
      setSelectedCategory(categoryFromUrl);
    } else if (user) {
      // Charge les préférences utilisateur
      const token = useAuthStore.getState().userToken; // ou une variable équivalente dans ton store
      fetch(`http://localhost:4000/users/${user.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
        .then(res => res.json())
        .then(data => {
          if (data.filters) {
            if (data.filters.searchQuery) setSearchQuery(data.filters.searchQuery);
            if (data.filters.selectedCategory) setSelectedCategory(data.filters.selectedCategory);
            if (data.filters.priceRange) setPriceRange(data.filters.priceRange);
            if (data.filters.sortBy) setSortBy(data.filters.sortBy);
          }
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryFromUrl, user]);

  // Pour l'autocomplétion, on filtre côté front sur la page courante
  const filteredAndSortedProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch =
        product.name.toLowerCase().includes(localSearchQuery.toLowerCase()) ||
        product.description.toLowerCase().includes(localSearchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [products, localSearchQuery]);
  const paginatedProducts = products;

  // Ajout au panier via API backend
  const handleAddToCart = async (product) => {
    if (!user) {
      navigate('/account');
      return;
    }
    try {
      // Récupère le panier actuel
      const token = useAuthStore.getState().userToken;
      const res = await fetch(`http://localhost:4000/cart/${user.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error("Erreur lors de la récupération du panier.");
      const items = await res.json();
      // Cherche si le produit est déjà dans le panier
      const existing = items.find((item) => item.product.id === product.id);
      let newItems;
      if (existing) {
        newItems = items.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        newItems = [...items, { product, quantity: 1 }];
      }
      // Met à jour le panier côté backend
      const res2 = await fetch(`http://localhost:4000/cart/${user.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ items: newItems })
      });
      if (!res2.ok) throw new Error("Erreur lors de la mise à jour du panier.");
      if (window.refreshCartCount) window.refreshCartCount();
      toast("Ajouté au panier", { description: product.name });
    } catch (e) {
      toast("Erreur", { description: e.message || "Erreur lors de l'ajout au panier." });
    }
  };

  const handleWishlist = async (product) => {
    if (!user) {
      navigate('/account');
      return;
    }
    try {
      let newWishlist;
      if (isInWishlist(product.id)) {
        newWishlist = wishlist.filter((p) => p.id !== product.id);
        toast("Retiré des favoris", { description: product.name });
      } else {
        newWishlist = [...wishlist, { ...product, categoryId: product.categoryId || product.category }];
        toast("Ajouté aux favoris", { description: product.name });
      }
      setWishlist(newWishlist);
      const token = useAuthStore.getState().userToken; // ou une variable équivalente dans ton store
      const res = await fetch(`http://localhost:4000/wishlist/${user.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ items: newWishlist })
      });
      if (!res.ok) throw new Error("Erreur lors de la mise à jour des favoris.");
      if (window.refreshWishlistCount) window.refreshWishlistCount();
    } catch (e) {
      toast("Erreur", { description: e.message || "Erreur lors de la mise à jour des favoris." });
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(localSearchQuery);
  };

  const clearFilters = () => {
    resetFilters();
    setLocalSearchQuery('');
    setSortBy('name');
  };

  const FilterContent = () => (
    <div className="space-y-6">
      {/* Recherche */}
      <div>
        <label className="text-sm font-medium mb-2 block">Recherche</label>
        <form onSubmit={handleSearchSubmit} className="flex gap-2 relative">
          <Input
              type="text"
              placeholder="Rechercher..."
              value={localSearchQuery}
              onChange={(e) => setLocalSearchQuery(e.target.value)}
              autoComplete="off"
          />
          <Button type="submit" size="sm">OK</Button>
          {localSearchQuery.length > 0 && (
            <ul className="absolute z-10 top-full left-0 w-full bg-white border rounded shadow mt-1 max-h-40 overflow-auto">
              {filteredAndSortedProducts
                .slice(0, 5)
                .map(p => (
                  <li
                    key={p.id}
                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                    onMouseDown={() => {
                      setLocalSearchQuery(p.name);
                      setSearchQuery(p.name);
                    }}
                  >
                    {p.name}
                  </li>
                ))}
            </ul>
          )}
        </form>
      </div>

      {/* Catégories */}
      <div>
        <label className="text-sm font-medium mb-2 block">Catégorie</label>
        <Select value={selectedCategory || "all"} onValueChange={value => setSelectedCategory(value === "all" ? "" : value)}>
          <SelectTrigger>
            <SelectValue placeholder="Toutes les catégories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les catégories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.icon} {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Prix */}
      <div>
        <label className="text-sm font-medium mb-2 block">
          Prix: {priceRange[0]} F - {priceRange[1]} FCFA
        </label>
        <Slider
          value={priceRange}
          onValueChange={(value) => setPriceRange(value as [number, number])}
          max={10000000}
          min={0}
          step={10}
          className="mt-2"
        />
      </div>

      {/* Tri */}
      <div>
        <label className="text-sm font-medium mb-2 block">Trier par</label>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Nom (A-Z)</SelectItem>
            <SelectItem value="price-low">Prix croissant</SelectItem>
            <SelectItem value="price-high">Prix décroissant</SelectItem>
            <SelectItem value="rating">Meilleures notes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button onClick={clearFilters} variant="outline" className="w-full">
        <X className="h-4 w-4 mr-2" />
        Effacer les filtres
      </Button>
    </div>
  );

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold">Chargement des produits...</h1>
      </div>
    );
  }
  if (productsError) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold text-red-600">Erreur lors du chargement des produits</h1>
        <p className="text-gray-500">{String(productsError)}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Filtres Desktop */}
        <aside className="hidden lg:block w-64 space-y-6">
          <div className="sticky top-24">
            <h2 className="text-lg font-semibold mb-4">Filtres</h2>
            <FilterContent />
          </div>
        </aside>

        {/* Contenu principal */}
        <main className="flex-1">
          {/* Header avec filtres mobiles */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">
                {selectedCategory
                  ? categories.find(c => c.id === selectedCategory)?.name || 'Produits'
                  : 'Tous les produits'
                }
              </h1>
              <p className="text-gray-600 mt-1">
                {productsData?.total || products.length} produit{(productsData?.total || products.length) !== 1 ? 's' : ''} trouvé{(productsData?.total || products.length) !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Filtres mobiles */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="lg:hidden">
                  <Filter className="h-4 w-4 mr-2" />
                  Filtres
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80">
                <SheetHeader>
                  <SheetTitle>Filtres</SheetTitle>
                </SheetHeader>
                <div className="mt-6">
                  <FilterContent />
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Grille de produits */}
          {products.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg mb-4">Aucun produit trouvé</p>
              <Button onClick={clearFilters} variant="outline">
                Effacer les filtres
              </Button>
              <div className="mt-4">
                <Button onClick={() => navigate('/')} variant="link">
                  Retour à l'accueil
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-6">
                {paginatedProducts.map((product) => (
                  <Card key={product.id} className="group hover:shadow-lg transition-shadow">
                    <CardContent className="p-0">
                      <Link to={`/product/${product.id}`}>
                        <div className="relative overflow-hidden rounded-t-lg cursor-pointer">
                          <div className="w-full aspect-square rounded-t-lg overflow-hidden bg-white flex items-center justify-center">
                            <img
                              src={product.image}
                              alt={product.name}
                              loading="lazy"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                          {product.originalPrice && product.originalPrice > product.price && (
                            <Badge className="absolute top-1 left-1 bg-red-500 text-[10px] sm:top-2 sm:left-2 sm:text-sm">
                              -{Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}%
                            </Badge>
                          )}
                          {!product.inStock && (
                            <Badge variant="secondary" className="absolute top-1 right-1 text-[10px] sm:top-2 sm:right-2 sm:text-sm">
                              Rupture de stock
                            </Badge>
                          )}
                          {product.inStock && product.stock !== undefined && product.stock <= 3 && product.stock > 0 && (
                            <Badge variant="destructive" className="absolute bottom-1 left-1 bg-yellow-400 text-black text-[10px] sm:bottom-2 sm:left-2 sm:text-sm">
                              Bientôt épuisé
                            </Badge>
                          )}
                        </div>
                      </Link>

                      <div className="p-1 sm:p-4 flex flex-col gap-1 sm:gap-2">
                        <div className="flex justify-between items-center">
                          <Link to={`/product/${product.id}`}>
                            <h3 className="font-semibold mb-1 sm:mb-2 hover:text-primary transition-colors line-clamp-2 text-[11px] sm:text-base">
                              {product.name}
                            </h3>
                          </Link>
                          <button
                            aria-label={isInWishlist(product.id) ? "Retirer des favoris" : "Ajouter aux favoris"}
                            onClick={() => handleWishlist(product)}
                            className={`ml-2 p-0.5 sm:p-1 rounded-full border ${isInWishlist(product.id) ? 'bg-red-100 text-red-500' : 'hover:bg-gray-100 text-gray-400'}`}
                          >
                            <Heart fill={isInWishlist(product.id) ? "#ef4444" : "none"} className="h-3 w-3 sm:h-5 sm:w-5" />
                          </button>
                        </div>

                        <div className="flex items-center mb-1 sm:mb-2">
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-2.5 w-2.5 sm:h-4 sm:w-4 ${
                                  i < Math.floor(product.rating)
                                    ? 'text-yellow-400 fill-current'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-[10px] sm:text-sm text-gray-600 ml-1 sm:ml-2">
                            ({product.reviews})
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-0.5 sm:space-x-2">
                            <span className="text-xs sm:text-lg font-bold text-primary">
                              {product.price.toFixed(2)} F
                            </span>
                            {product.originalPrice && (
                              <span className="text-[10px] sm:text-sm text-gray-500 line-through">
                                {product.originalPrice.toFixed(2)} F
                              </span>
                            )}
                            <span className="text-[10px] sm:text-xs text-gray-500 ml-1 sm:ml-2">Stock: {product.stock}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>

                    <CardFooter className="pt-0">
                      <Button
                        onClick={() => handleAddToCart(product)}
                        disabled={!product.inStock}
                        className="w-full text-xs sm:text-base py-1.5 sm:py-3"
                        aria-disabled={!product.inStock}
                        aria-label={product.inStock ? "Ajouter au panier" : "Indisponible"}
                        tabIndex={0}
                      >
                        {product.inStock ? 'Ajouter au panier' : 'Indisponible'}
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center mt-8 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Précédent
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => (
                    <Button
                      key={i + 1}
                      size="sm"
                      variant={page === i + 1 ? "default" : "outline"}
                      onClick={() => setPage(i + 1)}
                    >
                      {i + 1}
                    </Button>
                  ))}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Suivant
                  </Button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}