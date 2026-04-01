import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ArrowLeftRight,
  ArrowRightLeft,
  RefreshCw,
  Layers,
  Target,
  FileBarChart,
  Settings,
  UserCircle,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Transazioni", url: "/transazioni", icon: ArrowLeftRight },
  { title: "Trasferimenti", url: "/trasferimenti", icon: ArrowRightLeft },
  { title: "Ricorrenze", url: "/ricorrenti", icon: RefreshCw },
  { title: "Budget & Categorie", url: "/budget-categorie", icon: Layers },
  { title: "Obiettivi", url: "/obiettivi", icon: Target },
  { title: "Confronto", url: "/report", icon: FileBarChart },
  { title: "Impostazioni", url: "/impostazioni", icon: Settings },
  { title: "Account", url: "/account", icon: UserCircle },
];

export function AppSidebar() {
  const { isMobile, setOpenMobile } = useSidebar();
  const location = useLocation();
  const { user } = useAuth();

  const displayLabel = user?.user_metadata?.display_name || user?.email || "";

  useEffect(() => {
    if (isMobile) setOpenMobile(false);
  }, [location.pathname, isMobile, setOpenMobile]);

  return (
    <Sidebar className="border-r-0">
      <SidebarHeader className="px-5 py-6">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <span className="text-sidebar-primary-foreground font-bold text-sm">₿</span>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-sidebar-accent-foreground">Contly</h2>
            <p className="text-xs text-sidebar-muted truncate max-w-[140px]">Personale — {displayLabel}</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-muted text-[11px] uppercase tracking-wider mb-1">
            Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
