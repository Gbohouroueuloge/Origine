const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.REFRESH_SECRET;


// Inscription
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "Tous les champs sont obligatoires." });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Le mot de passe doit contenir au moins 6 caractères." });
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(400).json({ error: "Cet email est déjà utilisé." });
  }
  const hash = bcrypt.hashSync(password, 10);
  try {
    // Vérifie s'il y a déjà des utilisateurs
    const userCount = await prisma.user.count();
    const role = userCount === 0 ? 'admin' : 'user';
    const user = await prisma.user.create({
      data: { name, email, password: hash, role }
    });
    res.status(201).json({ id: user.id, name: user.name, email: user.email, role: user.role });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Connexion
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
  if (user.role === 'banned') {
    return res.status(403).json({ error: 'Votre compte a été banni.' });
  }
  if (!bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
  }
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ id: user.id, email: user.email, role: user.role }, REFRESH_SECRET, { expiresIn: '30d' });
  // Stocke le refreshToken en base
  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken }
  });
  res.json({
    token,
    refreshToken,
    user: { id: user.id, name: user.name, email: user.email, role: user.role }
  });
});

// Liste des utilisateurs (admin) avec pagination
router.get('/', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 20;
  const total = await prisma.user.count();
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    skip: (page - 1) * pageSize,
    take: pageSize,
    orderBy: { createdAt: 'desc' }
  });
  res.json({ users, total, page, pageSize });
});

// GET /users/:id
router.get('/:id', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { id: true, name: true, email: true, role: true, createdAt: true }
    });
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    res.json(user);
  } catch (e) {
    console.error("Erreur GET /users/:id :", e);
    res.status(500).json({ error: "Erreur lors de la récupération de l'utilisateur." });
  }
});

function requireAuthOrAdmin(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: "Token manquant." });
  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: "Token manquant." });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role === 'admin' || decoded.id === req.params.id) {
      req.user = decoded;
      return next();
    }
    return res.status(403).json({ error: "Accès interdit." });
  } catch (e) {
    return res.status(401).json({ error: "Token invalide." });
  }
}

// Modifier un utilisateur par son id
router.put('/:id', requireAuthOrAdmin, async (req, res) => {
  const { name, email, role, password, theme, filters } = req.body;
  try {
    let data = {};
    if (role) data.role = role;
    if (name) data.name = name;
    if (email) data.email = email;
    if (password) {
      const bcrypt = require('bcryptjs');
      data.password = bcrypt.hashSync(password, 10);
    }
    if (theme) data.theme = theme;
    if (filters) data.filters = filters;
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data
    });
    res.json({ id: user.id, name: user.name, email: user.email, role: user.role, theme: user.theme, filters: user.filters });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Endpoint PATCH pour juste le thème ou les filtres
router.patch('/:id/preferences', requireAuthOrAdmin, async (req, res) => {
  const { theme, filters } = req.body;
  try {
    const data = {};
    if (theme) data.theme = theme;
    if (filters) data.filters = filters;
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data
    });
    res.json({ theme: user.theme, filters: user.filters });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
// Supprimer un utilisateur par son id
router.delete('/:id', requireAuthOrAdmin, async (req, res) => {
  console.log('Suppression utilisateur', req.params.id);
  try {
    // Supprime les avis de l'utilisateur
    await prisma.review.deleteMany({ where: { userId: req.params.id } });
    // Supprime les items de commandes de l'utilisateur
    const orders = await prisma.order.findMany({ where: { userId: req.params.id } });
    if (orders.length > 0) {
      const orderIds = orders.map(o => o.id);
      await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    }
    // Supprime l'utilisateur
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Endpoint pour rafraîchir le JWT
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ error: "Refresh token manquant." });
  try {
    const decoded = jwt.verify(refreshToken, REFRESH_SECRET);
    // Vérifie que le refreshToken correspond à celui stocké en base
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(403).json({ error: "Refresh token invalide." });
    }
    // Renvoie un nouveau JWT court
    const token = jwt.sign(
      { id: decoded.id, email: decoded.email, role: decoded.role },
      JWT_SECRET,
      { expiresIn: '15m' }
    );
    res.json({ token });
  } catch (e) {
    return res.status(401).json({ error: "Refresh token invalide ou expiré." });
  }
});

module.exports = router;
