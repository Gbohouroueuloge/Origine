import { sendPushNotification } from '@/components/Header';
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/lib/authStore';
import { toast } from '@/components/ui/sonner';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const register = useAuthStore((s) => s.register);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setTimeout(async () => { // Simule un délai
      if (!name || !email || !password) {
        setError('Tous les champs sont obligatoires.');
        toast("Erreur", { description: "Tous les champs sont obligatoires."});
        setLoading(false);
        return;
      }
      // Validation email
      if (!/^[\w-.]+@([\w-]+\.)+[\w-]{2,}$/.test(email)) {
        setError('Email invalide.');
        toast("Erreur", { description: "Email invalide." });
        setLoading(false);
        return;
      }
      if (password.length < 6) {
        setError('Le mot de passe doit contenir au moins 6 caractères.');
        toast("Erreur", { description: "Le mot de passe doit contenir au moins 6 caractères." });
        setLoading(false);
        return;
      }
      if (password !== confirm) {
        setError('Les mots de passe ne correspondent pas.');
        toast( "Erreur", { description: "Les mots de passe ne correspondent pas." });
        setLoading(false);
        return;
      }
      const result = await register(name, email, password);
      if (result !== true) {
        setError(result as string);
        toast( "Erreur", { description: result as string,  });
        setLoading(false);
        return;
      }
      toast( "Compte créé", { description: "Votre compte a bien été créé !" });
      sendPushNotification("Bienvenue sur Origine", "Votre compte a bien été créé !");
      setLoading(false);
      navigate('/account');
    }, 800);
  };

  return (
    <div className="container mx-auto max-w-md py-12">
      <h1 className="text-2xl font-bold mb-6 text-center">Créer un compte</h1>
      <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded shadow dark:bg-gray-900" aria-label="Formulaire de création de compte">
        <div>
          <label htmlFor="register-name" className="block mb-1 font-medium">Nom</label>
          <Input id="register-name" value={name} onChange={e => setName(e.target.value)} placeholder="Votre nom" aria-required="true" />
        </div>
        <div>
          <label htmlFor="register-email" className="block mb-1 font-medium">Email</label>
          <Input id="register-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Votre email" aria-required="true" />
        </div>
        <div>
          <label htmlFor="register-password" className="block mb-1 font-medium">Mot de passe</label>
          <Input id="register-password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mot de passe" aria-required="true" />
        </div>
        <div>
          <label htmlFor="register-confirm" className="block mb-1 font-medium">Confirmer le mot de passe</label>
          <Input id="register-confirm" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Confirmer le mot de passe" aria-required="true" />
        </div>
        {error && <div className="text-red-500 text-sm" aria-live="polite">{error}</div>}
        <Button type="submit" className="w-full" disabled={loading} aria-busy={loading} aria-label="Créer mon compte">
          {loading ? "Création du compte..." : "Créer mon compte"}
        </Button>
        <div className="text-sm text-center mt-2">
          Déjà un compte ? <Link to="/account" className="text-blue-600 hover:underline">Se connecter</Link>
        </div>
      </form>
    </div>
  );
}