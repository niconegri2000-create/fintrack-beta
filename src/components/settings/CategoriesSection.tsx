import { useRef, useState, useEffect, useCallback } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAllCategories, useUpdateCategory, useDeleteCategory } from "@/hooks/useCategories";
import { CategoryFormDialog } from "./CategoryFormDialog";
import { CategoryEditDialog } from "./CategoryEditDialog";
import { toast } from "sonner";

const priorityLabel: Record<string, string> = {
  none: "Nessuna priorità",
  mandatory: "Obbligatoria",
  reducible: "Riducibile",
  eliminable: "Eliminabile",
};

export function CategoriesSection() {
  const { data: categories = [], isLoading } = useAllCategories();
  const toggleActive = useUpdateCategory();
  const deleteCat = useDeleteCategory();

  const handleToggle = (id: string, current: boolean) => {
    toggleActive.mutate({ id, is_active: !current }, {
      onError: () => toast.error("Errore nell'aggiornamento"),
    });
  };

  const handleDelete = (id: string) => {
    deleteCat.mutate(id, {
      onSuccess: () => toast.success("Categoria eliminata"),
      onError: () => toast.error("Errore nell'eliminazione"),
    });
  };

  return (
    <div className="rounded-xl border bg-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Categorie</p>
          <p className="text-muted-foreground text-xs">Gestisci le categorie del workspace</p>
        </div>
        <CategoryFormDialog />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground text-center py-4">Caricamento…</p>
      ) : categories.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">Nessuna categoria</p>
      ) : (
        <SyncedScrollTable categories={categories} onToggle={handleToggle} onDelete={handleDelete} />
      )}
    </div>
  );
}

function SyncedScrollTable({ categories, onToggle, onDelete }: {
  categories: any[];
  onToggle: (id: string, current: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const topRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isSyncing = useRef(false);
  const [spacerWidth, setSpacerWidth] = useState(0);
  const [hasOverflow, setHasOverflow] = useState(false);

  const measure = useCallback(() => {
    if (bottomRef.current) {
      setSpacerWidth(bottomRef.current.scrollWidth);
      setHasOverflow(bottomRef.current.scrollWidth > bottomRef.current.clientWidth);
    }
  }, []);

  useEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (bottomRef.current) ro.observe(bottomRef.current);
    return () => ro.disconnect();
  }, [measure, categories.length]);

  const handleTopScroll = () => {
    if (isSyncing.current) { isSyncing.current = false; return; }
    if (topRef.current && bottomRef.current) {
      isSyncing.current = true;
      bottomRef.current.scrollLeft = topRef.current.scrollLeft;
    }
  };
  const handleBottomScroll = () => {
    if (isSyncing.current) { isSyncing.current = false; return; }
    if (topRef.current && bottomRef.current) {
      isSyncing.current = true;
      topRef.current.scrollLeft = bottomRef.current.scrollLeft;
    }
  };

  return (
    <div className="rounded-lg border">
      {/* Top scrollbar — outside overflow-hidden so it's never clipped */}
      {hasOverflow && (
        <div ref={topRef} onScroll={handleTopScroll} className="overflow-x-auto overflow-y-hidden block pointer-events-auto mb-2" style={{ height: 14 }}>
          <div style={{ width: spacerWidth, height: 1 }} />
        </div>
      )}

      {/* Table with bottom scrollbar — overflow-hidden here for rounded corners */}
      <div ref={bottomRef} onScroll={handleBottomScroll} className="overflow-x-auto overflow-hidden rounded-b-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Priorità</TableHead>
              
              <TableHead className="text-center w-[80px]">Attiva</TableHead>
              <TableHead className="text-right w-[120px]">Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-[11px]">
                    {priorityLabel[c.priority] ?? c.priority}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <span className={`inline-block h-2 w-2 rounded-full ${c.is_active ? "bg-success" : "bg-muted-foreground"}`} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <CategoryEditDialog category={c} />
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onToggle(c.id, c.is_active)}>
                      <span className="text-xs">{c.is_active ? "Off" : "On"}</span>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Eliminare "{c.name}"?</AlertDialogTitle>
                          <AlertDialogDescription>Questa azione è irreversibile.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annulla</AlertDialogCancel>
                          <AlertDialogAction onClick={() => onDelete(c.id)}>Elimina</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
