import { useEffect, useState, useCallback } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useSearchParams } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { PrivacyProvider } from "@/contexts/PrivacyContext";
import { DateRangeProvider } from "@/contexts/DateRangeContext";
import { AccountProvider } from "@/contexts/AccountContext";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { useAccessControl } from "@/hooks/useAccessControl";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import Dashboard from "./pages/Dashboard";
import Transazioni from "./pages/Transazioni";
import Trasferimenti from "./pages/Trasferimenti";
import Ricorrenti from "./pages/Ricorrenti";
import BudgetCategorie from "./pages/BudgetCategorie";
import Obiettivi from "./pages/Obiettivi";
import Report from "./pages/Report";
import Impostazioni from "./pages/Impostazioni";
import Account from "./pages/Account";
import Auth from "./pages/Auth";
import Abbonamento from "./pages/Abbonamento";
import NotFound from "./pages/NotFound";
import { DevDiagnostics } from "@/components/DevDiagnostics";
import { Skeleton } from "@/components/ui/skeleton";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";

const queryClient = new QueryClient();

function CheckoutPolling({ user, onActivated }: { user: any; onActivated: () => void }) {
  const [attempts, setAttempts] = useState(0);
  const [failed, setFailed] = useState(false);
  const maxAttempts = 30;

  const poll = useCallback(async () => {
    setFailed(false);
    setAttempts(0);
    let count = 0;
    const interval = setInterval(async () => {
      count++;
      setAttempts(count);
      try {
        const { data } = await supabase
          .from("subscriptions")
          .select("is_active")
          .eq("user_id", user.id)
          .maybeSingle();
        if (data?.is_active) {
          clearInterval(interval);
          onActivated();
        } else if (count >= maxAttempts) {
          clearInterval(interval);
          setFailed(true);
        }
      } catch {
        if (count >= maxAttempts) {
          clearInterval(interval);
          setFailed(true);
        }
      }
    }, 1000);
    return interval;
  }, [user.id, onActivated]);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;
    poll().then((id) => { intervalId = id; });
    return () => { if (intervalId) clearInterval(intervalId); };
  }, [poll]);

  if (failed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center space-y-4 max-w-md">
          <p className="text-lg font-semibold">Attivazione non riuscita</p>
          <p className="text-sm text-muted-foreground">
            Il pagamento è stato completato, ma l'abbonamento non risulta ancora attivo. Questo può succedere per un ritardo nella conferma.
          </p>
          <div className="flex flex-col gap-2">
            <Button onClick={() => poll()}>Riprova verifica</Button>
            <Button variant="outline" asChild>
              <a href="mailto:support@trackmymoney.app">Contatta supporto</a>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-3">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="text-muted-foreground">Attivazione in corso…</p>
        <p className="text-xs text-muted-foreground">Tentativo {attempts}/{maxAttempts}</p>
      </div>
    </div>
  );
}

function AuthGate() {
  const { user, loading } = useAuth();
  const { status, recheck } = useAccessControl(user);
  const [searchParams, setSearchParams] = useSearchParams();
  const isCheckoutSuccess = searchParams.get("checkout") === "success";

  const handleActivated = useCallback(() => {
    setSearchParams({}, { replace: true });
    recheck();
  }, [setSearchParams, recheck]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Caricamento...</p>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  // Show polling UI after Stripe checkout before access check
  if (isCheckoutSuccess && status !== "granted") {
    return <CheckoutPolling user={user} onActivated={handleActivated} />;
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="space-y-4 w-64">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  if (status === "needs_subscription") {
    return <Abbonamento onAccessGranted={recheck} />;
  }

  return (
    <WorkspaceProvider userId={user.id}>
      <PrivacyProvider>
        <AccountProvider>
          <DateRangeProvider>
            <Routes>
              <Route element={<AppLayout />}>
                <Route path="/" element={<Dashboard />} />
              <Route path="/transazioni" element={<Transazioni />} />
                <Route path="/trasferimenti" element={<Trasferimenti />} />
                <Route path="/ricorrenti" element={<Ricorrenti />} />
                <Route path="/budget-categorie" element={<BudgetCategorie />} />
                <Route path="/obiettivi" element={<Obiettivi />} />
                <Route path="/report" element={<Report />} />
                <Route path="/impostazioni" element={<Impostazioni />} />
                <Route path="/account" element={<Account />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </DateRangeProvider>
        </AccountProvider>
      </PrivacyProvider>
    </WorkspaceProvider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <DevDiagnostics />
          <AuthGate />
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
