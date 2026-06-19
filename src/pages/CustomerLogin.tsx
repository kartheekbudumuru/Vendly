import React, { useState } from "react";
import { supabase } from "../lib/supabase";
import { useLocation, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { 
  Phone, Loader2, ArrowLeft, Star, AlertCircle 
} from "lucide-react";

export default function CustomerLogin() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!phone.trim()) {
      setError("Please enter your phone number.");
      setLoading(false);
      return;
    }

    try {
      // Lookup customer by phone number
      const { data, error: dbError } = await supabase
        .from("customers")
        .select("id, customer_name, phone, vendor_id")
        .eq("phone", phone.trim());

      if (dbError) throw dbError;

      if (!data || data.length === 0) {
        throw new Error("No customer profile found with this phone number. Please contact your store to register.");
      }

      // Store customer session locally
      localStorage.setItem("customer_phone", phone.trim());
      localStorage.setItem("customer_name", data[0].customer_name);

      toast({
        title: "Welcome!",
        description: `Successfully signed in as ${data[0].customer_name}. Redirecting to your portal...`,
      });

      setLocation("/customer/portal");

    } catch (err: any) {
      console.error("Customer login failed:", err);
      setError(err.message || "An unexpected error occurred during login.");
      toast({
        variant: "destructive",
        title: "Sign In Failed",
        description: err.message || "Please verify your phone number and try again.",
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
        <Link href="/login" className="flex items-center gap-2 group text-muted hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-medium">Merchant Portal</span>
        </Link>
        <div className="flex items-center gap-2">
          <div className="text-gold font-bold text-2xl flex items-center">
            <span className="text-white">Vend</span><span className="text-gold">ly</span>
          </div>
          <Star className="text-gold fill-gold h-5 w-5 animate-pulse" />
        </div>
      </header>

      {/* CARD */}
      <div className="flex-1 flex items-center justify-center pt-28 pb-16 px-4 z-10">
        <div className="w-full max-w-md glass-panel rounded-3xl p-8 md:p-10 border border-white/10 shadow-2xl relative">
          
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold text-white mb-2">
              Customer Sign In
            </h1>
            <p className="text-muted text-sm">
              Enter your registered phone number to check points, view store offers, and prebook items.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex gap-3 items-start text-red-200 text-sm animate-shake">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
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
                  placeholder="e.g. 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
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
                  Verifying Account...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/10 text-center space-y-3">
            <div>
              <p className="text-muted text-xs">
                New to Vendly?{" "}
                <Link href="/customer/register" className="text-gold font-semibold hover:underline">
                  Sign Up here
                </Link>
              </p>
            </div>
            <div>
              <p className="text-muted text-xs">
                Are you a merchant?{" "}
                <Link href="/login" className="text-gold font-semibold hover:underline">
                  Log In here
                </Link>
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
