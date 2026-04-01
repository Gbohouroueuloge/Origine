import { sendPushNotification } from '@/components/Header';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Minus, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuthStore } from '@/lib/authStore';
import { toast } from '@/components/ui/sonner';
import {useEffect, useRef, useState} from 'react';


export default function Cart() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  // CRUD panier via API
  const fetchCart = async () => {
    if (!user) return;
    try {
      const token = useAuthStore.getState().userToken; // ou une variable équivalente dans ton store
      const res = await fetch(`http://localhost:4000/cart/${user.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error("Erreur lors du chargement du panier.");
      const data = await res.json();
      setItems(data);
    } catch (e) {
      setItems([]);
      toast("Erreur", { description: e.message || "Erreur lors du chargement du panier." });
    }
  };
  useEffect(() => { fetchCart(); }, [user]);

  const updateCart = async (newItems) => {
    setItems(newItems);
    if (user) {
      try {
        const token = useAuthStore.getState().userToken; // ou une variable équivalente dans ton store
        const res = await fetch(`http://localhost:4000/cart/${user.id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ items: newItems })
        });
        if (!res.ok) throw new Error("Erreur lors de la mise à jour du panier.");
        if (window.refreshCartCount) window.refreshCartCount();
      } catch (e) {
        toast("Erreur", { description: e.message || "Erreur lors de la mise à jour du panier." });
      }
    }
  };

  const removeItem = (productId) => {
    const newItems = items.filter(item => item.product.id !== productId);
    updateCart(newItems);
  };
  const updateQuantity = (productId, quantity) => {
    const newItems = items.map(item =>
      item.product.id === productId ? { ...item, quantity } : item
    );
    updateCart(newItems);
  };
  const clearCart = () => {
    updateCart([]);
  };

  const [promo, setPromo] = useState('');
  const [promos, setPromos] = useState([]);
  useEffect(() => {
    fetch('http://localhost:4000/promos')
      .then(res => {
        if (!res.ok) throw new Error("Erreur lors du chargement des codes promo.");
        return res.json();
      })
      .then(setPromos)
      .catch(() => setPromos([]));
  }, []);

  const [promoError, setPromoError] = useState('');
  const [promoSuccess, setPromoSuccess] = useState('');
  const [discount, setDiscount] = useState(0);

  const subtotal = items.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const discountAmount = subtotal * discount;
  const total = subtotal - discountAmount;

  // Vérifie si le panier est vide
  const isCartEmpty = items.length === 0;

  // Fonction pour procéder au paiement
  const [products, setProducts] = useState([]);
  const [loadingCheckout, setLoadingCheckout] = useState(false);

  // Cache global pour les produits (Cart)
  const cacheRef = useRef({ products: null, lastFetch: 0 });
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const now = Date.now();
        if (
          cacheRef.current.products &&
          now - cacheRef.current.lastFetch < 60000
        ) {
          setProducts(cacheRef.current.products);
          return;
        }
        const res = await fetch('http://localhost:4000/products');
        if (!res.ok) throw new Error("Erreur lors du chargement des produits.");
        const productsData = await res.json();
        setProducts(productsData.products || productsData);
        cacheRef.current.products = productsData.products || productsData;
        cacheRef.current.lastFetch = now;
      } catch {
        setProducts([]);
      }
    };
    fetchAll();
  }, []);

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    setPromoError('');
    setPromoSuccess('');
    const found = promos.find((p: any) => p.code === promo.trim().toUpperCase());
    if (found) {
      // Vérifie la date d'expiration côté frontend aussi
      if (found.expiresAt && new Date(found.expiresAt) < new Date()) {
        setDiscount(0);
        setPromoError('Ce code promo est expiré');
        return;
      }
      setDiscount(found.discount);
      setPromoSuccess(`Code promo appliqué : -${found.discount * 100}%`);
      sendPushNotification("Origine - Promo", `Code promo ${found.code} appliqué !`);
    } else {
      setDiscount(0);
      setPromoError('Code promo invalide');
    }
  };

  const handleCheckout = async () => {
    if (!user) {
      toast("Connexion requise", { description: "Veuillez vous connecter pour passer commande." });
      navigate('/account');
      return;
    }
    setLoadingCheckout(true);
    try {
      const token = useAuthStore.getState().userToken; // ou une variable équivalente dans ton store
      const res = await fetch('http://localhost:4000/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          userId: user.id,
          items: items.map(item => ({
            productId: item.product.id,
            name: item.product.name,
            price: item.product.price,
            quantity: item.quantity
          })),
          subtotal,
          discount: discountAmount,
          total,
          promo: discount > 0 ? promo : undefined
        })
      });
      const data = await res.json();
      if (!res.ok) {
        toast("Erreur", { description: data.error || "Erreur lors de la commande." });
        setLoadingCheckout(false);
        return;
      }
      clearCart();
      toast("Commande validée", { description: "Votre commande a bien été enregistrée !" });
      sendPushNotification("Origine", "Merci pour votre commande ! Elle est en cours de traitement.");
      navigate('/account');
    } catch (e) {
      toast("Erreur", { description: e.message || "Erreur lors de la commande." });
    } finally {
      setLoadingCheckout(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {isCartEmpty ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <ShoppingCart className="h-24 w-24 text-gray-300 mb-6" />
          <h1 className="text-2xl font-bold text-gray-700 mb-2">Votre panier est vide</h1>
          <p className="text-gray-500 mb-6">
            Découvrez nos produits et ajoutez-les à votre panier pour commencer vos achats.
          </p>
          <Link to="/products">
            <Button size="lg">Découvrir nos produits</Button>
          </Link>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">
             Mon panier ({items.length} article{items.length > 1 ? 's' : ''})
            </h1>
            <Button variant="outline" size="sm" onClick={clearCart}>
              <Trash2 className="h-4 w-4 mr-2" /> Vider le panier
            </Button>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Liste des articles du panier */}
            <div className="flex-1 space-y-4">
              {items.map((item) => (
                <Card key={item.product.id} className="p-2 sm:p-4 flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 sm:w-24 sm:h-24 aspect-square rounded-lg overflow-hidden bg-white flex items-center justify-center">
                      <img
                        src={item.product.image}
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm sm:text-lg">{item.product.name}</h3>
                    <p className="text-gray-600 line-clamp-2 text-xs sm:text-base">{item.product.description}</p>
                    <div className="flex items-center space-x-1 sm:space-x-2 mt-1 sm:mt-2">
                      <span className="text-base sm:text-lg font-bold text-primary">
                        {item.product.price.toFixed(2)} FCFA
                      </span>
                      {item.product.originalPrice && (
                        <span className="text-xs sm:text-sm text-gray-500 line-through">
                          {item.product.originalPrice.toFixed(2)} FCFA
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-6 w-6 sm:h-8 sm:w-8"
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                    >
                      <Minus className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                    <span className="w-6 sm:w-8 text-center text-xs sm:text-base">{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-6 w-6 sm:h-8 sm:w-8"
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      disabled={item.product.stock !== undefined && item.quantity >= item.product.stock}
                    >
                      <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 sm:h-8 sm:w-8 text-red-500 hover:text-red-700"
                      onClick={() => removeItem(item.product.id)}
                    >
                      <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  </div>
                  <div className="ml-auto font-bold text-base sm:text-lg hidden sm:block">
                    {(item.product.price * item.quantity).toFixed(2)} FCFA
                  </div>
                </Card>
              ))}
            </div>

            {/* Résumé de la commande */}
            <div className="w-full lg:w-80">
              <Card className="p-6 sticky top-24">
                <h2 className="text-xl font-bold mb-4">Résumé de la commande</h2>
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between">
                    <span>Sous-total ({items.length} article{items.length > 1 ? 's' : ''})</span>
                    <span className="font-semibold">{subtotal.toFixed(2)} FCFA</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Livraison</span>
                    <span className="text-green-600 font-semibold">Gratuite</span>
                  </div>
                </div>
                {/* Champ code promo */}
                <form onSubmit={handleApplyPromo} className="mb-4 flex gap-2">
                  <input
                    placeholder="Code promo"
                    value={promo}
                    onChange={e => setPromo(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background
                                file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground
                                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <Button type="submit" size="sm">Appliquer</Button>
                </form>
                {promoError && <div className="text-red-500 text-sm mb-2">{promoError}</div>}
                {promoSuccess && <div className="text-green-600 text-sm mb-2">{promoSuccess}</div>}
                {discount > 0 && (
                  <div className="flex justify-between text-green-600 font-semibold mb-2">
                    <span>Réduction</span>
                    <span>-{discountAmount.toFixed(2)} FCFA</span>
                  </div>
                )}
                <div className="h-px bg-gray-200 my-4" />
                <div className="flex justify-between items-center text-xl font-bold mb-6">
                  <span>Total</span>
                  <span>{total.toFixed(2)} FCFA</span>
                </div>
                <Button
                  className="w-full mb-4"
                  onClick={handleCheckout}
                  disabled={items.length === 0 || loadingCheckout}
                  aria-busy={loadingCheckout}
                  aria-label="Procéder au paiement"
                >
                  {loadingCheckout
                    ? <span>Traitement du paiement...</span>
                    : (items.length === 0 ? "Panier vide" : "Procéder au paiement")}
                </Button>
                <Link to="/products">
                  <Button variant="outline" className="w-full">
                    ← Continuer mes achats
                  </Button>
                </Link>

                <div className="mt-6 text-sm text-gray-500 space-y-2">
                  <div className="flex items-center">
                    <span className="mr-2">✔️</span>
                    <span>Paiement sécurisé</span>
                  </div>
                  <div className="flex items-center">
                    <span className="mr-2">🚚</span>
                    <span>Livraison rapide</span>
                  </div>
                  <div className="flex items-center">
                    <span className="mr-2">↩️</span>
                    <span>Retour gratuit sous 30 jours</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}