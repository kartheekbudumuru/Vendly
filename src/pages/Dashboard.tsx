import React, { useState, useEffect } from "react";
import { useAuth } from "../hooks/use-auth";
import { useLocation, Link } from "wouter";
import { supabase } from "../lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useLoyaltyEngine } from "../hooks/use-loyalty-engine";
import { 
  LogOut, Store, User, Mail, Phone, Calendar, 
  TrendingUp, Users, Award, ShieldAlert, Plus,
  CreditCard, Gift, Clock, Trash2, X, Check,
  Coins, ArrowRight, Sparkles, ChevronRight, ListCollapse,
  Loader2, QrCode, ShoppingBag, Tag
} from "lucide-react";

interface Customer {
  id: string;
  customer_name: string;
  phone: string;
  points: number;
  created_at: string;
}

interface Transaction {
  id: string;
  amount: number;
  points_earned: number;
  transaction_date: string;
  customer_id: string;
  customers?: {
    customer_name: string;
  } | null;
}

interface Reward {
  id: string;
  reward_name: string;
  points_required: number;
  description: string;
  created_at: string;
}

export default function Dashboard() {
  const { vendor, signOut, refreshProfile } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { calculatePoints, logLoyaltyTransaction, updateLoyaltyRules } = useLoyaltyEngine();

  // Dashboard state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]); // For transaction dropdown
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalTransactions: 0,
    pointsIssued: 0,
    activeRewards: 0,
    pendingPrebookings: 0
  });

  const [dataLoading, setDataLoading] = useState(true);

  // Modal visibility states
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isRewardModalOpen, setIsRewardModalOpen] = useState(false);

  // Form states
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  
  const [txCustId, setTxCustId] = useState("");
  const [txAmount, setTxAmount] = useState("");
  
  const [newRewardName, setNewRewardName] = useState("");
  const [newRewardPoints, setNewRewardPoints] = useState("");
  const [newRewardDesc, setNewRewardDesc] = useState("");

  // Rule settings states
  const [ruleAmount, setRuleAmount] = useState("100");
  const [rulePoints, setRulePoints] = useState("10");

  const [actionLoading, setActionLoading] = useState(false);

  // Sync point rules form on vendor load
  useEffect(() => {
    if (vendor) {
      setRuleAmount(vendor.points_rule_amount?.toString() || "100");
      setRulePoints(vendor.points_rule_points?.toString() || "10");
    }
  }, [vendor]);

  // Fetch all dashboard data
  async function fetchDashboardData() {
    if (!vendor) return;

    try {
      // 1. Fetch Customers
      const { data: custData, error: custError } = await supabase
        .from("customers")
        .select("*")
        .eq("vendor_id", vendor.id)
        .order("points", { ascending: false });

      if (custError) throw custError;

      // 2. Fetch Transactions (joining customer details)
      const { data: txData, error: txError } = await supabase
        .from("transactions")
        .select(`
          id,
          amount,
          points_earned,
          transaction_date,
          customer_id,
          customers (
            customer_name
          )
        `)
        .eq("vendor_id", vendor.id)
        .order("transaction_date", { ascending: false });

      if (txError) throw txError;

      // 3. Fetch Rewards
      const { data: rwData, error: rwError } = await supabase
        .from("rewards")
        .select("*")
        .eq("vendor_id", vendor.id)
        .order("points_required", { ascending: true });

      if (rwError) throw rwError;

      // Map local states
      const loadedCustomers = custData || [];
      const loadedTransactions = (txData || []).map(tx => ({
        ...tx,
        customers: Array.isArray(tx.customers) ? tx.customers[0] : tx.customers
      })) as Transaction[];
      const loadedRewards = rwData || [];

      setCustomers(loadedCustomers.slice(0, 5)); // Top 5
      setAllCustomers(loadedCustomers); // For transaction selector
      setTransactions(loadedTransactions.slice(0, 5)); // Recent 5
      setRewards(loadedRewards);

      // Aggregates
      const totalPoints = loadedTransactions.reduce((sum, tx) => sum + tx.points_earned, 0);

      // 4. Fetch Pending Prebookings count
      const { count: prebookCount, error: prebookError } = await supabase
        .from("prebookings")
        .select("*", { count: "exact", head: true })
        .eq("vendor_id", vendor.id)
        .eq("status", "pending");

      if (prebookError) throw prebookError;

      setStats({
        totalCustomers: loadedCustomers.length,
        totalTransactions: loadedTransactions.length,
        pointsIssued: totalPoints,
        activeRewards: loadedRewards.length,
        pendingPrebookings: prebookCount || 0
      });

    } catch (err: any) {
      console.error("Error fetching dashboard data:", err);
      toast({
        variant: "destructive",
        title: "Fetch Error",
        description: err.message || "Could not retrieve real-time dashboard data."
      });
    } finally {
      setDataLoading(false);
    }
  }

  // Real-time integration
  useEffect(() => {
    if (!vendor) return;

    fetchDashboardData();

    // Subscribe to modifications on tables
    const channel = supabase
      .channel("realtime-vendor-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "customers" }, () => {
        fetchDashboardData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, () => {
        fetchDashboardData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "rewards" }, () => {
        fetchDashboardData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "prebookings" }, () => {
        fetchDashboardData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [vendor]);

  // Mutations
  async function handleAddCustomer(e: React.FormEvent) {
    e.preventDefault();
    if (!vendor) return;
    setActionLoading(true);

    try {
      const { error } = await supabase
        .from("customers")
        .insert([{
          vendor_id: vendor.id,
          customer_name: newCustName.trim(),
          phone: newCustPhone.trim(),
          points: 0
        }]);

      if (error) throw error;

      toast({
        title: "Customer Added",
        description: `${newCustName} has been successfully added to your CRM.`,
      });

      setIsCustomerModalOpen(false);
      setNewCustName("");
      setNewCustPhone("");
      fetchDashboardData();

    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Action Failed",
        description: err.message || "Failed to add customer.",
      });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleLogTransaction(e: React.FormEvent) {
    e.preventDefault();
    if (!vendor) return;
    setActionLoading(true);

    const amount = parseFloat(txAmount);

    try {
      // Calculate and submit transaction dynamically using custom point rules
      const pointsEarned = await logLoyaltyTransaction(
        vendor.id,
        txCustId,
        amount,
        vendor.points_rule_amount,
        vendor.points_rule_points
      );

      toast({
        title: "Transaction Logged",
        description: `Logged ₹${amount} transaction. Customer earned ${pointsEarned} loyalty points!`,
      });

      setIsTransactionModalOpen(false);
      setTxCustId("");
      setTxAmount("");
      fetchDashboardData();

    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Transaction Failed",
        description: err.message || "Failed to process transaction.",
      });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleUpdateRules(e: React.FormEvent) {
    e.preventDefault();
    if (!vendor) return;
    setActionLoading(true);

    try {
      const amountVal = parseFloat(ruleAmount);
      const pointsVal = parseInt(rulePoints);

      await updateLoyaltyRules(vendor.id, amountVal, pointsVal);
      await refreshProfile(); // Refresh global auth vendor profile cache

      toast({
        title: "Loyalty Point Rules Saved",
        description: `Loyalty rule updated to: ₹${amountVal} spent = ${pointsVal} points.`,
      });

    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: err.message || "Failed to update loyalty rules.",
      });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleAddReward(e: React.FormEvent) {
    e.preventDefault();
    if (!vendor) return;
    setActionLoading(true);

    try {
      const { error } = await supabase
        .from("rewards")
        .insert([{
          vendor_id: vendor.id,
          reward_name: newRewardName.trim(),
          points_required: parseInt(newRewardPoints),
          description: newRewardDesc.trim()
        }]);

      if (error) throw error;

      toast({
        title: "Reward Created",
        description: `Reward tier "${newRewardName}" has been successfully added.`,
      });

      setIsRewardModalOpen(false);
      setNewRewardName("");
      setNewRewardPoints("");
      setNewRewardDesc("");
      fetchDashboardData();

    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Action Failed",
        description: err.message || "Failed to create reward tier.",
      });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeleteReward(rewardId: string) {
    if (!confirm("Are you sure you want to delete this reward tier?")) return;

    try {
      const { error } = await supabase
        .from("rewards")
        .delete()
        .eq("id", rewardId);

      if (error) throw error;

      toast({
        title: "Reward Deleted",
        description: "The reward tier has been deleted.",
      });

      fetchDashboardData();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Delete Failed",
        description: err.message || "Could not delete reward.",
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
          <div className="flex gap-4 justify-center">
            <button 
              onClick={() => setLocation("/register")}
              className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-bold hover:bg-gold/90 transition-colors"
            >
              Go to Register
            </button>
            <button 
              onClick={handleSignOut}
              className="border border-white/20 px-6 py-2.5 rounded-full font-bold hover:bg-white/10 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans pb-16">
      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-40 glass-panel border-x-0 border-t-0 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="text-gold font-bold text-2xl flex items-center">
            <span className="text-white">Vend</span><span className="text-gold">ly</span>
          </div>
          
          <div className="hidden sm:flex items-center gap-6 text-sm font-medium">
            <Link 
              href="/dashboard" 
              className="text-white border-b-2 border-gold pb-1 pt-1 font-bold"
            >
              Overview
            </Link>
            <Link 
              href="/customers" 
              className="text-muted hover:text-white transition-colors"
            >
              Customers
            </Link>
            <Link
              href="/rewards"
              className="text-muted hover:text-white transition-colors"
            >
              Rewards
            </Link>
            <Link
              href="/offers"
              className="text-muted hover:text-white transition-colors"
            >
              Offers
            </Link>
            <Link
              href="/prebookings"
              className="text-muted hover:text-white transition-colors"
            >
              Prebookings
            </Link>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-sm font-semibold text-white">{vendor.business}</span>
            <span className="text-xs text-muted-foreground">{vendor.name}</span>
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
      <main className="max-w-6xl mx-auto px-6 pt-28">
        
        {/* Welcome & Quick Actions */}
        <div className="glass-panel rounded-3xl p-8 mb-8 bg-gradient-to-r from-blue/10 to-gold/10 relative overflow-hidden border border-white/10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="absolute top-0 right-0 w-80 h-80 bg-gold/5 rounded-full blur-3xl pointer-events-none"></div>
          
          <div>
            <span className="text-gold font-bold text-xs uppercase tracking-wider block mb-1">Overview Dashboard</span>
            <h1 className="text-3xl font-extrabold text-white mb-2">
              {vendor.business}
            </h1>
            <p className="text-muted text-sm max-w-lg">
              Manage loyalty programs, track transactional rewards, and view customer profiles in real-time.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 z-10">
            <button 
              onClick={() => setIsCustomerModalOpen(true)}
              className="bg-white/5 border border-white/10 hover:border-gold hover:text-gold px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-gold/5 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Customer
            </button>
            <button 
              onClick={() => setIsTransactionModalOpen(true)}
              className="bg-primary text-primary-foreground hover:bg-gold/90 px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all cursor-pointer gold-glow animate-pulse"
            >
              <CreditCard className="w-4 h-4" />
              Log Transaction
            </button>
            <button 
              onClick={() => setIsRewardModalOpen(true)}
              className="bg-white/5 border border-white/10 hover:border-blue hover:text-blue px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-blue/5 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Reward
            </button>
            <Link
              href="/qr-scanner"
              className="bg-white/5 border border-white/10 hover:border-emerald hover:text-emerald px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-emerald/5 transition-all cursor-pointer"
            >
              <QrCode className="w-4 h-4" />
              Scan QR
            </Link>
            <Link
              href="/offers"
              className="bg-white/5 border border-white/10 hover:border-purple-400 hover:text-purple-400 px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-purple-400/5 transition-all cursor-pointer"
            >
              <Tag className="w-4 h-4" />
              Manage Offers
            </Link>
            <Link
              href="/prebookings"
              className="bg-white/5 border border-white/10 hover:border-blue hover:text-blue px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-blue/5 transition-all cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              Prebookings
            </Link>
          </div>
        </div>

        {/* METRICS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-10">
          {[
            { label: "Total Customers", val: stats.totalCustomers, icon: <Users className="w-6 h-6 text-gold" />, color: "border-gold/20" },
            { label: "Total Transactions", val: stats.totalTransactions, icon: <CreditCard className="w-6 h-6 text-blue" />, color: "border-blue/20" },
            { label: "Loyalty Points Issued", val: stats.pointsIssued, icon: <Coins className="w-6 h-6 text-emerald" />, color: "border-emerald/20" },
            { label: "Active Rewards", val: stats.activeRewards, icon: <Gift className="w-6 h-6 text-purple-400" />, color: "border-purple-400/20" },
            { label: "Pending Prebookings", val: stats.pendingPrebookings, icon: <ShoppingBag className="w-6 h-6 text-pink-400" />, color: "border-pink-400/20" }
          ].map((stat, i) => (
            <div key={i} className={`glass-panel p-6 rounded-2xl flex flex-col justify-between hover:scale-[1.01] transition-transform duration-300 border ${stat.color}`}>
              {dataLoading ? (
                // SKELETON METRIC
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
                    <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider">{stat.label}</div>
                    <div className="p-2.5 rounded-xl bg-white/5">{stat.icon}</div>
                  </div>
                  <div>
                    <div className="text-3xl font-extrabold text-white mb-0.5">{stat.val}</div>
                    <div className="text-xs text-muted-foreground">Aggregated Real-time</div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {/* MAIN BODY SECTIONS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* SECTION: RECENT TRANSACTIONS */}
          <div className="lg:col-span-2 glass-panel p-6 md:p-8 rounded-3xl border border-white/10 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-gold" />
                Recent Transactions
              </h2>
              {!dataLoading && transactions.length > 0 && (
                <span className="text-xs text-muted font-medium bg-white/5 border border-white/10 px-2.5 py-1 rounded-full">
                  Latest 5
                </span>
              )}
            </div>

            {dataLoading ? (
              // SKELETON TABLE
              <div className="animate-pulse space-y-4 w-full">
                {[1, 2, 3, 4].map(s => (
                  <div key={s} className="flex justify-between items-center py-3 border-b border-white/5">
                    <div className="space-y-2">
                      <div className="h-4 bg-white/10 rounded w-28"></div>
                      <div className="h-3 bg-white/10 rounded w-20"></div>
                    </div>
                    <div className="h-6 bg-white/10 rounded w-16"></div>
                  </div>
                ))}
              </div>
            ) : transactions.length === 0 ? (
              // EMPTY STATE
              <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
                <div className="p-4 bg-white/5 border border-white/10 rounded-full mb-4">
                  <CreditCard className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-bold text-lg text-white mb-1">No Transactions Yet</h3>
                <p className="text-muted text-sm max-w-sm mb-6">
                  Log transactions for your customers to award loyalty points and record sales.
                </p>
                <button
                  onClick={() => setIsTransactionModalOpen(true)}
                  className="bg-primary text-primary-foreground hover:bg-gold/90 px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Log First Transaction
                </button>
              </div>
            ) : (
              // LIST
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-muted-foreground text-xs uppercase tracking-wider pb-3">
                      <th className="pb-3 font-semibold">Customer</th>
                      <th className="pb-3 font-semibold">Date</th>
                      <th className="pb-3 font-semibold text-right">Amount</th>
                      <th className="pb-3 font-semibold text-right text-gold">Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                        <td className="py-4 font-semibold text-white flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          {tx.customers?.customer_name || "Unknown Customer"}
                        </td>
                        <td className="py-4 text-muted-foreground">
                          {new Date(tx.transaction_date).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </td>
                        <td className="py-4 text-right font-bold text-white">₹{tx.amount.toFixed(2)}</td>
                        <td className="py-4 text-right font-bold text-gold">+{tx.points_earned}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* SECTION: TOP CUSTOMERS */}
          <div className="lg:col-span-1 glass-panel p-6 md:p-8 rounded-3xl border border-white/10 flex flex-col">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Award className="w-5 h-5 text-gold" />
              Top Customers
            </h2>

            {dataLoading ? (
              // SKELETON LIST
              <div className="animate-pulse space-y-4 w-full">
                {[1, 2, 3].map(s => (
                  <div key={s} className="flex justify-between items-center py-3 border-b border-white/5">
                    <div className="space-y-2">
                      <div className="h-4 bg-white/10 rounded w-24"></div>
                      <div className="h-3 bg-white/10 rounded w-16"></div>
                    </div>
                    <div className="h-5 bg-white/10 rounded w-10"></div>
                  </div>
                ))}
              </div>
            ) : customers.length === 0 ? (
              // EMPTY STATE
              <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
                <div className="p-4 bg-white/5 border border-white/10 rounded-full mb-4">
                  <Users className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-bold text-lg text-white mb-1">No Customers</h3>
                <p className="text-muted text-sm max-w-xs mb-6">
                  Add customers to your dashboard to start tracking points and udhaar details.
                </p>
                <button
                  onClick={() => setIsCustomerModalOpen(true)}
                  className="bg-white/5 border border-white/15 hover:border-gold hover:text-gold px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer"
                >
                  Create Customer
                </button>
              </div>
            ) : (
              // LIST
              <div className="space-y-4 flex-1">
                {customers.map((cust, idx) => (
                  <div key={cust.id} className="flex items-center justify-between p-4 rounded-xl hover:bg-white/5 transition-colors border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center font-bold text-gold text-xs">
                        #{idx + 1}
                      </div>
                      <div>
                        <div className="font-bold text-white text-sm">{cust.customer_name}</div>
                        <div className="text-xs text-muted-foreground">{cust.phone}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-gold flex items-center gap-1">
                        <Coins className="w-3.5 h-3.5" />
                        {cust.points}
                      </div>
                      <div className="text-[10px] text-muted-foreground uppercase font-semibold">Points</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION: LOYALTY POINTS ENGINE CONFIG */}
          <div className="lg:col-span-1 glass-panel p-6 md:p-8 rounded-3xl border border-white/10 flex flex-col">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Coins className="w-5 h-5 text-gold" />
              Loyalty Point Rules
            </h2>
            <p className="text-muted text-xs mb-6">
              Customize how customers earn loyalty points at your store. Points are calculated automatically.
            </p>

            <form onSubmit={handleUpdateRules} className="space-y-4 flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase block">Amount Spent (₹)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={ruleAmount}
                    onChange={(e) => setRuleAmount(e.target.value)}
                    className="block w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase block">Points Awarded</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={rulePoints}
                    onChange={(e) => setRulePoints(e.target.value)}
                    className="block w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 text-sm"
                  />
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/5 space-y-4">
                <div className="text-xs text-gold font-semibold flex items-center gap-1.5 bg-gold/5 p-2.5 rounded-xl border border-gold/15">
                  <Sparkles className="w-4 h-4 flex-shrink-0" />
                  <span>Rule: ₹{vendor.points_rule_amount} spent = {vendor.points_rule_points} points</span>
                </div>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl font-bold hover:bg-gold/90 transition-all cursor-pointer text-sm gold-glow flex items-center justify-center gap-2"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Point Rules"}
                </button>
              </div>
            </form>
          </div>

          {/* SECTION: MERCHANT PROFILE DETAILS */}
          <div className="lg:col-span-2 glass-panel p-6 md:p-8 rounded-3xl border border-white/10 flex flex-col justify-between">
            <div>
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Store className="w-5 h-5 text-gold" />
                Business Profile
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1 uppercase tracking-wider font-semibold">Store / Business Name</label>
                  <div className="text-white font-bold text-lg flex items-center gap-2">
                    <Store className="w-4 h-4 text-muted-foreground" />
                    {vendor.business}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground block mb-1 uppercase tracking-wider font-semibold">Merchant / Owner Name</label>
                  <div className="text-white font-medium flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    {vendor.name}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground block mb-1 uppercase tracking-wider font-semibold">Email Address</label>
                  <div className="text-white font-medium flex items-center gap-2 break-all">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    {vendor.email}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground block mb-1 uppercase tracking-wider font-semibold">Phone Number</label>
                  <div className="text-white font-medium flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    {vendor.phone || "Not provided"}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-white/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                <span>Registered: {new Date(vendor.created_at).toLocaleDateString()}</span>
              </div>
              <div>Merchant ID: {vendor.id}</div>
            </div>
          </div>

          {/* SECTION: REWARD PERFORMANCE */}
          <div className="lg:col-span-3 glass-panel p-6 md:p-8 rounded-3xl border border-white/10">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Gift className="w-5 h-5 text-gold" />
                Reward Tiers & Catalog
              </h2>
              <button 
                onClick={() => setIsRewardModalOpen(true)}
                className="text-xs text-gold font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                Create Reward Tier <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {dataLoading ? (
              // SKELETON
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map(s => (
                  <div key={s} className="animate-pulse glass-panel p-6 rounded-2xl space-y-4">
                    <div className="h-6 bg-white/10 rounded w-28"></div>
                    <div className="h-4 bg-white/10 rounded w-16"></div>
                    <div className="h-10 bg-white/10 rounded w-full"></div>
                  </div>
                ))}
              </div>
            ) : rewards.length === 0 ? (
              // EMPTY STATE
              <div className="flex flex-col items-center justify-center py-12 text-center max-w-md mx-auto">
                <div className="p-4 bg-white/5 border border-white/10 rounded-full mb-4">
                  <Gift className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-bold text-lg text-white mb-1">No Reward Tiers Defined</h3>
                <p className="text-muted text-sm mb-6">
                  Set rewards to incentivize repeat customer checkouts (e.g. Free Chai, 10% Off Grocery).
                </p>
                <button
                  onClick={() => setIsRewardModalOpen(true)}
                  className="bg-primary text-primary-foreground hover:bg-gold/90 px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Define First Reward
                </button>
              </div>
            ) : (
              // LIST
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {rewards.map((rw) => (
                  <div key={rw.id} className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col justify-between hover:scale-[1.01] transition-transform">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-white text-lg">{rw.reward_name}</h3>
                        <button 
                          onClick={() => handleDeleteReward(rw.id)}
                          className="text-muted-foreground hover:text-red-400 p-1 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-muted text-xs mb-4 min-h-[32px]">{rw.description || "No description provided."}</p>
                    </div>
                    
                    <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Requirements</span>
                      <span className="bg-gold/10 text-gold text-xs font-bold px-3 py-1 rounded-full border border-gold/20 flex items-center gap-1.5">
                        <Coins className="w-3.5 h-3.5" />
                        {rw.points_required} Points
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
        </div>
      </main>

      {/* ========================================================
          MODAL 1: ADD CUSTOMER
          ======================================================== */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md glass-panel rounded-3xl p-8 border border-white/10 shadow-2xl relative animate-fade-in">
            <button 
              onClick={() => setIsCustomerModalOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-white p-1 cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
                <Users className="w-6 h-6 text-gold" />
                Add Customer
              </h2>
              <p className="text-muted text-xs">Create a new customer profile in your CRM database.</p>
            </div>

            <form onSubmit={handleAddCustomer} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase block">Customer Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Sharma"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="block w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-muted-foreground focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase block">Phone Number</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. +91 9876543210"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  className="block w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-muted-foreground focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full mt-4 bg-primary text-primary-foreground py-3 rounded-xl font-bold hover:bg-gold/90 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm gold-glow"
              >
                {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Customer"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 2: LOG TRANSACTION
          ======================================================== */}
      {isTransactionModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md glass-panel rounded-3xl p-8 border border-white/10 shadow-2xl relative animate-fade-in">
            <button 
              onClick={() => setIsTransactionModalOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-white p-1 cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
                <CreditCard className="w-6 h-6 text-gold" />
                Log Transaction
              </h2>
              <p className="text-muted text-xs">Record customer purchase amount and award loyalty points.</p>
            </div>

            {allCustomers.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-muted text-sm mb-4">You need to add a customer profile first.</p>
                <button
                  onClick={() => {
                    setIsTransactionModalOpen(false);
                    setIsCustomerModalOpen(true);
                  }}
                  className="bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-bold text-sm cursor-pointer"
                >
                  Create Customer
                </button>
              </div>
            ) : (
              <form onSubmit={handleLogTransaction} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase block">Select Customer</label>
                  <select
                    required
                    value={txCustId}
                    onChange={(e) => setTxCustId(e.target.value)}
                    className="block w-full px-4 py-3 bg-card border border-white/10 rounded-xl text-white focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 text-sm"
                  >
                    <option value="" disabled>-- Choose a customer --</option>
                    {allCustomers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.customer_name} ({c.phone})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase block">Transaction Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="1"
                    placeholder="Enter sales value e.g. 250"
                    value={txAmount}
                    onChange={(e) => setTxAmount(e.target.value)}
                    className="block w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-muted-foreground focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 text-sm"
                  />
                  {txAmount && !isNaN(parseFloat(txAmount)) && (
                    <div className="text-xs text-gold font-semibold pt-1 flex items-center gap-1.5 animate-pulse">
                      <Sparkles className="w-3.5 h-3.5" />
                      Award points: +{calculatePoints(parseFloat(txAmount), vendor.points_rule_amount, vendor.points_rule_points)} Loyalty Points (based on active rules)
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full mt-4 bg-primary text-primary-foreground py-3 rounded-xl font-bold hover:bg-gold/90 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm gold-glow"
                >
                  {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Process Transaction"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 3: ADD REWARD
          ======================================================== */}
      {isRewardModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md glass-panel rounded-3xl p-8 border border-white/10 shadow-2xl relative animate-fade-in">
            <button 
              onClick={() => setIsRewardModalOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-white p-1 cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
                <Gift className="w-6 h-6 text-gold" />
                Add Reward Tier
              </h2>
              <p className="text-muted text-xs">Define a reward coupon that customers can redeem with points.</p>
            </div>

            <form onSubmit={handleAddReward} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase block">Reward Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Free Masala Chai, 10% Off Grocery"
                  value={newRewardName}
                  onChange={(e) => setNewRewardName(e.target.value)}
                  className="block w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-muted-foreground focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase block">Points Required</label>
                <input
                  type="number"
                  required
                  min="5"
                  placeholder="e.g. 50"
                  value={newRewardPoints}
                  onChange={(e) => setNewRewardPoints(e.target.value)}
                  className="block w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-muted-foreground focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase block">Description / Terms</label>
                <textarea
                  placeholder="Describe details e.g. Valid on minimum purchase of Rs 500."
                  value={newRewardDesc}
                  onChange={(e) => setNewRewardDesc(e.target.value)}
                  rows={3}
                  className="block w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-muted-foreground focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 text-sm resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full mt-4 bg-primary text-primary-foreground py-3 rounded-xl font-bold hover:bg-gold/90 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm gold-glow"
              >
                {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Reward Tier"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
