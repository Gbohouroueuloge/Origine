import { create } from 'zustand';

// Redéfinis le type Product minimal ici
export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  categoryId: string;
  image: string;
  description: string;
  features: string[];
  inStock: boolean;
  stock?: number;
  rating: number;
  reviews: number;
  reviewsList?: { user: string; rating: number; text: string }[];
}

interface WishlistStore {
  items: Product[];
  add: (product: Product) => void;
  remove: (productId: string) => void;
  clear: () => void;
  isInWishlist: (productId: string) => boolean;
}

export const useWishlistStore = create<WishlistStore>()(
  (set, get) => ({
    items: [],
    add: (product) => {
      if (!get().items.find((p) => p.id === product.id)) {
        set({ items: [...get().items, product] });
      }
    },
    remove: (productId) => {
      set({ items: get().items.filter((p) => p.id !== productId) });
    },
    clear: () => set({ items: [] }),
    isInWishlist: (productId) => !!get().items.find((p) => p.id === productId),
  })
);