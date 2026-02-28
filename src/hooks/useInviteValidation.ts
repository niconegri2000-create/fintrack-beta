import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

type InviteStatus = "loading" | "valid" | "needs_code" | "error";

export function useInviteValidation(user: User | null) {
  const [status, setStatus] = useState<InviteStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  // Check if user already has a validated invite
  useEffect(() => {
    if (!user) {
      setStatus("loading");
      return;
    }

    const checkInvite = async () => {
      const { data, error: err } = await supabase
        .from("invites")
        .select("id")
        .eq("email", user.email!)
        .eq("used", true)
        .limit(1);

      if (err) {
        setStatus("error");
        setError("Errore nel controllo dell'invito.");
        return;
      }

      if (data && data.length > 0) {
        setStatus("valid");
      } else {
        setStatus("needs_code");
      }
    };

    checkInvite();
  }, [user]);

  const validateCode = async (code: string): Promise<boolean> => {
    if (!user?.email) return false;
    setError(null);

    // Find matching invite
    const { data, error: fetchErr } = await supabase
      .from("invites")
      .select("*")
      .eq("invite_code", code.trim())
      .eq("email", user.email)
      .eq("used", false)
      .limit(1);

    if (fetchErr) {
      setError("Errore durante la validazione.");
      return false;
    }

    if (!data || data.length === 0) {
      setError("Codice invito non valido o già utilizzato.");
      return false;
    }

    const invite = data[0];

    // Mark as used
    const { error: updateErr } = await supabase
      .from("invites")
      .update({ used: true })
      .eq("id", invite.id);

    if (updateErr) {
      setError("Errore nell'attivazione dell'invito.");
      return false;
    }

    setStatus("valid");
    return true;
  };

  return { status, error, validateCode };
}
