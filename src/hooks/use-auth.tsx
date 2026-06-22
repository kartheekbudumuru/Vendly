import React, { createContext, useContext, useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: "customer" | "vendor" | "admin";
  created_at: string;
}

export interface VendorProfile {
  id: string;
  business_name: string;
  description: string | null;
  phone: string | null;
  address: string | null;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  vendor: VendorProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [vendor, setVendor] = useState<VendorProfile | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchUserProfileAndVendor(userId: string) {
    try {
      // 1. Fetch core user profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (profileError || !profileData) {
        console.warn("Could not fetch user profile details:", profileError?.message);
        setProfile(null);
        setVendor(null);
        return;
      }

      setProfile(profileData);

      // 2. Fetch vendor info if role is vendor
      if (profileData.role === "vendor") {
        const { data: vendorData, error: vendorError } = await supabase
          .from("vendors")
          .select("*")
          .eq("id", userId)
          .maybeSingle();

        if (vendorError) {
          console.warn("Could not fetch vendor profile details:", vendorError.message);
          setVendor(null);
        } else {
          setVendor(vendorData);
        }
      } else {
        setVendor(null);
      }
    } catch (err) {
      console.error("Error fetching auth details:", err);
      setProfile(null);
      setVendor(null);
    }
  }

  async function refreshProfile() {
    if (user) {
      await fetchUserProfileAndVendor(user.id);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
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
          await fetchUserProfileAndVendor(session.user.id);
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
          await fetchUserProfileAndVendor(session.user.id);
        } else {
          setUser(null);
          setProfile(null);
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
    profile,
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
