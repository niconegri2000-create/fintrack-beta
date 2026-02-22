import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_WORKSPACE_ID } from "@/lib/constants";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Save } from "lucide-react";

export function OpeningBalanceSection() {
  const queryClient = useQueryClient();
  const [value, setValue] = useState("");

  const { data: workspace } = useQuery({
    queryKey: ["workspace", DEFAULT_WORKSPACE_ID],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspaces")
        .select("opening_balance")
        .eq("id", DEFAULT_WORKSPACE_ID)
        .single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (workspace) {
      setValue(String(workspace.opening_balance ?? 0));
    }
  }, [workspace]);

  const mutation = useMutation({
    mutationFn: async (amount: number) => {
      const { error } = await supabase
        .from("workspaces")
        .update({ opening_balance: amount } as any)
        .eq("id", DEFAULT_WORKSPACE_ID);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Saldo iniziale aggiornato" });
      queryClient.invalidateQueries({ queryKey: ["workspace"] });
      queryClient.invalidateQueries({ queryKey: ["forecast"] });
    },
    onError: () => {
      toast({ title: "Errore nel salvataggio", variant: "destructive" });
    },
  });

  const handleSave = () => {
    const num = parseFloat(value) || 0;
    if (num < 0) {
      toast({ title: "Il saldo iniziale non può essere negativo", variant: "destructive" });
      return;
    }
    mutation.mutate(num);
  };

  return (
    <div className="rounded-xl border bg-card p-6 space-y-3">
      <div>
        <p className="text-sm font-medium">Saldo iniziale</p>
        <p className="text-muted-foreground text-xs">
          Saldo di partenza del conto (non è una transazione).
        </p>
      </div>
      <div className="flex items-center gap-3 max-w-sm">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
          <Input
            type="number"
            min={0}
            step={0.01}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="pl-7"
          />
        </div>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={mutation.isPending}
        >
          <Save className="h-4 w-4 mr-1" />
          Salva
        </Button>
      </div>
    </div>
  );
}
