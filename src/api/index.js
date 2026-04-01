const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const app = express();

// CORS sécurisé : autorise seulement l'origine de production en prod
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [process.env.FRONTEND_URL]
  : ['http://localhost:5173'];
  
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());

// Rate limiting
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requêtes par minute par IP
  message: { error: "Trop de requêtes, réessayez plus tard." }
});
app.use(limiter);

app.use('/products', require('./routes/products'));
app.use('/categories', require('./routes/categories'));
app.use('/users', require('./routes/users'));
app.use('/orders', require('./routes/orders'));
app.use('/reviews', require('./routes/reviews'));
app.use('/promos', require('./routes/promos'));
app.use('/cart', require('./routes/cart'));
app.use('/wishlist', require('./routes/wishlist'));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});

// Middleware de gestion d'erreur global
app.use((err, req, res, next) => {
  console.error("Erreur API :", err);
  res.status(500).json({ error: "Erreur interne du serveur." });
});