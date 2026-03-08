import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

// Admin check removed — access is controlled server-side via subscriptions, invites, and access codes only.

type AccessStatus = "loading" | "granted" | "needs_subscription";

export function useAccessControl(user: User | null) {
  const [status, setStatus] = useState<AccessStatus>("loading");

  useEffect(() => {
    if (!user) {
      setStatus("loading");
      return;
    }

    const check = async () => {
      // 1. Check active subscription
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("is_active")
        .eq("user_id", user.id)
        .maybeSingle();

      if (sub?.is_active) {
        setStatus("granted");
        return;
      }

      // 3. Check tester access (used invite)
      const { data: invite } = await supabase
        .from("invites")
        .select("id")
        .eq("email", user.email!)
        .eq("used", true)
        .limit(1);

      if (invite && invite.length > 0) {
        setStatus("granted");
        return;
      }

      // 4. Check access_codes (redeemed)
      const { data: accessCode } = await supabase
        .from("access_codes")
        .select("id")
        .eq("is_used", true)
        .eq("used_by", user.id)
        .limit(1);

      if (accessCode && accessCode.length > 0) {
        setStatus("granted");
        return;
      }

      setStatus("needs_subscription");
    };

    check();
  }, [user]);

  const recheck = () => {
    if (user) {
      setStatus("loading");
      // trigger re-check
      const check = async () => {
        if (ADMIN_EMAILS.includes(user.email ?? "")) {
          setStatus("granted");
          return;
        }
        const { data: sub } = await supabase
          .from("subscriptions")
          .select("is_active")
          .eq("user_id", user.id)
          .maybeSingle();
        if (sub?.is_active) {
          setStatus("granted");
          return;
        }
        const { data: invite } = await supabase
          .from("invites")
          .select("id")
          .eq("email", user.email!)
          .eq("used", true)
          .limit(1);
        if (invite && invite.length > 0) {
          setStatus("granted");
          return;
        }
        const { data: accessCode } = await supabase
          .from("access_codes")
          .select("id")
          .eq("is_used", true)
          .eq("used_by", user.id)
          .limit(1);
        if (accessCode && accessCode.length > 0) {
          setStatus("granted");
          return;
        }
        setStatus("needs_subscription");
      };
      check();
    }
  };

  return { status, recheck };
}
