import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useLocation, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { 
  Store, User, Mail, Phone, Lock, 
  Loader2, ArrowLeft, Star, AlertCircle 
} from "lucide-react";

export default function Register() {
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && user) {
      setLocation("/dashboard");
    }
  }, [user, authLoading, setLocation]);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Basic Client Validation
    if (!name.trim()) {
      setError("Owner Name is required.");
      setLoading(false);
      return;
    }
    if (!businessName.trim()) {
      setError("Business Name is required.");
      setLoading(false);
      return;
    }
    if (!phone.trim()) {
      setError("Phone Number is required.");
      setLoading(false);
      return;
    }
    if (!email.trim()) {
      setError("Email address is required.");
      setLoading(false);
      return;
    }
    if (!password.trim()) {
      setError("Password is required.");
      setLoading(false);
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      setLoading(false);
      return;
    }

    try {
      // 1. Supabase Auth signup
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      const user = authData.user;
      if (!user) throw new Error("No user profile created by Supabase Auth.");

      // 2. Insert vendor profile matching Supabase columns: id, name, email, phone, business
      const { error: dbError } = await supabase
        .from("vendors")
        .insert([
          {
            id: user.id,
            name: name.trim(),
            email: email.trim().toLowerCase(),
            phone: phone.trim(),
            business: businessName.trim(),
          }
        ]);

      if (dbError) throw dbError;

      toast({
        title: "Registration Successful!",
        description: "Welcome to Vendly! Redirecting to dashboard...",
      });

      // 3. Redirect to dashboard after a brief delay for toast visibility
      setTimeout(() => {
        setLocation("/dashboard");
      }, 1500);

    } catch (err: any) {
      console.error("Registration failed:", err);
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
        <Link href="/" className="flex items-center gap-2 group text-muted hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-medium">Back to Home</span>
        </Link>
        <Link href="/" className="flex items-center gap-2">
          <div className="text-gold font-bold text-2xl flex items-center">
            <span className="text-white">Vend</span><span className="text-gold">ly</span>
          </div>
          <Star className="text-gold fill-gold h-5 w-5 animate-pulse" />
        </Link>
      </header>

      {/* REGISTRATION FORM CARD */}
      <div className="flex-1 flex items-center justify-center pt-28 pb-16 px-4 z-10">
        <div className="w-full max-w-lg glass-panel rounded-3xl p-8 md:p-10 border border-white/10 shadow-2xl relative">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2">
              Create Vendor Account
            </h1>
            <p className="text-muted text-sm">
              Start building customer loyalty and tracking CRM in minutes.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex gap-3 items-start text-red-200 text-sm animate-shake">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-5">
            {/* Owner Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                Owner Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rajesh Kumar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-muted-foreground focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all text-sm"
                />
              </div>
            </div>

            {/* Business Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                Business / Store Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Store className="h-5 w-5 text-muted-foreground" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rajesh Kirana Store"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
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
                  placeholder="e.g. +91 9876543210"
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
                  placeholder="e.g. rajesh@example.com"
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

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 bg-primary text-primary-foreground py-3.5 rounded-xl font-bold hover:bg-gold/90 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-60 disabled:hover:scale-100 disabled:cursor-not-allowed gold-glow text-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating Account...
                </>
              ) : (
                "Register as Vendor"
              )}
            </button>
          </form>

          {/* Redirect to Login Link */}
          <div className="mt-8 text-center text-sm text-muted-foreground">
            Already have a vendor account?{" "}
            <Link href="/login" className="text-gold font-bold hover:underline">
              Log In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}