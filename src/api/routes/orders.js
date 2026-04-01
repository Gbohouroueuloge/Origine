const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const prisma = new PrismaClient();

// GET /orders (admin) avec pagination
router.get('/', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 20;
  const total = await prisma.order.count();
  const orders = await prisma.order.findMany({
    include: { items: true, user: true },
    skip: (page - 1) * pageSize,
    take: pageSize,
    orderBy: { date: 'desc' }
  });
  res.json({ orders, total, page, pageSize });
});

// GET /orders/user/:userId
router.get('/user/:userId', async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.params.userId },
      include: { items: true }
    });
    res.json(orders);
  } catch (e) {
    console.error("Erreur GET /orders/user/:userId :", e);
    res.status(500).json({ error: "Erreur lors de la récupération des commandes." });
  }
});


const JWT_SECRET = process.env.JWT_SECRET;

function requireAuthUserBody(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: "Token manquant." });
  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: "Token manquant." });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.id === req.body.userId) {
      req.user = decoded;
      return next();
    }
    return res.status(403).json({ error: "Accès interdit." });
  } catch (e) {
    return res.status(401).json({ error: "Token invalide." });
  }
}

// POST /orders
router.post('/', requireAuthUserBody, async (req, res) => {
  const { userId, items, subtotal, discount, total, promo } = req.body;
  try {
    // Vérifie la validité du code promo si présent
    if (promo) {
      const promoObj = await prisma.promo.findUnique({ where: { code: promo } });
      if (!promoObj) {
        return res.status(400).json({ error: "Code promo invalide." });
      }
      if (promoObj.expiresAt && new Date(promoObj.expiresAt) < new Date()) {
        return res.status(400).json({ error: "Ce code promo est expiré." });
      }
    }

    const order = await prisma.order.create({
      data: {
        userId,
        subtotal,
        discount,
        total,
        promo,
        items: {
          create: items.map(item => ({
            productId: item.productId,
            name: item.name,
            price: item.price,
            quantity: item.quantity
          }))
        }
      }
    });
    // Met à jour le stock des produits
    for (const item of items) {
      // Vérifie le stock restant
      const prod = await prisma.product.findUnique({ where: { id: item.productId } });
      if (!prod || prod.stock < item.quantity) {
        return res.status(400).json({ error: `Stock insuffisant pour le produit ${item.name}` });
      }
      const product = await prisma.product.update({
        where: { id: item.productId },
        data: {
          stock: { decrement: item.quantity }
        }
      });
      // Mets à jour inStock si le stock est à 0
      if (product.stock - item.quantity <= 0) {
        await prisma.product.update({
          where: { id: item.productId },
          data: { inStock: false }
        });
      }
    }
    res.status(201).json(order);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

module.exports = router;
