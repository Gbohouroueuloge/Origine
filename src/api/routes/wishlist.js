const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const prisma = new PrismaClient();


const JWT_SECRET = process.env.JWT_SECRET;

function requireAuthUser(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: "Token manquant." });
  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: "Token manquant." });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.id === req.params.userId) {
      req.user = decoded;
      return next();
    }
    return res.status(403).json({ error: "Accès interdit." });
  } catch (e) {
    return res.status(401).json({ error: "Token invalide." });
  }
}

// GET /wishlist/:userId
router.get('/:userId', requireAuthUser, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.userId },
      select: { wishlist: true }
    });
    res.json(user?.wishlist || []);
  } catch (e) {
    console.error("Erreur GET /wishlist/:userId :", e);
    res.status(500).json({ error: "Erreur lors de la récupération des favoris." });
  }
});

// POST /wishlist/:userId
router.post('/:userId', requireAuthUser, async (req, res) => {
  const { items } = req.body;
  try {
    const user = await prisma.user.update({
      where: { id: req.params.userId },
      data: { wishlist: items }
    });
    res.json(user.wishlist);
  } catch (e) {
    console.error("Erreur POST /wishlist/:userId :", e);
    res.status(400).json({ error: e.message });
  }
});

module.exports = router;
