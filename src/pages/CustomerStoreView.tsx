import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useLocation, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { 
  Store, Star, ArrowLeft, Coins, Loader2, Tag, 
  ShoppingBag, CheckCircle, AlertCircle, Calendar, Sparkles
} from "lucide-react";

interface Offer {
  id: string;
  item_name: string;
  description: string;
  original_price: number | null;
  offer_price: number;
  points_cost: number;
}

interface CustomerProfile {
  id: string;
  customer_name: string;
  points: number;
}

interface VendorProfile {
  name: string;
  business: string;
}

export default function CustomerStoreView({ params }: { params: { vendorId: string } }) {
  const { vendorId } = params;
  const [phone, setPhone] = useState<string | null>(null);
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [vendor, setVendor] = useState<VendorProfile | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successPrebooking, setSuccessPrebooking] = useState<{
    itemName: string;
    pointsDeducted: number;
    code: string;
  } | null>(null);

  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const storedPhone = localStorage.getItem("customer_phone");
    if (!storedPhone) {
      setLocation("/customer/login");
      return;
    }
    setPhone(storedPhone);
    loadStoreDetails(storedPhone);
  }, [vendorId, setLocation]);

  async function loadStoreDetails(customerPhone: string) {
    setLoading(true);
    try {
      // 1. Get customer record for this specific vendor
      const { data: custData, error: custError } = await supabase
        .from("customers")
        .select("id, customer_name, points")
        .eq("vendor_id", vendorId)
        .eq("phone", customerPhone)
        .maybeSingle();

      if (custError) throw custError;

      if (!custData) {
        throw new Error("You are not registered in this store's loyalty program.");
      }
      setCustomer(custData);

      // 2. Get vendor store details
      const { data: vendData, error: vendError } = await supabase
        .from("vendors")
        .select("name, business")
        .eq("id", vendorId)
        .single();

      if (vendError) throw vendError;
      setVendor(vendData);

      // 3. Get active offers
      const { data: offersData, error: offersError } = await supabase
        .from("offers")
        .select("id, item_name, description, original_price, offer_price, points_cost")
        .eq("vendor_id", vendorId)
        .order("created_at", { ascending: false });

      if (offersError) throw offersError;
      setOffers(offersData || []);

    } catch (err: any) {
      console.error("Error loading store details:", err);
      toast({
        variant: "destructive",
        title: "Error Loading Store",
        description: err.message || "Failed to load store data.",
      });
      setLocation("/customer/portal");
    } finally {
      setLoading(false);
    }
  }

  async function handlePrebook(offer: Offer) {
    if (!customer || !phone) return;

    if (customer.points < offer.points_cost) {
      toast({
        variant: "destructive",
        title: "Insufficient Points",
        description: `You need ${offer.points_cost} points to prebook this item, but you only have ${customer.points} points.`,
      });
      return;
    }

    setSubmitting(true);
    try {
      const newPointsBalance = customer.points - offer.points_cost;

      // 1. Deduct points from customer profile
      const { error: updateError } = await supabase
        .from("customers")
        .update({ points: newPointsBalance })
        .eq("id", customer.id);

      if (updateError) throw updateError;

      // 2. Insert prebooking entry
      const prebookingCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const { error: prebookError } = await supabase
        .from("prebookings")
        .insert([
          {
            vendor_id: vendorId,
            customer_id: customer.id,
            offer_id: offer.id,
            points_deducted: offer.points_cost,
            status: "pending",
          }
        ]);

      if (prebookError) throw prebookError;

      // 3. Log negative transaction to balance history
      const { error: txError } = await supabase
        .from("transactions")
        .insert([
          {
            vendor_id: vendorId,
            customer_id: customer.id,
            amount: 0.00,
            points_earned: -offer.points_cost,
          }
        ]);

      if (txError) throw txError;

      // Update local state points balance
      setCustomer(prev => prev ? { ...prev, points: newPointsBalance } : null);

      // Display success modal
      setSuccessPrebooking({
        itemName: offer.item_name,
        pointsDeducted: offer.points_cost,
        code: prebookingCode,
      });

      toast({
        title: "Prebooking Confirmed! 🎉",
        description: `Prebooked ${offer.item_name} successfully.`,
      });

    } catch (err: any) {
      console.error("Prebooking failed:", err);
      toast({
        variant: "destructive",
        title: "Prebooking Failed",
        description: err.message || "Failed to complete prebooking. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col">
      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-40 glass-panel border-x-0 border-t-0 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/customer/portal" className="text-muted hover:text-white transition-colors cursor-pointer">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="font-bold text-2xl flex items-center">
            <span className="text-white">Vend</span><span className="text-gold">ly</span>
          </div>
        </div>

        {customer && (
          <div className="flex items-center gap-1.5 font-bold text-gold text-lg px-4 py-1.5 rounded-full bg-gold/10 border border-gold/20 shadow-md">
            <Coins className="w-4 h-4" />
            {customer.points}
            <span className="text-xs font-semibold text-muted-foreground ml-0.5">pts</span>
          </div>
        )}
      </nav>

      {/* MAIN CONTENT */}
      <main className="flex-1 max-w-4xl w-full mx-auto pt-24 pb-16 px-4">
        
        {loading ? (
          <div className="min-h-[400px] flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-12 h-12 text-gold animate-spin" />
            <p className="text-muted animate-pulse">Loading store details & offers...</p>
          </div>
        ) : (
          <>
            {/* Store Information */}
            <div className="glass-panel p-6 rounded-3xl border border-white/10 shadow-lg mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-blue/5 to-transparent">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-blue/15 border border-blue/30 flex items-center justify-center text-blue">
                  <Store className="w-7 h-7" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white leading-tight">
                    {vendor?.business}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Store Owner: {vendor?.name}
                  </p>
                </div>
              </div>
              
              <div className="text-right sm:text-right w-full sm:w-auto">
                <span className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">Registered Account</span>
                <span className="text-sm font-semibold text-white">{customer?.customer_name}</span>
              </div>
            </div>

            {/* Daily Offers Title */}
            <div className="mb-6 flex items-center gap-2">
              <Tag className="w-6 h-6 text-gold" />
              <h2 className="text-xl font-bold text-white">Today's Store Offers</h2>
              <span className="text-xs text-muted bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-full font-medium ml-2">
                Prebook with Points
              </span>
            </div>

            {/* OFFERS CONTAINER */}
            {offers.length === 0 ? (
              <div className="glass-panel p-12 rounded-3xl border border-white/10 text-center max-w-md mx-auto">
                <ShoppingBag className="w-16 h-16 text-muted mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-bold text-white mb-1">No Offers Today</h3>
                <p className="text-muted text-sm">
                  This store hasn't posted any offers for today. Check back later!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {offers.map(offer => (
                  <div 
                    key={offer.id} 
                    className="glass-panel rounded-3xl border border-white/10 p-6 flex flex-col justify-between hover:border-gold/20 transition-all shadow-md relative overflow-hidden group"
                  >
                    {/* Points Tag Badge */}
                    <div className="absolute top-0 right-0 bg-gold/15 text-gold border-b border-l border-gold/20 px-4 py-1.5 rounded-bl-2xl text-xs font-bold flex items-center gap-1">
                      <Coins className="w-3.5 h-3.5" />
                      {offer.points_cost} pts
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-white pr-20 mb-2">
                        {offer.item_name}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-3 mb-6">
                        {offer.description || "No description provided."}
                      </p>
                    </div>

                    <div className="space-y-4">
                      {/* Price Section */}
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-emerald">
                          ₹{offer.offer_price}
                        </span>
                        {offer.original_price && (
                          <span className="text-sm text-muted-foreground line-through">
                            ₹{offer.original_price}
                          </span>
                        )}
                      </div>

                      <button 
                        onClick={() => handlePrebook(offer)}
                        disabled={submitting}
                        className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold hover:bg-gold/90 transition-all cursor-pointer flex items-center justify-center gap-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed gold-glow"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Booking...
                          </>
                        ) : (
                          <>
                            <ShoppingBag className="w-4 h-4" />
                            Prebook ({offer.points_cost} pts)
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

      </main>

      {/* SUCCESS PREBOOKING MODAL */}
      {successPrebooking && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel max-w-md w-full rounded-3xl border border-white/10 p-8 text-center animate-scaleUp shadow-2xl relative overflow-hidden">
            
            {/* Sparkles effect */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-gold via-blue to-gold"></div>

            <div className="w-16 h-16 rounded-full bg-emerald/15 border border-emerald/30 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-9 h-9 text-emerald" />
            </div>

            <h3 className="text-2xl font-bold text-white mb-2">Prebooking Successful!</h3>
            <p className="text-muted-foreground text-sm mb-6">
              You prebooked <strong className="text-white">{successPrebooking.itemName}</strong>.
              <br />
              <span className="text-gold font-bold">{successPrebooking.pointsDeducted} loyalty points</span> have been deducted from your balance.
            </p>

            {/* Booking Code Card */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-8">
              <span className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">Show this code at pickup</span>
              <span className="text-3xl font-black text-white tracking-widest font-mono">
                {successPrebooking.code}
              </span>
            </div>

            <button 
              onClick={() => setSuccessPrebooking(null)}
              className="w-full bg-primary text-primary-foreground py-3.5 rounded-xl font-bold hover:bg-gold/90 transition-all cursor-pointer text-sm shadow-md"
            >
              Back to Store
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
