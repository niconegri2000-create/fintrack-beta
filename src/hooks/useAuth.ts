import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const resolvedRef = useRef(false);

  useEffect(() => {
    logger.info(`[BOOT] useAuth mount | timestamp=${new Date().toISOString()}`);
    resolvedRef.current = false;

    const applySession = (s: Session | null, source: string) => {
      logger.info(`[BOOT] ${source} | user=${s?.user?.id ?? "null"} | session=${!!s}`);
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
      resolvedRef.current = true;
    };

    // Set up listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        logger.info(`[BOOT] onAuthStateChange | event=${event}`);
        // On Safari, INITIAL_SESSION fires before getSession resolves
        applySession(session, `onAuthStateChange(${event})`);
      }
    );

    // Then get initial session as fallback
    supabase.auth.getSession().then(({ data: { session } }) => {
      // Only apply if listener hasn't resolved yet
      if (!resolvedRef.current) {
        applySession(session, "getSession");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { user, session, loading, signOut };
}
