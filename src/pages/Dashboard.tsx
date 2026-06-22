import React, { useState, useEffect } from "react";
import { useAuth } from "../hooks/use-auth";
import { useLocation, Link } from "wouter";
import { supabase } from "../lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { 
  LogOut, Store, User, Mail, Plus, CreditCard, Clock, 
  ShoppingBag, Tag, ChevronRight, Loader2, ArrowUpRight, 
  Package, AlertTriangle, ArrowRight, ShieldAlert
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  price: number;
  stock_quantity: number;
  image_url: string | null;
  category_id: string;
  categories: { name: string } | null;
}

interface OrderItem {
  id: string;
  price: number;
  quantity: number;
  order_id: string;
  orders: {
    id: string;
    status: "pending" | "paid" | "shipped" | "delivered" | "cancelled";
    created_at: string;
    shipping_address: string;
    profiles: {
      name: string;
      email: string;
    } | null;
  } | null;
  products: {
    id: string;
    name: string;
    image_url: string | null;
  } | null;
}

export default function Dashboard() {
  const { vendor, profile, signOut } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Stats calculation
  const [stats, setStats] = useState({
    totalSales: 0,
    totalOrders: 0,
    activeProducts: 0,
    pendingShipments: 0
  });

  useEffect(() => {
    if (vendor) {
      fetchDashboardData();
    }
  }, [vendor]);

  async function fetchDashboardData() {
    if (!vendor) return;
    setLoading(true);
    try {
      // 1. Fetch Vendor Products
      const { data: prodData, error: prodError } = await supabase
        .from("products")
        .select(`
          id,
          name,
          price,
          stock_quantity,
          image_url,
          category_id,
          categories ( name )
        `)
        .eq("vendor_id", vendor.id)
        .order("created_at", { ascending: false });

      if (prodError) throw prodError;

      const formattedProducts = (prodData || []).map((p: any) => ({
        ...p,
        categories: Array.isArray(p.categories) ? p.categories[0] : p.categories
      })) as Product[];

      setProducts(formattedProducts);

      // 2. Fetch Order Items for this vendor
      const { data: itemsData, error: itemsError } = await supabase
        .from("order_items")
        .select(`
          id,
          price,
          quantity,
          order_id,
          orders (
            id,
            status,
            created_at,
            shipping_address,
            profiles (
              name,
              email
            )
          ),
          products (
            id,
            name,
            image_url
          )
        `)
        .eq("vendor_id", vendor.id);

      if (itemsError) throw itemsError;

      const formattedItems = (itemsData || []).map((item: any) => ({
        ...item,
        orders: Array.isArray(item.orders) ? item.orders[0] : item.orders,
        products: Array.isArray(item.products) ? item.products[0] : item.products
      })).filter((item: any) => item.orders !== null) as OrderItem[];

      // Sort order items by order date descending
      formattedItems.sort((a, b) => {
        const dateA = new Date(a.orders?.created_at || 0).getTime();
        const dateB = new Date(b.orders?.created_at || 0).getTime();
        return dateB - dateA;
      });

      setOrderItems(formattedItems);

      // 3. Compute Metrics
      let salesSum = 0;
      const uniqueOrderIds = new Set<string>();
      let pendingCount = 0;

      formattedItems.forEach(item => {
        if (item.orders) {
          const status = item.orders.status;
          if (status !== "cancelled") {
            salesSum += Number(item.price) * item.quantity;
          }
          uniqueOrderIds.add(item.order_id);
          if (status === "pending" || status === "paid") {
            pendingCount += 1;
          }
        }
      });

      setStats({
        totalSales: salesSum,
        totalOrders: uniqueOrderIds.size,
        activeProducts: formattedProducts.length,
        pendingShipments: pendingCount
      });

    } catch (err: any) {
      console.error("Error loading vendor dashboard:", err);
      toast({
        variant: "destructive",
        title: "Load Error",
        description: err.message || "Failed to load seller metrics."
      });
    } finally {
      setLoading(false);
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
          <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4 animate-bounce" />
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted mb-6">No seller storefront profiles were located for your account.</p>
          <div className="flex gap-4 justify-center">
            <button 
              onClick={() => setLocation("/register")}
              className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-bold hover:bg-gold/90 transition-colors cursor-pointer"
            >
              Register Storefront
            </button>
            <button 
              onClick={handleSignOut}
              className="border border-white/20 px-6 py-2.5 rounded-full font-bold hover:bg-white/10 transition-colors cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Get recent 5 order items
  const recentOrderItems = orderItems.slice(0, 5);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans pb-16 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gold/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-40 glass-panel border-x-0 border-t-0 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-bold text-2xl flex items-center cursor-pointer">
            <span className="text-white">Vend</span><span className="text-gold">ly</span>
            <span className="ml-2 text-xs font-semibold uppercase tracking-wider bg-gold/15 text-gold px-2.5 py-0.5 rounded-full">
              Seller
            </span>
          </Link>
          
          <div className="hidden sm:flex items-center gap-6 text-sm font-medium text-muted">
            <span className="text-white border-b-2 border-gold pb-1 pt-1 font-bold">Overview</span>
            <Link href="/offers" className="hover:text-white transition-colors">Catalog Manager</Link>
            <Link href="/prebookings" className="hover:text-white transition-colors">Fulfill Orders</Link>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-sm font-semibold text-white">{vendor.business_name}</span>
            <span className="text-xs text-muted-foreground">Store Owner</span>
          </div>
          <button 
            onClick={handleSignOut}
            className="flex items-center gap-2 border border-white/10 hover:border-red-500/30 hover:text-red-400 px-4 py-2 rounded-full text-sm font-semibold hover:bg-red-500/10 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </nav>

      {/* DASHBOARD BODY */}
      <main className="max-w-6xl mx-auto px-6 pt-28 relative z-10">
        
        {/* Welcome Banner */}
        <div className="glass-panel rounded-3xl p-8 mb-8 bg-gradient-to-r from-blue/10 to-gold/10 relative overflow-hidden border border-white/10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <span className="text-gold font-bold text-xs uppercase tracking-wider block mb-1">Seller Dashboard Overview</span>
            <h1 className="text-3xl font-extrabold text-white mb-2">
              {vendor.business_name}
            </h1>
            <p className="text-muted text-sm max-w-lg">
              Manage your product catalog, check real-time sales revenue, and fulfill pending customer shipments.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/offers">
              <button className="bg-white/5 border border-white/10 hover:border-gold hover:text-gold px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-gold/5 transition-all cursor-pointer">
                <Plus className="w-4 h-4" />
                Add Product
              </button>
            </Link>
            <Link href="/prebookings">
              <button className="bg-primary text-primary-foreground hover:bg-gold/90 px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all cursor-pointer gold-glow">
                <ShoppingBag className="w-4 h-4" />
                Ship Pending Orders
              </button>
            </Link>
          </div>
        </div>

        {/* METRICS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {[
            { label: "Total Sales Revenue", val: `₹${stats.totalSales.toFixed(2)}`, icon: <CreditCard className="w-6 h-6 text-emerald" />, desc: "Gross storefront sales" },
            { label: "Orders Received", val: stats.totalOrders, icon: <ShoppingBag className="w-6 h-6 text-blue" />, desc: "Unique checked out orders" },
            { label: "Catalog Products", val: stats.activeProducts, icon: <Package className="w-6 h-6 text-gold" />, desc: "Live products in shop" },
            { label: "Pending Shipments", val: stats.pendingShipments, icon: <Clock className="w-6 h-6 text-pink-400" />, desc: "Orders requiring shipping" }
          ].map((stat, i) => (
            <div key={i} className="glass-panel p-6 rounded-2xl flex flex-col justify-between hover:scale-[1.01] transition-transform duration-300 border border-white/5">
              {loading ? (
                <div className="animate-pulse space-y-4 w-full">
                  <div className="flex justify-between items-center">
                    <div className="h-4 bg-white/10 rounded w-24"></div>
                    <div className="h-8 bg-white/10 rounded-full w-8"></div>
                  </div>
                  <div className="h-8 bg-white/10 rounded w-16"></div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-start mb-4">
                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{stat.label}</div>
                    <div className="p-2.5 rounded-xl bg-white/5">{stat.icon}</div>
                  </div>
                  <div>
                    <div className="text-2xl font-black text-white mb-0.5">{stat.val}</div>
                    <div className="text-[10px] text-muted-foreground">{stat.desc}</div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {/* MAIN BODY SECTIONS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* SECTION: RECENT CUSTOMER ORDERS */}
          <div className="lg:col-span-2 glass-panel p-6 md:p-8 rounded-3xl border border-white/10 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-gold" />
                Recent Shop Orders
              </h2>
              <Link href="/prebookings" className="text-xs text-gold font-bold hover:underline flex items-center gap-1 cursor-pointer">
                View All <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {loading ? (
              <div className="animate-pulse space-y-4 w-full">
                {[1, 2, 3].map(s => (
                  <div key={s} className="flex justify-between items-center py-3 border-b border-white/5">
                    <div className="h-4 bg-white/10 rounded w-28"></div>
                    <div className="h-4 bg-white/10 rounded w-16"></div>
                  </div>
                ))}
              </div>
            ) : recentOrderItems.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
                <div className="p-4 bg-white/5 border border-white/10 rounded-full mb-4">
                  <ShoppingBag className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-bold text-base text-white mb-1">No Orders Found</h3>
                <p className="text-muted text-xs max-w-sm mb-6">
                  When customers purchase your products online, they will appear here for packaging and shipping.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-muted-foreground uppercase tracking-wider pb-3 font-bold text-[10px]">
                      <th className="pb-3">Product</th>
                      <th className="pb-3">Buyer</th>
                      <th className="pb-3 text-right">Qty</th>
                      <th className="pb-3 text-right">Earnings</th>
                      <th className="pb-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrderItems.map((item) => (
                      <tr key={item.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                        <td className="py-4 font-bold text-white max-w-[150px] truncate">
                          {item.products?.name || "Deleted Product"}
                        </td>
                        <td className="py-4 text-muted-foreground">
                          {item.orders?.profiles?.name || "Customer"}
                        </td>
                        <td className="py-4 text-right font-semibold text-white">{item.quantity}</td>
                        <td className="py-4 text-right font-bold text-emerald">₹{(Number(item.price) * item.quantity).toFixed(2)}</td>
                        <td className="py-4 text-right">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider
                            ${item.orders?.status === "delivered" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : ""}
                            ${item.orders?.status === "shipped" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" : ""}
                            ${item.orders?.status === "pending" || item.orders?.status === "paid" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : ""}
                            ${item.orders?.status === "cancelled" ? "bg-red-500/10 text-red-400 border border-red-500/20" : ""}
                          `}>
                            {item.orders?.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* SECTION: PRODUCT CATALOG PREVIEW */}
          <div className="lg:col-span-1 glass-panel p-6 md:p-8 rounded-3xl border border-white/10 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Package className="w-5 h-5 text-gold" />
                  Store Inventory
                </h2>
                <Link href="/offers" className="text-xs text-gold font-bold hover:underline cursor-pointer">
                  Manage
                </Link>
              </div>

              {loading ? (
                <div className="animate-pulse space-y-4 w-full">
                  {[1, 2, 3].map(s => (
                    <div key={s} className="h-10 bg-white/10 rounded w-full"></div>
                  ))}
                </div>
              ) : products.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Package className="w-10 h-10 text-muted-foreground opacity-50 mb-3" />
                  <p className="text-xs text-muted">No products listed yet.</p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {products.slice(0, 5).map((prod) => {
                    const isLow = prod.stock_quantity > 0 && prod.stock_quantity <= 10;
                    const isOut = prod.stock_quantity === 0;
                    
                    return (
                      <div key={prod.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors border border-white/5">
                        <div className="min-w-0 flex-1 pr-2">
                          <div className="font-bold text-white text-xs truncate">{prod.name}</div>
                          <div className="text-[10px] text-muted-foreground">Category: {prod.categories?.name || "None"}</div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-xs font-black text-emerald">₹{prod.price}</div>
                          <div className="flex items-center gap-1 justify-end mt-0.5">
                            {isOut ? (
                              <span className="text-[9px] font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">Sold Out</span>
                            ) : isLow ? (
                              <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                <AlertTriangle className="w-2.5 h-2.5" />
                                {prod.stock_quantity} Left
                              </span>
                            ) : (
                              <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">{prod.stock_quantity} Stock</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <Link href="/offers" className="mt-6 pt-4 border-t border-white/5">
              <button className="w-full bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-white/20 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer">
                Manage Full Catalog
                <ArrowRight className="w-4 h-4 text-gold" />
              </button>
            </Link>
          </div>

        </div>

        {/* PROFILE INFORMATION FOOTER */}
        <div className="glass-panel p-6 rounded-3xl border border-white/10 mt-8 bg-white/[0.01]">
          <h3 className="text-sm font-bold text-white mb-4">Vendor Support</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-muted-foreground">
            <div>
              <p>For inventory assistance, storefront customizations, or payouts contact Vendly Platform Support.</p>
            </div>
            <div className="flex flex-col md:items-end justify-center">
              <span>Merchant Registered Email: <strong className="text-white">{vendor.phone ? `${vendor.phone} (${vendor.address || ""})` : profile?.email}</strong></span>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
