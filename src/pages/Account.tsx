import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Shield, CreditCard, LogOut, Mail, Save, KeyRound } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { DEFAULT_WORKSPACE_ID } from "@/lib/constants";

export default function Account() {
  const { user, signOut } = useAuth();
  const { data: workspace } = useQuery({
    queryKey: ["workspace-name"],
    queryFn: async () => {
      const { data } = await supabase.from("workspaces").select("name").eq("id", DEFAULT_WORKSPACE_ID).maybeSingle();
      return data;
    },
  });
  const { toast } = useToast();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Account</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Gestisci il tuo profilo, sicurezza e abbonamento
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile" className="gap-1.5">
            <User className="h-3.5 w-3.5" />
            Profilo
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-1.5">
            <Shield className="h-3.5 w-3.5" />
            Sicurezza
          </TabsTrigger>
          <TabsTrigger value="subscription" className="gap-1.5">
            <CreditCard className="h-3.5 w-3.5" />
            Abbonamento
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileTab user={user} workspaceName={workspace?.name} />
        </TabsContent>

        <TabsContent value="security">
          <SecurityTab signOut={signOut} />
        </TabsContent>

        <TabsContent value="subscription">
          <SubscriptionTab userId={user?.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ---- Profile Tab ---- */

function ProfileTab({ user, workspaceName }: { user: any; workspaceName?: string }) {
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState(
    user?.user_metadata?.display_name || user?.user_metadata?.full_name || ""
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.auth.updateUser({
      data: { display_name: displayName },
    });
    if (error) {
      toast({ title: "Errore nel salvataggio", variant: "destructive" });
    } else {
      toast({ title: "Profilo aggiornato" });
    }
    setSaving(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profilo</CardTitle>
        <CardDescription>Le informazioni del tuo account</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label className="text-muted-foreground text-xs uppercase tracking-wide">Email</Label>
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span>{user?.email}</span>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <Label className="text-muted-foreground text-xs uppercase tracking-wide">Workspace</Label>
          <p className="text-sm font-medium">{workspaceName || "—"}</p>
        </div>

        <Separator />

        <div className="space-y-2">
          <Label htmlFor="display-name">Nome visualizzato</Label>
          <div className="flex gap-2">
            <Input
              id="display-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Il tuo nome"
              className="max-w-xs"
            />
            <Button onClick={handleSave} disabled={saving} size="sm" className="gap-1.5">
              <Save className="h-3.5 w-3.5" />
              {saving ? "Salvataggio..." : "Salva"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ---- Security Tab ---- */

function SecurityTab({ signOut }: { signOut: () => Promise<void> }) {
  const { toast } = useToast();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPw, setChangingPw] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const { user } = useAuth();

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast({ title: "La password deve avere almeno 6 caratteri", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Le password non corrispondono", variant: "destructive" });
      return;
    }
    setChangingPw(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast({ title: "Errore nel cambio password", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Password aggiornata" });
      setNewPassword("");
      setConfirmPassword("");
    }
    setChangingPw(false);
  };

  const handleSendReset = async () => {
    if (!user?.email) return;
    setSendingReset(true);
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast({ title: "Errore nell'invio", variant: "destructive" });
    } else {
      toast({ title: "Email inviata", description: "Controlla la tua casella di posta." });
    }
    setSendingReset(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-4 w-4" />
            Cambia password
          </CardTitle>
          <CardDescription>Aggiorna la password del tuo account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4 max-w-sm">
            <div className="space-y-2">
              <Label htmlFor="new-pw">Nuova password</Label>
              <Input id="new-pw" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-pw">Conferma password</Label>
              <Input id="confirm-pw" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} />
            </div>
            <Button type="submit" disabled={changingPw}>
              {changingPw ? "Aggiornamento..." : "Aggiorna password"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reset via email</CardTitle>
          <CardDescription>Ricevi un'email per reimpostare la password</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={handleSendReset} disabled={sendingReset}>
            {sendingReset ? "Invio in corso..." : "Invia email di reset"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Disconnetti</CardTitle>
          <CardDescription>Esci dal tuo account su questo dispositivo</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" className="gap-1.5" onClick={signOut}>
            <LogOut className="h-3.5 w-3.5" />
            Esci
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

/* ---- Subscription Tab ---- */

function SubscriptionTab({ userId }: { userId?: string }) {
  const { data: subscription, isLoading } = useQuery({
    queryKey: ["subscription", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", userId!)
        .maybeSingle();
      return data;
    },
  });

  const isInvite = (subscription as any)?.source === "invite_code";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Abbonamento</CardTitle>
        <CardDescription>Dettagli del tuo piano attuale</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Caricamento...</p>
        ) : subscription?.is_active ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Piano:</span>
              <Badge variant="secondary">FinTrack Premium</Badge>
            </div>
            {!isInvite && (
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">Prezzo:</span>
                <span className="text-sm">€3,99/mese</span>
              </div>
            )}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Stato:</span>
              <Badge variant="default">
                {isInvite ? "Attivo (Invite Access)" : "Attivo"}
              </Badge>
            </div>
            {subscription.expires_at && (
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">Scadenza:</span>
                <span className="text-sm text-muted-foreground">
                  {new Date(subscription.expires_at).toLocaleDateString("it-IT")}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground">Nessun abbonamento attivo.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
