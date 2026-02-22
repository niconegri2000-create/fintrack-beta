import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AppLayout } from "@/components/AppLayout";
import Dashboard from "./pages/Dashboard";
import Transazioni from "./pages/Transazioni";
import Ricorrenti from "./pages/Ricorrenti";
import Obiettivi from "./pages/Obiettivi";
import Report from "./pages/Report";
import Impostazioni from "./pages/Impostazioni";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
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
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
