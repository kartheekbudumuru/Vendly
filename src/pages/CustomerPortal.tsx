import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useLocation, Link } from "wouter";
import { useAuth } from "../hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { 
  Package, Clock, Truck, CheckCircle, XCircle, ShoppingBag, MapPin, 
  CreditCard, ArrowLeft, LogOut, RefreshCw, Star, Loader2, User
} from "lucide-react";

interface OrderItem {
  id: string;
  price: number;
  quantity: number;
  products: {
    id: string;
    name: string;
    image_url: string | null;
  } | null;
}

interface Order {
  id: string;
  total_amount: number;
  status: "pending" | "paid" | "shipped" | "delivered" | "cancelled";
  shipping_address: string;
  coupon_code: string | null;
  created_at: string;
  order_items: OrderItem[];
}

export default function CustomerPortal() {
  const { user, profile, signOut } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) {
      setLocation("/login");
      return;
    }
    fetchOrders();
  }, [user]);

  async function fetchOrders() {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          id,
          total_amount,
          status,
          shipping_address,
          coupon_code,
          created_at,
          order_items (
            id,
            price,
            quantity,
            products (
              id,
              name,
              image_url
            )
          )
        `)
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formatted = (data || []).map((order: any) => ({
        ...order,
        order_items: (order.order_items || []).map((item: any) => ({
          ...item,
          products: Array.isArray(item.products) ? item.products[0] : item.products
        }))
      })) as Order[];

      setOrders(formatted);
    } catch (err: any) {
      console.error("Error fetching customer orders:", err);
      toast({
        variant: "destructive",
        title: "Error Loading Orders",
        description: err.message || "Failed to retrieve your order history.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    try {
      await signOut();
      toast({
        title: "Signed Out",
        description: "Successfully signed out of your account.",
      });
      setLocation("/login");
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Sign Out Failed",
        description: err.message,
      });
    }
  }

  // Helper to format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  // Helper for status badge style
  const getStatusBadge = (status: Order["status"]) => {
    switch (status) {
      case "pending":
      case "paid":
        return <span className="bg-amber-500/15 text-amber-400 border border-amber-500/20 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">Paid / Processing</span>;
      case "shipped":
        return <span className="bg-blue/15 text-blue-400 border border-blue-500/20 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">Shipped</span>;
      case "delivered":
        return <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">Delivered</span>;
      case "cancelled":
        return <span className="bg-red-500/15 text-red-400 border border-red-500/20 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">Cancelled</span>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gold/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-panel border-x-0 border-t-0 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-bold text-2xl flex items-center cursor-pointer">
            <span className="text-white">Vend</span><span className="text-gold">ly</span>
            <Star className="text-gold fill-gold h-5 w-5 ml-1" />
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-muted">
            <Link href="/" className="hover:text-white transition-colors">Catalog</Link>
            <span className="text-white border-b-2 border-gold pb-1 font-bold">My Orders</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={handleSignOut}
            className="flex items-center gap-2 border border-white/10 hover:border-red-500/30 hover:text-red-400 px-4 py-2 rounded-full text-sm font-semibold hover:bg-red-500/10 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </nav>

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-5xl w-full mx-auto pt-24 pb-16 px-6 relative z-10">
        
        {/* Back Link */}
        <Link href="/" className="inline-flex items-center gap-2 text-muted hover:text-white mb-6 text-sm font-medium transition-colors cursor-pointer group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Catalog</span>
        </Link>

        {/* Profile Card */}
        <div className="glass-panel p-6 rounded-3xl border border-white/10 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-r from-gold/5 via-blue/5 to-transparent">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center text-gold">
              <User className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white">{profile?.name || "Customer Account"}</h1>
              <p className="text-muted text-sm">{profile?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={fetchOrders}
              disabled={loading}
              className="flex items-center gap-1.5 border border-white/10 hover:border-gold hover:text-gold px-4 py-2 rounded-full text-xs font-semibold bg-white/5 transition-all disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh Orders
            </button>
          </div>
        </div>

        {/* Orders Header */}
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-gold" />
          Order Purchase History ({orders.length})
        </h2>

        {/* LOADING STATE */}
        {loading ? (
          <div className="min-h-[300px] flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-12 h-12 text-gold animate-spin" />
            <p className="text-muted animate-pulse">Loading order tracking metrics...</p>
          </div>
        ) : orders.length === 0 ? (
          /* EMPTY STATE */
          <div className="glass-panel p-16 rounded-3xl border border-white/10 text-center max-w-md mx-auto">
            <Package className="w-16 h-16 text-muted mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-bold text-white mb-2">No Orders Found</h3>
            <p className="text-muted text-sm mb-6">
              You haven't placed any orders yet. Head to our product catalog page to place your first order.
            </p>
            <Link href="/">
              <button className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-bold text-sm cursor-pointer gold-glow">
                Go Shopping
              </button>
            </Link>
          </div>
        ) : (
          /* ORDERS LIST */
          <div className="space-y-6">
            {orders.map((order) => {
              const isCancelled = order.status === "cancelled";
              const isDelivered = order.status === "delivered";
              const isShipped = order.status === "shipped";
              
              return (
                <div 
                  key={order.id} 
                  className="glass-panel rounded-3xl border border-white/10 overflow-hidden hover:border-gold/15 transition-all shadow-lg flex flex-col"
                >
                  {/* Order Header Summary */}
                  <div className="p-6 border-b border-white/5 bg-white/[0.02] flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-sm font-bold text-white uppercase tracking-wider">
                          Order ID: <span className="text-gold font-mono">#{order.id.slice(0, 8)}</span>
                        </span>
                        {getStatusBadge(order.status)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Placed on {formatDate(order.created_at)}
                      </p>
                    </div>

                    <div className="flex flex-col md:items-end">
                      <span className="text-xs text-muted-foreground">Total Amount</span>
                      <span className="text-xl font-black text-emerald">₹{order.total_amount.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Order Items & Shipping details */}
                  <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Items List */}
                    <div className="md:col-span-2 space-y-4 border-r border-white/5 pr-0 md:pr-6">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Items Purchased</h4>
                      {order.order_items?.map((item) => (
                        <div key={item.id} className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-black/20 border border-white/5 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center">
                            {item.products?.image_url ? (
                              <img src={item.products.image_url} alt={item.products.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-[8px] text-muted-foreground font-semibold">No Image</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="font-bold text-white text-xs hover:text-gold block truncate">
                              {item.products?.name || "Product Deleted"}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              Qty: {item.quantity} × <span className="text-emerald font-semibold">₹{item.price}</span>
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Delivery & Tracking Timeline */}
                    <div className="md:col-span-1 space-y-4">
                      {/* Shipping address info */}
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-gold" />
                          Delivery Address
                        </h4>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {order.shipping_address}
                        </p>
                      </div>

                      {/* Timeline Tracker */}
                      <div className="space-y-3 pt-2">
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                          Order Status Tracker
                        </h4>
                        
                        {isCancelled ? (
                          <div className="flex items-center gap-2 text-red-400 bg-red-500/10 p-3 rounded-2xl border border-red-500/15">
                            <XCircle className="w-5 h-5 flex-shrink-0" />
                            <div className="text-xs">
                              <span className="font-bold block">Cancelled</span>
                              <span className="text-[10px] text-muted-foreground">This order has been cancelled</span>
                            </div>
                          </div>
                        ) : (
                          <div className="relative pl-5 space-y-4 text-xs font-medium border-l border-white/10">
                            {/* Step 1: Placed */}
                            <div className="relative">
                              <div className="absolute -left-[25px] top-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
                              <div>
                                <span className="text-white font-bold block">Order Placed</span>
                                <span className="text-[10px] text-muted-foreground">Payment verified, order received.</span>
                              </div>
                            </div>

                            {/* Step 2: Shipped */}
                            <div className="relative">
                              <div className={`absolute -left-[25px] top-0 w-2.5 h-2.5 rounded-full ring-4 
                                ${isShipped || isDelivered 
                                  ? "bg-emerald-500 ring-emerald-500/20" 
                                  : "bg-white/10 ring-transparent"}`} 
                              />
                              <div className={isShipped || isDelivered ? "text-white" : "text-muted"}>
                                <span className="font-bold block">Shipped</span>
                                <span className="text-[10px] text-muted-foreground">In transit to destination facility.</span>
                              </div>
                            </div>

                            {/* Step 3: Delivered */}
                            <div className="relative">
                              <div className={`absolute -left-[25px] top-0 w-2.5 h-2.5 rounded-full ring-4 
                                ${isDelivered 
                                  ? "bg-emerald-500 ring-emerald-500/20" 
                                  : "bg-white/10 ring-transparent"}`} 
                              />
                              <div className={isDelivered ? "text-white" : "text-muted"}>
                                <span className="font-bold block">Out for Delivery & Delivered</span>
                                <span className="text-[10px] text-muted-foreground">Handed over to customer.</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
