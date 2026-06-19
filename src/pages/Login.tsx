import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useLocation, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { 
  Mail, Lock, Loader2, ArrowLeft, Star, AlertCircle 
} from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { user, loading: authLoading } = useAuth();

  // Redirect to dashboard if user is already logged in
  useEffect(() => {
    if (!authLoading && user) {
      setLocation("/dashboard");
    }
  }, [user, authLoading, setLocation]);

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
        description: "Successfully logged in. Redirecting to dashboard...",
      });

      setLocation("/dashboard");

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
      {/* Background Decorative Glow Elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gold/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* TOP NAVIGATION / LOGO */}
      <header className="absolute top-0 left-0 right-0 z-50 px-6 py-6 max-w-6xl mx-auto flex items-center justify-end">
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
          
          {isForgotPassword ? (
            /* FORGOT PASSWORD FORM */
            <>
              <div className="text-center mb-8">
                <h1 className="text-3xl font-extrabold text-white mb-2">
                  Reset Password
                </h1>
                <p className="text-muted text-sm">
                  Enter your email address and we'll send you a link to reset your password.
                </p>
              </div>

              {error && (
                <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex gap-3 items-start text-red-200 text-sm animate-shake">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>{error}</div>
                </div>
              )}

              <form onSubmit={handleForgotPassword} className="space-y-5">
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

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-6 bg-primary text-primary-foreground py-3.5 rounded-xl font-bold hover:bg-gold/90 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-60 disabled:hover:scale-100 disabled:cursor-not-allowed gold-glow text-sm"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Sending Link...
                    </>
                  ) : (
                    "Send Reset Link"
                  )}
                </button>
              </form>

              <div className="mt-8 text-center text-sm">
                <button 
                  onClick={() => { setIsForgotPassword(false); setError(null); }}
                  className="text-gold font-bold hover:underline"
                >
                  Cancel and Log In
                </button>
              </div>
            </>
          ) : (
            /* STANDARD LOGIN FORM */
            <>
              <div className="text-center mb-8">
                <h1 className="text-3xl font-extrabold text-white mb-2">
                  Vendor Login
                </h1>
                <p className="text-muted text-sm">
                  Log in to manage your loyalty platform and customer database.
                </p>
              </div>

              {error && (
                <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex gap-3 items-start text-red-200 text-sm animate-shake">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>{error}</div>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-5">
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
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => { setIsForgotPassword(true); setError(null); }}
                      className="text-xs text-gold hover:underline font-semibold"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <input
                      type="password"
                      required
                      placeholder="Enter your password"
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
                      Logging in...
                    </>
                  ) : (
                    "Log In"
                  )}
                </button>
              </form>

              {/* Toggle to Register */}
              <div className="mt-8 text-center text-sm text-muted-foreground space-y-3">
                <div>
                  Don't have a vendor account yet?{" "}
                  <Link href="/register" className="text-gold font-bold hover:underline">
                    Sign Up
                  </Link>
                </div>
                <div className="pt-4 border-t border-white/5 flex flex-col gap-2">
                  <div>
                    Are you a customer?{" "}
                    <Link href="/customer/login" className="text-gold font-bold hover:underline">
                      Sign In here
                    </Link>
                  </div>
                  <div>
                    Want to register as a customer?{" "}
                    <Link href="/customer/register" className="text-gold font-bold hover:underline">
                      Sign Up here
                    </Link>
                  </div>
                </div>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
