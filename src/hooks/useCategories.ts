import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspaceId } from "@/contexts/WorkspaceContext";
import { invalidateAfterCategory } from "@/lib/queryKeys";

export interface Category {
  id: string;
  name: string;
  priority: string;
  is_fixed_default: boolean;
  is_active: boolean;
}

/** All categories (for settings page) */
export function useAllCategories() {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: ["categories", "all", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, priority, is_fixed_default, is_active")
        .eq("workspace_id", workspaceId)
        .order("name");
      if (error) throw error;
      return data as Category[];
    },
  });
}

/** Only active categories (for dropdowns) */
export function useCategories() {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: ["categories", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, priority, is_fixed_default, is_active")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as Category[];
    },
  });
}

export interface NewCategory {
  name: string;
  is_fixed_default: boolean;
  is_active: boolean;
}

export function useCreateCategory() {
  const workspaceId = useWorkspaceId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cat: NewCategory) => {
      const { error } = await supabase.from("categories").insert({
        workspace_id: workspaceId,
        name: cat.name,
        is_fixed_default: cat.is_fixed_default,
        is_active: cat.is_active,
      });
      if (error) { console.error("[useCreateCategory]", error); throw error; }
    },
    onSuccess: () => invalidateAfterCategory(qc, "category created"),
  });
}

export function useUpdateCategory() {
  const workspaceId = useWorkspaceId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Category> & { id: string }) => {
      const { error } = await supabase
        .from("categories")
        .update(updates)
        .eq("id", id)
        .eq("workspace_id", workspaceId);
      if (error) { console.error("[useUpdateCategory]", error); throw error; }
    },
    onSuccess: () => invalidateAfterCategory(qc, "category updated"),
  });
}

export function useDeleteCategory() {
  const workspaceId = useWorkspaceId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", id)
        .eq("workspace_id", workspaceId);
      if (error) throw error;
    },
    onSuccess: () => invalidateAfterCategory(qc, "category deleted"),
  });
}
