import { sendPushNotification } from '@/components/Header';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useAuthStore } from '@/lib/authStore';
import { useEffect } from 'react';
import { toast } from '@/components/ui/sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export default function Admin() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/');
    }
  }, [user, navigate]);

  const [section, setSection] = useState<'stats' | 'users' | 'products'>('stats');
  const [orderDetails, setOrderDetails] = useState<any | null>(null);

  // Utilisateurs (React Query)
  const queryClient = useQueryClient();
  // Pagination utilisateurs
  const [usersPage, setUsersPage] = useState(1);
  const usersPageSize = 10;
  const { data: usersData, refetch: refetchUsers } = useQuery({
    queryKey: ['users', usersPage],
    queryFn: async () => {
      const res = await fetch(`http://localhost:4000/users?page=${usersPage}&pageSize=${usersPageSize}`);
      if (!res.ok) throw new Error("Erreur lors du chargement des utilisateurs.");
      return await res.json();
    }
  });
  const users = usersData?.users || [];
  const usersTotal = usersData?.total || 0;
  const usersTotalPages = Math.ceil(usersTotal / usersPageSize);
  const bannedUsers = users.filter((u: any) => u.role === 'banned');

  const handleDeleteUser = async (id: string) => {
    const userToDelete = users.find((u: any) => u.id === id);
    if (userToDelete && userToDelete.role === 'admin') {
      toast("Erreur", { description: "Impossible de supprimer l'administrateur principal." });
      return;
    }
    if (window.confirm("Supprimer cet utilisateur ?")) {
      try {
        const token = useAuthStore.getState().userToken;
        const res = await fetch(`http://localhost:4000/users/${id}`, {
          method: 'DELETE',
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        const data = await res.json();
        if (!res.ok) {
          toast("Erreur", { description: data.error || "Erreur lors de la suppression de l'utilisateur." });
          return;
        }
        await refetchUsers();
      } catch (e) {
        toast("Erreur", { description: "Erreur réseau lors de la suppression de l'utilisateur." });
      }
    }
  };
  const handleBanUser = async (id: string) => {
    const userToBan = users.find((u: any) => u.id === id);
    if (userToBan && userToBan.role === 'admin') {
      toast("Erreur", { description: "Impossible de bannir l'administrateur principal." });
      return;
    }
    if (window.confirm("Bannir cet utilisateur ?")) {
      try {
        const token = useAuthStore.getState().userToken;
        const res = await fetch(`http://localhost:4000/users/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ role: 'banned' })
        });
        const data = await res.json();
        if (!res.ok) {
          toast("Erreur", { description: data.error || "Erreur lors du bannissement." });
          return;
        }
        await refetchUsers();
      } catch (e) {
        toast("Erreur", { description: "Erreur réseau lors du bannissement." });
      }
    }
  };
  const handleUnbanUser = async (id: string) => {
    try {
      const res = await fetch(`http://localhost:4000/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'user' })
      });
      const data = await res.json();
      if (!res.ok) {
        toast("Erreur", { description: data.error || "Erreur lors du débannissement." });
        return;
      }
      await refetchUsers();
    } catch (e) {
      toast("Erreur", { description: "Erreur réseau lors du débannissement." });
    }
  };
  const handleMakeAdmin = async (id: string) => {
    if (window.confirm("Rendre cet utilisateur administrateur ?")) {
      try {
        const res = await fetch(`http://localhost:4000/users/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'admin' })
        });
        const data = await res.json();
        if (!res.ok) {
          toast("Erreur", { description: data.error || "Erreur lors du passage en admin." });
          return;
        }
        await refetchUsers();
      } catch (e) {
        toast("Erreur", { description: "Erreur réseau lors du passage en admin." });
      }
    }
  };

  // Produits (React Query)
  const { data: productsData, refetch: refetchProducts } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await fetch('http://localhost:4000/products');
      if (!res.ok) throw new Error("Erreur lors du chargement des produits.");
      return await res.json();
    }
  });
  // Trie du plus ancien au plus récent (createdAt)
  const products = (productsData?.products || productsData || []).sort((a, b) => {
    if (!a.createdAt || !b.createdAt) return 0;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  // Codes promo (React Query)
  const { data: promos = [], refetch: refetchPromos } = useQuery({
    queryKey: ['promos'],
    queryFn: async () => {
      const res = await fetch('http://localhost:4000/promos');
      if (!res.ok) throw new Error("Erreur lors du chargement des codes promo.");
      return await res.json();
    }
  });
  const [showPromos, setShowPromos] = useState(false);
  const [newPromo, setNewPromo] = useState({ code: '', discount: '', description: '', expiresAt: '' });
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [showCategories, setShowCategories] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', price: '', originalPrice: '', category: '', image: '', description: '', inStock: true, stock: 1, features: '' });

  // Ajout depuis le modal
  const handleAddProductFromModal = async () => {
    if (!editingProduct.name || !editingProduct.price || !editingProduct.categoryId) return;
    const prod = {
      name: editingProduct.name,
      price: Number(editingProduct.price),
      originalPrice: editingProduct.originalPrice !== undefined && editingProduct.originalPrice !== ''
        ? Number(editingProduct.originalPrice)
        : undefined,
      categoryId: editingProduct.categoryId,
      image: editingProduct.image || 'https://via.placeholder.com/150',
      description: editingProduct.description || '',
      stock: Number(editingProduct.stock) || 1,
      features: editingProduct.features
        ? typeof editingProduct.features === 'string'
          ? editingProduct.features.split(';').map((f: string) => f.trim()).filter(Boolean)
          : editingProduct.features
        : [],
      inStock: editingProduct.inStock,
      rating: 0,
      reviews: 0,
    };
    try {
      const token = useAuthStore.getState().userToken;
      const res = await fetch('http://localhost:4000/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(prod)
      });
      if (!res.ok) {
        const data = await res.json();
        toast("Erreur", { description: data.error || "Erreur lors de l'ajout du produit." });
        return;
      }
      await refetchProducts();
      window.dispatchEvent(new Event("products-updated"));
      setEditingProduct(null);
    } catch (e) {
      toast("Erreur", { description: "Erreur réseau lors de l'ajout du produit." });
    }
  };

  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.price || !newProduct.category) return;
    const prod = {
      name: newProduct.name,
      price: Number(newProduct.price),
      originalPrice: newProduct.originalPrice !== undefined && newProduct.originalPrice !== ''
        ? Number(newProduct.originalPrice)
        : undefined,
      categoryId: newProduct.category,
      image: newProduct.image || 'https://via.placeholder.com/150',
      description: newProduct.description || '',
      stock: Number(newProduct.stock) || 1,
      features: newProduct.features
        ? typeof newProduct.features === 'string'
          ? newProduct.features.split(';').map((f: string) => f.trim()).filter(Boolean)
          : newProduct.features
        : [],
      inStock: newProduct.inStock,
      rating: 0,
      reviews: 0,
    };
    try {
      const token = useAuthStore.getState().userToken;
      const res = await fetch('http://localhost:4000/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(prod)
      });
      if (!res.ok) {
        const data = await res.json();
        toast("Erreur", { description: data.error || "Erreur lors de l'ajout du produit." });
        return;
      }
      await refetchProducts();
      window.dispatchEvent(new Event("products-updated"));
      setNewProduct({ name: '', price: '', originalPrice: '', category: '', image: '', description: '', inStock: true, stock: 1, features: '' });
    } catch (e) {
      toast("Erreur", { description: "Erreur réseau lors de l'ajout du produit." });
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (window.confirm("Supprimer ce produit ?")) {
        try {
            const token = useAuthStore.getState().userToken;
            const res = await fetch(`http://localhost:4000/products/${id}`, {
                method: 'DELETE',
                headers: token ? {Authorization: `Bearer ${token}`} : {}
            });
            const data = await res.json();
            if (!res.ok) {
                toast("Erreur", {description: data.error || "Erreur lors de la suppression du produit."});
                return;
            }
            await refetchProducts();
            window.dispatchEvent(new Event("products-updated"));
        } catch (e) {
            toast("Erreur", {description: "Erreur réseau lors de la suppression du produit."});
        }
    }
  };

  // Suppression définitive d'un produit
  const handleDeleteProductPermanent = async (id: string) => {
    if (window.confirm("⚠️ Cette action supprimera DÉFINITIVEMENT ce produit de la base. Continuer ?")) {
      try {
        const token = useAuthStore.getState().userToken;
        const res = await fetch(`http://localhost:4000/products/${id}/permanent`, {
          method: 'DELETE',
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        const data = await res.json();
        if (!res.ok) {
          toast("Erreur", { description: data.error || "Erreur lors de la suppression définitive du produit." });
          return;
        }
        await refetchProducts();
        window.dispatchEvent(new Event("products-updated"));
        toast("Suppression définitive", { description: "Le produit a été supprimé définitivement." });
      } catch (e) {
        toast("Erreur", { description: "Erreur réseau lors de la suppression définitive du produit." });
      }
    }
  };

  const handleEditProduct = (product: any) => {
    // Clone l'objet pour éviter la disparition du formulaire lors du refetch
    setEditingProduct({ ...product });
  };
  const handleSaveEditProduct = async () => {
    if (!editingProduct.name || !editingProduct.price || !editingProduct.categoryId) return;
    const updatedProduct = {
      name: editingProduct.name,
      price: Number(editingProduct.price),
      originalPrice: editingProduct.originalPrice !== undefined && editingProduct.originalPrice !== ''
        ? Number(editingProduct.originalPrice)
        : undefined,
      categoryId: editingProduct.categoryId,
      image: editingProduct.image || 'https://via.placeholder.com/150',
      description: editingProduct.description || '',
      stock: Number(editingProduct.stock) || 1,
      features: editingProduct.features
        ? typeof editingProduct.features === 'string'
          ? editingProduct.features.split(';').map((f: string) => f.trim()).filter(Boolean)
          : editingProduct.features
        : [],
      inStock: editingProduct.inStock,
    };
    try {
      const token = useAuthStore.getState().userToken;
      const res = await fetch(`http://localhost:4000/products/${editingProduct.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(updatedProduct)
      });
      if (!res.ok) {
        const data = await res.json();
        toast("Erreur", { description: data.error || "Erreur lors de la modification du produit." });
        return;
      }
      await refetchProducts();
      window.dispatchEvent(new Event("products-updated"));
      setEditingProduct(null);
    } catch (e) {
      toast("Erreur", { description: "Erreur réseau lors de la modification du produit." });
    }
  };
  // Catégories (React Query)
  const { data: categories = [], refetch: refetchCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await fetch('http://localhost:4000/categories');
      if (!res.ok) throw new Error("Erreur lors du chargement des catégories.");
      return await res.json();
    }
  });
  const [newCategory, setNewCategory] = useState({ name: '', icon: '' });
  const handleAddCategory = async () => {
    if (!newCategory.name || !newCategory.icon) return;
    try {
      const token = useAuthStore.getState().userToken;
      const res = await fetch('http://localhost:4000/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ name: newCategory.name, icon: newCategory.icon })
      });
      if (!res.ok) {
        const data = await res.json();
        toast("Erreur", { description: data.error || "Erreur lors de l'ajout de la catégorie." });
        return;
      }
      await refetchCategories();
      setNewCategory({ name: '', icon: '' });
      window.dispatchEvent(new Event("categories-updated"));
    } catch (e) {
      toast("Erreur", { description: "Erreur réseau lors de l'ajout de la catégorie." });
    }
  };
  const handleDeleteCategory = async (id: string) => {
    if (window.confirm("Supprimer cette catégorie ?")) {
        try {
            const token = useAuthStore.getState().userToken;
            const res = await fetch(`http://localhost:4000/categories/${id}`, {
                method: 'DELETE',
                headers: token ? {Authorization: `Bearer ${token}`} : {}
            });
            const data = await res.json();
            if (!res.ok) {
                toast("Erreur", {description: data.error || "Erreur lors de la suppression de la catégorie."});
                return;
            }
            await refetchCategories();
            window.dispatchEvent(new Event("categories-updated"));
        } catch (e) {
            toast("Erreur", {description: "Erreur réseau lors de la suppression de la catégorie."});
        }
    }
  };

  // Commandes (React Query)
  const { data: ordersData = [], refetch: refetchOrders } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const res = await fetch('http://localhost:4000/orders');
      if (!res.ok) throw new Error("Erreur lors du chargement des commandes.");
      return await res.json();
    }
  });
  const orders = ordersData?.orders || ordersData || [];
  const totalSales = orders.reduce((acc: number, o: any) => acc + (o.total || 0), 0);
  const totalOrders = orders.length;
  const totalUsers = users.length;
  const totalProducts = products.length;
  const totalBanned = bannedUsers.length;
  const now = new Date();
  const usersThisMonth = users.filter((u: any) => {
    if (!u.createdAt) return false;
    const d = new Date(u.createdAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  const outOfStock = products.filter((p: any) => !p.inStock).length;
  const productsByCategory = categories.map((cat: any) => ({
      name: cat.name,
      count: products.filter((p: any) => p.categoryId === cat.id).length,
    }));
  const panierMoyen = totalOrders > 0 ? (totalSales / totalOrders).toFixed(2) : 0;
  const productSales = products.map((p: any) => ({
    name: p.name,
    sales: orders.filter((o: any) => o.items && o.items.find((i: any) => i.productId === p.id)).length,
  }));
  const topProducts = productSales.sort((a, b) => b.sales - a.sales).slice(0, 3);

  return (
    <div className="container mx-auto py-8 flex gap-8">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0">
        <nav className="flex flex-col gap-2 bg-muted rounded-lg p-4">
          <Button
            variant={section === 'stats' ? 'default' : 'ghost'}
            className="justify-start"
            onClick={() => setSection('stats')}
          >
            Statistiques
          </Button>
          <Button
            variant={section === 'users' ? 'default' : 'ghost'}
            className="justify-start"
            onClick={() => setSection('users')}
          >
            Gestion des utilisateurs
          </Button>
          <Button
            variant={section === 'products' ? 'default' : 'ghost'}
            className="justify-start"
            onClick={() => setSection('products')}
          >
            Gestion des produits
          </Button>
        </nav>
      </aside>
      {/* Main content */}
      <main className="flex-1">
        <h1 className="text-3xl font-bold mb-8 text-center">Administration</h1>
        {section === 'stats' && (
          <section>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <Card className="p-4 text-center">
                <div className="text-2xl font-bold">{totalUsers}</div>
                <div className="text-gray-600">Utilisateurs</div>
                <div className="text-xs text-gray-400">{usersThisMonth} ce mois</div>
              </Card>
              <Card className="p-4 text-center">
                <div className="text-2xl font-bold">{totalProducts}</div>
                <div className="text-gray-600">Produits</div>
                <div className="text-xs text-gray-400">{outOfStock} en rupture</div>
              </Card>
              <Card className="p-4 text-center">
                <div className="text-2xl font-bold">{totalOrders}</div>
                <div className="text-gray-600">Commandes</div>
                <div className="text-xs text-gray-400">Panier moyen : {panierMoyen} FCFA</div>
              </Card>
              <Card className="p-4 text-center">
                <div className="text-2xl font-bold">{totalBanned}</div>
                <div className="text-gray-600">Bannis</div>
              </Card>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="p-4">
                <h3 className="font-bold mb-2">Produits par catégorie</h3>
                <ul>
                  {productsByCategory.map((cat) => (
                    <li key={cat.name}>{cat.name} : {cat.count}</li>
                  ))}
                </ul>
              </Card>
              <Card className="p-4">
                <h3 className="font-bold mb-2">Top produits</h3>
                <ul>
                  {topProducts.map((prod) => (
                    <li key={prod.name}>{prod.name} : {prod.sales} ventes</li>
                  ))}
                </ul>
              </Card>
            </div>
            {/* Liste des commandes reçues */}
            <div className="mt-10">
              <h2 className="text-xl font-bold mb-4">Commandes reçues</h2>
              {orders.length === 0 ? (
                <div className="text-gray-500">Aucune commande reçue pour le moment.</div>
              ) : (
                <div className="overflow-x-auto rounded-lg border bg-background shadow">
                  <table className="min-w-full text-sm">
                    <thead className="text-muted-foreground">
                      <tr>
                        <th className="p-3 text-left">#</th>
                        <th className="p-3 text-left">Client</th>
                        <th className="p-3 text-left">Date</th>
                        <th className="p-3 text-left">Total</th>
                        <th className="p-3 text-left">Réduction</th>
                        <th className="p-3 text-left">Code promo</th>
                        <th className="p-3 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order: any, idx: number) => (
                        <tr key={order.id || idx} className="border-b last:border-0">
                          <td className="p-3">{order.id || idx + 1}</td>
                          <td className="p-3">{order.user?.email || '-'}</td>
                          <td className="p-3">{order.date ? new Date(order.date).toLocaleString() : ''}</td>
                          <td className="p-3">{order.total.toFixed(2)} FCFA</td>
                          <td className="p-3">
                            {order.discount ? `-${order.discount.toFixed(2)} FCFA` : '-'}
                          </td>
                          <td className="p-3">
                            {order.promo || '-'}
                          </td>
                          <td>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setOrderDetails(order)}
                            >
                              Voir détails
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {/* Modal détails commande */}
              {orderDetails && (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
                  tabIndex={-1}
                  aria-modal="true"
                  role="dialog"
                  onKeyDown={e => {
                    if (e.key === "Escape") setOrderDetails(null);
                  }}
                  onClick={e => {
                    if (e.target === e.currentTarget) setOrderDetails(null);
                  }}
                >
                  <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg" tabIndex={0} autoFocus>
                    <h3 className="text-lg text-muted-foreground font-black mb-4 ">
                      Détails de la commande #{orderDetails.id}
                    </h3>
                    <div className="mb-2">
                      <span className="font-medium">Client :</span> {orderDetails.user?.email || '-'}
                    </div>
                    <div className="mb-2">
                      <span className="font-medium">Date :</span> {orderDetails.date ? new Date(orderDetails.date).toLocaleString() : ''}
                    </div>
                    <div className="mb-2">
                      <span className="font-medium">Sous-total :</span> {orderDetails.subtotal ? orderDetails.subtotal.toFixed(2) : orderDetails.total.toFixed(2)} FCFA
                    </div>
                    <div className="mb-2">
                      <span className="font-medium">Réduction :</span> {orderDetails.discount ? `-${orderDetails.discount.toFixed(2)} FCFA` : '-'}
                    </div>
                    <div className="mb-2">
                      <span className="font-medium">Code promo :</span> {orderDetails.promo || '-'}
                    </div>
                    <div className="mb-2">
                      <span className="font-medium">Total :</span> {orderDetails.total.toFixed(2)} FCFA
                    </div>
                    <div className="mb-4">
                      <span className="font-medium">Articles :</span>
                      <ul className="ml-4 mt-2 text-sm text-gray-700">
                        {orderDetails.items.map((item: any) => (
                          <li key={item.productId}>
                            {item.name} × {item.quantity} — {(item.price * item.quantity).toFixed(2)} FCFA
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="flex justify-end">
                      <Button size="sm" variant="outline" onClick={() => setOrderDetails(null)}>
                        Fermer
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}
        {section === 'users' && (
          <section>
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4">Gestion des utilisateurs</h2>
              <ul className="space-y-2">
                {users.map((u: any) => (
                  <li key={u.id} className="flex justify-between items-center border-b py-2">
                    <span>
                      {u.name} ({u.email}) {u.role === 'admin' && <span className="text-xs text-blue-600">(admin)</span>}
                      {u.role === 'banned' && <span className="text-xs text-red-600 ml-2">(banni)</span>}
                    </span>
                    <div className="flex gap-2">
                      {u.role !== 'admin' && (
                        <Button size="sm" variant="outline" onClick={() => handleMakeAdmin(u.id)}>Admin</Button>
                      )}
                      {u.role !== 'banned' ? (
                        <Button size="sm" variant="destructive" onClick={() => handleBanUser(u.id)}>Bannir</Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => handleUnbanUser(u.id)}>Débannir</Button>
                      )}
                      {u.role !== 'admin' && (
                        <Button size="sm" variant="destructive" onClick={() => handleDeleteUser(u.id)}>Supprimer</Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              {/* Pagination utilisateurs */}
              {usersTotalPages > 1 && (
                <div className="flex justify-center mt-4 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setUsersPage((p) => Math.max(1, p - 1))}
                    disabled={usersPage === 1}
                  >
                    Précédent
                  </Button>
                  {Array.from({ length: usersTotalPages }, (_, i) => (
                    <Button
                      key={i + 1}
                      size="sm"
                      variant={usersPage === i + 1 ? "default" : "outline"}
                      onClick={() => setUsersPage(i + 1)}
                    >
                      {i + 1}
                    </Button>
                  ))}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setUsersPage((p) => Math.min(usersTotalPages, p + 1))}
                    disabled={usersPage === usersTotalPages}
                  >
                    Suivant
                  </Button>
                </div>
              )}
            </Card>
          </section>
        )}
        {section === 'products' && (
          <section>
            <div className="flex flex-wrap items-center justify-between mb-6 gap-2">
              <h2 className="text-xl font-bold">Gestion des produits</h2>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => setEditingProduct({ ...newProduct, isNew: true })}>
                  + Ajouter un produit
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowCategories(true)}>
                  Gérer les catégories
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowPromos(true)}>
                  Gérer les codes promo
                </Button>
              </div>
            </div>
            {/* Tableau des produits */}
            <div className="overflow-x-auto rounded-lg border bg-background shadow">
              <table className="min-w-full text-sm">
                <thead className="bg-background">
                  <tr>
                    <th className="p-3 text-left">Photo</th>
                    <th className="p-3 text-left">Nom</th>
                    <th className="p-3 text-left">Prix</th>
                    <th className="p-3 text-left">Catégorie</th>
                    <th className="p-3 text-left">Stock</th>
                    <th className="p-3 text-left">Réduction</th>
                    <th className="p-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Tri du plus ancien au plus récent */}
                  {products
                    .slice()
                    .sort((a, b) => {
                      if (!a.createdAt || !b.createdAt) return 0;
                      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                    })
                    .map((p: any) => (
                      <tr key={p.id} className="border-b last:border-0">
                        <td className="p-3">
                          <img src={p.image} alt={p.name} className="w-12 h-12 object-cover rounded" />
                        </td>
                        <td className="p-3">
                          {p.name}
                          {p.featuredAt && (
                            <span className="ml-2 text-xs text-yellow-500 font-bold">Vedette</span>
                          )}
                        </td>
                        <td className="p-3">{p.price} FCFA</td>
                        <td className="p-3">
                            {categories.find((c: any) => c.id === p.categoryId)?.name || p.categoryId}
                        </td>
                        <td className="p-3">
                          {p.inStock ? (
                            <span className="text-green-600 font-semibold">En stock</span>
                          ) : (
                            <span className="text-red-500 font-semibold">Rupture</span>
                          )}
                        </td>
                        <td className="p-3">
                          {p.originalPrice && p.originalPrice > p.price ? (
                            <span className="text-red-500 font-semibold">
                              -{Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)}%
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="p-3">
                          <Button size="sm" variant="outline" onClick={() => handleEditProduct(p)}>
                            Modifier
                          </Button>
                          <Button size="sm" variant="destructive" className="ml-2" onClick={() => handleDeleteProduct(p.id)}>
                            Supprimer
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="ml-2"
                            style={{ backgroundColor: "#b91c1c", color: "white" }}
                            onClick={() => handleDeleteProductPermanent(p.id)}
                            title="Suppression définitive (irréversible)"
                          >
                            Supp déf
                          </Button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* Modal d'ajout/modification produit */}
            {editingProduct && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
                tabIndex={-1}
                aria-modal="true"
                role="dialog"
                onKeyDown={e => {
                  if (e.key === "Escape") setEditingProduct(null);
                }}
                onClick={e => {
                  if (e.target === e.currentTarget) setEditingProduct(null);
                }}
              >
                <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg" tabIndex={0} autoFocus>
                  <h3 className="text-lg text-muted-foreground font-black mb-4 ">
                    {editingProduct.isNew ? 'Ajouter un produit' : 'Modifier le produit'}
                  </h3>
                  <div className="space-y-2">
                    <Input placeholder="Nom" value={editingProduct.name} onChange={e => setEditingProduct((p: any) => ({ ...p, name: e.target.value }))} />
                    <Input placeholder="Prix" type="number" value={editingProduct.price} onChange={e => setEditingProduct((p: any) => ({ ...p, price: e.target.value }))} />
                    <Input placeholder="Prix d'origine (optionnel)" type="number" value={editingProduct.originalPrice || ''} onChange={e => setEditingProduct((p: any) => ({ ...p, originalPrice: e.target.value }))} />
                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" value={editingProduct.categoryId || ''} onChange={e => setEditingProduct((p: any) => ({ ...p, categoryId: e.target.value }))}>
                      <option value="">Catégorie</option>
                      {categories.map((cat: any) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                    <Input placeholder="Stock" type="number" value={editingProduct.stock || 1} onChange={e => setEditingProduct((p: any) => ({ ...p, stock: Number(e.target.value) }))} />
                    <Input placeholder="Caractéristiques (séparées par ; )" value={editingProduct.features || ''} onChange={e => setEditingProduct((p: any) => ({ ...p, features: e.target.value }))} />
                    <Input placeholder="Image (URL)" value={editingProduct.image} onChange={e => setEditingProduct((p: any) => ({ ...p, image: e.target.value }))} />
                    <Input placeholder="Description" value={editingProduct.description} onChange={e => setEditingProduct((p: any) => ({ ...p, description: e.target.value }))} />
                    <label className="flex items-center gap-2 text-muted-foreground ">
                      <input type="checkbox" checked={editingProduct.inStock} onChange={e => setEditingProduct((p: any) => ({ ...p, inStock: e.target.checked }))} />
                      En stock
                    </label>
                    <label className="flex items-center gap-2 text-yellow-600 font-bold">
                      <input
                        type="checkbox"
                        checked={!!editingProduct.featuredAt}
                        onChange={e => setEditingProduct((p: any) => ({
                          ...p,
                          featuredAt: e.target.checked ? true : false,
                          _featuredAtChanged: true
                        }))}
                      />
                      Vedette
                    </label>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button
                      size="sm"
                      onClick={async () => {
                        if (editingProduct.isNew) {
                          // Ajout d'un produit
                          const prod = {
                            name: editingProduct.name,
                            price: Number(editingProduct.price),
                            originalPrice: editingProduct.originalPrice !== undefined && editingProduct.originalPrice !== ''
                              ? Number(editingProduct.originalPrice)
                              : undefined,
                            categoryId: editingProduct.categoryId,
                            image: editingProduct.image || 'https://via.placeholder.com/150',
                            description: editingProduct.description || '',
                            stock: Number(editingProduct.stock) || 1,
                            features: editingProduct.features
                              ? typeof editingProduct.features === 'string'
                                ? editingProduct.features.split(';').map((f: string) => f.trim()).filter(Boolean)
                                : editingProduct.features
                              : [],
                            inStock: editingProduct.inStock,
                            rating: 0,
                            reviews: 0,
                          };
                          try {
                            const token = useAuthStore.getState().userToken;
                            if (!token) {
                              toast("Erreur", { description: "Vous devez être connecté en tant qu'admin." });
                              return;
                            }
                            // Création du produit
                            const res = await fetch('http://localhost:4000/products', {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${token}`
                              },
                              body: JSON.stringify(prod)
                            });
                            if (!res.ok) {
                              const data = await res.json();
                              toast("Erreur", { description: data.error || "Erreur lors de l'ajout du produit." });
                              return;
                            }
                            const created = await res.json();
                            // Si vedette coché, on l'ajoute aux vedettes
                            if (editingProduct.featuredAt) {
                              const res2 = await fetch(`http://localhost:4000/products/${created.id}/feature`, {
                                method: 'POST',
                                headers: { Authorization: `Bearer ${token}` }
                              });
                              if (!res2.ok) {
                                const data = await res2.json();
                                toast("Erreur", { description: data.error || "Erreur lors de l'ajout aux vedettes." });
                              }
                            }
                            await refetchProducts();
                            window.dispatchEvent(new Event("products-updated"));
                            setEditingProduct(null);
                          } catch (e) {
                            toast("Erreur", { description: "Erreur réseau lors de l'ajout du produit." });
                          }
                        } else {
                          // Edition d'un produit
                          const updatedProduct = {
                            name: editingProduct.name,
                            price: Number(editingProduct.price),
                            originalPrice: editingProduct.originalPrice !== undefined && editingProduct.originalPrice !== ''
                              ? Number(editingProduct.originalPrice)
                              : undefined,
                            categoryId: editingProduct.categoryId,
                            image: editingProduct.image || 'https://via.placeholder.com/150',
                            description: editingProduct.description || '',
                            stock: Number(editingProduct.stock) || 1,
                            features: editingProduct.features
                              ? typeof editingProduct.features === 'string'
                                ? editingProduct.features.split(';').map((f: string) => f.trim()).filter(Boolean)
                                : editingProduct.features
                              : [],
                            inStock: editingProduct.inStock,
                          };
                          try {
                            const token = useAuthStore.getState().userToken;
                            if (!token) {
                              toast("Erreur", { description: "Vous devez être connecté en tant qu'admin." });
                              return;
                            }
                            // Met à jour le produit SANS toucher à createdAt
                            const res = await fetch(`http://localhost:4000/products/${editingProduct.id}`, {
                              method: 'PUT',
                              headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${token}`
                              },
                              body: JSON.stringify(updatedProduct)
                            });
                            if (!res.ok) {
                              const data = await res.json();
                              toast("Erreur", { description: data.error || "Erreur lors de la modification du produit." });
                              return;
                            }
                            // Gère vedette
                            if (editingProduct._featuredAtChanged) {
                              if (editingProduct.featuredAt) {
                                // Ajout aux vedettes
                                const res2 = await fetch(`http://localhost:4000/products/${editingProduct.id}/feature`, {
                                  method: 'POST',
                                  headers: { Authorization: `Bearer ${token}` }
                                });
                                if (!res2.ok) {
                                  const data = await res2.json();
                                  toast("Erreur", { description: data.error || "Erreur lors de l'ajout aux vedettes." });
                                }
                              } else {
                                // Retirer des vedettes
                                const res2 = await fetch(`http://localhost:4000/products/${editingProduct.id}`, {
                                  method: 'PUT',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    Authorization: `Bearer ${token}`
                                  },
                                  body: JSON.stringify({ featuredAt: null })
                                });
                                if (!res2.ok) {
                                  const data = await res2.json();
                                  toast("Erreur", { description: data.error || "Erreur lors du retrait des vedettes." });
                                }
                              }
                            }
                            await refetchProducts();
                            window.dispatchEvent(new Event("products-updated"));
                            setEditingProduct(null);
                          } catch (e) {
                            toast("Erreur", { description: "Erreur réseau lors de la modification du produit." });
                          }
                        }
                      }}
                    >
                      {editingProduct.isNew ? 'Ajouter' : 'Enregistrer'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingProduct(null)}>
                      Annuler
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal gestion des catégories */}
            {showCategories && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
                tabIndex={-1}
                aria-modal="true"
                role="dialog"
                onKeyDown={e => {
                  if (e.key === "Escape") setShowCategories(false);
                }}
                onClick={e => {
                  if (e.target === e.currentTarget) setShowCategories(false);
                }}
              >
                <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md" tabIndex={0} autoFocus>
                  <h3 className="text-lg text-muted-foreground font-black mb-4 ">Gérer les catégories</h3>
                  <div className="mb-4 space-y-2">
                    <Input placeholder="Nom" value={newCategory.name} onChange={e => setNewCategory(c => ({ ...c, name: e.target.value }))} />
                    <Input placeholder="Icône (emoji)" value={newCategory.icon} onChange={e => setNewCategory(c => ({ ...c, icon: e.target.value }))} />
                    <Button size="sm" onClick={handleAddCategory}>Ajouter</Button>
                  </div>
                  <ul className="space-y-2 max-h-32 overflow-auto">
                    {categories.map((c: any) => (
                      <li key={c.id} className="flex justify-between items-center">
                        <span className="text-muted-foreground">{c.icon} {c.name}</span>
                        <Button size="sm" variant="destructive" onClick={() => handleDeleteCategory(c.id)}>Supprimer</Button>
                      </li>
                    ))}
                  </ul>
                  <div className="flex justify-end mt-4">
                    <Button size="sm" variant="outline" onClick={() => setShowCategories(false)}>
                      Fermer
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal gestion des codes promo */}
            {showPromos && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
                tabIndex={-1}
                aria-modal="true"
                role="dialog"
                onKeyDown={e => {
                  if (e.key === "Escape") setShowPromos(false);
                }}
                onClick={e => {
                  if (e.target === e.currentTarget) setShowPromos(false);
                }}
              >
                <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md" tabIndex={0} autoFocus>
                  <h3 className="text-lg text-muted-foreground font-black mb-4 ">Gérer les codes promo</h3>
                  <div className="mb-4 space-y-2">
                    <Input placeholder="Code" value={newPromo.code} onChange={e => setNewPromo(p => ({ ...p, code: e.target.value.toUpperCase() }))} />
                    <Input placeholder="Réduction (ex: 0.1 pour 10%)" value={newPromo.discount} onChange={e => setNewPromo(p => ({ ...p, discount: e.target.value }))} />
                    <Input placeholder="Description" value={newPromo.description} onChange={e => setNewPromo(p => ({ ...p, description: e.target.value }))} />
                    <Input
                      type="date"
                      placeholder="Expiration"
                      value={newPromo.expiresAt}
                      onChange={e => setNewPromo(p => ({ ...p, expiresAt: e.target.value }))}
                    />
                    <Button size="sm" onClick={async () => {
                      if (!newPromo.code || !newPromo.discount) return;
                      const token = useAuthStore.getState().userToken;
                      await fetch('http://localhost:4000/promos', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          ...(token ? { Authorization: `Bearer ${token}` } : {})
                        },
                        body: JSON.stringify({
                          code: newPromo.code,
                          discount: Number(newPromo.discount),
                          description: newPromo.description,
                          expiresAt: newPromo.expiresAt ? new Date(newPromo.expiresAt).toISOString() : null
                        })
                      });
                      await refetchPromos();
                      window.dispatchEvent(new Event("promos-updated"));
                      setNewPromo({ code: '', discount: '', description: '', expiresAt: '' });
                      sendPushNotification("Origine - Nouveau code promo", `Le code ${newPromo.code} est maintenant disponible !`);
                    }}>Ajouter</Button>
                  </div>
                  <ul className="space-y-2 max-h-32 overflow-auto">
                    {promos.map((promo: any) => (
                      <li key={promo.code} className="flex justify-between items-center">
                        <span className="text-muted-foreground">
                          <b>{promo.code}</b> : {promo.discount * 100}% — {promo.description}
                          {promo.expiresAt && (
                            <span className="ml-2 text-xs text-gray-500">
                              (Expire le {new Date(promo.expiresAt).toLocaleDateString()})
                            </span>
                          )}
                        </span>
                        <Button size="sm" variant="destructive" onClick={async () => {
                          const token = useAuthStore.getState().userToken;
                          await fetch(`http://localhost:4000/promos/${promo.id}`, {
                            method: 'DELETE',
                            headers: token ? { Authorization: `Bearer ${token}` } : {}
                          });
                          await refetchPromos();
                          window.dispatchEvent(new Event("promos-updated"));
                        }}>Supprimer</Button>
                      </li>
                    ))}
                  </ul>
                  <div className="flex justify-end mt-4">
                    <Button size="sm" variant="outline" onClick={() => setShowPromos(false)}>
                      Fermer
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}