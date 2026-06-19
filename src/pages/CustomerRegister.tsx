import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useLocation, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { 
  Store, User, Mail, Phone, Loader2, ArrowLeft, Star, AlertCircle, Lock 
} from "lucide-react";

interface Vendor {
  id: string;
  name: string;
  business: string;
}

export default function CustomerRegister() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [vendors, setVendors] = useState<Vendor[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    fetchVendors();
  }, []);

  async function fetchVendors() {
    setFetchLoading(true);
    try {
      const { data, error } = await supabase
        .from("vendors")
        .select("id, name, business")
        .order("business", { ascending: true });

      if (error) throw error;
      setVendors(data || []);
      if (data && data.length > 0) {
        setSelectedVendorId(data[0].id);
      }
    } catch (err: any) {
      console.error("Failed to load stores:", err);
      toast({
        variant: "destructive",
        title: "Load Error",
        description: "Could not retrieve list of stores.",
      });
    } finally {
      setFetchLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!name.trim()) {
      setError("Please enter your name.");
      setLoading(false);
      return;
    }
    if (!phone.trim()) {
      setError("Please enter your phone number.");
      setLoading(false);
      return;
    }
    if (!email.trim()) {
      setError("Please enter your email address.");
      setLoading(false);
      return;
    }
    if (!password.trim()) {
      setError("Please enter a password.");
      setLoading(false);
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      setLoading(false);
      return;
    }
    if (!selectedVendorId) {
      setError("Please select a store to register under.");
      setLoading(false);
      return;
    }

    try {
      // 1. Check if customer phone or email is already registered at the selected store
      const { data: existing, error: checkError } = await supabase
        .from("customers")
        .select("id")
        .eq("vendor_id", selectedVendorId)
        .or(`phone.eq.${phone.trim()},email.eq.${email.trim().toLowerCase()}`)
        .maybeSingle();
 
      if (checkError) throw checkError;
 
      if (existing) {
        throw new Error("You are already registered under this store with this phone number or email. Try signing in.");
      }
 
      // 2. Insert customer profile
      const { error: insertError } = await supabase
        .from("customers")
        .insert([
          {
            vendor_id: selectedVendorId,
            customer_name: name.trim(),
            phone: phone.trim(),
            email: email.trim().toLowerCase(),
            password: password.trim(),
            points: 0
          }
        ]);

      if (insertError) throw insertError;

      // 3. Store customer session locally
      localStorage.setItem("customer_phone", phone.trim());
      localStorage.setItem("customer_name", name.trim());

      toast({
        title: "Registration Successful! 🎉",
        description: `Welcome to Vendly! Registered successfully under ${
          vendors.find(v => v.id === selectedVendorId)?.business || "selected store"
        }.`,
      });

      setLocation("/customer/portal");

    } catch (err: any) {
      console.error("Customer registration failed:", err);
      setError(err.message || "An unexpected error occurred.");
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: err.message || "Please check your inputs and try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col relative overflow-hidden">
      {/* Background Decorative Glow Elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gold/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* TOP NAVIGATION / LOGO */}
      <header className="absolute top-0 left-0 right-0 z-50 px-6 py-6 max-w-6xl mx-auto flex items-center justify-between">
        <Link href="/customer/login" className="flex items-center gap-2 group text-muted hover:text-white transition-colors cursor-pointer">
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-medium">Back to Login</span>
        </Link>
        <Link href="/customer/login" className="flex items-center gap-2">
          <div className="text-gold font-bold text-2xl flex items-center">
            <span className="text-white">Vend</span><span className="text-gold">ly</span>
          </div>
          <Star className="text-gold fill-gold h-5 w-5 animate-pulse" />
        </Link>
      </header>

      {/* REGISTRATION CARD */}
      <div className="flex-1 flex items-center justify-center pt-28 pb-16 px-4 z-10">
        <div className="w-full max-w-md glass-panel rounded-3xl p-8 md:p-10 border border-white/10 shadow-2xl relative">
          
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold text-white mb-2">
              Customer Sign Up
            </h1>
            <p className="text-muted text-sm">
              Register under your favorite store to start earning points and prebooking special offers.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex gap-3 items-start text-red-200 text-sm animate-shake">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            {/* Owner Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                Your Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. Varun Raj"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-muted-foreground focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all text-sm"
                />
              </div>
            </div>

            {/* Phone Number */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                Phone Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                </div>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9874563256"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-muted-foreground focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all text-sm"
                />
              </div>
            </div>

            {/* Email Address */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                </div>
                <input
                  type="email"
                  required
                  placeholder="e.g. varun@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-muted-foreground focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all text-sm"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-muted-foreground" />
                </div>
                <input
                  type="password"
                  required
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-muted-foreground focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all text-sm"
                />
              </div>
            </div>

            {/* Select Store Dropdown */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                Select Store
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Store className="h-5 w-5 text-muted-foreground" />
                </div>
                {fetchLoading ? (
                  <div className="block w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-muted-foreground text-sm flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-gold" />
                    <span>Loading stores...</span>
                  </div>
                ) : (
                  <select
                    required
                    value={selectedVendorId}
                    onChange={(e) => setSelectedVendorId(e.target.value)}
                    className="block w-full pl-11 pr-10 py-3 bg-neutral-900 border border-white/10 rounded-xl text-white focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all text-sm appearance-none cursor-pointer"
                  >
                    {vendors.length === 0 ? (
                      <option value="">No stores registered yet</option>
                    ) : (
                      vendors.map(vendor => (
                        <option key={vendor.id} value={vendor.id}>
                          {vendor.business} ({vendor.name})
                        </option>
                      ))
                    )}
                  </select>
                )}
                {/* Custom arrow decoration for dropdown */}
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-muted-foreground">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || fetchLoading || vendors.length === 0}
              className="w-full mt-6 bg-primary text-primary-foreground py-3.5 rounded-xl font-bold hover:bg-gold/90 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-60 disabled:hover:scale-100 disabled:cursor-not-allowed gold-glow text-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Registering Account...
                </>
              ) : (
                "Sign Up as Customer"
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/10 text-center">
            <p className="text-muted text-xs">
              Already have a customer account?{" "}
              <Link href="/customer/login" className="text-gold font-semibold hover:underline">
                Sign In
              </Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
