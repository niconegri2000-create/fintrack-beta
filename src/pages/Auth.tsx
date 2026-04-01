import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Lock, Mail, RefreshCw, Eye, EyeOff } from "lucide-react";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showResendVerification, setShowResendVerification] = useState(false);
  const [resending, setResending] = useState(false);
  const { toast } = useToast();

  const handleResendVerification = async () => {
    if (!email) return;
    setResending(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: "Email inviata",
        description: "Controlla la tua casella di posta per il link di verifica.",
      });
    }
    setResending(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setShowResendVerification(false);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        // If user exists but email not confirmed, Supabase returns "Email not confirmed"
        if (error.message?.toLowerCase().includes("email not confirmed")) {
          setShowResendVerification(true);
          toast({
            title: "Email non verificata",
            description: "Devi verificare la tua email prima di accedere.",
            variant: "destructive",
          });
        } else {
          toast({ title: "Errore", description: error.message, variant: "destructive" });
        }
      }
    } else {
      const { data: signUpData, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) {
        toast({ title: "Errore", description: error.message, variant: "destructive" });
      } else if (
        signUpData?.user &&
        signUpData.user.identities &&
        signUpData.user.identities.length === 0
      ) {
        // Email already exists - check if confirmed
        if (signUpData.user.email_confirmed_at) {
          toast({
            title: "Email già registrata",
            description: "Questa email è già registrata. Accedi con la tua password.",
          });
        } else {
          setShowResendVerification(true);
          toast({
            title: "Email già registrata",
            description: "Questa email è già registrata ma non ancora verificata.",
          });
        }
      } else {
        toast({ title: "Registrazione completata", description: "Controlla la tua email per confermare l'account." });
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary text-primary-foreground mb-2">
            <Lock className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold">Contly</h1>
          <p className="text-sm text-muted-foreground">
            {isLogin ? "Accedi al tuo account" : "Crea un nuovo account"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="nome@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Caricamento..." : isLogin ? "Accedi" : "Registrati"}
          </Button>
        </form>

        {showResendVerification && (
          <div className="text-center space-y-2 p-3 rounded-lg border border-border bg-muted/50">
            <p className="text-sm text-muted-foreground">
              Non hai ricevuto l'email di verifica?
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResendVerification}
              disabled={resending}
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${resending ? "animate-spin" : ""}`} />
              {resending ? "Invio in corso..." : "Reinvia email di verifica"}
            </Button>
          </div>
        )}

        <p className="text-center text-sm text-muted-foreground">
          {isLogin ? "Non hai un account?" : "Hai già un account?"}{" "}
          <button
            type="button"
            onClick={() => { setIsLogin(!isLogin); setShowResendVerification(false); }}
            className="text-primary hover:underline font-medium"
          >
            {isLogin ? "Registrati" : "Accedi"}
          </button>
        </p>
      </div>
    </div>
  );
}
