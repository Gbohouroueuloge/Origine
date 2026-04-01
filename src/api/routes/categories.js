const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const prisma = new PrismaClient();

router.get('/', async (req, res) => {
  try {
    const categories = await prisma.category.findMany();
    res.json(categories);
  } catch (e) {
    console.error("Erreur GET /categories :", e);
    res.status(500).json({ error: "Erreur lors de la récupération des catégories." });
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
  const data = req.body;
  try {
    const category = await prisma.category.create({ data });
    res.status(201).json(category);
  } catch (e) {
    console.error("Erreur POST /categories :", e);
    res.status(400).json({ error: e.message });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await prisma.category.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) {
    console.error("Erreur DELETE /categories/:id :", e);
    res.status(400).json({ error: e.message });
  }
});

module.exports = router;
