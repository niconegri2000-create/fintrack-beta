import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_WORKSPACE_ID } from "@/lib/constants";

export interface Category {
  id: string;
  name: string;
  priority: string;
  is_fixed_default: boolean;
  is_active: boolean;
}

/** All categories (for settings page) */
export function useAllCategories() {
  return useQuery({
    queryKey: ["categories", "all", DEFAULT_WORKSPACE_ID],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, priority, is_fixed_default, is_active")
        .eq("workspace_id", DEFAULT_WORKSPACE_ID)
        .order("name");
      if (error) throw error;
      return data as Category[];
    },
  });
}

/** Only active categories (for dropdowns) */
export function useCategories() {
  return useQuery({
    queryKey: ["categories", DEFAULT_WORKSPACE_ID],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, priority, is_fixed_default, is_active")
        .eq("workspace_id", DEFAULT_WORKSPACE_ID)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as Category[];
    },
  });
}

export interface NewCategory {
  name: string;
  priority: string;
  is_fixed_default: boolean;
  is_active: boolean;
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cat: NewCategory) => {
      const { error } = await supabase.from("categories").insert({
        workspace_id: DEFAULT_WORKSPACE_ID,
        name: cat.name,
        priority: cat.priority,
        is_fixed_default: cat.is_fixed_default,
        is_active: cat.is_active,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Category> & { id: string }) => {
      const { error } = await supabase.from("categories").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
}
