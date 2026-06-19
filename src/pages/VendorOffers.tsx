import React, { useState, useEffect } from "react";
import { useAuth } from "../hooks/use-auth";
import { useLocation, Link } from "wouter";
import { supabase } from "../lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { 
  LogOut, Store, Tag, Plus, Edit, Trash2, Eye, X, 
  Loader2, Sparkles, ShieldAlert, ArrowLeft, Coins
} from "lucide-react";

interface Offer {
  id: string;
  item_name: string;
  description: string;
  original_price: number | null;
  offer_price: number;
  points_cost: number;
  created_at: string;
}

export default function VendorOffers() {
  const { vendor, signOut } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [itemName, setItemName] = useState("");
  const [description, setDescription] = useState("");
  const [origPrice, setOrigPrice] = useState("");
  const [offPrice, setOffPrice] = useState("");
  const [ptsCost, setPtsCost] = useState("50");

  useEffect(() => {
    if (vendor) {
      fetchOffers();
    }
  }, [vendor]);

  async function fetchOffers() {
    if (!vendor) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("offers")
        .select("*")
        .eq("vendor_id", vendor.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOffers(data || []);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Load Failed",
        description: err.message || "Failed to load offers.",
      });
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingOffer(null);
    setItemName("");
    setDescription("");
    setOrigPrice("");
    setOffPrice("");
    setPtsCost("50");
    setIsModalOpen(true);
  }

  function openEditModal(offer: Offer) {
    setEditingOffer(offer);
    setItemName(offer.item_name);
    setDescription(offer.description || "");
    setOrigPrice(offer.original_price?.toString() || "");
    setOffPrice(offer.offer_price.toString());
    setPtsCost(offer.points_cost.toString());
    setIsModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!vendor) return;
    setActionLoading(true);

    const parsedOfferPrice = parseFloat(offPrice);
    const parsedPointsCost = parseInt(ptsCost);
    const parsedOrigPrice = origPrice.trim() ? parseFloat(origPrice) : null;

    if (isNaN(parsedOfferPrice) || parsedOfferPrice <= 0) {
      toast({ variant: "destructive", title: "Invalid Input", description: "Offer price must be positive." });
      setActionLoading(false);
      return;
    }

    if (isNaN(parsedPointsCost) || parsedPointsCost < 0) {
      toast({ variant: "destructive", title: "Invalid Input", description: "Points cost cannot be negative." });
      setActionLoading(false);
      return;
    }

    try {
      if (editingOffer) {
        // Edit offer
        const { error } = await supabase
          .from("offers")
          .update({
            item_name: itemName.trim(),
            description: description.trim(),
            original_price: parsedOrigPrice,
            offer_price: parsedOfferPrice,
            points_cost: parsedPointsCost,
          })
          .eq("id", editingOffer.id);

        if (error) throw error;

        toast({ title: "Offer Updated", description: "Your offer tier has been successfully updated." });
      } else {
        // Create offer
        const { error } = await supabase
          .from("offers")
          .insert([
            {
              vendor_id: vendor.id,
              item_name: itemName.trim(),
              description: description.trim(),
              original_price: parsedOrigPrice,
              offer_price: parsedOfferPrice,
              points_cost: parsedPointsCost,
            }
          ]);

        if (error) throw error;

        toast({ title: "Offer Created 🎉", description: "Your daily offer is now live for customers." });
      }

      setIsModalOpen(false);
      fetchOffers();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Action Failed",
        description: err.message || "Failed to save offer details.",
      });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete(offerId: string) {
    if (!confirm("Are you sure you want to remove this offer? This will delete the offer but won't cancel past customer bookings.")) return;

    try {
      const { error } = await supabase
        .from("offers")
        .delete()
        .eq("id", offerId);

      if (error) throw error;

      toast({ title: "Offer Deleted", description: "The offer has been removed." });
      fetchOffers();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Delete Failed",
        description: err.message || "Could not delete offer.",
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
            <Link href="/offers" className="text-white border-b-2 border-gold pb-1 pt-1 font-bold">Offers</Link>
            <Link href="/prebookings" className="text-muted hover:text-white transition-colors">Prebookings</Link>
          </div>
        </div>
        <button onClick={handleSignOut}
          className="flex items-center gap-2 border border-white/10 hover:border-red-500/30 hover:text-red-400 px-4 py-2 rounded-full text-sm font-semibold hover:bg-red-500/10 transition-all cursor-pointer">
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </nav>

      {/* CONTENT CONTAINER */}
      <main className="flex-1 max-w-6xl w-full mx-auto pt-24 pb-16 px-4">
        
        {/* Header Block */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-white flex items-center gap-2">
              <Tag className="w-8 h-8 text-gold" />
              Manage Daily Offers
            </h1>
            <p className="text-muted text-sm mt-1">
              Add and configure special items customers can prebook with points before visiting the store.
            </p>
          </div>

          <button 
            onClick={openCreateModal}
            className="bg-primary text-primary-foreground px-5 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gold/90 transition-all cursor-pointer text-sm self-start sm:self-auto gold-glow"
          >
            <Plus className="w-4 h-4" /> Create Offer Deal
          </button>
        </div>

        {/* LOADING & DISPLAY GRID */}
        {loading ? (
          <div className="min-h-[300px] flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-12 h-12 text-gold animate-spin" />
            <p className="text-muted animate-pulse">Loading daily offers...</p>
          </div>
        ) : offers.length === 0 ? (
          <div className="glass-panel p-12 rounded-3xl border border-white/10 text-center max-w-md mx-auto">
            <Tag className="w-16 h-16 text-muted mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-bold text-white mb-2">No Active Offers</h3>
            <p className="text-muted text-sm mb-6">
              You haven't posted any daily offers. Create your first deal to let customers prebook items!
            </p>
            <button onClick={openCreateModal} className="bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-bold text-sm">
              Create First Offer
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {offers.map(offer => (
              <div 
                key={offer.id} 
                className="glass-panel rounded-3xl border border-white/10 p-6 flex flex-col justify-between hover:border-gold/20 transition-all shadow-lg relative overflow-hidden group"
              >
                {/* Points Tag Badge */}
                <div className="absolute top-0 right-0 bg-gold/15 text-gold border-b border-l border-gold/20 px-4 py-1.5 rounded-bl-2xl text-xs font-bold flex items-center gap-1">
                  <Coins className="w-3.5 h-3.5" />
                  {offer.points_cost} pts
                </div>

                <div>
                  <h3 className="text-xl font-bold text-white pr-20 mb-2">{offer.item_name}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-6 h-14">
                    {offer.description || "No description provided."}
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Price info */}
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-emerald">₹{offer.offer_price}</span>
                    {offer.original_price && (
                      <span className="text-sm text-muted-foreground line-through">₹{offer.original_price}</span>
                    )}
                  </div>

                  {/* Actions footer */}
                  <div className="flex items-center gap-2 border-t border-white/5 pt-4">
                    <button 
                      onClick={() => openEditModal(offer)}
                      className="flex-1 flex items-center justify-center gap-1.5 border border-white/10 hover:border-gold hover:text-gold px-3 py-2 rounded-xl text-xs font-bold bg-white/5 transition-all cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button 
                      onClick={() => handleDelete(offer.id)}
                      className="flex items-center justify-center border border-white/10 hover:border-red-500/30 hover:text-red-400 p-2.5 rounded-xl bg-white/5 transition-all cursor-pointer"
                      title="Delete offer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </main>

      {/* CREATE & EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel max-w-lg w-full rounded-3xl border border-white/10 p-6 md:p-8 animate-scaleUp shadow-2xl relative">
            
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-xl text-muted-foreground hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-2xl font-extrabold text-white mb-6">
              {editingOffer ? "Edit Daily Offer" : "Create Daily Offer"}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Item Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                  Item Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Organic Basmati Rice (5kg)"
                  value={itemName}
                  onChange={e => setItemName(e.target.value)}
                  className="block w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-muted-foreground focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 text-sm"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                  Item Description
                </label>
                <textarea
                  placeholder="Describe details of the deal (e.g. stock limits, pick-up hours)..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                  className="block w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-muted-foreground focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 text-sm resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Original Price */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                    Original Price (₹) <span className="text-[10px] text-muted-foreground font-normal">(Optional)</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 450"
                    value={origPrice}
                    onChange={e => setOrigPrice(e.target.value)}
                    className="block w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-muted-foreground focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 text-sm"
                  />
                </div>

                {/* Offer Price */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                    Offer Price (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 380"
                    value={offPrice}
                    onChange={e => setOffPrice(e.target.value)}
                    className="block w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-muted-foreground focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 text-sm"
                  />
                </div>
              </div>

              {/* Prebooking Points Cost */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                  Points Cost to Prebook
                </label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 100"
                  value={ptsCost}
                  onChange={e => setPtsCost(e.target.value)}
                  className="block w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-muted-foreground focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 text-sm"
                />
              </div>

              {/* Action buttons */}
              <div className="flex gap-4 pt-4 border-t border-white/5">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 border border-white/10 text-white py-3 rounded-xl font-bold hover:bg-white/5 transition-colors cursor-pointer text-sm"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={actionLoading}
                  className="flex-1 bg-primary text-primary-foreground py-3 rounded-xl font-bold hover:bg-gold/90 transition-colors flex items-center justify-center gap-2 cursor-pointer text-sm"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {editingOffer ? "Save Changes" : "Create Deal"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
