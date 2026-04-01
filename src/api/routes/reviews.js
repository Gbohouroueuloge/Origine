const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const prisma = new PrismaClient();
const sanitizeHtml = require('sanitize-html');

/**
 * Ajoute un avis et met à jour le produit (note moyenne, nombre d'avis, reviewsList)
 */
router.post('/', async (req, res) => {
  const { productId, userId, rating, text } = req.body;
  try {
    // Vérifie si l'utilisateur a déjà laissé un avis pour ce produit
    const existing = await prisma.review.findFirst({ where: { productId, userId } });
    if (existing) {
      return res.status(400).json({ error: "Vous avez déjà laissé un avis pour ce produit." });
    }
    // Sanitize le texte de l'avis
    const cleanText = sanitizeHtml(text, { allowedTags: [], allowedAttributes: {} });
    const review = await prisma.review.create({
      data: { productId, userId, rating, text: cleanText }
    });
    // Recalcule la note moyenne et le nombre d'avis
    const reviews = await prisma.review.findMany({ where: { productId } });
    const avgRating = reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length;
    await prisma.product.update({
      where: { id: productId },
      data: {
        rating: avgRating,
        reviews: reviews.length,
      }
    });
    res.status(201).json(review);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

module.exports = router;
