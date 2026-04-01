import {useEffect, useRef, useState} from 'react';
import {useParams, Link, useNavigate} from 'react-router-dom';
import { Star, ShoppingCart, Minus, Plus, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { useAuthStore } from '@/lib/authStore';

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const [quantity, setQuantity] = useState(1);
  const user = useAuthStore((s) => s.user);
  const [product, setProduct] = useState(null);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState('');
  const navigate = useNavigate();

  // Gestion des favoris backend
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

  const handleWishlist = async (product) => {
    if (!user) {
      navigate('/account');
      return;
    }
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
    await fetch(`http://localhost:4000/wishlist/${user.id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ items: newWishlist })
    });
    if (window.refreshWishlistCount) window.refreshWishlistCount();
  };

  useEffect(() => {
    setLoading(true);
    fetch(`http://localhost:4000/products/${id}`)
      .then(res => {
        if (!res.ok) throw new Error("Erreur lors du chargement du produit.");
        return res.json();
      })
      .then(data => {
        if (data && !data.error) setProduct(data);
        else setProduct(undefined);
        setLoading(false);
      })
      .catch(() => {
        setProduct(undefined);
        setLoading(false);
      });
  }, [id]);

  // Cache global pour les produits (ProductDetail)
  const cacheRef = useRef({ products: null, lastFetch: 0 });
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const now = Date.now();
        if (
          cacheRef.current.products &&
          now - cacheRef.current.lastFetch < 60000
        ) {
          setAllProducts(cacheRef.current.products);
          return;
        }
        const res = await fetch('http://localhost:4000/products');
        if (!res.ok) throw new Error("Erreur lors du chargement des produits similaires.");
        const productsData = await res.json();
        setAllProducts(productsData.products || productsData);
        cacheRef.current.products = productsData.products || productsData;
        cacheRef.current.lastFetch = now;
      } catch {
        setAllProducts([]);
      }
    };
    fetchAll();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold">Chargement...</h1>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-3xl font-bold text-red-500">Produit non trouvé</h1>
        <p className="mt-4 text-gray-600">Le produit que vous recherchez n'existe pas.</p>
        <Link to="/products">
          <Button className="mt-6">Retourner à la boutique</Button>
        </Link>
      </div>
    );
  }

  const similarProducts = allProducts.filter(
    (p) => p.categoryId === product.categoryId && p.id !== product.id
  ).slice(0, 4);

  const handleAddToCart = async () => {
    if (!user) {
      toast("Connexion requise", { description: "Connectez-vous pour ajouter au panier." });
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
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        newItems = [...items, { product, quantity }];
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

  // Ajout d'un avis
  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setReviewError('');
    setReviewSuccess('');
    if (!user) {
      setReviewError("Vous devez être connecté pour laisser un avis.");
      return;
    }
    if (!reviewText.trim()) {
      setReviewError("Le commentaire ne peut pas être vide.");
      return;
    }
    try {
      const res = await fetch('http://localhost:4000/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          userId: user.id,
          rating: reviewRating,
          text: reviewText
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setReviewError(data.error || "Erreur lors de l'ajout de l'avis.");
        return;
      }
      setReviewText('');
      setReviewRating(5);
      setReviewSuccess("Merci pour votre avis !");
      // Recharge le produit pour voir l'avis ajouté
      fetch(`http://localhost:4000/products/${product.id}`)
        .then(res => res.json())
        .then(setProduct);
    } catch (e) {
      setReviewError(e.message || "Erreur lors de l'ajout de l'avis.");
    }
  };


  return (
    <div className="container mx-auto px-4 py-8">
      {/* Fil d'Ariane */}
      <nav className="text-sm text-gray-500 mb-6">
        <ol className="list-none p-0 inline-flex">
          <li className="flex items-center">
            <Link to="/" className="text-blue-600 hover:underline">
              Accueil
            </Link>
            <span className="mx-2">/</span>
          </li>
          <li className="flex items-center">
            <Link to="/products" className="text-blue-600 hover:underline">
              Produits
            </Link>
            <span className="mx-2">/</span>
          </li>
          <li className="text-gray-800 font-semibold">{product.name}</li>
        </ol>
      </nav>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Image du produit */}
        <div className="lg:w-1/2">
          <div className="w-full aspect-square rounded-xl shadow-lg overflow-hidden bg-white flex items-center justify-center">
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Détails du produit */}
        <div className="lg:w-1/2">
          <div className="space-y-4">
            <h1 className="text-3xl font-bold">{product.name}</h1>
            <div className="flex items-center space-x-2">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-5 w-5 ${
                      i < Math.floor(product.rating)
                        ? 'text-yellow-400 fill-current'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-gray-600">
                {product.rating.toFixed(1)}/5 ({product.reviews} avis)
              </span>
            </div>

            <div className="flex items-center space-x-3">
              <span className="text-4xl font-extrabold text-primary">
                {product.price.toFixed(2)} FCFA
              </span>
              {product.originalPrice && (
                <span className="text-xl text-gray-500 line-through">
                  {product.originalPrice.toFixed(2)} FCFA
                </span>
              )}
              {product.originalPrice && product.originalPrice > product.price && (
                <Badge className="bg-red-500">
                  -{Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}%
                </Badge>
              )}
              {product.inStock && product.stock !== undefined && product.stock <= 3 && product.stock > 0 && (
                <Badge variant="destructive" className="bg-yellow-400 text-black ml-2">
                  Bientôt épuisé
                </Badge>
              )}
              <span className="text-xs text-gray-500 ml-2">Stock: {product.stock}</span>
            </div>

            <p className="text-gray-700 leading-relaxed mt-4">{String(product.description)}</p>

            {product.features && Array.isArray(product.features) && product.features.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-lg font-semibold mt-4">Caractéristiques principales :</h3>
                <ul className="list-none p-0 space-y-2">
                  {product.features.map((feature, index) => (
                    <li key={index} className="flex items-center text-gray-700">
                      <span className="text-green-500 mr-2">✔️</span> {feature}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="mt-8 flex items-center gap-4">
            <div className="flex items-center border rounded-lg">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-r-none"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-8 text-center">{quantity}</span>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-l-none"
                onClick={() => setQuantity(quantity + 1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <Button size="lg" onClick={handleAddToCart} disabled={!product.inStock} className="flex-1">
              <ShoppingCart className="h-5 w-5 mr-2" />
              {product.inStock ? 'Ajouter au panier' : 'Indisponible'}
            </Button>
            {/* Bouton favoris */}
            <Button
              size="icon"
              variant={isInWishlist(product.id) ? "destructive" : "outline"}
              className="flex items-center justify-center p-2 sm:p-4"
              onClick={() => handleWishlist(product)}
              aria-label={isInWishlist(product.id) ? "Retirer des favoris" : "Ajouter aux favoris"}
            >
              <Heart
                fill={isInWishlist(product.id) ? "#ef4444" : "none"}
                className="h-5 w-5 sm:h-6 sm:w-6"
              />
            </Button>
            <Button size="lg" variant="outline" className="flex-1 hidden sm:block">
              Acheter maintenant
            </Button>
          </div>

          {product.inStock && (
            <p className="mt-4 text-green-600 text-sm flex items-center">
              <span className="h-2 w-2 bg-green-500 rounded-full mr-2"></span>
              En stock - Expédition sous 24h
            </p>
          )}
        </div>
      </div>

      {/* Avis et notation */}
      <section className="mt-12 max-w-xl">
        <h2 className="text-xl font-bold mb-4">Avis des clients</h2>
        {product.reviewsList && product.reviewsList.length > 0 ? (
          <ul className="mb-6 space-y-4">
            {product.reviewsList.map((r: any, idx: number) => (
              <li key={idx} className="border-b pb-2">
                <div className="flex items-center gap-2">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${i < r.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                    />
                  ))}
                  <span className="text-sm text-gray-600 ml-2">
                    {r.user?.name || r.user || "Utilisateur"}
                  </span>
                </div>
                <div className="text-gray-700 mt-1">{r.text}</div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-gray-500 mb-6">Aucun avis pour ce produit.</div>
        )}
        {user ? (
          <form onSubmit={handleAddReview} className="space-y-2">
            <label className="block font-medium">Votre note :</label>
            <div className="flex items-center gap-2">
              {[1,2,3,4,5].map((n) => (
                <button
                  type="button"
                  key={n}
                  onClick={() => setReviewRating(n)}
                  className={n <= reviewRating ? "text-yellow-400" : "text-gray-300"}
                >
                  <Star className="h-6 w-6" fill={n <= reviewRating ? "#facc15" : "none"} />
                </button>
              ))}
              <span className="ml-2">{reviewRating}/5</span>
            </div>
            <textarea
              //className="text-foreground w-full  border p-2"
              className= "flex h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              rows={3}
              placeholder="Votre avis..."
              value={reviewText}
              onChange={e => setReviewText(e.target.value)}
            />
            {reviewError && <div className="text-red-600">{reviewError}</div>}
            {reviewSuccess && <div className="text-green-600">{reviewSuccess}</div>}
            <Button type="submit">Envoyer mon avis</Button>
          </form>
        ) : (
          <div className="text-gray-500">Connectez-vous pour laisser un avis.</div>
        )}
      </section>
      {/* Produits similaires */}
      {similarProducts.length > 0 && (
        <section className="mt-16">
          <h2 className="text-2xl font-bold mb-6">Produits similaires</h2>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-6">
            {similarProducts.map((p) => (
              <Card key={p.id} className="group hover:shadow-lg transition-shadow">
                <CardContent className="p-0">
                  <Link to={`/product/${p.id}`} className="block">
                    <div className="w-full aspect-square rounded-t-lg overflow-hidden bg-white flex items-center justify-center">
                      <img
                        src={p.image}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  </Link>
                  <div className="p-1 sm:p-4">
                    <Link to={`/product/${p.id}`}>
                      <h3 className="font-semibold mb-1 sm:mb-2 hover:text-primary transition-colors line-clamp-2 text-[11px] sm:text-base">
                        {p.name}
                      </h3>
                    </Link>
                    <div className="flex items-center mb-1 sm:mb-2">
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-2.5 w-2.5 sm:h-4 sm:w-4 ${
                              i < Math.floor(p.rating)
                                ? 'text-yellow-400 fill-current'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-[10px] sm:text-sm text-gray-600 ml-1 sm:ml-2">({p.reviews})</span>
                    </div>
                    <div className="flex items-center space-x-0.5 sm:space-x-2">
                      <span className="text-xs sm:text-lg font-bold text-primary">{p.price.toFixed(2)} FCFA</span>
                      {p.originalPrice && (
                        <span className="text-[10px] sm:text-sm text-gray-500 line-through">
                          {p.originalPrice.toFixed(2)} FCFA
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}