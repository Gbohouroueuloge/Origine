import { sendPushNotification } from '@/components/Header';
import {useEffect, useState} from 'react';
import { useAuthStore } from '@/lib/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from '@/components/ui/sonner';
import bcrypt from 'bcryptjs';

function EditUserInfo({ user }: { user: { id: string; name: string; email: string; role?: string } }) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const setUser = useAuthStore((s) => s.user ? s.user : null);
  const setAuthUser = useAuthStore((s) => s.user);
  const setUserStore = useAuthStore((s) => s);

  const handleSave = async () => {
    setError('');
    setSuccess('');
    if (!name || !email) {
      setError("Nom et email obligatoires.");
      return;
    }
    if (newPassword && newPassword !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    // Envoie la modification au backend
    try {
      const token = useAuthStore.getState().userToken; // ou une variable équivalente dans ton store
      const res = await fetch(`http://localhost:4000/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          name,
          email,
          password: newPassword ? newPassword : undefined
        })
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Erreur lors de la mise à jour.");
        return;
      }
      // Mets à jour le store Zustand
      setUserStore.user = { ...setAuthUser, name, email };
      setSuccess("Informations mises à jour !");
      setEditMode(false);
    } catch (e) {
      setError("Erreur réseau");
    }
  };

  if (!editMode) {
    return (
      <div className="bg-background p-6 rounded shadow space-y-4 max-w-xl mx-auto">
        <div>
          <span className="font-medium">Nom :</span> {user.name}
        </div>
        <div>
          <span className="font-medium">Email :</span> {user.email}
        </div>
        <div>
          <span className="font-medium">Rôle :</span> {user.role === 'admin' ? "Administrateur" : "Utilisateur"}
        </div>
        <Button className="mt-4" onClick={() => setEditMode(true)}>
          Modifier mes informations
        </Button>
        {success && <div className="text-green-600">{success}</div>}
      </div>
    );
  }

  return (
    <form
      className="bg-white p-6 rounded shadow space-y-4 max-w-xl mx-auto"
      onSubmit={e => {
        e.preventDefault();
        handleSave();
      }}
    >
      <div>
        <label className="block font-medium mb-1">Nom</label>
        <Input value={name} onChange={e => setName(e.target.value)} />
      </div>
      <div>
        <label className="block font-medium mb-1">Email</label>
        <Input
          value={email}
          onChange={e => setEmail(e.target.value)}
          type="email"
          pattern="^[\w-.]+@([\w-]+\.)+[\w-]{2,}$"
          required
        />
      </div>
      <div>
        <label className="block font-medium mb-1">Nouveau mot de passe</label>
        <Input
          type="password"
          value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
          placeholder="Laisser vide pour ne pas changer"
          minLength={6}
        />
      </div>
      {newPassword && (
        <>
          <div>
            <label className="block font-medium mb-1">Confirmer le nouveau mot de passe</label>
            <Input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} />
          </div>
          <div>
            <label className="block font-medium mb-1">Mot de passe actuel</label>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
        </>
      )}
      {error && <div className="text-red-600">{error}</div>}
      <div className="flex gap-2">
        <Button type="submit">Enregistrer</Button>
        <Button type="button" variant="outline" onClick={() => setEditMode(false)}>
          Annuler
        </Button>
      </div>
    </form>
  );
}


export default function Account() {
  const user = useAuthStore((s) => s.user);
  const login = useAuthStore((s) => s.login);
  const logout = useAuthStore((s) => s.logout);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [section, setSection] = useState<'infos' | 'orders' | 'actions'>('infos');
  const navigate = useNavigate();

  // Récupère les commandes de l'utilisateur (depuis l'API)
  const [orders, setOrders] = useState([]);
  useEffect(() => {
    if (user) {
      const token = useAuthStore.getState().userToken; // ou une variable équivalente dans ton store
      fetch('http://localhost:4000/orders/user/' + user.id, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
        .then(res => res.json())
        .then(setOrders);
    }
  }, [user && user.id]);

  if (user) {
    return (
      <div className="container mx-auto py-4 px-2 sm:px-4 flex flex-col md:flex-row gap-4 md:gap-8">
        {/* Sidebar */}
        <aside className="w-full md:w-56 flex-shrink-0 mb-4 md:mb-0">
          <nav className="flex flex-row md:flex-col gap-2 bg-muted rounded-lg p-2 md:p-4 justify-center">
            <Button
              variant={section === 'infos' ? 'default' : 'ghost'}
              className="flex-1 md:justify-start"
              onClick={() => setSection('infos')}
            >
              Mes informations
            </Button>
            <Button
              variant={section === 'orders' ? 'default' : 'ghost'}
              className="flex-1 md:justify-start"
              onClick={() => setSection('orders')}
            >
              Mes commandes
            </Button>
            <Button
              variant={section === 'actions' ? 'default' : 'ghost'}
              className="flex-1 md:justify-start"
              onClick={() => setSection('actions')}
            >
              Actions
            </Button>
          </nav>
        </aside>
        {/* Main content */}
        <main className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-8 text-center">Mon compte</h1>
          {section === 'infos' && (
            <EditUserInfo user={user} />
          )}
          {section === 'orders' && (
            <div className="bg-background p-3 sm:p-6 rounded shadow max-w-xl mx-auto">
              <h2 className="text-lg sm:text-xl font-bold mb-2 sm:mb-4">Mes commandes</h2>
              {orders.length === 0 ? (
                <div className="text-gray-500">Aucune commande passée pour le moment.</div>
              ) : (
                <ul className="space-y-4">
                  {orders.map((order: any, idx: number) => (
                    <li key={order.id || idx} className="border-b pb-2 sm:pb-4">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                        <span className="font-medium">Commande #{order.id || idx + 1}</span>
                        <span className="text-xs sm:text-sm text-gray-500">{order.date ? new Date(order.date).toLocaleDateString() : ''}</span>
                      </div>
                      <ul className="ml-2 sm:ml-4 mt-2 text-xs sm:text-sm text-gray-700">
                        {order.items.map((item: any) => (
                          <li key={item.productId}>
                            {item.name} × {item.quantity} — {(item.price * item.quantity).toFixed(2)} FCFA
                          </li>
                        ))}
                      </ul>
                      <div className="text-right font-bold mt-2 text-xs sm:text-base">
                        Sous-total : {order.subtotal ? order.subtotal.toFixed(2) : order.total.toFixed(2)} FCFA<br />
                        {order.discount ? <>Réduction : -{order.discount.toFixed(2)} FCFA<br /></> : null}
                        {order.promo ? <>Code promo : {order.promo}<br /></> : null}
                        Total : {order.total.toFixed(2)} FCFA
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {section === 'actions' && (
            <div className="bg-background p-3 sm:p-6 rounded shadow max-w-xl mx-auto space-y-4">
              <Button
                className="w-full"
                variant="outline"
                onClick={() => {
                  const isDark = document.body.classList.contains('dark');
                  if (isDark) {
                    document.body.classList.remove('dark');
                    localStorage.setItem('theme', 'light');
                  } else {
                    document.body.classList.add('dark');
                    localStorage.setItem('theme', 'dark');
                  }
                }}
              >
                Changer de thème
              </Button>
              <Button className="w-full" onClick={() => {
                logout();
                toast("Déconnexion", { description: "Vous avez été déconnecté." });
                navigate('/');
              }}>
                Se déconnecter
              </Button>
            </div>
          )}
        </main>
      </div>
    );
  }

  // Formulaire de connexion
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setTimeout(async () => { // Simule un délai
      if (!email || !password) {
        setError('Tous les champs sont obligatoires.');
        toast( "Erreur", { description: "Tous les champs sont obligatoires."});
        setLoading(false);
        return;
      }
      const result = await login(email, password);
      if (result !== true) {
        setError(result as string);
        toast("Erreur", { description: result as string });
        setLoading(false);
        return;
      }
      toast("Connexion réussie", { description: "Bienvenue sur votre compte !" });
      sendPushNotification("Salut", "Content de te revoir");
      setLoading(false);
      navigate('/account');
    }, 800);
  };

  return (
    <div className="container mx-auto max-w-md py-12">
      <h1 className="text-2xl font-bold mb-6 text-center">Connexion</h1>
      <form onSubmit={handleLogin} className="space-y-4 bg-white p-6 rounded shadow  dark:bg-gray-900" aria-label="Formulaire de connexion">
        <div>
          <label htmlFor="login-email" className="block mb-1 font-medium">Email</label>
          <Input id="login-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Votre email" aria-required="true" />
        </div>
        <div>
          <label htmlFor="login-password" className="block mb-1 font-medium">Mot de passe</label>
          <Input id="login-password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mot de passe" aria-required="true" />
        </div>
        {error && <div className="text-red-500 text-sm" aria-live="polite">{error}</div>}
        <Button type="submit" className="w-full" disabled={loading} aria-busy={loading} aria-label="Se connecter">
          {loading ? "Connexion..." : "Se connecter"}
        </Button>
        <div className="text-sm text-center mt-2">
          Pas encore de compte ? <Link to="/register" className="text-blue-600 hover:underline">Créer un compte</Link>
        </div>
      </form>
    </div>
  );
}