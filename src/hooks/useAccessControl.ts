import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

const ADMIN_EMAILS = ["niconegri.2000@gmail.com"];

type AccessStatus = "loading" | "granted" | "needs_subscription";

export function useAccessControl(user: User | null) {
  const [status, setStatus] = useState<AccessStatus>("loading");

  useEffect(() => {
    if (!user) {
      setStatus("loading");
      return;
    }

    const check = async () => {
      // 1. Admin bypass
      if (ADMIN_EMAILS.includes(user.email ?? "")) {
        setStatus("granted");
        return;
      }

      // 2. Check active subscription
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
        setStatus("needs_subscription");
      };
      check();
    }
  };

  return { status, recheck };
}
