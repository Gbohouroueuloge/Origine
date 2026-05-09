export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  category: string;
  image: string;
  description: string;
  features: string[];
  inStock: boolean;
  stock?: number; // <--- AJOUTE CETTE LIGNE
  rating: number;
  reviews: number;
  reviewsList?: { user: string; rating: number; text: string }[];
}

export const categories = [
  { id: 'electronics', name: 'Électronique', icon: '📱' },
  { id: 'clothing', name: 'Vêtements', icon: '👕' },
  { id: 'home', name: 'Maison', icon: '🏠' },
  { id: 'books', name: 'Livres', icon: '📚' },
  { id: 'sports', name: 'Sport', icon: '⚽' },
  { id: 'beauty', name: 'Beauté', icon: '💄' }
];

export const products: Product[] = [
  {
    id: '1',
    name: 'iPhone 15 Pro',
    price: 1199,
    originalPrice: 1299,
    category: 'electronics',
    image: 'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=500&h=500&fit=crop',
    description: 'Le dernier iPhone avec puce A17 Pro, appareil photo professionnel et design en titane.',
    features: ['Puce A17 Pro', 'Appareil photo 48MP', 'Écran Super Retina XDR', 'Titane Grade 5'],
    inStock: true,
    rating: 4.8,
    stock: 3,
    reviews: 1250
  },
  {
    id: '2',
    name: 'MacBook Air M2',
    price: 1299,
    category: 'electronics',
    image: 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=500&h=500&fit=crop',
    description: 'MacBook Air avec puce M2, design ultra-fin et autonomie exceptionnelle.',
    features: ['Puce M2', '8-core CPU', '10-core GPU', '18h d\'autonomie'],
    inStock: true,
    rating: 4.9,
    stock: 3,
    reviews: 890
  },
  {
    id: '3',
    name: 'T-shirt Premium Coton',
    price: 29.99,
    originalPrice: 39.99,
    category: 'clothing',
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&h=500&fit=crop',
    description: 'T-shirt en coton bio premium, coupe moderne et confortable.',
    features: ['100% Coton Bio', 'Coupe moderne', 'Résistant au lavage', 'Plusieurs couleurs'],
    inStock: true,
    rating: 4.5,
    stock: 3,
    reviews: 324
  },
  {
    id: '4',
    name: 'Casque Audio Sans Fil',
    price: 199.99,
    category: 'electronics',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop',
    description: 'Casque audio haute qualité avec réduction de bruit active.',
    features: ['Réduction de bruit', 'Bluetooth 5.0', '30h d\'autonomie', 'Charge rapide'],
    inStock: true,
    rating: 4.7,
    stock: 3,
    reviews: 567
  },
  {
    id: '5',
    name: 'Lampe Design LED',
    price: 89.99,
    category: 'home',
    image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=500&h=500&fit=crop',
    description: 'Lampe de bureau design avec éclairage LED ajustable.',
    features: ['LED économique', 'Intensité réglable', 'Design moderne', 'Base stable'],
    inStock: true,
    rating: 4.4,
    stock: 3,
    reviews: 198
  },
  {
    id: '6',
    name: 'Livre "Développement Web"',
    price: 34.99,
    category: 'books',
    image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500&h=500&fit=crop',
    description: 'Guide complet pour apprendre le développement web moderne.',
    features: ['500+ pages', 'Exemples pratiques', 'Dernières technologies', 'Exercices inclus'],
    inStock: true,
    rating: 4.6,
    stock: 3,
    reviews: 412
  },
  {
    id: '7',
    name: 'Chaussures de Running',
    price: 129.99,
    originalPrice: 159.99,
    category: 'sports',
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&h=500&fit=crop',
    description: 'Chaussures de running haute performance avec amorti avancé.',
    features: ['Amorti réactif', 'Respirant', 'Semelle antidérapante', 'Design ergonomique'],
    inStock: true,
    rating: 4.8,
    stock: 2,
    reviews: 743
  },
  {
    id: '8',
    name: 'Parfum Élégance',
    price: 79.99,
    category: 'beauty',
    image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=500&h=500&fit=crop',
    description: 'Parfum sophistiqué aux notes florales et boisées.',
    features: ['Notes florales', 'Longue tenue', 'Flacon élégant', '50ml'],
    inStock: false,
    rating: 4.3,
    stock: 0,
    reviews: 156
  }
];