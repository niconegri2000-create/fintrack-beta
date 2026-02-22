import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_WORKSPACE_ID } from "@/lib/constants";

export interface Category {
  id: string;
  name: string;
  priority: string;
  is_fixed_default: boolean;
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories", DEFAULT_WORKSPACE_ID],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, priority, is_fixed_default")
        .eq("workspace_id", DEFAULT_WORKSPACE_ID)
        .order("name");
      if (error) throw error;
      return data as Category[];
    },
  });
}
