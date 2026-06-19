import React, { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../hooks/use-auth";
import { Loader2 } from "lucide-react";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      setLocation("/login");
    }
  }, [user, loading, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-white">
        <Loader2 className="w-12 h-12 text-gold animate-spin mb-4" />
        <p className="text-muted text-lg animate-pulse">Verifying session...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
