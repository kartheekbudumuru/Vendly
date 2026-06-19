import React, { useState, useEffect } from "react";
import { useAuth } from "../hooks/use-auth";
import { useLocation, Link } from "wouter";
import { supabase } from "../lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { 
  LogOut, Store, ShoppingBag, Check, CheckCircle2, 
  Loader2, RefreshCw, ShieldAlert, Coins, Phone, Calendar
} from "lucide-react";

interface Prebooking {
  id: string;
  points_deducted: number;
  status: string;
  created_at: string;
  customers: {
    customer_name: string;
    phone: string;
  } | null;
  offers: {
    item_name: string;
    offer_price: number;
  } | null;
}

export default function VendorPrebookings() {
  const { vendor, signOut } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [prebookings, setPrebookings] = useState<Prebooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  useEffect(() => {
    if (vendor) {
      fetchPrebookings();
    }
  }, [vendor]);

  async function fetchPrebookings() {
    if (!vendor) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("prebookings")
        .select(`
          id,
          points_deducted,
          status,
          created_at,
          customers (
            customer_name,
            phone
          ),
          offers (
            item_name,
            offer_price
          )
        `)
        .eq("vendor_id", vendor.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Normalize data (since some drivers join arrays vs objects)
      const formatted = (data || []).map(item => ({
        ...item,
        customers: Array.isArray(item.customers) ? item.customers[0] : item.customers,
        offers: Array.isArray(item.offers) ? item.offers[0] : item.offers
      })) as Prebooking[];

      setPrebookings(formatted);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Load Failed",
        description: err.message || "Failed to load prebookings.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleClaim(prebookingId: string) {
    setClaimingId(prebookingId);
    try {
      const { error } = await supabase
        .from("prebookings")
        .update({ status: "claimed" })
        .eq("id", prebookingId);

      if (error) throw error;

      toast({
        title: "Item Claimed",
        description: "The prebooking status has been updated to claimed successfully.",
      });
      fetchPrebookings();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Action Failed",
        description: err.message || "Could not update prebooking status.",
      });
    } finally {
      setClaimingId(null);
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
          <p className="text-muted mb-6">No vendor profile was found in the database. Please register first.</p>
          <button onClick={() => setLocation("/register")} className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-bold">
            Go to Register
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col">
      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-40 glass-panel border-x-0 border-t-0 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="font-bold text-2xl flex items-center">
            <span className="text-white">Vend</span><span className="text-gold">ly</span>
          </div>
          <div className="hidden sm:flex items-center gap-6 text-sm font-medium">
            <Link href="/dashboard" className="text-muted hover:text-white transition-colors">Overview</Link>
            <Link href="/customers" className="text-muted hover:text-white transition-colors">Customers</Link>
            <Link href="/rewards" className="text-muted hover:text-white transition-colors">Rewards</Link>
            <Link href="/offers" className="text-muted hover:text-white transition-colors">Offers</Link>
            <Link href="/prebookings" className="text-white border-b-2 border-gold pb-1 pt-1 font-bold">Prebookings</Link>
          </div>
        </div>
        <button onClick={handleSignOut}
          className="flex items-center gap-2 border border-white/10 hover:border-red-500/30 hover:text-red-400 px-4 py-2 rounded-full text-sm font-semibold hover:bg-red-500/10 transition-all cursor-pointer">
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </nav>

      {/* CONTENT MAIN */}
      <main className="flex-1 max-w-6xl w-full mx-auto pt-24 pb-16 px-4">
        
        {/* Header Block */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-white flex items-center gap-2">
              <ShoppingBag className="w-8 h-8 text-gold" />
              Customer Prebookings
            </h1>
            <p className="text-muted text-sm mt-1">
              Track items prebooked by customers using their loyalty points and confirm pickups.
            </p>
          </div>

          <button 
            onClick={fetchPrebookings}
            disabled={loading}
            className="flex items-center gap-1.5 border border-white/10 hover:border-gold hover:text-gold px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 transition-all disabled:opacity-50 cursor-pointer self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh List
          </button>
        </div>

        {/* LOADING & TABLE */}
        {loading ? (
          <div className="min-h-[300px] flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-12 h-12 text-gold animate-spin" />
            <p className="text-muted animate-pulse">Loading prebookings...</p>
          </div>
        ) : prebookings.length === 0 ? (
          <div className="glass-panel p-12 rounded-3xl border border-white/10 text-center max-w-md mx-auto">
            <ShoppingBag className="w-16 h-16 text-muted mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-bold text-white mb-2">No Prebookings Yet</h3>
            <p className="text-muted text-sm">
              Incoming prebooked items will appear here once customers start reserving deals using their points.
            </p>
          </div>
        ) : (
          <div className="glass-panel rounded-3xl border border-white/10 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <th className="py-4 px-6">Customer</th>
                    <th className="py-4 px-6">Item Prebooked</th>
                    <th className="py-4 px-6">Deal Price</th>
                    <th className="py-4 px-6">Points Redeemed</th>
                    <th className="py-4 px-6">Date</th>
                    <th className="py-4 px-6 text-center">Status / Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm text-white">
                  {prebookings.map(pb => (
                    <tr key={pb.id} className="hover:bg-white/5 transition-colors">
                      {/* Customer info */}
                      <td className="py-4 px-6">
                        <div className="font-semibold text-white">
                          {pb.customers?.customer_name || "Unknown Customer"}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                          <Phone className="w-3.5 h-3.5" />
                          {pb.customers?.phone || "N/A"}
                        </div>
                      </td>

                      {/* Item Info */}
                      <td className="py-4 px-6 font-semibold text-white">
                        {pb.offers?.item_name || "Deleted Offer"}
                      </td>

                      {/* Offer Price */}
                      <td className="py-4 px-6 font-bold text-emerald">
                        ₹{pb.offers?.offer_price ?? "0.00"}
                      </td>

                      {/* Points Cost */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-1 font-semibold text-gold">
                          <Coins className="w-4 h-4" />
                          {pb.points_deducted} pts
                        </div>
                      </td>

                      {/* Prebooked Date */}
                      <td className="py-4 px-6 text-muted-foreground text-xs">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(pb.created_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </div>
                      </td>

                      {/* Status / Action */}
                      <td className="py-4 px-6 text-center">
                        {pb.status === "claimed" ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald bg-emerald/10 border border-emerald/20 px-3 py-1.5 rounded-full">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Claimed
                          </span>
                        ) : (
                          <button
                            onClick={() => handleClaim(pb.id)}
                            disabled={claimingId === pb.id}
                            className="bg-primary hover:bg-gold/90 text-primary-foreground px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 mx-auto transition-all cursor-pointer disabled:opacity-50"
                          >
                            {claimingId === pb.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Check className="w-3.5 h-3.5" />
                            )}
                            Mark as Claimed
                          </button>
                        )}
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
