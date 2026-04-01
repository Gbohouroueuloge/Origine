import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

// Pour TypeScript : déclare la propriété globale
declare global {
  interface Window {
    refreshCartCount?: () => void;
    refreshWishlistCount?: () => void;
  }
}
import { Search, ShoppingCart, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useSearchStore } from '@/lib/store';
import { useRef } from 'react';
import { useAuthStore } from '@/lib/authStore';
import { useEffect } from 'react';

function getInitialDarkMode() {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("theme");
    if (stored) return stored === "dark";
    // Prend le mode système par défaut
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  return false;
}


export function useDarkMode() {
  const user = useAuthStore((s) => s.user);
  const [dark, setDark] = useState(getInitialDarkMode);

  useEffect(() => {
    if (dark) {
      document.body.classList.add("dark");
    } else {
      document.body.classList.remove("dark");
    }
    // Sauvegarde le thème en base si connecté
    if (user) {
      const token = useAuthStore.getState().userToken; // ou une variable équivalente dans ton store
      fetch(`http://localhost:4000/users/${user.id}/preferences`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ theme: dark ? "dark" : "light" })
      });
    }
  }, [dark, user]);

  return [dark, setDark] as const;
}

// Notification push simple
function sendPushNotification(title: string, body: string) {
  if ("Notification" in window) {
    if (Notification.permission === "granted") {
      new Notification(title, { body });
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then(permission => {
        if (permission === "granted") {
          new Notification(title, { body });
        }
      });
    }
  }
}

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const location = useLocation();
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);

  // Cache global pour les catégories et produits
  const cacheRef = useRef({ categories: null, products: null, lastFetch: 0 });
useEffect(() => {
    const fetchAll = async () => {
      try {
        const resCat = await fetch('http://localhost:4000/categories');
        if (!resCat.ok) throw new Error("Erreur lors du chargement des catégories.");
        const categoriesData = await resCat.json();
        setCategories(categoriesData);
        const resProd = await fetch('http://localhost:4000/products');
        if (!resProd.ok) throw new Error("Erreur lors du chargement des produits.");
        const productsData = await resProd.json();
        setProducts(productsData.products || productsData);
        cacheRef.current.categories = categoriesData;
        cacheRef.current.products = productsData.products || productsData;
        cacheRef.current.lastFetch = Date.now();
      } catch (e) {
        toast("Erreur", { description: e.message || "Erreur lors du chargement des produits ou catégories." });
      }
    };
    fetchAll();
    // Rafraîchir la liste des catégories si une catégorie est ajoutée/supprimée en admin
    const handler = () => fetchAll();
    window.addEventListener("categories-updated", handler);
    return () => {
      window.removeEventListener("categories-updated", handler);
    };
  }, []);

  const { setSearchQuery, setSelectedCategory, resetFilters } = useSearchStore();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  // Nombre d'articles du panier depuis l'API backend
  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);

  // Fonction pour charger le panier
  const fetchCartCount = async () => {
    if (!user) {
      setCartCount(0);
      return;
    }
    try {
      const res = await fetch(`http://localhost:4000/cart/${user.id}`);
      const items = await res.json();
      setCartCount(Array.isArray(items) ? items.reduce((acc, item) => acc + (item.quantity || 1), 0) : 0);
    } catch {
      setCartCount(0);
    }
  };

  // Fonction pour charger les favoris
  const fetchWishlistCount = async () => {
    if (!user) {
      setWishlistCount(0);
      return;
    }
    try {
      const res = await fetch(`http://localhost:4000/wishlist/${user.id}`);
      const items = await res.json();
      setWishlistCount(Array.isArray(items) ? items.length : 0);
    } catch {
      setWishlistCount(0);
    }
  };

  useEffect(() => {
    fetchCartCount();
    fetchWishlistCount();
    // eslint-disable-next-line
  }, [user]);

  // Permet de rafraîchir le nombre d'articles du panier/favoris depuis d'autres composants
  window.refreshCartCount = fetchCartCount;
  window.refreshWishlistCount = fetchWishlistCount;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    resetFilters();
    setSearchQuery(searchInput);
    navigate('/products');
    setIsMenuOpen(false);
  };

  // Vide la recherche quand on quitte /products
  useEffect(() => {
    if (location.pathname !== '/products') {
      setSearchInput('');
      setSearchQuery('');
      resetFilters();
    }
    // eslint-disable-next-line
  }, [location.pathname]);

  const handleCategoryClick = (categoryId: string) => {
    setSelectedCategory(categoryId);
    navigate(`/products?category=${categoryId}`);
    setIsMenuOpen(false);
  };

  const inputRef = useRef<HTMLInputElement>(null);
  const [dark, setDark] = useDarkMode();

  return (
    <header className="hidden md:block fixed top-0 left-0 right-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
         <Link to="/" className="flex items-center space-x-2">
            <div className="h-0 w-30 rounded-lg flex items-center justify-center">
              {/* Icône Lucide ShoppingCart */}
<svg xmlns="http://www.w3.org/2000/svg"
     width="160" height="40" viewBox="0 0 160 40" role="img" aria-label="Origine">
  <defs>
    <linearGradient id="gradO" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#3b82f6"/>
      <stop offset="100%" stop-color="#9333ea"/>
    </linearGradient>
  </defs>

  <circle cx="20" cy="20" r="16" fill="none" stroke="url(#gradO)" stroke-width="6"/>
  <path d="M20 12
           a8 8 0 1 1 -8 8
           a4 4 0 1 0 4-4"
        fill="none" stroke="url(#gradO)" stroke-width="3" stroke-linecap="round"/>

  <text x="50" y="25" font-family="Poppins, Arial, sans-serif"
        font-size="20" font-weight="700" fill="#facc15" letter-spacing="1">
    Origine
  </text>
</svg>



            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <div className="flex flex-col items-center">
              <Link
                to="/"
                className={`text-sm font-medium hover:text-primary transition-colors ${location.pathname === "/" ? "text-primary" : ""}`}
              >
                Accueil
              </Link>
              {location.pathname === "/" && (
                <span className="block w-1 h-1 rounded-full bg-primary mt-1"></span>
              )}
            </div>
            <div className="flex flex-col items-center">
              <Link
                to="/products"
                className={`text-sm font-medium hover:text-primary transition-colors ${location.pathname.startsWith("/products") ? "text-primary" : ""}`}
              >
                Produits
              </Link>
              {location.pathname.startsWith("/products") && (
                <span className="block w-1 h-1 rounded-full bg-primary mt-1"></span>
              )}
            </div>
            {/* Categories Dropdown */}
            <div
              className="relative group flex flex-col items-center"
              tabIndex={0}
              onKeyDown={e => {
                if (e.key === "Escape") {
                  (e.currentTarget as HTMLElement).blur();
                }
              }}
            >
              <button className={`text-sm font-medium hover:text-primary transition-colors ${location.pathname.includes("category") ? "text-primary" : ""}`}>
                Catégories
              </button>
              {location.pathname.includes("category") && (
                <span className="block w-1 h-1 rounded-full bg-primary mt-1"></span>
              )}
              <div className="absolute top-full left-0 mt-2 w-48 bg-background border rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                <div className="py-2">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => handleCategoryClick(category.id)}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-muted transition-colors flex items-center space-x-2"
                      tabIndex={0}
                    >
                      <span>{category.icon}</span>
                      <span>{category.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </nav>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="hidden md:flex items-center space-x-2 flex-1 max-w-md mx-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  ref={inputRef}
                  type="text"
                  placeholder="Rechercher des produits..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-10"
                  autoComplete="off"
                  aria-autocomplete="list"
                  aria-controls="autocomplete-list"
                  aria-expanded={showAutocomplete}
                  aria-activedescendant={showAutocomplete ? "autocomplete-list" : undefined}
                  onFocus={() => {
                    setShowAutocomplete(true);
                    setTimeout(() => {
                      inputRef.current?.select();
                    }, 0);
                  }}
                  onBlur={() => {
                    // Masque la liste d'autocomplétion quand on quitte l'input
                    setTimeout(() => setShowAutocomplete(false), 100);
                  }}
                />
                {searchInput.length > 0 && showAutocomplete && (
                  <ul
                    id="autocomplete-list"
                    role="listbox"
                    className="absolute z-10 top-full left-0 w-full bg-background border rounded shadow mt-1 max-h-40 overflow-auto"
                  >
                    {categories.length === 0 || products.length === 0 ? (
                      <li className="px-3 py-2 text-red-500">Aucune donnée disponible</li>
                    ) : (
                      categories
                        .flatMap(cat => products.filter(p => p.categoryId === cat.id))
                        .filter(p => p.name.toLowerCase().includes(searchInput.toLowerCase()))
                        .slice(0, 5)
                        .map(p => (
                          <li
                            key={p.id}
                            className="px-3 py-2 hover:bg-muted cursor-pointer"
                            onMouseDown={() => {
                              resetFilters();
                              setSearchInput(p.name);
                              setSearchQuery(p.name);
                              navigate(`/products`);
                              setIsMenuOpen(false);
                            }}
                          >
                            {p.name}
                          </li>
                        ))
                    )}
                  </ul>
                )}
              </div>
              <Button type="submit" size="sm" className="flex items-center justify-center">
                <Search className="h-4 w-4" />
              </Button>
          </form>

          {/* Cart and Account and Mobile Menu */}
          <div className="flex items-center space-x-2">
            {/* Admin */}
            {user && user.role === 'admin' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Vérifie le rôle admin dans le store et navigue directement
                  navigate('/admin');
                }}
                aria-label="Accès administration"
              >
                Admin
              </Button>
            )}
            {/* Favoris */}
            {user && (
              <Link to="/wishlist" className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  className="relative"
                  aria-label="Voir mes favoris"
                >
                  <Heart className="h-5 w-5 text-red-500" fill="#ef4444" />
                  {wishlistCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                    >
                      {wishlistCount}
                    </Badge>
                  )}
                </Button>
              </Link>
            )}

            {/* Cart */}
            {user && (
              <Link to="/cart" className="relative">
                <Button variant="ghost" size="sm" className="relative">
                  <ShoppingCart className="h-5 w-5 text-blue-500" fill="#ef440011" />
                  {cartCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                    >
                      {cartCount}
                    </Badge>
                  )}
                </Button>
              </Link>
            )}

            {/* Badge utilisateur */}
            {user ? (
              <div className="relative group">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center justify-center p-0 w-8 h-8"
                  onClick={() => navigate('/account')}
                >
                  <span
                    className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white"
                    style={{
                      backgroundColor: `hsl(${(user.name.charCodeAt(0) * 137) % 360}, 70%, 50%)`
                    }}
                  >
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                </Button>
                <div className="absolute right-0 mt-2 w-48 bg-background border rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <button
                    onClick={() => setDark((d) => !d)}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-muted transition-colors"
                  >
                    {dark ? 'Passer en mode claire' : 'Passer en mode sombre'}
                  </button>
                  <button
                    onClick={() => {
                      logout();
                      navigate('/');
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-muted transition-colors"
                  >
                    Se déconnecter
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/account')}
                >
                  Se connecter
                </Button>
                <span className="text-gray-400 font-bold">/</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/register')}
                >
                  S'inscrire
                </Button>
              </div>
            )}

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t py-4 space-y-4">
            {/* Mobile Search */}
            <form onSubmit={handleSearch} className="flex items-center space-x-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button type="submit" size="sm" className="flex items-center justify-center">
                <Search className="h-4 w-4" />
              </Button>
            </form>

            {/* Badges favoris, panier, utilisateur */}
            <div className="flex items-center justify-center gap-4 mt-4">
              {/* Favoris */}
              {user && (
                <Link to="/wishlist" className="relative" onClick={() => setIsMenuOpen(false)}>
                  <Button variant="ghost" size="icon" className="relative">
                    <Heart className="h-6 w-6 text-red-500" fill="#ef4444" />
                    {wishlistCount > 0 && (
                      <Badge
                        variant="destructive"
                        className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                      >
                        {wishlistCount}
                      </Badge>
                    )}
                  </Button>
                </Link>
              )}
              {/* Panier */}
              {user && (
                <Link to="/cart" className="relative" onClick={() => setIsMenuOpen(false)}>
                  <Button
                      variant="ghost"
                      size="icon"
                      className="relative"
                      aria-label="Voit mon Panier"
                  >
                    <ShoppingCart className="h-6 w-6" />
                    {cartCount > 0 && (
                      <Badge
                        variant="destructive"
                        className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                      >
                        {cartCount}
                      </Badge>
                    )}
                  </Button>
                </Link>
              )}
              {/* Badge utilisateur + menu */}
              {user ? (
                <div className="relative group">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="flex items-center justify-center p-0 w-8 h-8"
                    onClick={() => {
                      setIsMenuOpen(false);
                      navigate('/account');
                    }}
                  >
                    <span
                      className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white"
                      style={{
                        backgroundColor: `hsl(${(user.name.charCodeAt(0) * 137) % 360}, 70%, 50%)`
                      }}
                    >
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  </Button>
                  <div className="absolute right-0 mt-2 w-48 bg-background border rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <button
                      onClick={() => {
                        logout();
                        setIsMenuOpen(false);
                        navigate('/');
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-muted transition-colors"
                    >
                      Se déconnecter
                    </button>
                    <button
                      onClick={() => {
                        setDark((d) => !d);
                        setIsMenuOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-muted transition-colors"
                    >
                      {dark ? 'Passer en mode claire' : 'Passer en mode sombre'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsMenuOpen(false);
                      navigate('/account');
                    }}
                  >
                    Se connecter
                  </Button>
                  <span className="text-gray-400 font-bold">/</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsMenuOpen(false);
                      navigate('/register');
                    }}
                  >
                    S'inscrire
                  </Button>
                </div>
              )}
            </div>

            {/* Mobile Navigation */}
            <nav className="space-y-2 mt-4">
              <Link
                to="/"
                className="block py-2 text-sm font-medium hover:text-primary transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Accueil
              </Link>
              <Link
                to="/products"
                className="block py-2 text-sm font-medium hover:text-primary transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Produits
              </Link>

              {/* Mobile Categories */}
              <div className="py-2">
                <p className="text-sm font-medium text-muted-foreground mb-2">Catégories</p>
                <div className="space-y-1 pl-4">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => handleCategoryClick(category.id)}
                      className="block py-1 text-sm hover:text-primary transition-colors flex items-center space-x-2"
                    >
                      <span>{category.icon}</span>
                      <span>{category.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}


export { sendPushNotification };