import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { PrivacyProvider } from "@/contexts/PrivacyContext";
import { DateRangeProvider } from "@/contexts/DateRangeContext";
import { AccountProvider } from "@/contexts/AccountContext";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { useAccessControl } from "@/hooks/useAccessControl";
import Dashboard from "./pages/Dashboard";
import Transazioni from "./pages/Transazioni";
import Ricorrenti from "./pages/Ricorrenti";
import Obiettivi from "./pages/Obiettivi";
import Report from "./pages/Report";
import Impostazioni from "./pages/Impostazioni";
import Auth from "./pages/Auth";
import Abbonamento from "./pages/Abbonamento";
import NotFound from "./pages/NotFound";
import { DevDiagnostics } from "@/components/DevDiagnostics";
import { Skeleton } from "@/components/ui/skeleton";

const queryClient = new QueryClient();

function AuthGate() {
  const { user, loading } = useAuth();
  const { status, recheck } = useAccessControl(user);

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
    <PrivacyProvider>
      <AccountProvider>
        <DateRangeProvider>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/transazioni" element={<Transazioni />} />
              <Route path="/ricorrenti" element={<Ricorrenti />} />
              <Route path="/obiettivi" element={<Obiettivi />} />
              <Route path="/report" element={<Report />} />
              <Route path="/impostazioni" element={<Impostazioni />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </DateRangeProvider>
      </AccountProvider>
    </PrivacyProvider>
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
