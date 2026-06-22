import React, { useEffect, useState } from "react";
import { useAuth } from "../hooks/use-auth";
import { useCart } from "../hooks/use-cart";
import { supabase } from "../lib/supabase";
import { useLocation, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Heart, Trash2, ShoppingCart, ArrowLeft, Loader2, Star } from "lucide-react";

interface WishlistItem {
  id: string;
  product_id: string;
  products: {
    id: string;
    name: string;
    description: string | null;
    price: number;
    image_url: string | null;
    stock_quantity: number;
    categories: { name: string } | null;
    vendors: { business_name: string } | null;
  } | null;
}

export default function Wishlist() {
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchWishlist();
    }
  }, [user]);

  async function fetchWishlist() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("wishlists")
        .select(`
          id,
          product_id,
          products (
            id,
            name,
            description,
            price,
            image_url,
            stock_quantity,
            categories ( name ),
            vendors ( business_name )
          )
        `)
        .eq("customer_id", user?.id);

      if (error) throw error;

      const formatted = (data || []).map((w: any) => ({
        ...w,
        products: {
          ...w.products,
          categories: Array.isArray(w.products?.categories) ? w.products.categories[0] : w.products?.categories,
          vendors: Array.isArray(w.products?.vendors) ? w.products.vendors[0] : w.products?.vendors,
        }
      })) as WishlistItem[];

      setWishlistItems(formatted.filter(w => w.products !== null));
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error Loading Wishlist", description: err.message });
    } finally {
      setLoading(false);
    }
  }

  const handleRemove = async (wishlistItemId: string, productName: string) => {
    try {
      const { error } = await supabase
        .from("wishlists")
        .delete()
        .eq("id", wishlistItemId);

      if (error) throw error;

      setWishlistItems(prev => prev.filter(item => item.id !== wishlistItemId));
      toast({ title: "Removed from Wishlist", description: `${productName} was removed.` });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Delete Failed", description: err.message });
    }
  };

  const handleAddToCart = async (item: WishlistItem) => {
    if (!item.products) return;
    await addToCart(item.products, 1);
    toast({
      title: "Cart Updated 🛒",
      description: `${item.products.name} has been added to your shopping cart.`,
    });
    // Option to remove from wishlist after adding to cart
    handleRemove(item.id, item.products.name);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-white">
        <Loader2 className="w-12 h-12 text-gold animate-spin" />
        <p className="text-muted mt-4 animate-pulse">Loading saved items...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col">
      
      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-panel border-x-0 border-t-0 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-bold text-2xl flex items-center cursor-pointer">
            <span className="text-white">Vend</span><span className="text-gold">ly</span>
            <Star className="text-gold fill-gold h-5 w-5 ml-1" />
          </Link>
        </div>
      </nav>

      {/* WISHLIST CONTENT */}
      <main className="flex-1 max-w-5xl w-full mx-auto pt-24 pb-16 px-6">
        
        {/* Back Link */}
        <Link href="/" className="inline-flex items-center gap-2 text-muted hover:text-white mb-6 text-sm font-medium transition-colors cursor-pointer group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Catalog</span>
        </Link>

        <h1 className="text-3xl font-extrabold text-white mb-8 flex items-center gap-3">
          <Heart className="w-8 h-8 text-gold" />
          My Wishlist
        </h1>

        {wishlistItems.length === 0 ? (
          <div className="glass-panel p-16 rounded-3xl border border-white/10 text-center max-w-md mx-auto">
            <Heart className="w-16 h-16 text-muted mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-bold text-white mb-2">Wishlist is Empty</h3>
            <p className="text-muted text-sm mb-6">
              You haven't saved any products to your wishlist yet.
            </p>
            <Link href="/">
              <button className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-bold text-sm cursor-pointer gold-glow">
                Browse Products
              </button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {wishlistItems.map((item) => (
              <div 
                key={item.id}
                className="glass-panel rounded-3xl border border-white/10 overflow-hidden hover:border-gold/30 hover:scale-[1.01] transition-all duration-300 flex flex-col justify-between group relative"
              >
                
                {/* Image */}
                <Link href={`/product/${item.product_id}`} className="block relative aspect-square overflow-hidden cursor-pointer bg-black/10">
                  {item.products?.image_url ? (
                    <img 
                      src={item.products.image_url} 
                      alt={item.products.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs font-semibold bg-white/5">
                      No Image Available
                    </div>
                  )}
                </Link>

                {/* Details */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center text-[10px] uppercase tracking-wider font-semibold mb-1 text-muted-foreground">
                      <span>{item.products?.categories?.name || "Uncategorized"}</span>
                      <span className="text-gold truncate max-w-[120px]">{item.products?.vendors?.business_name || "Unknown Store"}</span>
                    </div>

                    <Link href={`/product/${item.product_id}`} className="font-bold text-white text-base leading-snug hover:text-gold hover:underline cursor-pointer block mb-2 line-clamp-2">
                      {item.products?.name}
                    </Link>
                  </div>

                  <div className="space-y-3.5 mt-2">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xl font-black text-emerald">₹{item.products?.price}</span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${item.products && item.products.stock_quantity > 0 ? "text-emerald" : "text-red-400"}`}>
                        {item.products && item.products.stock_quantity > 0 ? "In Stock" : "Out of stock"}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleAddToCart(item)}
                        disabled={!item.products || item.products.stock_quantity <= 0}
                        className={`flex-1 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1 cursor-pointer
                          ${item.products && item.products.stock_quantity > 0 
                            ? "bg-primary text-primary-foreground hover:bg-gold/90 gold-glow" 
                            : "bg-white/5 text-muted-foreground border border-white/10 cursor-not-allowed opacity-60"
                          }`}
                      >
                        <ShoppingCart className="w-3.5 h-3.5" /> Add to Cart
                      </button>
                      
                      <button 
                        onClick={() => handleRemove(item.id, item.products?.name || "Product")}
                        className="p-2.5 hover:bg-red-500/10 text-muted-foreground hover:text-red-400 rounded-xl transition-all cursor-pointer border border-white/10"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                </div>

              </div>
            ))}
          </div>
        )}

      </main>

    </div>
  );
}
