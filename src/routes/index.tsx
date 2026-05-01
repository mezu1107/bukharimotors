import { createFileRoute, redirect } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useEffect } from "react";

export const Route = createFileRoute("/")({
  component: IndexRedirect,
});

function IndexRedirect() {
  const { user, loading } = useAuth();
  useEffect(() => {
    if (loading) return;
    if (user) {
      window.location.replace("/dashboard");
    } else {
      window.location.replace("/login");
    }
  }, [user, loading]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary">
      <div className="text-center">
        <div className="font-display text-3xl font-bold text-gradient mb-2">BUKHARI MOTORS</div>
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    </div>
  );
}

// silence unused
void redirect;
