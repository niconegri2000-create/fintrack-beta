import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Copy, Plus, RefreshCw, Ban, Trash2, ShieldCheck } from "lucide-react";

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "TEST-";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function TesterManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newEmail, setNewEmail] = useState("");
  const [adding, setAdding] = useState(false);

  const { data: codes = [], isLoading } = useQuery({
    queryKey: ["admin-access-codes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("access_codes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-access-codes"] });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = newEmail.trim().toLowerCase();
    if (!email) return;
    setAdding(true);

    const code = generateCode();
    const { error } = await supabase.from("access_codes").insert({
      code,
      email_allowed: email,
      is_used: false,
    });

    if (error) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Codice creato", description: `Codice ${code} generato per ${email}` });
      setNewEmail("");
      invalidate();
    }
    setAdding(false);
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Copiato!", description: code });
  };

  const handleRevoke = async (id: string) => {
    const { error } = await supabase
      .from("access_codes")
      .update({ is_used: true })
      .eq("id", id);
    if (error) toast({ title: "Errore", variant: "destructive" });
    else {
      toast({ title: "Codice revocato" });
      invalidate();
    }
  };

  const handleRegenerate = async (id: string, email: string) => {
    const newCode = generateCode();
    const { error } = await supabase
      .from("access_codes")
      .update({ code: newCode, is_used: false, used_by: null, last_used_at: null })
      .eq("id", id);
    if (error) toast({ title: "Errore", variant: "destructive" });
    else {
      toast({ title: "Codice rigenerato", description: `Nuovo codice: ${newCode}` });
      invalidate();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("access_codes").delete().eq("id", id);
    if (error) toast({ title: "Errore", variant: "destructive" });
    else {
      toast({ title: "Codice eliminato" });
      invalidate();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" />
          Gestione Accesso Tester
        </CardTitle>
        <CardDescription>
          Crea e gestisci i codici di accesso per i tester. Ogni codice è vincolato a un'email specifica.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add new tester */}
        <form onSubmit={handleAdd} className="flex gap-2 items-end">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="tester-email">Email tester</Label>
            <Input
              id="tester-email"
              type="email"
              placeholder="tester@email.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={adding} size="sm" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            {adding ? "Creazione..." : "Genera codice"}
          </Button>
        </form>

        {/* Codes table */}
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Caricamento...</p>
        ) : codes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nessun codice creato.</p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Codice</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Creato</TableHead>
                  <TableHead>Ultimo uso</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {codes.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-sm">{c.email_allowed}</TableCell>
                    <TableCell className="font-mono text-sm">{c.code}</TableCell>
                    <TableCell>
                      <Badge variant={c.is_used ? "secondary" : "default"}>
                        {c.is_used ? (c.used_by ? "Usato" : "Revocato") : "Attivo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(c.created_at).toLocaleDateString("it-IT")}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.last_used_at
                        ? new Date(c.last_used_at).toLocaleDateString("it-IT")
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleCopy(c.code)}
                          title="Copia codice"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        {!c.is_used && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleRevoke(c.id)}
                            title="Revoca"
                          >
                            <Ban className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleRegenerate(c.id, c.email_allowed)}
                          title="Rigenera codice"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => handleDelete(c.id)}
                          title="Elimina"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
