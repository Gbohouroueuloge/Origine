import {Link, useNavigate} from 'react-router-dom';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCartStore } from '@/lib/store';
import { toast } from '@/components/ui/sonner';
import { Heart } from 'lucide-react';
import { useAuthStore } from '@/lib/authStore';
import {useEffect, useRef, useState} from "react";


// Données fictives pour les avantages
const features = [
  {
    icon: '🚚',
    title: 'Livraison Rapide',
    description: 'Livraison gratuite dès 10000 FCFA d\'achat, partout en Côte d\'Ivoire.'
  },
  {
    icon: '🔒',
    title: 'Paiement Sécurisé',
    description: 'Vos données sont protégées par un cryptage SSL.'
  },
  {
    icon: '📞',
    title: 'Support 24/7',
    description: 'Notre équipe est disponible pour vous aider.'
  },
];

export default function Index() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const navigate = useNavigate();

  // Cache global pour les catégories et produits (Index)
  const cacheRef = useRef({ categories: null, products: null, lastFetch: 0 });
  useEffect(() => {
    const fetchData = async () => {
      try {
        const now = Date.now();
        if (
          cacheRef.current.categories &&
          cacheRef.current.products &&
          now - cacheRef.current.lastFetch < 60000
        ) {
          setCategories(cacheRef.current.categories);
          setProducts(cacheRef.current.products);
          return;
        }
        const resProducts = await fetch('http://localhost:4000/products');
        if (!resProducts.ok) throw new Error("Erreur lors du chargement des produits.");
        const productsData = await resProducts.json();
        // On stocke le tableau de produits, pas l'objet complet
        setProducts(productsData.products || productsData);
        const resCategories = await fetch('http://localhost:4000/categories');
        if (!resCategories.ok) throw new Error("Erreur lors du chargement des catégories.");
        const categories = await resCategories.json();
        setCategories(categories);

        cacheRef.current.categories = categories;
        cacheRef.current.products = productsData.products || productsData;
        cacheRef.current.lastFetch = now;
      } catch (e) {
        toast("Erreur", { description: e.message || "Erreur lors du chargement des produits ou catégories." });
      }
    };
    fetchData();
  }, []);

  const user = useAuthStore((s) => s.user);
  const [wishlist, setWishlist] = useState([]);
  useEffect(() => {
    if (user) {
      const token = useAuthStore.getState().userToken; // ou une variable équivalente dans ton store
      fetch(`http://localhost:4000/wishlist/${user.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
        .then(res => {
          if (!res.ok) throw new Error("Erreur lors du chargement des favoris.");
          return res.json();
        })
        .then(setWishlist)
        .catch(() => setWishlist([]));
    }
  }, [user]);
  const isInWishlist = (productId) => wishlist.some((p) => p.id === productId);

  // Récupère les produits vedettes depuis l'API
  const [featuredProducts, setFeaturedProducts] = useState([]);
  useEffect(() => {
    fetch('http://localhost:4000/products/featured')
      .then(res => res.json())
      .then(setFeaturedProducts)
      .catch(() => setFeaturedProducts([]));
  }, []);

  // Ajout au panier via API backend
  const handleAddToCart = async (product) => {
    if (!user) {
      navigate('/account');
      return;
    }
    try {
      const token = useAuthStore.getState().userToken;
      const res = await fetch(`http://localhost:4000/cart/${user.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error("Erreur lors de la récupération du panier.");
      const items = await res.json();
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

  return (
    <div className="container mx-auto px-4 py-8">
      {/* En-tête promotionnel */}
      <header className="relative bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl text-white py-20 px-6 sm:px-12 mb-12 overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-30 z-0"></div>
        <div className="relative z-10 text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
            Découvrez nos <br />
            <span className="text-yellow-300">Produits Exceptionnels</span>
          </h1>
          <p className="text-lg opacity-90 max-w-2xl mx-auto mb-8">
            Une sélection premium de produits de qualité, livrés rapidement et en toute sécurité.
          </p>
          <div className="flex justify-center gap-4">
            <Link to="/products">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100">
                Voir tous les produits →
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Avantages de la boutique */}
      <section className="mb-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          {features.map((feature, index) => (
            <div key={index} className="p-6 rounded-lg">
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Catégories de produits */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-center mb-8">Nos Catégories</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6">
          {categories.map((category) => (
            <Link
              key={category.id}
              to={`/products?category=${category.id}`}
              className="group"
            >
              <Card className="flex flex-col items-center justify-center text-center p-4 h-full hover:shadow-lg transition-shadow">
                <div className="text-4xl mb-2">{category.icon}</div>
                <h3 className="font-medium">{category.name}</h3>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Produits vedettes */}
      <section>
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold">Produits Vedettes</h2>
          <p className="text-gray-600 mt-2">
            Découvrez notre sélection de produits les plus populaires, choisis pour leur qualité exceptionnelle.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-6">
        {featuredProducts.map((product) => (
          <Card key={product.id} className="group hover:shadow-lg transition-shadow">
            <CardContent className="p-0">
              <Link to={`/product/${product.id}`}>
                <div className="relative overflow-hidden rounded-t-lg cursor-pointer">
                  <div className="w-full aspect-square rounded-t-lg overflow-hidden bg-white flex items-center justify-center">
                    <img
                      src={product.image}
                      alt={product.name}
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
                      {product.price.toFixed(2)} FCFA
                    </span>
                    {product.originalPrice && (
                      <span className="text-[10px] sm:text-sm text-gray-500 line-through">
                        {product.originalPrice.toFixed(2)} FCFA
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-0">
              <Button
                onClick={() => handleAddToCart(product)}
                disabled={!product.inStock}
                className="w-full text-xs sm:text-base py-1.5 sm:py-3"
              >
                {product.inStock ? 'Ajouter au panier' : 'Indisponible'}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </section>
    </div>
  );
}
