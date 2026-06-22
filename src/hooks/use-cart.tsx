import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./use-auth";

export interface CartItem {
  id: string;
  productId: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    description: string | null;
    price: number;
    image_url: string | null;
    stock_quantity: number;
    vendor_id: string;
    vendors: {
      business_name: string;
    } | null;
  };
}

interface CartContextType {
  cartItems: CartItem[];
  loading: boolean;
  addToCart: (product: any, quantity?: number) => Promise<void>;
  removeFromCart: (cartItemId: string) => Promise<void>;
  updateQuantity: (cartItemId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  cartCount: number;
  cartTotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartId, setCartId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadCart(user.id);
    } else {
      setCartItems([]);
      setCartId(null);
    }
  }, [user]);

  async function loadCart(userId: string) {
    setLoading(true);
    try {
      // 1. Get or create cart for the logged-in customer
      let { data: cart, error: cartError } = await supabase
        .from("carts")
        .select("id")
        .eq("customer_id", userId)
        .maybeSingle();

      if (cartError) throw cartError;

      if (!cart) {
        const { data: newCart, error: createError } = await supabase
          .from("carts")
          .insert([{ customer_id: userId }])
          .select("id")
          .single();

        if (createError) throw createError;
        cart = newCart;
      }

      setCartId(cart.id);

      // 2. Fetch all items in the cart
      const { data: items, error: itemsError } = await supabase
        .from("cart_items")
        .select(`
          id,
          product_id,
          quantity,
          products (
            id,
            name,
            description,
            price,
            image_url,
            stock_quantity,
            vendor_id,
            vendors (
              business_name
            )
          )
        `)
        .eq("cart_id", cart.id);

      if (itemsError) throw itemsError;

      const formatted = (items || []).map((item: any) => {
        const prod = Array.isArray(item.products) ? item.products[0] : item.products;
        if (prod) {
          prod.vendors = Array.isArray(prod.vendors) ? prod.vendors[0] : prod.vendors;
        }
        return {
          id: item.id,
          productId: item.product_id,
          quantity: item.quantity,
          product: prod
        };
      }).filter(item => item.product !== null) as CartItem[];

      setCartItems(formatted);
    } catch (err) {
      console.error("Error loading cart:", err);
    } finally {
      setLoading(false);
    }
  }

  async function addToCart(product: any, quantity = 1) {
    if (!user || !cartId) return;
    setLoading(true);
    try {
      // Check if item already exists in cart
      const existing = cartItems.find((item) => item.productId === product.id);

      if (existing) {
        const newQty = existing.quantity + quantity;
        const { error } = await supabase
          .from("cart_items")
          .update({ quantity: newQty })
          .eq("id", existing.id);

        if (error) throw error;
        setCartItems((prev) =>
          prev.map((item) =>
            item.productId === product.id ? { ...item, quantity: newQty } : item
          )
        );
      } else {
        const { data, error } = await supabase
          .from("cart_items")
          .insert([
            {
              cart_id: cartId,
              product_id: product.id,
              quantity: quantity,
            },
          ])
          .select("id")
          .single();

        if (error) throw error;
        setCartItems((prev) => [
          ...prev,
          {
            id: data.id,
            productId: product.id,
            quantity: quantity,
            product: product,
          },
        ]);
      }
    } catch (err) {
      console.error("Error adding to cart:", err);
    } finally {
      setLoading(false);
    }
  }

  async function removeFromCart(cartItemId: string) {
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("cart_items")
        .delete()
        .eq("id", cartItemId);

      if (error) throw error;
      setCartItems((prev) => prev.filter((item) => item.id !== cartItemId));
    } catch (err) {
      console.error("Error removing from cart:", err);
    } finally {
      setLoading(false);
    }
  }

  async function updateQuantity(cartItemId: string, quantity: number) {
    if (!user || quantity <= 0) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("cart_items")
        .update({ quantity })
        .eq("id", cartItemId);

      if (error) throw error;
      setCartItems((prev) =>
        prev.map((item) =>
          item.id === cartItemId ? { ...item, quantity } : item
        )
      );
    } catch (err) {
      console.error("Error updating cart quantity:", err);
    } finally {
      setLoading(false);
    }
  }

  async function clearCart() {
    if (!user || !cartId) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("cart_items")
        .delete()
        .eq("cart_id", cartId);

      if (error) throw error;
      setCartItems([]);
    } catch (err) {
      console.error("Error clearing cart:", err);
    } finally {
      setLoading(false);
    }
  }

  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const cartTotal = cartItems.reduce(
    (acc, item) => acc + (item.product?.price || 0) * item.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        cartItems,
        loading,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartCount,
        cartTotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
