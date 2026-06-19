import React, { useState } from "react";
import { supabase } from "../lib/supabase";
import { useLocation, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { 
  Lock, Loader2, ArrowLeft, Star, AlertCircle 
} from "lucide-react";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!password.trim() || !confirmPassword.trim()) {
      setError("Please fill out both fields.");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) throw updateError;

      toast({
        title: "Password Updated!",
        description: "Your password has been successfully reset. Redirecting to dashboard...",
      });

      setLocation("/dashboard");

    } catch (err: any) {
      console.error("Password reset error:", err);
      setError(err.message || "Failed to update password.");
      toast({
        variant: "destructive",
        title: "Update Failed",
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
        <Link href="/login" className="flex items-center gap-2 group text-muted hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-medium">Cancel and Log In</span>
        </Link>
        <Link href="/" className="flex items-center gap-2">
          <div className="text-gold font-bold text-2xl flex items-center">
            <span className="text-white">Vend</span><span className="text-gold">ly</span>
          </div>
          <Star className="text-gold fill-gold h-5 w-5 animate-pulse" />
        </Link>
      </header>

      {/* CARD */}
      <div className="flex-1 flex items-center justify-center pt-28 pb-16 px-4 z-10">
        <div className="w-full max-w-md glass-panel rounded-3xl p-8 md:p-10 border border-white/10 shadow-2xl relative">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold text-white mb-2">
              Update Password
            </h1>
            <p className="text-muted text-sm">
              Please enter your new password below to secure your vendor account.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex gap-3 items-start text-red-200 text-sm animate-shake">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          <form onSubmit={handleResetPassword} className="space-y-5">
            {/* New Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                New Password
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

            {/* Confirm New Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-muted-foreground" />
                </div>
                <input
                  type="password"
                  required
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
                  Updating Password...
                </>
              ) : (
                "Update Password"
              )}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
