import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSearchStore } from "@/lib/store";
import { toast } from '@/components/ui/sonner';

export default function MobileSearchBar() {
  const [searchInput, setSearchInput] = useState('');
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const { setSearchQuery, setSelectedCategory, resetFilters } = useSearchStore();

  // Cache global pour les catégories et produits (mobile)
  const cacheRef = useRef({ categories: null, products: null, lastFetch: 0 });
  useEffect(() => {
    const fetchAll = async () => {
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
        cacheRef.current.lastFetch = now;
      } catch (e) {
        toast("Erreur", { description: e.message || "Erreur lors du chargement des produits ou catégories." });
      }
    };
    fetchAll();
  }, []);

  // Vide la recherche quand on quitte /products
  useEffect(() => {
    if (location.pathname !== '/products') {
      setSearchInput('');
      setSearchQuery('');
      resetFilters();
    }
    // eslint-disable-next-line
  }, [location.pathname]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput);
    navigate('/products');
    setShowAutocomplete(false);
  };

  // Suggestions produits (même logique que Header)
  const suggestions = searchInput.length > 0
    ? categories
        .flatMap(cat => products.filter(p => p.categoryId === cat.id))
        .filter(p => p.name.toLowerCase().includes(searchInput.toLowerCase()))
        .slice(0, 5)
    : [];

  return (
    <form
      onSubmit={handleSearch}
      className="flex items-center px-2 py-2 relative bg-background dark:bg-gray-900"
      autoComplete="off"
    >
      <input
        ref={inputRef}
        type="text"
        placeholder="Rechercher des produits..."
        className="flex-1 rounded-md border px-3 py-2 text-sm bg-background dark:bg-gray-900 text-foreground dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-400"
        autoComplete="off"
        value={searchInput}
        onChange={e => {
          setSearchInput(e.target.value);
          setShowAutocomplete(true);
        }}
        onFocus={() => setShowAutocomplete(true)}
        onBlur={() => setTimeout(() => setShowAutocomplete(false), 100)}
      />
      <button type="submit" className="ml-2 px-3 py-2 rounded bg-primary text-white text-sm flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" strokeWidth="2" />
        </svg>
      </button>
      {searchInput.length > 0 && showAutocomplete && (
        <ul className="absolute left-0 top-full w-full bg-white dark:bg-gray-900 border dark:border-gray-800 rounded shadow mt-1 max-h-40 overflow-auto z-50">
          {categories.length === 0 || products.length === 0 ? (
            <li className="px-3 py-2 text-red-500">Aucune donnée disponible</li>
          ) : suggestions.length === 0 ? (
            <li className="px-3 py-2 text-gray-500">Aucun résultat</li>
          ) : (
            suggestions.map((p) => (
              <li
                key={p.id}
                className="px-3 py-2 hover:bg-muted dark:hover:bg-gray-800 cursor-pointer text-sm text-gray-900 dark:text-gray-100"
                onMouseDown={() => {
                  setSearchInput(p.name);
                  setSearchQuery(p.name);
                  navigate(`/products`);
                  setShowAutocomplete(false);
                }}
              >
                {p.name}
              </li>
            ))
          )}
        </ul>
      )}
    </form>

  );
}
