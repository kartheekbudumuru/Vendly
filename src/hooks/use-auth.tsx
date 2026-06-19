import React, { createContext, useContext, useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

interface VendorProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  business: string;
  points_rule_amount: number;
  points_rule_points: number;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  vendor: VendorProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [vendor, setVendor] = useState<VendorProfile | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchVendorProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from("vendors")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        // It's possible the user is registered in Auth but profile insertion failed or hasn't run yet.
        console.warn("Could not fetch vendor profile:", error.message);
        setVendor(null);
      } else {
        setVendor(data);
      }
    } catch (err) {
      console.error("Error fetching vendor profile:", err);
      setVendor(null);
    }
  }

  async function refreshProfile() {
    if (user) {
      await fetchVendorProfile(user.id);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setVendor(null);
  }

  useEffect(() => {
    // 1. Check current session on mount
    async function initializeAuth() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (session?.user) {
          setUser(session.user);
          await fetchVendorProfile(session.user.id);
        }
      } catch (err) {
        console.error("Auth initialization error:", err);
      } finally {
        setLoading(false);
      }
    }

    initializeAuth();

    // 2. Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setLoading(true);
        if (session?.user) {
          setUser(session.user);
          await fetchVendorProfile(session.user.id);
        } else {
          setUser(null);
          setVendor(null);
        }
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const value: AuthContextType = {
    user,
    vendor,
    loading,
    signOut,
    refreshProfile
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
