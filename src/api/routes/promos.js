const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const prisma = new PrismaClient();

// GET /promos (ne retourne que les promos valides)
router.get('/', async (req, res) => {
  try {
    const now = new Date();
    const promos = await prisma.promo.findMany({
      where: {
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } }
        ]
      }
    });
    res.json(promos);
  } catch (e) {
    console.error("Erreur GET /promos :", e);
    res.status(500).json({ error: "Erreur lors de la récupération des codes promo." });
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

router.post('/', requireAdmin, async (req, res) => {
  const { code, discount, description, expiresAt } = req.body;
  try {
    const promo = await prisma.promo.create({
      data: {
        code,
        discount,
        description,
        expiresAt: expiresAt ? new Date(expiresAt) : null
      }
    });
    res.status(201).json(promo);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await prisma.promo.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

module.exports = router;
