import React, { useEffect, useState } from "react";
import { useAuth } from "../hooks/use-auth";
import { useCart } from "../hooks/use-cart";
import { supabase } from "../lib/supabase";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { 
  Star, Search, ShoppingCart, Heart, Coins, ChevronRight, 
  ArrowRight, Shield, RefreshCw, Loader2, Tag, SlidersHorizontal 
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
  vendors: { business_name: string } | null;
}

interface Category {
  id: string;
  name: string;
}

export default function Home() {
  const { user, profile } = useAuth();
  const { addToCart, cartCount } = useCart();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Data State
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [wishlistedIds, setWishlistedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [maxPrice, setMaxPrice] = useState<number>(5000);
  const [sortBy, setSortBy] = useState<string>("newest");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, [user]);

  async function fetchInitialData() {
    setLoading(true);
    try {
      // 1. Fetch categories
      const { data: catData } = await supabase.from("categories").select("id, name");
      setCategories(catData || []);

      // 2. Fetch products
      const { data: prodData, error } = await supabase
        .from("products")
        .select(`
          id, name, description, price, image_url, stock_quantity, category_id,
          categories ( name ),
          vendors ( business_name )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      const formatted = (prodData || []).map((p: any) => ({
        ...p,
        categories: Array.isArray(p.categories) ? p.categories[0] : p.categories,
        vendors: Array.isArray(p.vendors) ? p.vendors[0] : p.vendors
      })) as Product[];

      setProducts(formatted);

      // 3. Set default price slider maximum based on products
      if (formatted.length > 0) {
        const prices = formatted.map(p => p.price);
        setMaxPrice(Math.max(...prices, 1000));
      }

      // 4. Fetch customer wishlist
      if (user) {
        const { data: wishData } = await supabase
          .from("wishlists")
          .select("product_id")
          .eq("customer_id", user.id);
        setWishlistedIds((wishData || []).map((w: any) => w.product_id));
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error Loading Platform", description: err.message });
    } finally {
      setLoading(false);
    }
  }

  async function toggleWishlist(productId: string) {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Authentication Required",
        description: "Please sign in to add items to your wishlist.",
      });
      setLocation("/login");
      return;
    }

    const isWishlisted = wishlistedIds.includes(productId);
    try {
      if (isWishlisted) {
        const { error } = await supabase
          .from("wishlists")
          .delete()
          .eq("customer_id", user.id)
          .eq("product_id", productId);

        if (error) throw error;
        setWishlistedIds(prev => prev.filter(id => id !== productId));
        toast({ title: "Removed from Wishlist", description: "Item removed from your wishlist." });
      } else {
        const { error } = await supabase
          .from("wishlists")
          .insert([{ customer_id: user.id, product_id: productId }]);

        if (error) throw error;
        setWishlistedIds(prev => [...prev, productId]);
        toast({ title: "Added to Wishlist", description: "Item saved to your wishlist." });
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Action Failed", description: err.message });
    }
  }

  const handleAddToCart = async (product: Product) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Authentication Required",
        description: "Please sign in to add items to your shopping cart.",
      });
      setLocation("/login");
      return;
    }

    await addToCart(product, 1);
    toast({
      title: "Added to Cart 🛒",
      description: `${product.name} has been added to your shopping cart.`,
    });
  };

  // Filter & Sort Logic
  const filteredProducts = products
    .filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        p.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === "all" || p.category_id === selectedCategory;
      const matchesPrice = p.price <= maxPrice;
      return matchesSearch && matchesCategory && matchesPrice;
    })
    .sort((a, b) => {
      if (sortBy === "price-asc") return a.price - b.price;
      if (sortBy === "price-desc") return b.price - a.price;
      return 0; // default newest sorting (already ordered from API query)
    });

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col relative overflow-hidden">
      
      {/* Dynamic Background */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gold/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-panel border-x-0 border-t-0 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="font-bold text-2xl flex items-center">
            <span className="text-white">Vend</span><span className="text-gold">ly</span>
            <Star className="text-gold fill-gold h-5 w-5 ml-1" />
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-muted">
            <Link href="/" className="text-white border-b-2 border-gold pb-1 font-bold">Catalog</Link>
            {profile?.role === "vendor" && <Link href="/dashboard" className="hover:text-white transition-colors">Seller Panel</Link>}
            {profile?.role === "admin" && <Link href="/admin" className="hover:text-white transition-colors">Admin Panel</Link>}
            {profile?.role === "customer" && <Link href="/customer/portal" className="hover:text-white transition-colors">My Orders</Link>}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link href="/wishlist" className="p-2 hover:bg-white/10 rounded-full text-muted-hover text-white relative transition-colors" title="Wishlist">
            <Heart className="w-5 h-5" />
            {wishlistedIds.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full text-[10px] w-4 h-4 flex items-center justify-center font-bold">
                {wishlistedIds.length}
              </span>
            )}
          </Link>
          <Link href="/cart" className="p-2 hover:bg-white/10 rounded-full text-white relative transition-colors" title="Cart">
            <ShoppingCart className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-gold text-card rounded-full text-[10px] w-4 h-4 flex items-center justify-center font-bold">
                {cartCount}
              </span>
            )}
          </Link>

          {user ? (
            <div className="flex items-center gap-3">
              <span className="hidden md:block text-xs font-semibold uppercase tracking-wider bg-gold/15 text-gold px-2.5 py-1 rounded-full border border-gold/15">
                {profile?.role}
              </span>
              <Link href={profile?.role === "vendor" ? "/dashboard" : "/customer/portal"}>
                <button className="bg-primary text-primary-foreground px-4 py-2 rounded-full font-semibold hover:bg-gold/90 transition-all text-sm cursor-pointer gold-glow">
                  Dashboard
                </button>
              </Link>
            </div>
          ) : (
            <Link href="/login">
              <button className="bg-primary text-primary-foreground px-5 py-2 rounded-full font-semibold hover:bg-gold/90 transition-all text-sm cursor-pointer gold-glow">
                Sign In
              </button>
            </Link>
          )}
        </div>
      </nav>

      {/* HERO / PRODUCT PROMOTION */}
      <header className="relative pt-28 pb-12 px-6 flex items-center justify-center text-center">
        <div className="max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">
            Discover Great Products. <span className="text-gold">Delivered Fast.</span>
          </h1>
          <p className="text-muted text-sm md:text-base max-w-lg mx-auto">
            Browse our verified vendor catalogs and buy products securely using our e-commerce platform.
          </p>
        </div>
      </header>

      {/* MAIN CATALOG */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 pb-20 grid grid-cols-1 lg:grid-cols-4 gap-8 z-10">
        
        {/* Left Side Filters Pane */}
        <aside className="lg:col-span-1 space-y-6">
          
          {/* Quick Search */}
          <div className="glass-panel p-5 rounded-3xl border border-white/10">
            <h3 className="text-sm font-bold text-white mb-3">Search Products</h3>
            <div className="relative">
              <input 
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-muted-foreground focus:outline-none focus:border-gold text-xs"
              />
              <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-3.5" />
            </div>
          </div>

          {/* Filters Toggle Button (Mobile only) */}
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className="w-full lg:hidden flex items-center justify-center gap-2 border border-white/10 bg-white/5 py-3 rounded-2xl text-xs font-bold text-white"
          >
            <SlidersHorizontal className="w-4 h-4 text-gold" />
            {showFilters ? "Hide Filter Options" : "Show Filter Options"}
          </button>

          {/* Categories & Price Filters */}
          <div className={`space-y-6 lg:block ${showFilters ? "block" : "hidden"}`}>
            
            {/* Category selection */}
            <div className="glass-panel p-5 rounded-3xl border border-white/10">
              <h3 className="text-sm font-bold text-white mb-3">Categories</h3>
              <div className="space-y-2">
                <button
                  onClick={() => setSelectedCategory("all")}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center justify-between ${selectedCategory === "all" ? "bg-gold/15 text-gold border border-gold/20" : "text-muted-foreground hover:bg-white/5 border border-transparent"}`}
                >
                  All Categories
                </button>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center justify-between ${selectedCategory === cat.id ? "bg-gold/15 text-gold border border-gold/20" : "text-muted-foreground hover:bg-white/5 border border-transparent"}`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Filter */}
            <div className="glass-panel p-5 rounded-3xl border border-white/10">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold text-white">Price Limit</h3>
                <span className="text-xs font-bold text-gold">₹{maxPrice}</span>
              </div>
              <input 
                type="range"
                min="0"
                max="5000"
                step="50"
                value={maxPrice}
                onChange={e => setMaxPrice(parseInt(e.target.value))}
                className="w-full accent-gold bg-white/10 rounded-lg appearance-none h-1.5 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-2 font-medium">
                <span>Min: ₹0</span>
                <span>Max: ₹5,000+</span>
              </div>
            </div>

            {/* Sort options */}
            <div className="glass-panel p-5 rounded-3xl border border-white/10">
              <h3 className="text-sm font-bold text-white mb-3">Sort By</h3>
              <select 
                value={sortBy} 
                onChange={e => setSortBy(e.target.value)}
                className="w-full px-3 py-2 bg-card border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-gold"
              >
                <option value="newest">Newest Additions</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
              </select>
            </div>

          </div>

        </aside>

        {/* Right Side Products Grid */}
        <section className="lg:col-span-3">
          {loading ? (
            <div className="min-h-[400px] flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-12 h-12 text-gold animate-spin" />
              <p className="text-muted animate-pulse">Loading catalog products...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="glass-panel p-16 rounded-3xl border border-white/10 text-center max-w-md mx-auto mt-8">
              <Tag className="w-16 h-16 text-muted mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-bold text-white mb-2">No Products Found</h3>
              <p className="text-muted text-sm">
                No items match your selected filters. Try broadening your criteria.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {filteredProducts.map(product => {
                const isSaved = wishlistedIds.includes(product.id);
                return (
                  <div 
                    key={product.id}
                    className="glass-panel rounded-3xl border border-white/10 overflow-hidden hover:border-gold/30 hover:scale-[1.01] transition-all duration-300 flex flex-col justify-between group relative"
                  >
                    
                    {/* Wishlist Toggle Button */}
                    <button 
                      onClick={() => toggleWishlist(product.id)}
                      className="absolute top-3 right-3 z-20 p-2 bg-black/40 backdrop-blur-md rounded-full text-white hover:text-gold transition-colors cursor-pointer"
                      title={isSaved ? "Remove from wishlist" : "Add to wishlist"}
                    >
                      <Star className={`w-4 h-4 ${isSaved ? "fill-gold text-gold" : ""}`} />
                    </button>

                    {/* Product Image Clickable Link */}
                    <Link href={`/product/${product.id}`} className="block relative aspect-square overflow-hidden cursor-pointer bg-black/10">
                      {product.image_url ? (
                        <img 
                          src={product.image_url} 
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs font-semibold bg-white/5">
                          No Image Available
                        </div>
                      )}
                    </Link>

                    {/* Info */}
                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        {/* Category & Vendor */}
                        <div className="flex justify-between items-center text-[10px] uppercase tracking-wider font-semibold mb-1 text-muted-foreground">
                          <span>{product.categories?.name || "Uncategorized"}</span>
                          <span className="text-gold truncate max-w-[120px]">{product.vendors?.business_name || "Unknown Store"}</span>
                        </div>

                        {/* Name */}
                        <Link href={`/product/${product.id}`} className="font-bold text-white text-base leading-snug hover:text-gold hover:underline cursor-pointer block mb-2 line-clamp-2">
                          {product.name}
                        </Link>
                        
                        {/* Description */}
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-4">
                          {product.description || "No description provided."}
                        </p>
                      </div>

                      <div className="space-y-3.5 mt-2">
                        {/* Price & Stock */}
                        <div className="flex justify-between items-baseline">
                          <span className="text-xl font-black text-emerald">₹{product.price}</span>
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${product.stock_quantity > 0 ? "text-emerald" : "text-red-400"}`}>
                            {product.stock_quantity > 0 ? `${product.stock_quantity} In Stock` : "Out of stock"}
                          </span>
                        </div>

                        {/* Cart CTA */}
                        <button 
                          onClick={() => handleAddToCart(product)}
                          disabled={product.stock_quantity <= 0}
                          className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer
                            ${product.stock_quantity > 0 
                              ? "bg-primary text-primary-foreground hover:bg-gold/90 gold-glow" 
                              : "bg-white/5 text-muted-foreground border border-white/10 cursor-not-allowed opacity-60"
                            }`}
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          {product.stock_quantity > 0 ? "Add to Cart" : "Sold Out"}
                        </button>
                      </div>

                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </section>

      </main>

      {/* FOOTER */}
      <footer className="bg-card border-t border-white/10 pt-10 pb-8 mt-12 relative z-10 text-xs">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-muted-foreground font-medium">
          <div className="flex items-center gap-1 text-white font-bold text-sm">
            <span>Vend</span><span className="text-gold">ly</span>
            <Star className="text-gold fill-gold h-4 w-4" />
          </div>
          <div className="flex gap-6 text-xs">
            <Link href="/" className="hover:text-gold transition-colors">Catalog</Link>
            <Link href="/wishlist" className="hover:text-gold transition-colors">Wishlist</Link>
            <Link href="/cart" className="hover:text-gold transition-colors">My Cart</Link>
          </div>
          <p>&copy; {new Date().getFullYear()} Vendly. All rights reserved.</p>
        </div>
      </footer>

    </div>
  );
}
