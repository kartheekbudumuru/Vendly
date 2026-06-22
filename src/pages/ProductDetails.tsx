import React, { useEffect, useState } from "react";
import { useAuth } from "../hooks/use-auth";
import { useCart } from "../hooks/use-cart";
import { supabase } from "../lib/supabase";
import { useLocation, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { 
  Star, ShoppingCart, Heart, Coins, ArrowLeft, Loader2, Sparkles, 
  MessageSquare, User, Calendar, ShieldAlert 
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  stock_quantity: number;
  category_id: string;
  categories: { name: string } | null;
  vendors: { business_name: string; name: string } | null;
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  profiles: { name: string } | null;
}

export default function ProductDetails({ params }: { params: { productId: string } }) {
  const { productId } = params;
  const { user } = useAuth();
  const { addToCart, cartCount } = useCart();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Data State
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [wishlistedIds, setWishlistedIds] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Review Form State
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState("");

  useEffect(() => {
    fetchProductAndReviews();
  }, [productId, user]);

  async function fetchProductAndReviews() {
    setLoading(true);
    try {
      // 1. Fetch product details
      const { data: prodData, error: prodError } = await supabase
        .from("products")
        .select(`
          id, name, description, price, image_url, stock_quantity, category_id,
          categories ( name ),
          vendors ( business_name, name )
        `)
        .eq("id", productId)
        .maybeSingle();

      if (prodError) throw prodError;
      if (!prodData) {
        setProduct(null);
        return;
      }

      setProduct({
        ...prodData,
        categories: Array.isArray(prodData.categories) ? prodData.categories[0] : prodData.categories,
        vendors: Array.isArray(prodData.vendors) ? prodData.vendors[0] : prodData.vendors
      } as Product);

      // 2. Fetch product reviews
      const { data: revData, error: revError } = await supabase
        .from("reviews")
        .select(`
          id, rating, comment, created_at,
          profiles ( name )
        `)
        .eq("product_id", productId)
        .order("created_at", { ascending: false });

      if (revError) throw revError;
      setReviews((revData || []).map((r: any) => ({
        ...r,
        profiles: Array.isArray(r.profiles) ? r.profiles[0] : r.profiles
      })) as Review[]);

      // 3. Fetch wishlist
      if (user) {
        const { data: wishData } = await supabase
          .from("wishlists")
          .select("product_id")
          .eq("customer_id", user.id);
        setWishlistedIds((wishData || []).map((w: any) => w.product_id));
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Load Error", description: err.message });
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleWishlist() {
    if (!user || !product) {
      toast({ variant: "destructive", title: "Authentication Required", description: "Please sign in to add items to wishlist." });
      setLocation("/login");
      return;
    }

    const isSaved = wishlistedIds.includes(product.id);
    try {
      if (isSaved) {
        const { error } = await supabase
          .from("wishlists")
          .delete()
          .eq("customer_id", user.id)
          .eq("product_id", product.id);

        if (error) throw error;
        setWishlistedIds(prev => prev.filter(id => id !== product.id));
        toast({ title: "Removed from Wishlist", description: "Item has been removed." });
      } else {
        const { error } = await supabase
          .from("wishlists")
          .insert([{ customer_id: user.id, product_id: product.id }]);

        if (error) throw error;
        setWishlistedIds(prev => [...prev, product.id]);
        toast({ title: "Added to Wishlist", description: "Item saved to wishlist." });
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Action Failed", description: err.message });
    }
  }

  async function handleAddToCart() {
    if (!product) return;
    if (!user) {
      toast({ variant: "destructive", title: "Authentication Required", description: "Please sign in to add items to cart." });
      setLocation("/login");
      return;
    }

    await addToCart(product, quantity);
    toast({
      title: "Cart Updated! 🛒",
      description: `Added ${quantity} of ${product.name} to your cart.`,
    });
  }

  async function handlePostReview(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !product) return;
    setActionLoading(true);

    try {
      const { error } = await supabase
        .from("reviews")
        .insert([
          {
            product_id: product.id,
            customer_id: user.id,
            rating: newRating,
            comment: newComment.trim(),
          }
        ]);

      if (error) throw error;

      toast({ title: "Review Posted! 🎉", description: "Your product review has been submitted successfully." });
      setNewComment("");
      setNewRating(5);
      fetchProductAndReviews();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Submission Failed", description: err.message });
    } finally {
      setActionLoading(false);
    }
  }

  // Calculate review averages
  const averageRating = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : "—";

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-white">
        <Loader2 className="w-12 h-12 text-gold animate-spin" />
        <p className="text-muted mt-4 animate-pulse">Loading product specifications...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-white px-4">
        <div className="glass-panel p-8 rounded-2xl max-w-md w-full text-center">
          <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Product Not Found</h2>
          <p className="text-muted mb-6">The requested product does not exist or has been removed.</p>
          <button onClick={() => setLocation("/")} className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-bold">
            Back to Catalog
          </button>
        </div>
      </div>
    );
  }

  const isSaved = wishlistedIds.includes(product.id);

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
        <div className="flex items-center gap-4">
          <Link href="/wishlist" className="p-2 hover:bg-white/10 rounded-full text-white relative transition-colors">
            <Heart className={`w-5 h-5 ${isSaved ? "fill-gold text-gold" : ""}`} />
          </Link>
          <Link href="/cart" className="p-2 hover:bg-white/10 rounded-full text-white relative transition-colors">
            <ShoppingCart className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-gold text-card rounded-full text-[10px] w-4 h-4 flex items-center justify-center font-bold">
                {cartCount}
              </span>
            )}
          </Link>
        </div>
      </nav>

      {/* BODY SPECIFICATION SHEET */}
      <main className="flex-1 max-w-5xl w-full mx-auto pt-24 pb-16 px-6">
        
        {/* Back Link */}
        <Link href="/" className="inline-flex items-center gap-2 text-muted hover:text-white mb-6 text-sm font-medium transition-colors cursor-pointer group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Catalog</span>
        </Link>

        {/* Product Details Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-12">
          
          {/* Left image block */}
          <div className="glass-panel rounded-3xl border border-white/10 overflow-hidden flex items-center justify-center bg-black/10 aspect-square">
            {product.image_url ? (
              <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-muted-foreground text-sm font-semibold">No Image Available</span>
            )}
          </div>

          {/* Right Product Onboarding details */}
          <div className="flex flex-col justify-between">
            <div className="space-y-4">
              
              {/* Category tag */}
              <div className="flex justify-between items-center text-xs uppercase tracking-wider font-semibold text-gold">
                <span>{product.categories?.name || "Uncategorized"}</span>
                <span className="text-blue">{product.vendors?.business_name || "Unknown Shop"}</span>
              </div>

              {/* Title */}
              <h1 className="text-3xl font-extrabold text-white leading-tight">
                {product.name}
              </h1>

              {/* Rating and Reviews count */}
              <div className="flex items-center gap-4 text-xs font-semibold">
                <div className="flex items-center gap-1.5 text-gold bg-gold/10 px-3 py-1 rounded-full border border-gold/15">
                  <Star className="w-3.5 h-3.5 fill-gold text-gold" />
                  <span>{averageRating} Rating</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>{reviews.length} Customer Reviews</span>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Product Description</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {product.description || "No description provided for this product."}
                </p>
              </div>

              {/* Shop Vendor */}
              <div className="text-xs text-muted-foreground bg-white/5 border border-white/5 rounded-2xl p-3.5 flex items-center justify-between">
                <div>
                  <span className="block text-[10px] uppercase font-semibold text-muted-foreground">Sold By</span>
                  <span className="font-bold text-white text-sm">{product.vendors?.business_name}</span>
                </div>
                <div className="text-right">
                  <span className="block text-[10px] uppercase font-semibold text-muted-foreground">Seller Name</span>
                  <span className="font-semibold text-white">{product.vendors?.name}</span>
                </div>
              </div>

            </div>

            {/* Buying box */}
            <div className="pt-6 border-t border-white/5 space-y-4 mt-6">
              
              <div className="flex justify-between items-baseline">
                <span className="text-3xl font-black text-emerald">₹{product.price}</span>
                <span className={`text-xs font-bold uppercase tracking-wider ${product.stock_quantity > 0 ? "text-emerald" : "text-red-400"}`}>
                  {product.stock_quantity > 0 ? `${product.stock_quantity} items remaining` : "Out of stock"}
                </span>
              </div>

              <div className="flex gap-4">
                
                {/* Quantity adjuster */}
                {product.stock_quantity > 0 && (
                  <div className="flex items-center border border-white/10 rounded-xl bg-white/5 overflow-hidden">
                    <button 
                      onClick={() => setQuantity(prev => Math.max(prev - 1, 1))}
                      className="px-3.5 py-2 text-white hover:bg-white/10 transition-colors font-bold text-sm cursor-pointer"
                    >
                      -
                    </button>
                    <span className="px-3.5 py-2 font-bold text-white text-sm">{quantity}</span>
                    <button 
                      onClick={() => setQuantity(prev => Math.min(prev + 1, product.stock_quantity))}
                      className="px-3.5 py-2 text-white hover:bg-white/10 transition-colors font-bold text-sm cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                )}

                <button 
                  onClick={handleAddToCart}
                  disabled={product.stock_quantity <= 0}
                  className={`flex-1 py-3 rounded-xl font-bold hover:bg-gold/90 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm gold-glow
                    ${product.stock_quantity > 0 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-white/5 text-muted-foreground border border-white/10 cursor-not-allowed opacity-60"
                    }`}
                >
                  <ShoppingCart className="w-4 h-4" />
                  {product.stock_quantity > 0 ? "Add to Cart" : "Out of stock"}
                </button>

                <button 
                  onClick={handleToggleWishlist}
                  className={`p-3 rounded-xl border transition-colors cursor-pointer ${isSaved ? "bg-gold/15 border-gold/40 text-gold" : "bg-white/5 border-white/10 text-white hover:bg-white/10"}`}
                >
                  <Heart className="w-5 h-5" />
                </button>

              </div>
            </div>

          </div>

        </div>

        {/* Reviews Lists */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 border-t border-white/10 pt-12">
          
          {/* Review write panel */}
          <div className="lg:col-span-1 space-y-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-gold" />
              Write Product Review
            </h2>
            
            {user ? (
              <form onSubmit={handlePostReview} className="glass-panel p-5 rounded-3xl border border-white/10 space-y-4">
                
                {/* Rating selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Rating Star</label>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setNewRating(val)}
                        className="text-muted-foreground hover:text-gold transition-colors cursor-pointer"
                      >
                        <Star className={`w-6 h-6 ${val <= newRating ? "fill-gold text-gold" : ""}`} />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Comment box */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Comment Details</label>
                  <textarea
                    required
                    placeholder="Share your thoughts about this product's quality, packing, and overall usage..."
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-muted-foreground focus:outline-none focus:border-gold text-xs resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl font-bold hover:bg-gold/90 transition-all text-xs cursor-pointer gold-glow flex items-center justify-center gap-2"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Post Review"}
                </button>

              </form>
            ) : (
              <div className="glass-panel p-6 rounded-3xl border border-white/10 text-center">
                <User className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                <h4 className="text-sm font-bold text-white mb-1">Authenticated Only</h4>
                <p className="text-xs text-muted-foreground mb-4">Please log in to submit your reviews.</p>
                <Link href="/login">
                  <button className="bg-primary text-primary-foreground px-4 py-1.5 rounded-full font-bold text-xs cursor-pointer">
                    Sign In
                  </button>
                </Link>
              </div>
            )}
          </div>

          {/* Reviews list panel */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-gold" />
              Customer Reviews ({reviews.length})
            </h2>

            {reviews.length === 0 ? (
              <div className="glass-panel p-10 rounded-3xl border border-white/10 text-center">
                <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <h4 className="text-base font-bold text-white mb-1">No Reviews Yet</h4>
                <p className="text-xs text-muted-foreground">Be the first to review this product!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map(review => (
                  <div key={review.id} className="glass-panel p-5 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                    <div className="flex items-start justify-between gap-4 mb-2.5">
                      
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gold/15 border border-gold/30 flex items-center justify-center font-bold text-gold text-xs">
                          {review.profiles?.name?.charAt(0).toUpperCase() || "C"}
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm">{review.profiles?.name || "Anonymous Buyer"}</div>
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(review.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      {/* Stars */}
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map(val => (
                          <Star key={val} className={`w-3.5 h-3.5 ${val <= review.rating ? "fill-gold text-gold" : "text-muted-foreground"}`} />
                        ))}
                      </div>

                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{review.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </main>

    </div>
  );
}
