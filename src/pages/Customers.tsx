import React, { useState, useEffect } from "react";
import { useAuth } from "../hooks/use-auth";
import { useLocation, Link } from "wouter";
import { supabase } from "../lib/supabase";
import { useToast } from "@/hooks/use-toast";
import QRCodeCard from "@/components/QRCodeCard";
import { 
  LogOut, Store, User, Mail, Phone, Calendar, 
  Users, Plus, Edit, Trash2, Eye, Coins, Loader2, 
  Search, X, Sparkles, TrendingUp, AlertCircle, ArrowLeft, QrCode, ShieldAlert
} from "lucide-react";

interface Customer {
  id: string;
  customer_name: string;
  phone: string;
  email: string | null;
  points: number;
  qr_token: string;
  created_at: string;
}

interface Transaction {
  id: string;
  amount: number;
  points_earned: number;
  transaction_date: string;
}

export default function Customers() {
  const { vendor, signOut } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [dataLoading, setDataLoading] = useState(true);

  // Modals Visibility
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);

  // Modal target / form states
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [profileTransactions, setProfileTransactions] = useState<Transaction[]>([]);
  const [txLoading, setTxLoading] = useState(false);

  // Form Fields
  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [custEmail, setCustEmail] = useState("");
  const [custPoints, setCustPoints] = useState("0");

  const [actionLoading, setActionLoading] = useState(false);

  // Fetch Customers
  async function fetchCustomers() {
    if (!vendor) return;

    try {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("vendor_id", vendor.id)
        .order("customer_name", { ascending: true });

      if (error) throw error;
      setCustomers(data || []);

    } catch (err: any) {
      console.error("Error fetching customers:", err);
      toast({
        variant: "destructive",
        title: "Load Error",
        description: err.message || "Failed to load customers list.",
      });
    } finally {
      setDataLoading(false);
    }
  }

  // Fetch specific customer transactions for profile view
  async function fetchCustomerTransactions(customerId: string) {
    setTxLoading(true);
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("id, amount, points_earned, transaction_date")
        .eq("customer_id", customerId)
        .order("transaction_date", { ascending: false });

      if (error) throw error;
      setProfileTransactions(data || []);

    } catch (err: any) {
      console.error("Error fetching transactions:", err);
      toast({
        variant: "destructive",
        title: "Load Error",
        description: err.message || "Failed to load customer transactions.",
      });
    } finally {
      setTxLoading(false);
    }
  }

  // Real-time integration
  useEffect(() => {
    if (!vendor) return;

    fetchCustomers();

    const channel = supabase
      .channel("realtime-customers-directory")
      .on("postgres_changes", { event: "*", schema: "public", table: "customers" }, () => {
        fetchCustomers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [vendor]);

  // Open Edit modal pre-filled
  function openEditModal(customer: Customer) {
    setSelectedCustomer(customer);
    setCustName(customer.customer_name);
    setCustPhone(customer.phone);
    setCustEmail(customer.email || "");
    setCustPoints(customer.points.toString());
    setIsEditModalOpen(true);
  }

  // Open Profile view
  function openProfileModal(customer: Customer) {
    setSelectedCustomer(customer);
    setProfileTransactions([]);
    setIsProfileModalOpen(true);
    fetchCustomerTransactions(customer.id);
  }

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
          customer_name: custName.trim(),
          phone: custPhone.trim(),
          email: custEmail.trim() ? custEmail.trim().toLowerCase() : null,
          points: parseInt(custPoints) || 0
        }]);

      if (error) throw error;

      toast({
        title: "Customer Created",
        description: `${custName} has been successfully added to your list.`,
      });

      setIsAddModalOpen(false);
      resetForm();
      fetchCustomers();

    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Action Failed",
        description: err.message || "Failed to create customer record.",
      });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleEditCustomer(e: React.FormEvent) {
    e.preventDefault();
    if (!vendor || !selectedCustomer) return;
    setActionLoading(true);

    try {
      const { error } = await supabase
        .from("customers")
        .update({
          customer_name: custName.trim(),
          phone: custPhone.trim(),
          email: custEmail.trim() ? custEmail.trim().toLowerCase() : null,
          points: parseInt(custPoints) || 0
        })
        .eq("id", selectedCustomer.id);

      if (error) throw error;

      toast({
        title: "Customer Updated",
        description: `Changes to ${custName} have been saved.`,
      });

      setIsEditModalOpen(false);
      resetForm();
      fetchCustomers();

    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Action Failed",
        description: err.message || "Failed to update customer record.",
      });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeleteCustomer(customerId: string, name: string) {
    if (!confirm(`Are you sure you want to delete ${name}? This will also delete their transaction history.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("customers")
        .delete()
        .eq("id", customerId);

      if (error) throw error;

      toast({
        title: "Customer Deleted",
        description: `${name} has been removed from your list.`,
      });

      fetchCustomers();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Delete Failed",
        description: err.message || "Could not delete customer.",
      });
    }
  }

  function resetForm() {
    setSelectedCustomer(null);
    setCustName("");
    setCustPhone("");
    setCustEmail("");
    setCustPoints("0");
  }

  async function handleSignOut() {
    await signOut();
    setLocation("/");
  }

  // Filter list by query
  const filteredCustomers = customers.filter(cust => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      cust.customer_name.toLowerCase().includes(query) ||
      cust.phone.includes(query) ||
      (cust.email && cust.email.toLowerCase().includes(query))
    );
  });

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
              className="text-muted hover:text-white transition-colors"
            >
              Overview
            </Link>
            <Link 
              href="/customers" 
              className="text-white border-b-2 border-gold pb-1 pt-1 font-bold"
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
              href="/qr-scanner"
              className="text-muted hover:text-white transition-colors"
            >
              Scan QR
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
          <button 
            onClick={handleSignOut}
            className="flex items-center gap-2 border border-white/10 hover:border-red-500/30 hover:text-red-400 px-4 py-2 rounded-full text-sm font-semibold hover:bg-red-500/10 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </nav>

      {/* BODY CONTENT */}
      <main className="max-w-6xl mx-auto px-6 pt-28">
        
        {/* Module Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-white flex items-center gap-2">
              <Users className="w-8 h-8 text-gold" />
              Customer Directory
            </h1>
            <p className="text-muted text-sm mt-1">
              Search, view profiles, and manage points balances of your shops loyalty members.
            </p>
          </div>

          <button 
            onClick={() => { resetForm(); setIsAddModalOpen(true); }}
            className="bg-primary text-primary-foreground hover:bg-gold/90 px-5 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 cursor-pointer gold-glow self-start sm:self-auto transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Customer
          </button>
        </div>

        {/* Filter / Search Bar */}
        <div className="glass-panel p-4 rounded-2xl border border-white/15 mb-6 flex items-center gap-3">
          <Search className="w-5 h-5 text-muted-foreground ml-2" />
          <input
            type="text"
            placeholder="Search customer directory by name, phone number, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full bg-transparent border-0 text-white placeholder-muted-foreground focus:outline-none focus:ring-0 text-sm py-1.5"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery("")}
              className="p-1.5 hover:bg-white/5 rounded-lg text-muted-foreground hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* DIRECTORY TABLE / LIST */}
        <div className="glass-panel rounded-3xl p-6 md:p-8 border border-white/10 flex flex-col">
          {dataLoading ? (
            // Loading Skeletons
            <div className="animate-pulse space-y-4 w-full">
              {[1, 2, 3, 4, 5].map(s => (
                <div key={s} className="flex justify-between items-center py-4 border-b border-white/5">
                  <div className="flex gap-4 items-center">
                    <div className="h-10 w-10 bg-white/10 rounded-full"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-white/10 rounded w-36"></div>
                      <div className="h-3 bg-white/10 rounded w-24"></div>
                    </div>
                  </div>
                  <div className="h-6 bg-white/10 rounded w-16"></div>
                </div>
              ))}
            </div>
          ) : filteredCustomers.length === 0 ? (
            // Empty State
            <div className="flex flex-col items-center justify-center py-16 text-center max-w-md mx-auto">
              <div className="p-4 bg-white/5 border border-white/10 rounded-full mb-4">
                <Users className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-bold text-lg text-white mb-1">No Customers Found</h3>
              <p className="text-muted text-sm mb-6">
                {searchQuery 
                  ? "We couldn't find any customers matching that search query." 
                  : "Start creating loyalty profiles for your regular customers to issue points."}
              </p>
              {searchQuery ? (
                <button
                  onClick={() => setSearchQuery("")}
                  className="border border-white/20 text-white hover:bg-white/5 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer"
                >
                  Clear Filters
                </button>
              ) : (
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="bg-primary text-primary-foreground hover:bg-gold/90 px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Add Your First Customer
                </button>
              )}
            </div>
          ) : (
            // Main Customer Directory Table
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-muted-foreground text-xs uppercase tracking-wider pb-3">
                    <th className="pb-3 font-semibold">Customer Details</th>
                    <th className="pb-3 font-semibold">Contact Details</th>
                    <th className="pb-3 font-semibold text-center">Loyalty Points</th>
                    <th className="pb-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((cust) => (
                    <tr key={cust.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                      {/* Name / Avatar */}
                      <td className="py-4 font-bold text-white">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gold/10 border border-gold/25 flex items-center justify-center font-bold text-gold text-sm">
                            {cust.customer_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-white">{cust.customer_name}</div>
                            <div className="text-[10px] text-muted-foreground uppercase font-semibold">
                              Joined {new Date(cust.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Phone / Email */}
                      <td className="py-4">
                        <div className="space-y-1">
                          <div className="text-sm text-white flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                            {cust.phone}
                          </div>
                          {cust.email && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                              {cust.email}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Points Balance */}
                      <td className="py-4 text-center">
                        <span className="bg-gold/10 text-gold text-xs font-bold px-3 py-1 rounded-full border border-gold/20 inline-flex items-center gap-1.5">
                          <Coins className="w-3.5 h-3.5" />
                          {cust.points} Points
                        </span>
                      </td>

                      {/* Action buttons */}
                      <td className="py-4 text-right">
                        <div className="inline-flex gap-2">
                          <button
                            onClick={() => openProfileModal(cust)}
                            title="View Profile"
                            className="p-2 hover:bg-white/10 rounded-xl text-muted-foreground hover:text-white transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => { setSelectedCustomer(cust); setIsQRModalOpen(true); }}
                            title="View QR Code"
                            className="p-2 hover:bg-white/10 rounded-xl text-muted-foreground hover:text-gold transition-colors cursor-pointer"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditModal(cust)}
                            title="Edit Customer"
                            className="p-2 hover:bg-white/10 rounded-xl text-muted-foreground hover:text-gold transition-colors cursor-pointer"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCustomer(cust.id, cust.customer_name)}
                            title="Delete Customer"
                            className="p-2 hover:bg-white/10 rounded-xl text-muted-foreground hover:text-red-400 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* ========================================================
          MODAL 1: ADD CUSTOMER
          ======================================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md glass-panel rounded-3xl p-8 border border-white/10 shadow-2xl relative animate-fade-in">
            <button 
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-white p-1 cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
                <Users className="w-6 h-6 text-gold" />
                Add Loyalty Member
              </h2>
              <p className="text-muted text-xs font-medium">Create a new customer profile and award starting points.</p>
            </div>

            <form onSubmit={handleAddCustomer} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase block">Customer Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Sharma"
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  className="block w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-muted-foreground focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase block">Phone Number</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. +91 9876543210"
                  value={custPhone}
                  onChange={(e) => setCustPhone(e.target.value)}
                  className="block w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-muted-foreground focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase block">Email Address (Optional)</label>
                <input
                  type="email"
                  placeholder="e.g. ramesh@example.com"
                  value={custEmail}
                  onChange={(e) => setCustEmail(e.target.value)}
                  className="block w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-muted-foreground focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase block">Starting Loyalty Points</label>
                <input
                  type="number"
                  required
                  min="0"
                  placeholder="e.g. 50"
                  value={custPoints}
                  onChange={(e) => setCustPoints(e.target.value)}
                  className="block w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-muted-foreground focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full mt-4 bg-primary text-primary-foreground py-3 rounded-xl font-bold hover:bg-gold/90 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm gold-glow"
              >
                {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Profile"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 2: EDIT CUSTOMER
          ======================================================== */}
      {isEditModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md glass-panel rounded-3xl p-8 border border-white/10 shadow-2xl relative animate-fade-in">
            <button 
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-white p-1 cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
                <Edit className="w-6 h-6 text-gold" />
                Edit Profile
              </h2>
              <p className="text-muted text-xs font-medium">Modify member credentials and adjust points balance.</p>
            </div>

            <form onSubmit={handleEditCustomer} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase block">Customer Name</label>
                <input
                  type="text"
                  required
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  className="block w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase block">Phone Number</label>
                <input
                  type="tel"
                  required
                  value={custPhone}
                  onChange={(e) => setCustPhone(e.target.value)}
                  className="block w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase block">Email Address (Optional)</label>
                <input
                  type="email"
                  value={custEmail}
                  onChange={(e) => setCustEmail(e.target.value)}
                  className="block w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase block">Points Balance</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={custPoints}
                  onChange={(e) => setCustPoints(e.target.value)}
                  className="block w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full mt-4 bg-primary text-primary-foreground py-3 rounded-xl font-bold hover:bg-gold/90 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm gold-glow"
              >
                {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Changes"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 3: VIEW CUSTOMER PROFILE SHEET
          ======================================================== */}
      {isProfileModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-end">
          <div className="w-full max-w-md h-full bg-card border-l border-white/10 shadow-2xl p-8 flex flex-col justify-between relative overflow-y-auto animate-slide-in">
            <button 
              onClick={() => setIsProfileModalOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-white p-1.5 cursor-pointer hover:bg-white/5 rounded-lg"
            >
              <X className="w-6 h-6" />
            </button>

            <div>
              {/* Profile Card Header */}
              <div className="text-center pb-8 border-b border-white/5 mb-6">
                <div className="w-20 h-20 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center font-bold text-gold text-3xl mx-auto mb-4">
                  {selectedCustomer.customer_name.charAt(0).toUpperCase()}
                </div>
                <h2 className="text-2xl font-bold text-white">{selectedCustomer.customer_name}</h2>
                <span className="text-xs text-muted-foreground mt-1 block">
                  Loyalty Member since {new Date(selectedCustomer.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                </span>
              </div>

              {/* Personal Details */}
              <div className="space-y-4 mb-8">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact Information</h3>
                
                <div className="flex items-center gap-3 text-sm text-white">
                  <Phone className="w-4 h-4 text-gold/80" />
                  <div>
                    <div className="text-xs text-muted-foreground">Mobile Phone</div>
                    <div className="font-semibold">{selectedCustomer.phone}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm text-white">
                  <Mail className="w-4 h-4 text-gold/80" />
                  <div>
                    <div className="text-xs text-muted-foreground">Email Address</div>
                    <div className="font-semibold">{selectedCustomer.email || "Not provided"}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm text-white">
                  <Coins className="w-4 h-4 text-gold/80" />
                  <div>
                    <div className="text-xs text-muted-foreground">Available Loyalty Balance</div>
                    <div className="font-bold text-gold text-base">{selectedCustomer.points} Points</div>
                  </div>
                </div>
              </div>

              {/* Transaction Logs */}
              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-gold/80" />
                  Purchase Logs
                </h3>

                {txLoading ? (
                  <div className="animate-pulse space-y-3">
                    {[1, 2, 3].map(s => (
                      <div key={s} className="flex justify-between py-2 border-b border-white/5">
                        <div className="h-4 bg-white/10 rounded w-20"></div>
                        <div className="h-4 bg-white/10 rounded w-12"></div>
                      </div>
                    ))}
                  </div>
                ) : profileTransactions.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-white/10 rounded-xl">
                    <p className="text-xs text-muted-foreground">No transaction history found for this member.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                    {profileTransactions.map(tx => (
                      <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                        <div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(tx.transaction_date).toLocaleDateString(undefined, {
                              month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
                            })}
                          </div>
                          <div className="font-bold text-white text-sm">₹{tx.amount.toFixed(2)}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-bold text-gold">+{tx.points_earned}</div>
                          <div className="text-[9px] text-muted-foreground uppercase font-semibold">Points</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-6 border-t border-white/5 flex gap-4">
              <button
                onClick={() => { setIsProfileModalOpen(false); openEditModal(selectedCustomer); }}
                className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-2.5 rounded-xl text-sm transition-all cursor-pointer"
              >
                Edit Account
              </button>
              <button
                onClick={() => setIsProfileModalOpen(false)}
                className="flex-1 bg-primary text-primary-foreground font-bold py-2.5 rounded-xl text-sm transition-all cursor-pointer text-center"
              >
                Done
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 4: VIEW CUSTOMER QR CODE
          ======================================================== */}
      {isQRModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm glass-panel rounded-3xl p-8 border border-white/10 shadow-2xl relative animate-fade-in">
            <button
              onClick={() => { setIsQRModalOpen(false); setSelectedCustomer(null); }}
              className="absolute top-4 right-4 text-muted-foreground hover:text-white p-1 cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="mb-6 text-center">
              <h2 className="text-2xl font-bold text-white mb-1 flex items-center justify-center gap-2">
                <QrCode className="w-6 h-6 text-gold" />
                Customer QR Code
              </h2>
              <p className="text-muted text-xs">
                Customer can show this QR for instant identification at your store.
              </p>
            </div>

            <QRCodeCard
              customerId={selectedCustomer.id}
              customerName={selectedCustomer.customer_name}
              qrToken={selectedCustomer.qr_token || selectedCustomer.id}
              size={200}
              showDownload={true}
            />

            <div className="mt-6 pt-4 border-t border-white/10 text-center">
              <p className="text-xs text-muted-foreground">
                Scan this QR at{" "}
                <span className="text-gold font-semibold">Scan QR</span>{" "}
                to instantly load this customer's profile and add points.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
