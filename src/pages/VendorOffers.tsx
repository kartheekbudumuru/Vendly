import React, { useState, useEffect } from "react";
import { useAuth } from "../hooks/use-auth";
import { useLocation, Link } from "wouter";
import { supabase } from "../lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { 
  LogOut, Store, Tag, Plus, Edit, Trash2, X, 
  Loader2, ShieldAlert, ArrowLeft, Package, FolderPlus, 
  Layers, AlertTriangle, Check
} from "lucide-react";

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  stock_quantity: number;
  category_id: string;
  categories: { name: string } | null;
}

export default function VendorOffers() {
  const { vendor, signOut } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Modals visibility
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Product Form states
  const [prodName, setProdName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [stockQty, setStockQty] = useState("10");
  const [catId, setCatId] = useState("");

  // Category Form states
  const [newCatName, setNewCatName] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");

  useEffect(() => {
    if (vendor) {
      fetchInitialData();
    }
  }, [vendor]);

  async function fetchInitialData() {
    if (!vendor) return;
    setLoading(true);
    try {
      // 1. Fetch categories
      const { data: catData, error: catError } = await supabase
        .from("categories")
        .select("id, name")
        .order("name", { ascending: true });

      if (catError) throw catError;
      setCategories(catData || []);

      // 2. Fetch products
      const { data: prodData, error: prodError } = await supabase
        .from("products")
        .select(`
          id,
          name,
          description,
          price,
          image_url,
          stock_quantity,
          category_id,
          categories ( name )
        `)
        .eq("vendor_id", vendor.id)
        .order("created_at", { ascending: false });

      if (prodError) throw prodError;

      const formatted = (prodData || []).map((p: any) => ({
        ...p,
        categories: Array.isArray(p.categories) ? p.categories[0] : p.categories
      })) as Product[];

      setProducts(formatted);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Load Failed",
        description: err.message || "Failed to load product catalog."
      });
    } finally {
      setLoading(false);
    }
  }

  function openCreateProductModal() {
    setEditingProduct(null);
    setProdName("");
    setDescription("");
    setPrice("");
    setImageUrl("");
    setStockQty("10");
    setCatId(categories[0]?.id || "");
    setIsProductModalOpen(true);
  }

  function openEditProductModal(prod: Product) {
    setEditingProduct(prod);
    setProdName(prod.name);
    setDescription(prod.description || "");
    setPrice(prod.price.toString());
    setImageUrl(prod.image_url || "");
    setStockQty(prod.stock_quantity.toString());
    setCatId(prod.category_id || "");
    setIsProductModalOpen(true);
  }

  async function handleProductSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!vendor) return;
    setActionLoading(true);

    const parsedPrice = parseFloat(price);
    const parsedStock = parseInt(stockQty);

    if (isNaN(parsedPrice) || parsedPrice < 0) {
      toast({ variant: "destructive", title: "Invalid Input", description: "Product price must be a valid positive number." });
      setActionLoading(false);
      return;
    }

    if (isNaN(parsedStock) || parsedStock < 0) {
      toast({ variant: "destructive", title: "Invalid Input", description: "Stock quantity must be a non-negative integer." });
      setActionLoading(false);
      return;
    }

    try {
      const payload = {
        vendor_id: vendor.id,
        name: prodName.trim(),
        description: description.trim(),
        price: parsedPrice,
        image_url: imageUrl.trim() || null,
        stock_quantity: parsedStock,
        category_id: catId || null
      };

      if (editingProduct) {
        const { error } = await supabase
          .from("products")
          .update(payload)
          .eq("id", editingProduct.id);

        if (error) throw error;
        toast({ title: "Product Updated", description: `${prodName} has been saved successfully.` });
      } else {
        const { error } = await supabase
          .from("products")
          .insert([payload]);

        if (error) throw error;
        toast({ title: "Product Added 🎉", description: `${prodName} is now live in your catalog.` });
      }

      setIsProductModalOpen(false);
      fetchInitialData();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Submit Failed",
        description: err.message || "Failed to save product details."
      });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCategorySubmit(e: React.FormEvent) {
    e.preventDefault();
    setActionLoading(true);

    try {
      const { data, error } = await supabase
        .from("categories")
        .insert([{
          name: newCatName.trim(),
          description: newCatDesc.trim() || null
        }])
        .select()
        .single();

      if (error) throw error;

      toast({ title: "Category Created", description: `"${newCatName}" category was registered.` });
      setCategories(prev => [...prev, data]);
      setCatId(data.id); // auto-select new category
      setIsCategoryModalOpen(false);
      setNewCatName("");
      setNewCatDesc("");
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Category Creation Failed",
        description: err.message || "Ensure category name is unique."
      });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeleteProduct(prodId: string, name: string) {
    if (!confirm(`Are you sure you want to delete "${name}" from your catalog?`)) return;

    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", prodId);

      if (error) throw error;

      toast({ title: "Product Deleted", description: "Item was removed from inventory catalog." });
      fetchInitialData();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Delete Failed",
        description: err.message || "Could not delete product."
      });
    }
  }

  async function handleSignOut() {
    await signOut();
    setLocation("/");
  }

  if (!vendor) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-white px-4">
        <div className="glass-panel p-8 rounded-2xl max-w-md w-full text-center border-red-500/20">
          <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Access Error</h2>
          <p className="text-muted mb-6">No seller profile was located. Please register first.</p>
          <button onClick={() => setLocation("/register")} className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-bold">
            Go to Register
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gold/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-40 glass-panel border-x-0 border-t-0 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="font-bold text-2xl flex items-center cursor-pointer">
            <span className="text-white">Vend</span><span className="text-gold">ly</span>
            <span className="ml-2 text-xs font-semibold uppercase tracking-wider bg-gold/15 text-gold px-2.5 py-0.5 rounded-full">
              Seller
            </span>
          </Link>
          <div className="hidden sm:flex items-center gap-6 text-sm font-medium text-muted">
            <Link href="/dashboard" className="hover:text-white transition-colors">Overview</Link>
            <span className="text-white border-b-2 border-gold pb-1 pt-1 font-bold">Catalog Manager</span>
            <Link href="/prebookings" className="hover:text-white transition-colors">Fulfill Orders</Link>
          </div>
        </div>
        <button onClick={handleSignOut}
          className="flex items-center gap-2 border border-white/10 hover:border-red-500/30 hover:text-red-400 px-4 py-2 rounded-full text-sm font-semibold hover:bg-red-500/10 transition-all cursor-pointer">
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </nav>

      {/* CONTENT CONTAINER */}
      <main className="flex-1 max-w-6xl w-full mx-auto pt-24 pb-16 px-6 relative z-10">
        
        {/* Header Block */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-white flex items-center gap-2">
              <Package className="w-8 h-8 text-gold" />
              Catalog Inventory Manager
            </h1>
            <p className="text-muted text-sm mt-1">
              Add new product offerings, edit pricing details, and update live catalog stock quantities.
            </p>
          </div>

          <div className="flex gap-2">
            <button 
              onClick={() => setIsCategoryModalOpen(true)}
              className="bg-white/5 border border-white/10 hover:border-gold hover:text-gold px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all cursor-pointer text-sm"
            >
              <FolderPlus className="w-4 h-4" /> Add Category
            </button>
            <button 
              onClick={openCreateProductModal}
              className="bg-primary text-primary-foreground px-5 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gold/90 transition-all cursor-pointer text-sm gold-glow"
            >
              <Plus className="w-4 h-4" /> Add Product
            </button>
          </div>
        </div>

        {/* LOADING & DISPLAY LIST */}
        {loading ? (
          <div className="min-h-[300px] flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-12 h-12 text-gold animate-spin" />
            <p className="text-muted animate-pulse">Loading storefront inventory...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="glass-panel p-16 rounded-3xl border border-white/10 text-center max-w-md mx-auto">
            <Package className="w-16 h-16 text-muted mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-bold text-white mb-2">Inventory is Empty</h3>
            <p className="text-muted text-sm mb-6">
              You haven't listed any products on Vendly yet. Create your first product to display it in the customer portal catalog.
            </p>
            <button onClick={openCreateProductModal} className="bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-bold text-sm gold-glow">
              Add First Product
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map(prod => {
              const isLow = prod.stock_quantity > 0 && prod.stock_quantity <= 10;
              const isOut = prod.stock_quantity === 0;

              return (
                <div 
                  key={prod.id} 
                  className="glass-panel rounded-3xl border border-white/10 overflow-hidden hover:border-gold/20 transition-all shadow-lg flex flex-col justify-between"
                >
                  {/* Thumbnail / Image container */}
                  <div className="relative aspect-video bg-black/25 flex items-center justify-center overflow-hidden border-b border-white/5">
                    {prod.image_url ? (
                      <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center text-muted-foreground">
                        <Package className="w-8 h-8 mb-1" />
                        <span className="text-[10px] uppercase font-bold">No Image Provided</span>
                      </div>
                    )}
                    {/* Category Label */}
                    <span className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md text-gold border border-gold/15 px-2 py-0.5 rounded-lg text-[10px] font-bold">
                      {prod.categories?.name || "Unassigned"}
                    </span>
                  </div>

                  {/* Body text */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-base font-extrabold text-white mb-1.5 truncate" title={prod.name}>
                        {prod.name}
                      </h3>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-4 h-8">
                        {prod.description || "No description provided."}
                      </p>
                    </div>

                    <div className="space-y-4">
                      {/* Price & Stock info */}
                      <div className="flex justify-between items-baseline pt-2 border-t border-white/5">
                        <span className="text-xl font-black text-emerald">₹{prod.price}</span>
                        <div>
                          {isOut ? (
                            <span className="text-[9px] font-black text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20 uppercase tracking-wider">Out of Stock</span>
                          ) : isLow ? (
                            <span className="text-[9px] font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 uppercase tracking-wider flex items-center gap-0.5">
                              <AlertTriangle className="w-3 h-3" />
                              Low Stock ({prod.stock_quantity})
                            </span>
                          ) : (
                            <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 uppercase tracking-wider">{prod.stock_quantity} In Stock</span>
                          )}
                        </div>
                      </div>

                      {/* Edit actions */}
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => openEditProductModal(prod)}
                          className="flex-1 flex items-center justify-center gap-1.5 border border-white/10 hover:border-gold hover:text-gold px-3 py-2.5 rounded-xl text-xs font-bold bg-white/5 transition-all cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5" /> Edit details
                        </button>
                        <button 
                          onClick={() => handleDeleteProduct(prod.id, prod.name)}
                          className="border border-white/10 hover:border-red-500/30 hover:text-red-400 p-2.5 rounded-xl bg-white/5 transition-all cursor-pointer"
                          title="Delete Product"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </main>

      {/* CREATE & EDIT PRODUCT MODAL */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel max-w-lg w-full rounded-3xl border border-white/10 p-6 md:p-8 animate-scaleUp shadow-2xl relative">
            
            <button 
              onClick={() => setIsProductModalOpen(false)}
              className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-xl text-muted-foreground hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-2xl font-extrabold text-white mb-6">
              {editingProduct ? "Modify Product Details" : "Add Product to Shop"}
            </h3>

            <form onSubmit={handleProductSubmit} className="space-y-4">
              {/* Product Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                  Product Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Wireless Bluetooth Earbuds"
                  value={prodName}
                  onChange={e => setProdName(e.target.value)}
                  className="block w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-muted-foreground focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 text-sm"
                />
              </div>

              {/* Category Dropdown */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Category Assignment
                  </label>
                  <button 
                    type="button"
                    onClick={() => setIsCategoryModalOpen(true)}
                    className="text-[10px] text-gold font-bold flex items-center gap-1 hover:underline"
                  >
                    <Plus className="w-3 h-3" /> New Category
                  </button>
                </div>
                {categories.length === 0 ? (
                  <p className="text-xs text-amber-400 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/15">
                    No categories exist yet. Please add a category first.
                  </p>
                ) : (
                  <select 
                    value={catId} 
                    onChange={e => setCatId(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-card border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                  Specifications / Description
                </label>
                <textarea
                  placeholder="Describe specifications, measurements, warranty information..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                  className="block w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-muted-foreground focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 text-sm resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Price */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                    Retail Price (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 1499"
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    className="block w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-muted-foreground focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 text-sm"
                  />
                </div>

                {/* Stock Quantity */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                    Available Stock
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 50"
                    value={stockQty}
                    onChange={e => setStockQty(e.target.value)}
                    className="block w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-muted-foreground focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 text-sm"
                  />
                </div>
              </div>

              {/* Image URL */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                  Product Image URL <span className="text-[10px] text-muted-foreground font-normal">(Optional)</span>
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/product.jpg"
                  value={imageUrl}
                  onChange={e => setImageUrl(e.target.value)}
                  className="block w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-muted-foreground focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 text-sm"
                />
              </div>

              {/* Action buttons */}
              <div className="flex gap-4 pt-4 border-t border-white/5">
                <button 
                  type="button" 
                  onClick={() => setIsProductModalOpen(false)}
                  className="flex-1 border border-white/10 text-white py-3 rounded-xl font-bold hover:bg-white/5 transition-colors cursor-pointer text-sm"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={actionLoading || categories.length === 0}
                  className="flex-1 bg-primary text-primary-foreground py-3 rounded-xl font-bold hover:bg-gold/90 transition-colors flex items-center justify-center gap-2 cursor-pointer text-sm gold-glow disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {editingProduct ? "Save Changes" : "Post Product"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* CREATE CATEGORY MODAL */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel max-w-md w-full rounded-3xl border border-white/15 p-6 animate-scaleUp shadow-2xl relative">
            
            <button 
              onClick={() => setIsCategoryModalOpen(false)}
              className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-xl text-muted-foreground hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Layers className="w-5 h-5 text-gold" />
              Register Catalog Category
            </h3>

            <form onSubmit={handleCategorySubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase block">Category Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Electronics, Fashion, Grocery"
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  className="block w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-muted-foreground focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase block">Category Description</label>
                <textarea
                  placeholder="Summary description of products in this category..."
                  value={newCatDesc}
                  onChange={e => setNewCatDesc(e.target.value)}
                  rows={2}
                  className="block w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-muted-foreground focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 text-sm resize-none"
                />
              </div>

              <div className="flex gap-4 pt-4 border-t border-white/5">
                <button 
                  type="button" 
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="flex-1 border border-white/10 text-white py-2 rounded-xl text-xs font-bold hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={actionLoading}
                  className="flex-1 bg-primary text-primary-foreground py-2 rounded-xl text-xs font-bold hover:bg-gold/90 transition-colors flex items-center justify-center gap-1.5 cursor-pointer gold-glow"
                >
                  {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Create Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
