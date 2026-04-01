// api/routes/products.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const sanitizeHtml = require('sanitize-html');
const prisma = new PrismaClient();

router.get('/', async (req, res) => {
  // Pagination: ?page=1&pageSize=12
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 12;

  // Filtres
  const where = {};
  if (req.query.category && req.query.category !== "all") {
    where.categoryId = req.query.category;
  }
  if (req.query.search) {
    where.OR = [
      { name: { contains: req.query.search, mode: 'insensitive' } },
      { description: { contains: req.query.search, mode: 'insensitive' } }
    ];
  }
  if (req.query.minPrice || req.query.maxPrice) {
    where.price = {};
    if (req.query.minPrice) where.price.gte = parseFloat(req.query.minPrice);
    if (req.query.maxPrice) where.price.lte = parseFloat(req.query.maxPrice);
  }

  // Tri
  let orderBy = { createdAt: 'asc' };
  if (req.query.sortBy) {
    switch (req.query.sortBy) {
      case 'price-low':
        orderBy = { price: 'asc' };
        break;
      case 'price-high':
        orderBy = { price: 'desc' };
        break;
      case 'rating':
        orderBy = { rating: 'desc' };
        break;
      case 'name':
        orderBy = { name: 'asc' };
        break;
      default:
        orderBy = { createdAt: 'asc' };
    }
  }

  try {
    const total = await prisma.product.count({ where });
    const products = await prisma.product.findMany({
      where,
      include: { category: true },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy
    });
    res.json({ products, total, page, pageSize });
  } catch (e) {
    console.error("Erreur GET /products :", e);
    res.status(500).json({ error: "Erreur lors de la récupération des produits." });
  }
});

// GET /products/featured : retourne les 8 produits vedettes (du plus récent au plus ancien)
router.get('/featured', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { featuredAt: { not: null } },
      orderBy: { featuredAt: 'desc' },
      take: 8
    });
    res.json(products);
  } catch (e) {
    res.status(500).json({ error: "Erreur lors de la récupération des produits vedettes." });
  }
});

// POST /products/:id/feature : ajoute un produit aux vedettes (remplace le plus ancien si > 8)
router.post('/:id/feature', requireAdmin, async (req, res) => {
  try {
    // Compte le nombre de produits vedettes
    const featured = await prisma.product.findMany({
      where: { featuredAt: { not: null } },
      orderBy: { featuredAt: 'asc' }
    });
    if (featured.length >= 8) {
      // Retire le plus ancien
      await prisma.product.update({
        where: { id: featured[0].id },
        data: { featuredAt: null }
      });
    }
    // Met à jour le produit courant
    const updated = await prisma.product.update({
      where: { id: req.params.id },
      data: { featuredAt: new Date() }
    });
    res.json(updated);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: { category: true, reviewsList: { include: { user: true } } }
    });
    if (!product) return res.status(404).json({ error: 'Produit non trouvé' });
    res.json(product);
  } catch (e) {
    console.error("Erreur GET /products/:id :", e);
    res.status(500).json({ error: "Erreur lors de la récupération du produit." });
  }
});


const JWT_SECRET = process.env.JWT_SECRET;

// Middleware d'authentification admin sécurisé (JWT)
function requireAdmin(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: "Token manquant." });
  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: "Token manquant." });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: "Accès réservé à l'administrateur." });
    }
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ error: "Token invalide." });
  }
}

// POST /products
router.post('/', requireAdmin, async (req, res) => {
  const data = req.body;
  try {
    if (data.description) {
      data.description = sanitizeHtml(data.description, { allowedTags: [], allowedAttributes: {} });
    }
    const product = await prisma.product.create({ data });
    res.status(201).json(product);
  } catch (e) {
    console.error("Erreur POST /products :", e);
    res.status(400).json({ error: e.message });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  const data = req.body;
  try {
    if (data.description) {
      data.description = sanitizeHtml(data.description, { allowedTags: [], allowedAttributes: {} });
    }
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data
    });
    res.json(product);
  } catch (e) {
    console.error("Erreur PUT /products/:id :", e);
    res.status(400).json({ error: e.message });
  }
});

/**
 * Suppression logique (désactive le produit)
 */
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    // Désactive le produit au lieu de le supprimer pour garder l'historique des commandes
    await prisma.product.update({
      where: { id: req.params.id },
      data: { inStock: false }
    });
    res.json({ success: true });
  } catch (e) {
    console.error("Erreur DELETE /products/:id :", e);
    res.status(400).json({ error: e.message });
  }
});

/**
 * Suppression définitive d'un produit (irréversible)
 * DELETE /products/:id/permanent
 */
router.delete('/:id/permanent', requireAdmin, async (req, res) => {
  try {
    // Supprime les reviews liées
    await prisma.review.deleteMany({ where: { productId: req.params.id } });
    // Supprime les items de commandes liés
    await prisma.orderItem.deleteMany({ where: { productId: req.params.id } });
    // Supprime le produit
    await prisma.product.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) {
    console.error("Erreur DELETE /products/:id/permanent :", e);
    res.status(400).json({ error: e.message });
  }
});

module.exports = router;
