import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useLocation, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { User, Mail, Lock, Loader2, ArrowLeft, Star, AlertCircle, Store, Phone, MapPin } from "lucide-react";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"customer" | "vendor">("customer");

  // Vendor secondary fields
  const [businessName, setBusinessName] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [businessDesc, setBusinessDesc] = useState("");

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { user, profile, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && user && profile) {
      if (profile.role === "admin") {
        setLocation("/admin");
      } else if (profile.role === "vendor") {
        setLocation("/dashboard");
      } else {
        setLocation("/");
      }
    }
  }, [user, profile, authLoading, setLocation]);

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) return setError("Name is required.");
    if (!email.trim()) return setError("Email is required.");
    if (!password.trim()) return setError("Password is required.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");

    if (role === "vendor") {
      setStep(2);
    } else {
      handleSignup();
    }
  };

  async function handleSignup(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setError(null);
    setLoading(true);

    if (role === "vendor") {
      if (!businessName.trim()) {
        setError("Business Name is required.");
        setLoading(false);
        return;
      }
    }

    try {
      // 1. Supabase Auth signup with metadata
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: password.trim(),
        options: {
          data: {
            name: name.trim(),
            role: role,
            business_name: role === "vendor" ? businessName.trim() : undefined,
            phone: role === "vendor" ? (businessPhone.trim() || null) : undefined,
            address: role === "vendor" ? (businessAddress.trim() || null) : undefined,
            description: role === "vendor" ? (businessDesc.trim() || null) : undefined,
          }
        }
      });

      if (authError) throw authError;

      const registeredUser = authData.user;
      if (!registeredUser) throw new Error("No user created by Supabase Auth.");

      // 2. Check if profiles table entry was already created (e.g. by DB trigger)
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", registeredUser.id)
        .maybeSingle();

      if (!existingProfile) {
        // Fallback: manually insert into profiles table if trigger didn't run
        const { error: profileError } = await supabase
          .from("profiles")
          .insert([
            {
              id: registeredUser.id,
              name: name.trim(),
              email: email.trim().toLowerCase(),
              role: role,
            }
          ]);

        if (profileError) {
          console.error("Manual profile insertion failed:", profileError.message);
          throw new Error(`Could not create user profile. Please ensure database RLS policies are applied. (Detail: ${profileError.message})`);
        }
      }

      // 3. If seller, check and insert store details
      if (role === "vendor") {
        const { data: existingVendor } = await supabase
          .from("vendors")
          .select("id")
          .eq("id", registeredUser.id)
          .maybeSingle();

        if (!existingVendor) {
          const { error: vendorError } = await supabase
            .from("vendors")
            .insert([
              {
                id: registeredUser.id,
                business_name: businessName.trim(),
                phone: businessPhone.trim() || null,
                address: businessAddress.trim() || null,
                description: businessDesc.trim() || null,
              }
            ]);

          if (vendorError) throw vendorError;
        }
      }

      toast({
        title: "Registration Successful! 🎉",
        description: `Welcome to Vendly! Account created successfully as a ${role}.`,
      });

      setTimeout(() => {
        setLocation(role === "vendor" ? "/dashboard" : "/");
      }, 1000);

    } catch (err: any) {
      console.error("Signup failed:", err);
      setError(err.message || "An unexpected error occurred during signup.");
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: err.message || "Please verify your inputs and try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col relative overflow-hidden">
      
      {/* Decorative Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gold/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* HEADER LOGO */}
      <header className="absolute top-0 left-0 right-0 z-50 px-6 py-6 max-w-6xl mx-auto flex items-center justify-between">
        <Link href="/login" className="flex items-center gap-2 group text-muted hover:text-white transition-colors cursor-pointer">
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-medium">Back to Login</span>
        </Link>
        <Link href="/" className="font-bold text-2xl flex items-center cursor-pointer">
          <span className="text-white">Vend</span><span className="text-gold">ly</span>
          <Star className="text-gold fill-gold h-5 w-5 ml-1" />
        </Link>
      </header>

      {/* REGISTRATION STEP CONTROLLER */}
      <div className="flex-1 flex items-center justify-center pt-28 pb-16 px-4 z-10">
        <div className="w-full max-w-lg glass-panel rounded-3xl p-8 md:p-10 border border-white/10 shadow-2xl relative">
          
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold text-white mb-2">Create Account</h1>
            <p className="text-muted text-sm">
              {step === 1 ? "Select your profile type and input personal credentials." : "Complete onboarding setup details for your store."}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex gap-3 items-start text-red-200 text-sm">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          {step === 1 ? (
            /* STEP 1: PERSONAL DETAILS */
            <form onSubmit={handleNextStep} className="space-y-4">
              
              {/* Profile Role Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                  I want to register as a:
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setRole("customer")}
                    className={`py-3 rounded-xl border text-sm font-bold transition-all cursor-pointer ${role === "customer" ? "bg-gold/15 border-gold text-gold" : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10"}`}
                  >
                    Buyer / Customer
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("vendor")}
                    className={`py-3 rounded-xl border text-sm font-bold transition-all cursor-pointer ${role === "vendor" ? "bg-gold/15 border-gold text-gold" : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10"}`}
                  >
                    Seller / Merchant
                  </button>
                </div>
              </div>

              {/* Personal Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Varun Kumar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-gold text-sm"
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. varun@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-gold text-sm"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Password</label>
                <input
                  type="password"
                  required
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-gold text-sm"
                />
              </div>

              <button
                type="submit"
                className="w-full mt-6 bg-primary text-primary-foreground py-3.5 rounded-xl font-bold hover:bg-gold/90 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm gold-glow"
              >
                {role === "vendor" ? "Proceed to Store Setup" : "Sign Up"}
              </button>

            </form>
          ) : (
            /* STEP 2: SELLER DETAILS */
            <form onSubmit={handleSignup} className="space-y-4">
              
              {/* Business Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Business / Store Name</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="e.g. Varun Supermarket"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="block w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-gold text-sm"
                  />
                </div>
              </div>

              {/* Business Phone */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Store Phone Number</label>
                <input
                  type="tel"
                  placeholder="e.g. +91 9876543210"
                  value={businessPhone}
                  onChange={(e) => setBusinessPhone(e.target.value)}
                  className="block w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-gold text-sm"
                />
              </div>

              {/* Business Address */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Store Physical Address</label>
                <input
                  type="text"
                  placeholder="e.g. Jubilee Hills, Hyderabad"
                  value={businessAddress}
                  onChange={(e) => setBusinessAddress(e.target.value)}
                  className="block w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-gold text-sm"
                />
              </div>

              {/* Business Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Business Description</label>
                <textarea
                  placeholder="Tell us what you sell (categories, items, brands)..."
                  value={businessDesc}
                  onChange={(e) => setBusinessDesc(e.target.value)}
                  rows={3}
                  className="block w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-gold text-sm resize-none"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 border border-white/10 text-white py-3 rounded-xl font-bold hover:bg-white/5 transition-colors cursor-pointer text-sm"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-primary text-primary-foreground py-3 rounded-xl font-bold hover:bg-gold/90 transition-colors flex items-center justify-center gap-2 cursor-pointer text-sm gold-glow"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Complete Register"}
                </button>
              </div>

            </form>
          )}

          <div className="mt-8 text-center text-xs text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-gold font-bold hover:underline cursor-pointer">
              Log In here
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}