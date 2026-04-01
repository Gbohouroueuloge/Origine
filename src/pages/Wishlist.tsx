import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useAuthStore } from '@/lib/authStore';
import {useEffect, useRef, useState} from 'react';
import { toast } from '@/components/ui/sonner';


export default function Wishlist() {
  const user = useAuthStore((s) => s.user);
  const [items, setItems] = useState([]);

  // Cache global pour les favoris (Wishlist)
  const cacheRef = useRef({ items: null, lastFetch: 0, userId: null });
  useEffect(() => {
    if (user) {
      const now = Date.now();
      if (
        cacheRef.current.items &&
        cacheRef.current.userId === user.id &&
        now - cacheRef.current.lastFetch < 60000
      ) {
        setItems(cacheRef.current.items);
        return;
      }
      const token = useAuthStore.getState().userToken; // ou une variable équivalente dans ton store
      fetch(`http://localhost:4000/wishlist/${user.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
        .then(res => {
          if (!res.ok) throw new Error("Erreur lors du chargement des favoris.");
          return res.json();
        })
        .then(data => {
          setItems(data);
          cacheRef.current.items = data;
          cacheRef.current.userId = user.id;
          cacheRef.current.lastFetch = now;
        })
        .catch(() => setItems([]));
    }
  }, [user]);

  const remove = async (productId) => {
    const newItems = items.filter((p) => p.id !== productId);
    setItems(newItems);
    if (user) {
      try {
        const token = useAuthStore.getState().userToken; // ou une variable équivalente dans ton store
        const res = await fetch(`http://localhost:4000/wishlist/${user.id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ items: newItems })
        });
        if (!res.ok) throw new Error("Erreur lors de la mise à jour des favoris.");
        if (window.refreshWishlistCount) window.refreshWishlistCount();
      } catch (e) {
        toast("Erreur", { description: e.message || "Erreur lors de la mise à jour des favoris." });
      }
    }
  };

  const clear = async () => {
    setItems([]);
    if (user) {
      try {
        const token = useAuthStore.getState().userToken; // ou une variable équivalente dans ton store
        const res = await fetch(`http://localhost:4000/wishlist/${user.id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ items: [] })
        });
        if (!res.ok) throw new Error("Erreur lors de la mise à jour des favoris.");
        if (window.refreshWishlistCount) window.refreshWishlistCount();
      } catch (e) {
        toast("Erreur", { description: e.message || "Erreur lors de la mise à jour des favoris." });
      }
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Mes favoris</h1>
      {items.length === 0 ? (
        <div className="text-gray-500">Aucun produit dans vos favoris.</div>
      ) : (
        <>
          <div className="mb-4">
            <Button variant="outline" onClick={clear}>Vider mes favoris</Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-6">
            {items.map((product) => (
              <Card key={product.id} className="group hover:shadow-lg transition-shadow">
                <CardContent className="p-0">
                  <Link to={`/product/${product.id}`}>
                    <div className="w-full aspect-square rounded-t-lg overflow-hidden bg-white flex items-center justify-center">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
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
                        aria-label="Retirer des favoris"
                        onClick={() => remove(product.id)}
                        className="ml-2 p-0.5 sm:p-1 rounded-full border bg-red-100 text-red-500"
                      >
                        <Heart fill="#ef4444" className="h-3 w-3 sm:h-5 sm:w-5" />
                      </button>
                    </div>
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
                </CardContent>
                <CardFooter className="pt-0">
                  <Link to={`/product/${product.id}`}>
                    <Button className="w-full text-xs sm:text-base py-1.5 sm:py-3">Voir le produit</Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}