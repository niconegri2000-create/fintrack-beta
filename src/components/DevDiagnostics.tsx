import { useLocation } from "react-router-dom";

/**
 * Dev-only banner showing current Supabase project + route.
 * Only renders when import.meta.env.DEV is true.
 */
export function DevDiagnostics() {
  const location = useLocation();

  if (!import.meta.env.DEV) return null;

  const url = import.meta.env.VITE_SUPABASE_URL ?? "NOT SET";
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "NOT SET";

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] bg-black/80 text-[10px] text-green-400 font-mono px-3 py-1 flex gap-4 pointer-events-none">
      <span>project: {projectId}</span>
      <span>url: {url}</span>
      <span>route: {location.pathname}</span>
    </div>
  );
}
