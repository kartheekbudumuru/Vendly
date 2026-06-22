import React, { useState, useEffect } from "react";
import { useAuth } from "../hooks/use-auth";
import { useLocation, Link } from "wouter";
import { supabase } from "../lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { 
  LogOut, Shield, ShieldAlert, Users, Store, Tag, ShoppingBag, 
  Coins, Plus, RefreshCw, Loader2, ArrowLeft, Trash2, CheckCircle2, 
  BarChart3, Settings, ShieldCheck, Mail, Info, FolderPlus, Grid, X
} from "lucide-react";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: "customer" | "vendor" | "admin";
  created_at: string;
}

interface VendorProfile {
  id: string;
  business_name: string;
  description: string | null;
  phone: string | null;
  address: string | null;
  created_at: string;
}

interface Category {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export default function AdminPanel() {
  const { user, profile, signOut } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [vendors, setVendors] = useState<VendorProfile[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Analytics Stats
  const [stats, setStats] = useState({
    totalSales: 0,
    totalOrders: 0,
    totalUsers: 0,
    totalVendors: 0,
    totalProducts: 0
  });

  // Active Tab
  const [activeTab, setActiveTab] = useState<"analytics" | "users" | "vendors" | "categories">("analytics");

  // Category Form State
  const [catName, setCatName] = useState("");
  const [catDesc, setCatDesc] = useState("");
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  useEffect(() => {
    if (user && profile) {
      if (profile.role !== "admin") {
        toast({
          variant: "destructive",
          title: "Access Denied",
          description: "You must be an administrator to access the admin portal.",
        });
        setLocation("/");
        return;
      }
      fetchAdminData();
    }
  }, [user, profile]);

  async function fetchAdminData() {
    setLoading(true);
    try {
      // 1. Fetch Users
      const { data: usersData } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      setProfiles(usersData || []);

      // 2. Fetch Vendors
      const { data: vendorsData } = await supabase
        .from("vendors")
        .select("*")
        .order("created_at", { ascending: false });
      setVendors(vendorsData || []);

      // 3. Fetch Categories
      const { data: categoriesData } = await supabase
        .from("categories")
        .select("*")
        .order("name", { ascending: true });
      setCategories(categoriesData || []);

      // 4. Fetch Products for analytics
      const { data: productsData } = await supabase
        .from("products")
        .select("id");

      // 5. Fetch Orders for analytics
      const { data: ordersData } = await supabase
        .from("orders")
        .select("id, total_amount, status");

      // Compute stats
      let salesTotal = 0;
      let orderCount = 0;

      (ordersData || []).forEach(o => {
        if (o.status !== "cancelled") {
          salesTotal += Number(o.total_amount);
        }
        orderCount++;
      });

      setStats({
        totalSales: salesTotal,
        totalOrders: orderCount,
        totalUsers: usersData?.length || 0,
        totalVendors: vendorsData?.length || 0,
        totalProducts: productsData?.length || 0
      });

    } catch (err: any) {
      console.error("Error loading admin data:", err);
      toast({
        variant: "destructive",
        title: "Load Error",
        description: err.message || "Failed to load platform administration metrics."
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleRoleChange(userId: string, newRole: UserProfile["role"]) {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ role: newRole })
        .eq("id", userId);

      if (error) throw error;

      toast({
        title: "Role Updated",
        description: "User role changed successfully.",
      });

      // If user became a vendor and has no vendor details, create a default vendor storefront row
      if (newRole === "vendor") {
        const vendorExists = vendors.some(v => v.id === userId);
        if (!vendorExists) {
          const matchedProfile = profiles.find(p => p.id === userId);
          const { error: vendorError } = await supabase
            .from("vendors")
            .insert([{
              id: userId,
              business_name: `${matchedProfile?.name || "New"}'s Storefront`,
              description: "Storefront registered by Platform Administrator.",
              phone: "N/A",
              address: "N/A"
            }]);
          if (vendorError) throw vendorError;
        }
      }

      fetchAdminData();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Role Change Failed",
        description: err.message
      });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("categories")
        .insert([{
          name: catName.trim(),
          description: catDesc.trim() || null
        }]);

      if (error) throw error;

      toast({
        title: "Category Created",
        description: `Global category "${catName}" has been successfully added to catalog.`,
      });

      setIsCategoryModalOpen(false);
      setCatName("");
      setCatDesc("");
      fetchAdminData();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Category Registration Failed",
        description: err.message || "Ensure category name is unique."
      });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeleteCategory(catId: string, name: string) {
    if (!confirm(`Are you sure you want to delete the category "${name}"? Products in this category will be unassigned.`)) return;
    try {
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", catId);

      if (error) throw error;

      toast({
        title: "Category Deleted",
        description: `Category "${name}" was removed from the database.`,
      });
      fetchAdminData();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Delete Failed",
        description: err.message
      });
    }
  }

  async function handleSignOut() {
    await signOut();
    setLocation("/");
  }

  if (profile?.role !== "admin") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-white px-4">
        <div className="glass-panel p-8 rounded-2xl max-w-md w-full text-center border-red-500/20">
          <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted mb-6">Administrators credentials are required to display this console.</p>
          <div className="flex gap-4 justify-center">
            <Link href="/">
              <button className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-bold hover:bg-gold/90 transition-colors">
                Back to Catalog
              </button>
            </Link>
            <button onClick={handleSignOut} className="border border-white/20 px-6 py-2.5 rounded-full font-bold hover:bg-white/10 transition-colors">
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

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
            <span className="ml-2 text-xs font-semibold uppercase tracking-wider bg-red-500/15 text-red-400 px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-red-500/15">
              <Shield className="w-3 h-3" /> Admin
            </span>
          </Link>

          <div className="hidden sm:flex items-center gap-6 text-sm font-medium text-muted">
            <button onClick={() => setActiveTab("analytics")} className={`transition-colors py-1 ${activeTab === "analytics" ? "text-white border-b-2 border-gold font-bold" : "hover:text-white"}`}>Analytics</button>
            <button onClick={() => setActiveTab("users")} className={`transition-colors py-1 ${activeTab === "users" ? "text-white border-b-2 border-gold font-bold" : "hover:text-white"}`}>Accounts</button>
            <button onClick={() => setActiveTab("vendors")} className={`transition-colors py-1 ${activeTab === "vendors" ? "text-white border-b-2 border-gold font-bold" : "hover:text-white"}`}>Sellers</button>
            <button onClick={() => setActiveTab("categories")} className={`transition-colors py-1 ${activeTab === "categories" ? "text-white border-b-2 border-gold font-bold" : "hover:text-white"}`}>Categories</button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-sm font-semibold text-white">{profile.name}</span>
            <span className="text-xs text-muted-foreground">System Administrator</span>
          </div>
          <button onClick={handleSignOut}
            className="flex items-center gap-2 border border-white/10 hover:border-red-500/30 hover:text-red-400 px-4 py-2 rounded-full text-sm font-semibold hover:bg-red-500/10 transition-all cursor-pointer">
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </nav>

      {/* DASHBOARD BODY */}
      <main className="max-w-6xl mx-auto px-6 pt-28 relative z-10">
        
        {/* Back link */}
        <Link href="/" className="inline-flex items-center gap-2 text-muted hover:text-white mb-6 text-sm font-medium transition-colors cursor-pointer group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Catalog</span>
        </Link>

        {/* Dashboard Title */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-white flex items-center gap-2">
              <Settings className="w-8 h-8 text-gold" />
              Platform Admin Control Center
            </h1>
            <p className="text-muted text-sm mt-1">
              Monitor active users, edit seller privileges, analyze sales volumes, and coordinate categories.
            </p>
          </div>

          <button 
            onClick={fetchAdminData}
            disabled={loading}
            className="flex items-center gap-1.5 border border-white/10 hover:border-gold hover:text-gold px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 transition-all disabled:opacity-50 cursor-pointer self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh Data
          </button>
        </div>

        {/* LOADING STATE */}
        {loading ? (
          <div className="min-h-[400px] flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-12 h-12 text-gold animate-spin" />
            <p className="text-muted animate-pulse">Gathering administration data...</p>
          </div>
        ) : (
          <>
            {/* TAB CONTENT: ANALYTICS */}
            {activeTab === "analytics" && (
              <div className="space-y-8">
                {/* METRICS GRID */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                  {[
                    { label: "Gross Sales Revenue", val: `₹${stats.totalSales.toFixed(2)}`, icon: <Coins className="w-6 h-6 text-emerald" />, desc: "Platform total payouts" },
                    { label: "Orders Checkout", val: stats.totalOrders, icon: <ShoppingBag className="w-6 h-6 text-blue" />, desc: "Total transactions" },
                    { label: "Active Profiles", val: stats.totalUsers, icon: <Users className="w-6 h-6 text-gold" />, desc: "Customers & sellers" },
                    { label: "Registered Sellers", val: stats.totalVendors, icon: <Store className="w-6 h-6 text-purple-400" />, desc: "Approved merchant stores" },
                    { label: "Products Listed", val: stats.totalProducts, icon: <Grid className="w-6 h-6 text-pink-400" />, desc: "Live database offerings" }
                  ].map((stat, i) => (
                    <div key={i} className="glass-panel p-6 rounded-2xl flex flex-col justify-between hover:scale-[1.01] transition-transform duration-300 border border-white/5 bg-white/[0.01]">
                      <div className="flex justify-between items-start mb-4">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{stat.label}</span>
                        <div className="p-2 rounded-lg bg-white/5">{stat.icon}</div>
                      </div>
                      <div>
                        <div className="text-2xl font-black text-white mb-0.5">{stat.val}</div>
                        <div className="text-[9px] text-muted-foreground">{stat.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Info Card */}
                <div className="glass-panel p-6 rounded-3xl border border-white/10 bg-gradient-to-r from-gold/5 via-blue/5 to-transparent flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gold/10 border border-gold/20 rounded-full flex items-center justify-center text-gold">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base">Security Policy Audit</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Supabase Row-Level Security (RLS) is active. User roles control write privileges to database products and orders.</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setActiveTab("users")}
                    className="bg-primary text-primary-foreground hover:bg-gold/90 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer gold-glow self-start md:self-auto"
                  >
                    Configure RBAC Access
                  </button>
                </div>
              </div>
            )}

            {/* TAB CONTENT: USERS LIST */}
            {activeTab === "users" && (
              <div className="glass-panel rounded-3xl border border-white/10 overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-white/5 border-b border-white/10 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        <th className="py-4 px-6">Name</th>
                        <th className="py-4 px-6">Email Address</th>
                        <th className="py-4 px-6">Account ID</th>
                        <th className="py-4 px-6">Access Role</th>
                        <th className="py-4 px-6 text-center">Modify Permissions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-sm text-white">
                      {profiles.map(p => (
                        <tr key={p.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-4 px-6 font-bold text-white flex items-center gap-2">
                            <Users className="w-4 h-4 text-muted-foreground" />
                            {p.name}
                          </td>
                          <td className="py-4 px-6 text-muted-foreground">
                            {p.email}
                          </td>
                          <td className="py-4 px-6 text-xs text-muted-foreground font-mono">
                            {p.id.slice(0, 18)}...
                          </td>
                          <td className="py-4 px-6">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider
                              ${p.role === "admin" ? "bg-red-500/10 text-red-400 border border-red-500/20" : ""}
                              ${p.role === "vendor" ? "bg-gold/10 text-gold border border-gold/20" : ""}
                              ${p.role === "customer" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" : ""}
                            `}>
                              {p.role}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <select
                              value={p.role}
                              disabled={p.id === user?.id || actionLoading}
                              onChange={(e) => handleRoleChange(p.id, e.target.value as UserProfile["role"])}
                              className="px-3 py-1.5 bg-card border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-gold disabled:opacity-50"
                            >
                              <option value="customer">Customer</option>
                              <option value="vendor">Vendor / Seller</option>
                              <option value="admin">Administrator</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB CONTENT: VENDORS LIST */}
            {activeTab === "vendors" && (
              <div className="glass-panel rounded-3xl border border-white/10 overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-white/5 border-b border-white/10 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        <th className="py-4 px-6">Store ID</th>
                        <th className="py-4 px-6">Business Storefront</th>
                        <th className="py-4 px-6">Contact Phone</th>
                        <th className="py-4 px-6">Location Address</th>
                        <th className="py-4 px-6">Registered Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-sm text-white">
                      {vendors.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-muted-foreground">
                            No storefront sellers registered yet.
                          </td>
                        </tr>
                      ) : (
                        vendors.map(v => (
                          <tr key={v.id} className="hover:bg-white/5 transition-colors">
                            <td className="py-4 px-6 text-xs text-muted-foreground font-mono">
                              {v.id.slice(0, 8)}...
                            </td>
                            <td className="py-4 px-6">
                              <div className="font-bold text-white flex items-center gap-2">
                                <Store className="w-4 h-4 text-gold" />
                                {v.business_name}
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1 max-w-[250px]">
                                {v.description || "No description provided."}
                              </div>
                            </td>
                            <td className="py-4 px-6 text-muted-foreground">
                              {v.phone || "N/A"}
                            </td>
                            <td className="py-4 px-6 text-muted-foreground max-w-[200px] truncate" title={v.address || ""}>
                              {v.address || "N/A"}
                            </td>
                            <td className="py-4 px-6 text-xs text-muted-foreground">
                              {new Date(v.created_at).toLocaleDateString("en-IN")}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB CONTENT: CATEGORIES MANAGEMENT */}
            {activeTab === "categories" && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-white">Product Categories ({categories.length})</h3>
                  <button 
                    onClick={() => setIsCategoryModalOpen(true)}
                    className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-gold/90 transition-all cursor-pointer gold-glow"
                  >
                    <Plus className="w-4 h-4" /> Add Global Category
                  </button>
                </div>

                <div className="glass-panel rounded-3xl border border-white/10 overflow-hidden shadow-xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-white/5 border-b border-white/10 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          <th className="py-4 px-6">Category Name</th>
                          <th className="py-4 px-6">Description</th>
                          <th className="py-4 px-6">Registered Date</th>
                          <th className="py-4 px-6 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-sm text-white">
                        {categories.map(cat => (
                          <tr key={cat.id} className="hover:bg-white/5 transition-colors">
                            <td className="py-4 px-6 font-bold text-white flex items-center gap-2">
                              <Tag className="w-4 h-4 text-gold" />
                              {cat.name}
                            </td>
                            <td className="py-4 px-6 text-muted-foreground max-w-[300px] truncate" title={cat.description || ""}>
                              {cat.description || "No description provided."}
                            </td>
                            <td className="py-4 px-6 text-xs text-muted-foreground">
                              {new Date(cat.created_at).toLocaleDateString("en-IN")}
                            </td>
                            <td className="py-4 px-6 text-center">
                              <button
                                onClick={() => handleDeleteCategory(cat.id, cat.name)}
                                className="border border-white/10 hover:border-red-500/30 hover:text-red-400 p-2 rounded-xl bg-white/5 transition-all cursor-pointer"
                                title="Delete Category"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

      </main>

      {/* CREATE CATEGORY MODAL */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel max-w-md w-full rounded-3xl border border-white/15 p-6 animate-scaleUp shadow-2xl relative">
            
            <button 
              onClick={() => setIsCategoryModalOpen(false)}
              className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-xl text-muted-foreground hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-gold" />
              Add Global Category
            </h3>

            <form onSubmit={handleAddCategory} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase block">Category Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Health & Wellness"
                  value={catName}
                  onChange={e => setCatName(e.target.value)}
                  className="block w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-muted-foreground focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase block">Category Description</label>
                <textarea
                  placeholder="Detailed description of global product catalog category..."
                  value={catDesc}
                  onChange={e => setCatDesc(e.target.value)}
                  rows={3}
                  className="block w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-muted-foreground focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 text-sm resize-none"
                />
              </div>

              <div className="flex gap-4 pt-4 border-t border-white/5">
                <button 
                  type="button" 
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="flex-1 border border-white/10 text-white py-2 rounded-xl text-xs font-bold hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={actionLoading}
                  className="flex-1 bg-primary text-primary-foreground py-2 rounded-xl text-xs font-bold hover:bg-gold/90 transition-colors flex items-center justify-center gap-1.5 cursor-pointer gold-glow"
                >
                  {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Create Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
