import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from '@/components/Header';
import Index from './pages/Index';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import NotFound from './pages/NotFound';
import Account from './pages/Account';
import Register from './pages/Register';
import Admin from './pages/Admin';
import Wishlist from './pages/Wishlist';

const queryClient = new QueryClient();

import { useAuthStore } from '@/lib/authStore';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MobileNavBar from "@/components/MobileNavBar.tsx";
import MobileSearchBar from "@/components/MobileSearchBar.tsx";

/**
 * AuthWatcher :
 * - Vérifie toutes les 5s si l'utilisateur est supprimé/banni.
 * - Rafraîchit automatiquement le JWT si expiré (401), sinon déconnecte.
 */
function AuthWatcher() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const refreshJwt = useAuthStore((s) => s.refreshJwt);
  const userToken = useAuthStore((s) => s.userToken);
  const navigate = useNavigate();

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    let abort = false;

    async function checkUser() {
      if (!user) return;
      try {
        const res = await fetch(`http://localhost:4000/users/${user.id}`, {
          headers: userToken ? { Authorization: `Bearer ${userToken}` } : {}
        });
        if (res.status === 401) {
          // Token expiré, tente refresh
          const ok = await refreshJwt();
          if (ok && !abort) {
            // On relance la vérification avec le nouveau token
            return checkUser();
          } else {
            logout();
            import('@/components/ui/sonner').then(({ toast }) => {
              toast("Déconnexion", { description: "Votre session a expiré." });
            });
            navigate('/account');
            return;
          }
        }
        if (!res.ok) {
          logout();
          import('@/components/ui/sonner').then(({ toast }) => {
            toast("Déconnexion", { description: "Votre compte a été supprimé." });
          });
          navigate('/account');
          return;
        }
        const data = await res.json();
        if (data.role && typeof data.role === "string" && data.role.trim() === 'banned') {
          logout();
          import('@/components/ui/sonner').then(({ toast }) => {
            toast("Déconnexion", { description: "Votre compte a été banni." });
          });
          navigate('/account');
        }
      } catch {
        // Erreur réseau, on ignore
      }
    }

    if (user) {
      interval = setInterval(checkUser, 5000);
      checkUser();
    }
    return () => {
      abort = true;
      if (interval) clearInterval(interval);
    };
  }, [user, logout, navigate, refreshJwt, userToken]);

  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <div className="min-h-screen bg-background pb-14 pt-16">
          {/* Barre de recherche en haut (mobile only) */}
          <div className="md:hidden sticky top-0 z-50 bg-background border-b">
            <MobileSearchBar />
          </div>
          <div className="hidden md:block">
            <Header />
          </div>
          <AuthWatcher />
          <main>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/products" element={<Products />} />
              <Route path="/product/:id" element={<ProductDetail />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/account" element={<Account />} />
              <Route path="/register" element={<Register />} />
              <Route path="/wishlist" element={<Wishlist />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          {/* Barre de navigation mobile en bas */}
          <MobileNavBar />
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;