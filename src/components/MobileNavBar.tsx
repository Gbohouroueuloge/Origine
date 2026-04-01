import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, ShoppingCart, Heart, User, Grid, Package } from "lucide-react";
import { useAuthStore } from "@/lib/authStore";
import {useEffect, useRef, useState} from "react";

export default function MobileNavBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  // Pour les badges
  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);

  // Cache global pour le panier et les favoris (MobileNavBar)
  const cacheRef = useRef({ cart: null, wishlist: null, lastFetch: 0, userId: null });
  useEffect(() => {
    if (!user) {
      setCartCount(0);
      setWishlistCount(0);
      return;
    }
    const now = Date.now();
    if (
      cacheRef.current.cart &&
      cacheRef.current.wishlist &&
      cacheRef.current.userId === user.id &&
      now - cacheRef.current.lastFetch < 60000
    ) {
      setCartCount(Array.isArray(cacheRef.current.cart) ? cacheRef.current.cart.reduce((acc, item) => acc + (item.quantity || 1), 0) : 0);
      setWishlistCount(Array.isArray(cacheRef.current.wishlist) ? cacheRef.current.wishlist.length : 0);
      return;
    }
    const token = useAuthStore.getState().userToken;
    fetch(`http://localhost:4000/cart/${user.id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then((res) => res.json())
      .then((items) => {
        setCartCount(Array.isArray(items) ? items.reduce((acc, item) => acc + (item.quantity || 1), 0) : 0);
        cacheRef.current.cart = items;
        cacheRef.current.userId = user.id;
        cacheRef.current.lastFetch = now;
      });
    fetch(`http://localhost:4000/wishlist/${user.id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then((res) => res.json())
      .then((items) => {
        setWishlistCount(Array.isArray(items) ? items.length : 0);
        cacheRef.current.wishlist = items;
        cacheRef.current.userId = user.id;
        cacheRef.current.lastFetch = now;
      });
  }, [user, location.pathname]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t flex justify-around items-center h-14 md:hidden dark:bg-gray-900 dark:border-gray-800">
      <Link to="/" className="flex flex-col items-center justify-center flex-1">
        <Home className={`h-6 w-6 ${location.pathname === "/" ? "text-primary" : "text-gray-400 dark:text-gray-400"}`} />
        <span className="text-[10px] text-gray-700 dark:text-gray-200">Accueil</span>
      </Link>
      <Link to="/products" className="flex flex-col items-center justify-center flex-1">
        <Package className={`h-6 w-6 ${location.pathname.startsWith("/products") ? "text-primary" : "text-gray-400"}`} />
        <span className="text-[10px] text-gray-700 dark:text-gray-200">Produits</span>
      </Link>
      <Link to="/products" className="flex flex-col items-center justify-center flex-1">
        <Grid className={`h-6 w-6 ${location.pathname.includes("category") ? "text-primary" : "text-gray-400"}`} />
        <span className="text-[10px] text-gray-700 dark:text-gray-200">Catégories</span>
      </Link>
      <Link to="/wishlist" className="flex flex-col items-center justify-center flex-1">
        <div className="relative flex flex-col items-center">
          <Heart
            className={`h-6 w-6 ${
              location.pathname === "/wishlist"
                ? "text-primary"
                : "text-gray-400"
            }`}
          />
          {wishlistCount > 0 && (
            <span className="inline-flex items-center justify-center bg-red-500 text-white rounded-full text-[10px] font-bold w-4 h-4 absolute -top-1 -right-2 border-2 border-white">
              {wishlistCount}
            </span>
          )}
        </div>
        <span className="text-[10px] text-gray-700 dark:text-gray-200">Favoris</span>
      </Link>
      <Link to="/cart" className="flex flex-col items-center justify-center flex-1">
        <div className="relative flex flex-col items-center">
          <ShoppingCart
            className={`h-6 w-6 ${
              location.pathname === "/cart"
                ? "text-primary"
                : "text-gray-400"
            }`}
          />
          {cartCount > 0 && (
            <span className="inline-flex items-center justify-center bg-red-500 text-white rounded-full text-[10px] font-bold w-4 h-4 absolute -top-1 -right-2 border-2 border-white">
              {cartCount}
            </span>
          )}
        </div>
        <span className="text-[10px] text-gray-700 dark:text-gray-200">Panier</span>
      </Link>
      <Link to={user ? "/account" : "/account"} className="flex flex-col items-center justify-center flex-1 relative">
        <User className={`h-6 w-6 ${location.pathname === "/account" ? "text-primary" : "text-gray-400"}`} />
        <span className="text-[10px] text-gray-700 dark:text-gray-200">Compte</span>
      </Link>
    </nav>
  );
}
