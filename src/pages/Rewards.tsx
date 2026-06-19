import React, { useState, useEffect } from "react";
import { useAuth } from "../hooks/use-auth";
import { useLocation, Link } from "wouter";
import { supabase } from "../lib/supabase";
import { useToast } from "@/hooks/use-toast";
import {
  LogOut, Gift, Plus, Edit, Trash2, Coins, Loader2,
  Search, X, Sparkles, Star, Users, ChevronRight,
  CheckCircle, Clock, History, AlertCircle, ShieldAlert
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Reward {
  id: string;
  reward_name: string;
  description: string | null;
  points_required: number;
  created_at: string;
}

interface Customer {
  id: string;
  customer_name: string;
  phone: string;
  points: number;
}

interface RedemptionRecord {
  id: string;
  redeemed_at: string;
  points_deducted: number;
  customers: { customer_name: string; phone: string } | null;
  rewards: { reward_name: string } | null;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Rewards() {
  const { vendor, signOut } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Data
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [redemptions, setRedemptions] = useState<RedemptionRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [dataLoading, setDataLoading] = useState(true);
  const [redemptionsLoading, setRedemptionsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Modal visibility
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRedeemModalOpen, setIsRedeemModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Selected / form state
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [redeemCustomerId, setRedeemCustomerId] = useState("");

  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPoints, setFormPoints] = useState("");

  // ─── Data Fetch ───────────────────────────────────────────────────────────
  async function fetchRewards() {
    if (!vendor) return;
    try {
      const { data, error } = await supabase
        .from("rewards")
        .select("*")
        .eq("vendor_id", vendor.id)
        .order("points_required", { ascending: true });
      if (error) throw error;
      setRewards(data || []);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Fetch Error", description: err.message });
    } finally {
      setDataLoading(false);
    }
  }

  async function fetchCustomers() {
    if (!vendor) return;
    const { data } = await supabase
      .from("customers")
      .select("id, customer_name, phone, points")
      .eq("vendor_id", vendor.id)
      .order("customer_name", { ascending: true });
    setCustomers(data || []);
  }

  async function fetchRedemptions() {
    if (!vendor) return;
    setRedemptionsLoading(true);
    try {
      const { data, error } = await supabase
        .from("redemption_history")
        .select(`
          id,
          redeemed_at,
          points_deducted,
          customers ( customer_name, phone ),
          rewards ( reward_name )
        `)
        .eq("vendor_id", vendor.id)
        .order("redeemed_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      setRedemptions((data || []).map((r: any) => ({
        ...r,
        customers: Array.isArray(r.customers) ? r.customers[0] : r.customers,
        rewards: Array.isArray(r.rewards) ? r.rewards[0] : r.rewards,
      })) as RedemptionRecord[]);
    } catch (err: any) {
      toast({ variant: "destructive", title: "History Error", description: err.message });
    } finally {
      setRedemptionsLoading(false);
    }
  }

  // Real-time
  useEffect(() => {
    if (!vendor) return;
    fetchRewards();
    fetchCustomers();

    const channel = supabase
      .channel("realtime-rewards")
      .on("postgres_changes", { event: "*", schema: "public", table: "rewards" }, fetchRewards)
      .on("postgres_changes", { event: "*", schema: "public", table: "customers" }, fetchCustomers)
      .on("postgres_changes", { event: "*", schema: "public", table: "redemption_history" }, () => {
        if (isHistoryOpen) fetchRedemptions();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [vendor]);

  // ─── Form Helpers ──────────────────────────────────────────────────────────
  function resetForm() {
    setFormName("");
    setFormDescription("");
    setFormPoints("");
    setSelectedReward(null);
  }

  function openEdit(reward: Reward) {
    setSelectedReward(reward);
    setFormName(reward.reward_name);
    setFormDescription(reward.description || "");
    setFormPoints(reward.points_required.toString());
    setIsEditModalOpen(true);
  }

  function openRedeem(reward: Reward) {
    setSelectedReward(reward);
    setRedeemCustomerId("");
    setIsRedeemModalOpen(true);
  }

  function openHistory() {
    setIsHistoryOpen(true);
    fetchRedemptions();
  }

  // ─── Mutations ────────────────────────────────────────────────────────────
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!vendor) return;
    setActionLoading(true);
    try {
      const { error } = await supabase.from("rewards").insert([{
        vendor_id: vendor.id,
        reward_name: formName.trim(),
        description: formDescription.trim() || null,
        points_required: parseInt(formPoints),
      }]);
      if (error) throw error;
      toast({ title: "Reward Created", description: `"${formName}" is now live!` });
      setIsCreateModalOpen(false);
      resetForm();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Create Failed", description: err.message });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!vendor || !selectedReward) return;
    setActionLoading(true);
    try {
      const { error } = await supabase.from("rewards").update({
        reward_name: formName.trim(),
        description: formDescription.trim() || null,
        points_required: parseInt(formPoints),
      }).eq("id", selectedReward.id);
      if (error) throw error;
      toast({ title: "Reward Updated", description: `"${formName}" has been saved.` });
      setIsEditModalOpen(false);
      resetForm();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Update Failed", description: err.message });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete(reward: Reward) {
    if (!confirm(`Delete "${reward.reward_name}"? This cannot be undone.`)) return;
    try {
      const { error } = await supabase.from("rewards").delete().eq("id", reward.id);
      if (error) throw error;
      toast({ title: "Reward Deleted", description: `"${reward.reward_name}" has been removed.` });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Delete Failed", description: err.message });
    }
  }

  async function handleRedeem(e: React.FormEvent) {
    e.preventDefault();
    if (!vendor || !selectedReward || !redeemCustomerId) return;
    setActionLoading(true);

    const customer = customers.find(c => c.id === redeemCustomerId);
    if (!customer) {
      toast({ variant: "destructive", title: "Error", description: "Customer not found." });
      setActionLoading(false);
      return;
    }

    if (customer.points < selectedReward.points_required) {
      toast({
        variant: "destructive",
        title: "Insufficient Points",
        description: `${customer.customer_name} only has ${customer.points} pts, but ${selectedReward.points_required} pts are required.`,
      });
      setActionLoading(false);
      return;
    }

    try {
      // 1. Deduct points from customer
      const { error: updateErr } = await supabase.from("customers")
        .update({ points: customer.points - selectedReward.points_required })
        .eq("id", customer.id);
      if (updateErr) throw updateErr;

      // 2. Log to redemption_history
      const { error: histErr } = await supabase.from("redemption_history").insert([{
        vendor_id: vendor.id,
        customer_id: customer.id,
        reward_id: selectedReward.id,
        points_deducted: selectedReward.points_required,
      }]);
      if (histErr) throw histErr;

      toast({
        title: "Reward Redeemed! 🎉",
        description: `${customer.customer_name} redeemed "${selectedReward.reward_name}" for ${selectedReward.points_required} pts.`,
      });
      setIsRedeemModalOpen(false);
      setSelectedReward(null);
      setRedeemCustomerId("");
      fetchCustomers();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Redemption Failed", description: err.message });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    setLocation("/");
  }

  // ─── Derived ──────────────────────────────────────────────────────────────
  const filteredRewards = rewards.filter(r => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      r.reward_name.toLowerCase().includes(q) ||
      (r.description && r.description.toLowerCase().includes(q))
    );
  });

  const selectedCustomer = customers.find(c => c.id === redeemCustomerId) || null;
  const canRedeem = selectedCustomer && selectedReward
    ? selectedCustomer.points >= selectedReward.points_required
    : false;

  // ─── Access Guard ─────────────────────────────────────────────────────────
  if (!vendor) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-white px-4">
        <div className="glass-panel p-8 rounded-2xl max-w-md w-full text-center border-red-500/20">
          <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Access Error</h2>
          <p className="text-muted mb-6">No vendor profile found. Please register first.</p>
          <button onClick={() => setLocation("/register")}
            className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-bold hover:bg-gold/90 transition-colors">
            Go to Register
          </button>
        </div>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background text-foreground font-sans pb-16">

      {/* ── NAVBAR ─────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-40 glass-panel border-x-0 border-t-0 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="font-bold text-2xl flex items-center">
            <span className="text-white">Vend</span><span className="text-gold">ly</span>
          </div>
          <div className="hidden sm:flex items-center gap-6 text-sm font-medium">
            <Link href="/dashboard" className="text-muted hover:text-white transition-colors">Overview</Link>
            <Link href="/customers" className="text-muted hover:text-white transition-colors">Customers</Link>
            <Link href="/rewards" className="text-white border-b-2 border-gold pb-1 pt-1 font-bold">Rewards</Link>
            <Link href="/qr-scanner" className="text-muted hover:text-white transition-colors">Scan QR</Link>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={openHistory}
            className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground hover:text-gold border border-white/10 hover:border-gold/30 px-3 py-2 rounded-full transition-all cursor-pointer"
          >
            <History className="w-3.5 h-3.5" />
            Redemption History
          </button>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 border border-white/10 hover:border-red-500/30 hover:text-red-400 px-4 py-2 rounded-full text-sm font-semibold hover:bg-red-500/10 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </nav>

      {/* ── MAIN ───────────────────────────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-6 pt-28">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
              <Gift className="w-8 h-8 text-gold" />
              Rewards Catalog
            </h1>
            <p className="text-muted text-sm mt-1">
              Create loyalty rewards, manage tiers, and redeem points for happy customers.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={openHistory}
              className="sm:hidden flex items-center gap-2 border border-white/10 hover:border-gold/30 text-muted-foreground hover:text-gold px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer"
            >
              <History className="w-4 h-4" />
              History
            </button>
            <button
              onClick={() => { resetForm(); setIsCreateModalOpen(true); }}
              className="bg-primary text-primary-foreground hover:bg-gold/90 px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 cursor-pointer gold-glow transition-all"
            >
              <Plus className="w-4 h-4" />
              Create Reward
            </button>
          </div>
        </div>

        {/* Stats Row */}
        {!dataLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
            {[
              { label: "Total Rewards", value: rewards.length, icon: <Gift className="w-5 h-5 text-gold" />, color: "border-gold/20" },
              { label: "Avg Points Cost", value: rewards.length ? Math.round(rewards.reduce((s, r) => s + r.points_required, 0) / rewards.length) : "—", icon: <Coins className="w-5 h-5 text-blue" />, color: "border-blue/20" },
              { label: "Total Customers", value: customers.length, icon: <Users className="w-5 h-5 text-emerald" />, color: "border-emerald/20" },
            ].map((s, i) => (
              <div key={i} className={`glass-panel p-5 rounded-2xl border ${s.color} flex items-center gap-4`}>
                <div className="p-2.5 bg-white/5 rounded-xl flex-shrink-0">{s.icon}</div>
                <div>
                  <div className="text-2xl font-extrabold text-white">{s.value}</div>
                  <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Search Bar */}
        <div className="glass-panel p-4 rounded-2xl border border-white/15 mb-6 flex items-center gap-3">
          <Search className="w-5 h-5 text-muted-foreground ml-2" />
          <input
            type="text"
            placeholder="Search rewards by name or description..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="block w-full bg-transparent border-0 text-white placeholder-muted-foreground focus:outline-none focus:ring-0 text-sm py-1.5"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="p-1.5 hover:bg-white/5 rounded-lg text-muted-foreground hover:text-white">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Rewards Grid */}
        {dataLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(s => (
              <div key={s} className="animate-pulse glass-panel p-6 rounded-3xl space-y-4">
                <div className="h-6 bg-white/10 rounded w-3/4" />
                <div className="h-4 bg-white/10 rounded w-full" />
                <div className="h-4 bg-white/10 rounded w-2/3" />
                <div className="flex justify-between mt-4">
                  <div className="h-8 bg-white/10 rounded-full w-24" />
                  <div className="h-8 bg-white/10 rounded-xl w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredRewards.length === 0 ? (
          <div className="glass-panel rounded-3xl border border-white/10 flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto">
            <div className="p-5 bg-white/5 border border-white/10 rounded-full mb-5">
              <Gift className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="font-bold text-xl text-white mb-2">
              {searchQuery ? "No Matching Rewards" : "No Rewards Yet"}
            </h3>
            <p className="text-muted text-sm mb-6 px-4">
              {searchQuery
                ? "Try a different search term."
                : "Create your first reward tier to start incentivising loyal customers."}
            </p>
            {!searchQuery && (
              <button
                onClick={() => { resetForm(); setIsCreateModalOpen(true); }}
                className="bg-primary text-primary-foreground hover:bg-gold/90 px-6 py-3 rounded-xl font-bold flex items-center gap-2 cursor-pointer transition-all gold-glow"
              >
                <Plus className="w-4 h-4" />
                Create First Reward
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRewards.map(reward => (
              <RewardCard
                key={reward.id}
                reward={reward}
                customers={customers}
                onEdit={() => openEdit(reward)}
                onDelete={() => handleDelete(reward)}
                onRedeem={() => openRedeem(reward)}
              />
            ))}
          </div>
        )}
      </main>

      {/* ══════════════════════════════════════════════════════════════════════
           MODAL 1 — CREATE REWARD
         ══════════════════════════════════════════════════════════════════════ */}
      {isCreateModalOpen && (
        <ModalBackdrop onClose={() => { setIsCreateModalOpen(false); resetForm(); }}>
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
              <Gift className="w-6 h-6 text-gold" />
              Create Reward
            </h2>
            <p className="text-muted text-xs">Add a new reward tier customers can redeem with loyalty points.</p>
          </div>
          <form onSubmit={handleCreate} className="space-y-4">
            <FormField label="Reward Name" required>
              <input type="text" required placeholder="e.g. Free Chai, 10% Off Grocery"
                value={formName} onChange={e => setFormName(e.target.value)}
                className={inputCls} />
            </FormField>
            <FormField label="Description / Terms">
              <textarea placeholder="e.g. Valid on minimum order of ₹300. Not combinable with offers."
                value={formDescription} onChange={e => setFormDescription(e.target.value)}
                rows={3} className={`${inputCls} resize-none`} />
            </FormField>
            <FormField label="Points Required" required>
              <input type="number" required min="1" placeholder="e.g. 50"
                value={formPoints} onChange={e => setFormPoints(e.target.value)}
                className={inputCls} />
              {formPoints && (
                <p className="text-xs text-gold flex items-center gap-1 pt-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  Customer must have at least {formPoints} points to redeem this.
                </p>
              )}
            </FormField>
            <SubmitBtn loading={actionLoading} label="Create Reward" />
          </form>
        </ModalBackdrop>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
           MODAL 2 — EDIT REWARD
         ══════════════════════════════════════════════════════════════════════ */}
      {isEditModalOpen && selectedReward && (
        <ModalBackdrop onClose={() => { setIsEditModalOpen(false); resetForm(); }}>
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
              <Edit className="w-6 h-6 text-gold" />
              Edit Reward
            </h2>
            <p className="text-muted text-xs">Modify the details of this reward tier.</p>
          </div>
          <form onSubmit={handleEdit} className="space-y-4">
            <FormField label="Reward Name" required>
              <input type="text" required value={formName} onChange={e => setFormName(e.target.value)} className={inputCls} />
            </FormField>
            <FormField label="Description / Terms">
              <textarea value={formDescription} onChange={e => setFormDescription(e.target.value)}
                rows={3} className={`${inputCls} resize-none`} />
            </FormField>
            <FormField label="Points Required" required>
              <input type="number" required min="1" value={formPoints} onChange={e => setFormPoints(e.target.value)} className={inputCls} />
            </FormField>
            <SubmitBtn loading={actionLoading} label="Save Changes" />
          </form>
        </ModalBackdrop>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
           MODAL 3 — REDEEM REWARD
         ══════════════════════════════════════════════════════════════════════ */}
      {isRedeemModalOpen && selectedReward && (
        <ModalBackdrop onClose={() => { setIsRedeemModalOpen(false); setSelectedReward(null); }}>
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
              <Star className="w-6 h-6 text-gold" />
              Redeem Reward
            </h2>
            <p className="text-muted text-xs">Select a customer to redeem this reward and deduct their points.</p>
          </div>

          {/* Reward Summary */}
          <div className="bg-gold/5 border border-gold/20 rounded-2xl p-4 mb-5 flex items-center justify-between">
            <div>
              <div className="font-bold text-white text-sm">{selectedReward.reward_name}</div>
              {selectedReward.description && (
                <div className="text-xs text-muted-foreground mt-0.5">{selectedReward.description}</div>
              )}
            </div>
            <span className="bg-gold/10 text-gold text-xs font-bold px-3 py-1.5 rounded-full border border-gold/20 flex items-center gap-1.5 flex-shrink-0 ml-3">
              <Coins className="w-3.5 h-3.5" />
              {selectedReward.points_required} pts
            </span>
          </div>

          {customers.length === 0 ? (
            <div className="text-center py-6">
              <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted text-sm">No customers found. Add customers first.</p>
            </div>
          ) : (
            <form onSubmit={handleRedeem} className="space-y-4">
              <FormField label="Select Customer" required>
                <select required value={redeemCustomerId}
                  onChange={e => setRedeemCustomerId(e.target.value)}
                  className={`${inputCls} bg-card`}>
                  <option value="" disabled>-- Choose a customer --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.customer_name} ({c.points} pts)
                    </option>
                  ))}
                </select>
              </FormField>

              {/* Points Preview */}
              {selectedCustomer && (
                <div className={`rounded-xl p-4 border text-sm flex items-start gap-3 ${canRedeem
                  ? "bg-emerald/5 border-emerald/20 text-emerald"
                  : "bg-red-500/5 border-red-500/20 text-red-400"}`}>
                  {canRedeem
                    ? <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    : <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
                  <div>
                    <div className="font-bold">
                      {canRedeem ? "Eligible for redemption" : "Insufficient points"}
                    </div>
                    <div className="text-xs mt-0.5 opacity-80">
                      {selectedCustomer.customer_name} has <strong>{selectedCustomer.points} pts</strong>.
                      {canRedeem
                        ? ` After redeeming: ${selectedCustomer.points - selectedReward.points_required} pts remaining.`
                        : ` Needs ${selectedReward.points_required - selectedCustomer.points} more pts.`}
                    </div>
                  </div>
                </div>
              )}

              <button type="submit" disabled={actionLoading || !canRedeem}
                className={`w-full mt-2 py-3 rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer text-sm transition-all
                  ${canRedeem
                    ? "bg-primary text-primary-foreground hover:bg-gold/90 gold-glow"
                    : "bg-white/5 text-muted-foreground border border-white/10 cursor-not-allowed opacity-60"}`}>
                {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  <><Star className="w-4 h-4" /> Confirm Redemption</>
                )}
              </button>
            </form>
          )}
        </ModalBackdrop>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
           DRAWER — REDEMPTION HISTORY
         ══════════════════════════════════════════════════════════════════════ */}
      {isHistoryOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-end">
          <div className="w-full max-w-md h-full bg-card border-l border-white/10 shadow-2xl p-8 flex flex-col relative overflow-y-auto">
            <button onClick={() => setIsHistoryOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-white p-1.5 cursor-pointer hover:bg-white/5 rounded-lg">
              <X className="w-6 h-6" />
            </button>

            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
                <History className="w-6 h-6 text-gold" />
                Redemption History
              </h2>
              <p className="text-muted text-xs">All reward redemptions across your store.</p>
            </div>

            {redemptionsLoading ? (
              <div className="animate-pulse space-y-3">
                {[1,2,3,4,5].map(s => (
                  <div key={s} className="flex justify-between items-center p-3 rounded-xl bg-white/5">
                    <div className="space-y-2">
                      <div className="h-4 bg-white/10 rounded w-32" />
                      <div className="h-3 bg-white/10 rounded w-20" />
                    </div>
                    <div className="h-6 bg-white/10 rounded-full w-16" />
                  </div>
                ))}
              </div>
            ) : redemptions.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-10">
                <div className="p-4 bg-white/5 border border-white/10 rounded-full mb-4">
                  <History className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-bold text-white mb-1">No Redemptions Yet</h3>
                <p className="text-muted text-sm">Redemptions will appear here after customers redeem rewards.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {redemptions.map(r => (
                  <div key={r.id} className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-white text-sm truncate">
                          {r.rewards?.reward_name || "Unknown Reward"}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {r.customers?.customer_name || "Unknown"} · {r.customers?.phone}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Clock className="w-3 h-3" />
                          {new Date(r.redeemed_at).toLocaleDateString(undefined, {
                            month: "short", day: "numeric", year: "numeric",
                            hour: "2-digit", minute: "2-digit"
                          })}
                        </div>
                      </div>
                      <span className="bg-red-500/10 text-red-400 text-xs font-bold px-2.5 py-1 rounded-full border border-red-500/20 flex-shrink-0">
                        -{r.points_deducted} pts
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function RewardCard({
  reward, customers, onEdit, onDelete, onRedeem,
}: {
  reward: Reward;
  customers: Customer[];
  onEdit: () => void;
  onDelete: () => void;
  onRedeem: () => void;
}) {
  const eligibleCount = customers.filter(c => c.points >= reward.points_required).length;

  return (
    <div className="glass-panel p-6 rounded-3xl border border-white/10 flex flex-col justify-between hover:border-gold/20 hover:scale-[1.01] transition-all duration-300 group">
      {/* Header */}
      <div>
        <div className="flex items-start justify-between mb-3">
          <div className="p-2.5 bg-gold/10 border border-gold/20 rounded-xl group-hover:bg-gold/20 transition-colors">
            <Gift className="w-5 h-5 text-gold" />
          </div>
          <div className="flex gap-1.5">
            <button onClick={onEdit} title="Edit"
              className="p-2 hover:bg-white/10 rounded-xl text-muted-foreground hover:text-gold transition-colors cursor-pointer">
              <Edit className="w-4 h-4" />
            </button>
            <button onClick={onDelete} title="Delete"
              className="p-2 hover:bg-red-500/10 rounded-xl text-muted-foreground hover:text-red-400 transition-colors cursor-pointer">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <h3 className="font-bold text-white text-lg leading-tight mb-2">{reward.reward_name}</h3>
        <p className="text-muted-foreground text-xs min-h-[36px] line-clamp-2">
          {reward.description || "No description provided."}
        </p>
      </div>

      {/* Footer */}
      <div className="pt-4 mt-4 border-t border-white/5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="bg-gold/10 text-gold text-xs font-bold px-3 py-1.5 rounded-full border border-gold/20 flex items-center gap-1.5">
            <Coins className="w-3.5 h-3.5" />
            {reward.points_required} Points
          </span>
          <span className="text-xs text-muted-foreground">
            {eligibleCount} eligible
          </span>
        </div>

        <button onClick={onRedeem}
          className="w-full bg-white/5 border border-white/10 hover:border-gold hover:bg-gold/5 hover:text-gold text-white font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 cursor-pointer transition-all">
          <Star className="w-4 h-4" />
          Redeem for Customer
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Shared UI helpers ────────────────────────────────────────────────────────
const inputCls =
  "block w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-muted-foreground focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 text-sm";

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-muted-foreground uppercase block">
        {label}{required && " *"}
      </label>
      {children}
    </div>
  );
}

function SubmitBtn({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button type="submit" disabled={loading}
      className="w-full mt-2 bg-primary text-primary-foreground py-3 rounded-xl font-bold hover:bg-gold/90 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm gold-glow">
      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : label}
    </button>
  );
}

function ModalBackdrop({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md glass-panel rounded-3xl p-8 border border-white/10 shadow-2xl relative animate-fade-in max-h-[90vh] overflow-y-auto">
        <button onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-white p-1 cursor-pointer z-10">
          <X className="w-6 h-6" />
        </button>
        {children}
      </div>
    </div>
  );
}
