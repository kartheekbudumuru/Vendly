import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useLocation, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Mail, Lock, Loader2, Star, AlertCircle } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { user, profile, loading: authLoading } = useAuth();

  // Redirect based on role if logged in
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

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!email.trim() || !password.trim()) {
      setError("Please enter both email and password.");
      setLoading(false);
      return;
    }

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password.trim(),
      });

      if (authError) throw authError;

      toast({
        title: "Welcome Back!",
        description: "Successfully logged in.",
      });
    } catch (err: any) {
      console.error("Login failed:", err);
      setError(err.message || "An unexpected error occurred during login.");
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: err.message || "Please check your email and password.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!email.trim()) {
      setError("Please enter your email address.");
      setLoading(false);
      return;
    }

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        { redirectTo: `${window.location.origin}/reset-password` }
      );

      if (resetError) throw resetError;

      toast({
        title: "Reset Link Sent!",
        description: "A password reset link has been sent to your email address.",
      });

      setIsForgotPassword(false);
    } catch (err: any) {
      console.error("Reset password error:", err);
      setError(err.message || "Could not request password reset.");
      toast({
        variant: "destructive",
        title: "Request Failed",
        description: err.message || "Something went wrong. Please check your email.",
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
        <Link href="/" className="font-bold text-2xl flex items-center cursor-pointer">
          <span className="text-white">Vend</span><span className="text-gold">ly</span>
          <Star className="text-gold fill-gold h-5 w-5 ml-1" />
        </Link>
      </header>

      {/* LOGIN CARD */}
      <div className="flex-1 flex items-center justify-center pt-28 pb-16 px-4 z-10">
        <div className="w-full max-w-md glass-panel rounded-3xl p-8 md:p-10 border border-white/10 shadow-2xl relative">
          
          {isForgotPassword ? (
            <>
              <div className="text-center mb-8">
                <h1 className="text-2xl font-extrabold text-white mb-2">Reset Password</h1>
                <p className="text-muted text-xs">
                  Enter your email address and we'll send you a password reset link.
                </p>
              </div>

              {error && (
                <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex gap-3 items-start text-red-200 text-sm">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>{error}</div>
                </div>
              )}

              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      placeholder="e.g. varun@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full pl-4 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-muted-foreground focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 text-sm"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 bg-primary text-primary-foreground py-3 rounded-xl font-bold hover:bg-gold/90 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm gold-glow"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send Reset Link"}
                </button>
              </form>

              <div className="mt-6 text-center">
                <button 
                  onClick={() => { setIsForgotPassword(false); setError(null); }}
                  className="text-xs text-gold font-bold hover:underline"
                >
                  Cancel and Log In
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="text-center mb-8">
                <h1 className="text-3xl font-extrabold text-white mb-2">Welcome to Vendly</h1>
                <p className="text-muted text-xs">
                  Log in to access products, checkouts, store settings, or platform analytics.
                </p>
              </div>

              {error && (
                <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex gap-3 items-start text-red-200 text-sm">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>{error}</div>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. ravi@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-muted-foreground focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 text-sm"
                  />
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => { setIsForgotPassword(true); setError(null); }}
                      className="text-[10px] text-gold hover:underline font-bold uppercase tracking-wider"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <input
                    type="password"
                    required
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-muted-foreground focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 text-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-4 bg-primary text-primary-foreground py-3 rounded-xl font-bold hover:bg-gold/90 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm gold-glow"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign In"}
                </button>
              </form>

              <div className="mt-8 text-center text-xs text-muted-foreground space-y-3">
                <div>
                  New to Vendly?{" "}
                  <Link href="/register" className="text-gold font-bold hover:underline cursor-pointer">
                    Create Account
                  </Link>
                </div>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
