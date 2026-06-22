import React, { useState, useEffect } from "react";
import { useAuth } from "../hooks/use-auth";
import { useLocation, Link } from "wouter";
import { supabase } from "../lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { 
  LogOut, Store, ShoppingBag, Check, CheckCircle2, 
  Loader2, RefreshCw, ShieldAlert, Phone, Calendar, 
  Truck, XCircle, MapPin, Inbox, User, AlertTriangle
} from "lucide-react";

interface ProductInfo {
  id: string;
  name: string;
  image_url: string | null;
}

interface OrderItem {
  id: string;
  price: number;
  quantity: number;
  products: ProductInfo | null;
}

interface GroupedOrder {
  orderId: string;
  status: "pending" | "paid" | "shipped" | "delivered" | "cancelled";
  createdAt: string;
  shippingAddress: string;
  customerName: string;
  customerEmail: string;
  items: OrderItem[];
  vendorSubtotal: number;
}

export default function VendorPrebookings() {
  const { vendor, signOut } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [orders, setOrders] = useState<GroupedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (vendor) {
      fetchOrders();
    }
  }, [vendor]);

  async function fetchOrders() {
    if (!vendor) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
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

      if (error) throw error;

      // Group order items by order ID
      const groups: { [key: string]: GroupedOrder } = {};

      (data || []).forEach((item: any) => {
        const orderData = Array.isArray(item.orders) ? item.orders[0] : item.orders;
        if (!orderData) return;

        const orderId = orderData.id;
        const prodData = Array.isArray(item.products) ? item.products[0] : item.products;
        const profileData = orderData.profiles ? (Array.isArray(orderData.profiles) ? orderData.profiles[0] : orderData.profiles) : null;

        const orderItem: OrderItem = {
          id: item.id,
          price: Number(item.price),
          quantity: item.quantity,
          products: prodData ? {
            id: prodData.id,
            name: prodData.name,
            image_url: prodData.image_url
          } : null
        };

        if (!groups[orderId]) {
          groups[orderId] = {
            orderId: orderId,
            status: orderData.status,
            createdAt: orderData.created_at,
            shippingAddress: orderData.shipping_address,
            customerName: profileData?.name || "Customer",
            customerEmail: profileData?.email || "No email",
            items: [],
            vendorSubtotal: 0
          };
        }

        groups[orderId].items.push(orderItem);
        groups[orderId].vendorSubtotal += orderItem.price * orderItem.quantity;
      });

      // Convert grouping dictionary to array and sort by date descending
      const sortedOrders = Object.values(groups).sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      setOrders(sortedOrders);
    } catch (err: any) {
      console.error("Error loading vendor orders:", err);
      toast({
        variant: "destructive",
        title: "Load Failed",
        description: err.message || "Failed to load orders history.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function updateOrderStatus(orderId: string, newStatus: GroupedOrder["status"]) {
    setUpdatingId(orderId);
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", orderId);

      if (error) throw error;

      toast({
        title: `Order Updated`,
        description: `Order status changed to "${newStatus}" successfully.`,
      });
      fetchOrders();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Fulfillment Failed",
        description: err.message || "Could not modify order status.",
      });
    } finally {
      setUpdatingId(null);
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
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted mb-6">No seller profile was located. Please register first.</p>
          <button onClick={() => setLocation("/register")} className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-bold">
            Go to Register
          </button>
        </div>
      </div>
    );
  }

  // Format date utility
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

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
            <Link href="/offers" className="hover:text-white transition-colors">Catalog Manager</Link>
            <span className="text-white border-b-2 border-gold pb-1 pt-1 font-bold">Fulfill Orders</span>
          </div>
        </div>
        <button onClick={handleSignOut}
          className="flex items-center gap-2 border border-white/10 hover:border-red-500/30 hover:text-red-400 px-4 py-2 rounded-full text-sm font-semibold hover:bg-red-500/10 transition-all cursor-pointer">
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </nav>

      {/* CONTENT MAIN */}
      <main className="flex-1 max-w-6xl w-full mx-auto pt-24 pb-16 px-6 relative z-10">
        
        {/* Header Block */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-white flex items-center gap-2">
              <ShoppingBag className="w-8 h-8 text-gold" />
              Storefront Order Fulfillment
            </h1>
            <p className="text-muted text-sm mt-1">
              Fulfill customer checkout transactions, modify delivery tracking states, and handle cancellations.
            </p>
          </div>

          <button 
            onClick={fetchOrders}
            disabled={loading}
            className="flex items-center gap-1.5 border border-white/10 hover:border-gold hover:text-gold px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 transition-all disabled:opacity-50 cursor-pointer self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh Orders
          </button>
        </div>

        {/* LOADING & DISPLAY */}
        {loading ? (
          <div className="min-h-[300px] flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-12 h-12 text-gold animate-spin" />
            <p className="text-muted animate-pulse">Loading orders metrics...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="glass-panel p-16 rounded-3xl border border-white/10 text-center max-w-md mx-auto">
            <Inbox className="w-16 h-16 text-muted mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-bold text-white mb-2">No Shop Orders Yet</h3>
            <p className="text-muted text-sm">
              Incoming customer orders will appear here. Fulfill them to complete payouts and update the customer's portal.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map(order => {
              const isPending = order.status === "pending" || order.status === "paid";
              const isShipped = order.status === "shipped";
              const isDelivered = order.status === "delivered";
              const isCancelled = order.status === "cancelled";

              return (
                <div 
                  key={order.orderId}
                  className="glass-panel rounded-3xl border border-white/10 overflow-hidden shadow-xl flex flex-col hover:border-gold/10 transition-colors duration-300"
                >
                  {/* Summary Bar */}
                  <div className="p-6 border-b border-white/5 bg-white/[0.01] flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-xs font-bold text-white uppercase tracking-wider">
                          Order ID: <span className="text-gold font-mono">#{order.orderId.slice(0, 8)}</span>
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider
                          ${isDelivered ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20" : ""}
                          ${isShipped ? "bg-blue/15 text-blue-400 border border-blue-500/20" : ""}
                          ${isPending ? "bg-amber-500/15 text-amber-400 border border-amber-500/20" : ""}
                          ${isCancelled ? "bg-red-500/15 text-red-400 border border-red-500/20" : ""}
                        `}>
                          {order.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Placed on {formatDate(order.createdAt)}
                      </p>
                    </div>

                    <div className="flex flex-col md:items-end">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Your Store Subtotal</span>
                      <span className="text-lg font-black text-emerald">₹{order.vendorSubtotal.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Details Body */}
                  <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Items to ship */}
                    <div className="lg:col-span-2 space-y-4 border-r border-white/5 pr-0 lg:pr-6">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Products in Shipment</h4>
                      {order.items.map(item => (
                        <div key={item.id} className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-black/25 rounded-lg border border-white/5 overflow-hidden flex items-center justify-center flex-shrink-0">
                            {item.products?.image_url ? (
                              <img src={item.products.image_url} alt={item.products.name} className="w-full h-full object-cover" />
                            ) : (
                              <Store className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-bold text-white block truncate">{item.products?.name || "Deleted Product"}</span>
                            <span className="text-[10px] text-muted-foreground">
                              Qty: {item.quantity} × <strong className="text-emerald">₹{item.price}</strong>
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Customer & Address Details + Actions */}
                    <div className="lg:col-span-1 flex flex-col justify-between gap-6">
                      <div className="space-y-4">
                        {/* Customer */}
                        <div className="space-y-1">
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-gold" />
                            Customer Info
                          </h4>
                          <div className="text-xs text-muted-foreground">
                            <span className="font-semibold text-white block">{order.customerName}</span>
                            <span className="block mt-0.5">{order.customerEmail}</span>
                          </div>
                        </div>

                        {/* Shipping address */}
                        <div className="space-y-1">
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-gold" />
                            Shipping Destination
                          </h4>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {order.shippingAddress}
                          </p>
                        </div>
                      </div>

                      {/* Shipment Action controls */}
                      <div className="pt-4 border-t border-white/5 space-y-2">
                        {isPending && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => updateOrderStatus(order.orderId, "cancelled")}
                              disabled={updatingId === order.orderId}
                              className="flex-1 border border-white/10 hover:border-red-500/30 hover:text-red-400 py-2.5 rounded-xl text-xs font-bold bg-white/5 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <XCircle className="w-4 h-4" /> Cancel Order
                            </button>
                            <button
                              onClick={() => updateOrderStatus(order.orderId, "shipped")}
                              disabled={updatingId === order.orderId}
                              className="flex-1 bg-primary text-primary-foreground hover:bg-gold/90 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer gold-glow"
                            >
                              <Truck className="w-4 h-4" /> Ship Order
                            </button>
                          </div>
                        )}

                        {isShipped && (
                          <button
                            onClick={() => updateOrderStatus(order.orderId, "delivered")}
                            disabled={updatingId === order.orderId}
                            className="w-full bg-emerald-500 text-white hover:bg-emerald-600 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <CheckCircle2 className="w-4 h-4" /> Confirm Delivered
                          </button>
                        )}

                        {isDelivered && (
                          <div className="text-xs text-emerald-400 bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/15 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Successfully Flipped & Delivered</span>
                          </div>
                        )}

                        {isCancelled && (
                          <div className="text-xs text-red-400 bg-red-500/10 p-2.5 rounded-xl border border-red-500/15 flex items-center gap-2">
                            <XCircle className="w-4 h-4" />
                            <span>This order was cancelled</span>
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
