import { useState } from "react";
import { createClient } from "../utils/supabase/client";
import { Button } from "./ui/button";
import { toast } from "sonner";

interface SignOutButtonProps {
  onSignedOut?: () => void;
  className?: string;
}

export default function SignOutButton({ onSignedOut, className }: SignOutButtonProps) {
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function handleSignOut() {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success("Successfully signed out");
      onSignedOut?.();
      // Force reload the page to clear any cached state
      window.location.reload();
    } catch (err: any) {
      console.error("Sign out failed:", err?.message || err);
      toast.error(err?.message || "Failed to sign out");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleSignOut} disabled={loading} className={className}>
      {loading ? "Signing out…" : "Sign out"}
    </Button>
  );
}
