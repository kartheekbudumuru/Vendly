import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useLocation, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { 
  Store, Star, LogOut, Coins, Loader2, RefreshCw, ChevronRight, User 
} from "lucide-react";

interface CustomerStoreRelation {
  id: string;
  points: number;
  vendor_id: string;
  vendors: {
    id: string;
    name: string;
    business: string;
  } | null;
}

export default function CustomerPortal() {
  const [phone, setPhone] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState<string>("");
  const [stores, setStores] = useState<CustomerStoreRelation[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const storedPhone = localStorage.getItem("customer_phone");
    const storedName = localStorage.getItem("customer_name") || "Customer";
    if (!storedPhone) {
      setLocation("/customer/login");
      return;
    }
    setPhone(storedPhone);
    setCustomerName(storedName);
    fetchCustomerStores(storedPhone);
  }, [setLocation]);

  async function fetchCustomerStores(customerPhone: string) {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("customers")
        .select(`
          id,
          points,
          vendor_id,
          vendors (
            id,
            name,
            business
          )
        `)
        .eq("phone", customerPhone);

      if (error) throw error;

      // Filter out any results where the vendor data didn't load properly
      const loadedStores = (data || []).map(item => ({
        ...item,
        vendors: Array.isArray(item.vendors) ? item.vendors[0] : item.vendors
      })) as CustomerStoreRelation[];

      setStores(loadedStores);
    } catch (err: any) {
      console.error("Error fetching customer stores:", err);
      toast({
        variant: "destructive",
        title: "Error Loading Stores",
        description: err.message || "Failed to retrieve your points balances.",
      });
    } finally {
      setLoading(false);
    }
  }

  function handleSignOut() {
    localStorage.removeItem("customer_phone");
    localStorage.removeItem("customer_name");
    toast({
      title: "Signed Out",
      description: "Successfully signed out of your customer portal.",
    });
    setLocation("/customer/login");
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col">
      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-40 glass-panel border-x-0 border-t-0 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="text-gold font-bold text-2xl flex items-center">
            <span className="text-white">Vend</span><span className="text-gold">ly</span>
          </div>
          <Star className="text-gold fill-gold h-5 w-5" />
          <span className="ml-2 text-xs font-semibold uppercase tracking-wider bg-gold/15 text-gold px-2.5 py-0.5 rounded-full">
            Customer Portal
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 text-sm text-muted">
            <User className="w-4 h-4 text-gold" />
            <span className="font-semibold text-white">{customerName}</span>
            <span className="opacity-60">({phone})</span>
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

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-5xl w-full mx-auto pt-28 pb-16 px-4">
        
        {/* Welcome Section */}
        <div className="mb-10 text-center md:text-left flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white">
              Hello, {customerName}!
            </h1>
            <p className="text-muted mt-1">
              Select a store below to view today's offers, check items, and prebook with your loyalty points.
            </p>
          </div>
          {phone && (
            <button 
              onClick={() => fetchCustomerStores(phone)}
              disabled={loading}
              className="flex items-center gap-1.5 self-center md:self-end border border-white/10 hover:border-gold hover:text-gold px-4 py-2 rounded-full text-xs font-semibold bg-white/5 transition-all disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          )}
        </div>

        {/* LOADING STATE */}
        {loading ? (
          <div className="min-h-[300px] flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-12 h-12 text-gold animate-spin" />
            <p className="text-muted animate-pulse">Loading store balances...</p>
          </div>
        ) : stores.length === 0 ? (
          /* EMPTY STATE */
          <div className="glass-panel p-12 rounded-3xl border border-white/10 text-center max-w-md mx-auto">
            <Store className="w-16 h-16 text-muted mx-auto mb-4 opacity-50" />
            <h2 className="text-xl font-bold text-white mb-2">No Registered Stores</h2>
            <p className="text-muted text-sm mb-6">
              You are not registered in any Vendly loyalty program yet. Sign up at your local store to start earning points!
            </p>
          </div>
        ) : (
          /* STORES LIST */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {stores.map((item) => (
              <div 
                key={item.id} 
                className="glass-panel rounded-3xl border border-white/10 overflow-hidden hover:border-gold/30 transition-all hover:translate-y-[-4px] shadow-lg flex flex-col"
              >
                {/* Store Header */}
                <div className="p-6 border-b border-white/5 bg-gradient-to-r from-gold/5 to-transparent flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">
                      {item.vendors?.business || "Local Store"}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Owner: {item.vendors?.name || "Merchant"}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center text-gold">
                    <Store className="w-6 h-6" />
                  </div>
                </div>

                {/* Points Card */}
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-muted-foreground text-sm font-medium">Your Points Balance</span>
                    <div className="flex items-center gap-1.5 font-bold text-gold text-2xl">
                      <Coins className="w-6 h-6" />
                      {item.points}
                      <span className="text-sm font-semibold text-muted-foreground">pts</span>
                    </div>
                  </div>

                  <Link href={`/customer/store/${item.vendor_id}?cid=${item.id}`}>
                    <button className="w-full bg-primary text-primary-foreground py-3.5 rounded-2xl font-bold hover:bg-gold/90 transition-all flex items-center justify-center gap-2 cursor-pointer gold-glow text-sm">
                      View Store & Prebook Items
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

      </main>
    </div>
  );
}
