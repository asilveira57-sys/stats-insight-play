import { useLocation } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import {
  LayoutDashboard,
  Settings,
  Newspaper,
  PenTool,
  Database,
  Link2,
  Users as UsersIcon,
  FileText,
  Trophy,
  Crown,
  Zap,
  BarChart3,
  Shield,
  AlertTriangle,
  GitMerge,
  BookOpen,
  HardDrive,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import statballLogo from "@/assets/statball-logo.png";

const menuGroups = [
  {
    label: "Visão Geral",
    items: [
      { title: "Dashboard", url: "/admin", icon: LayoutDashboard, end: true },
      { title: "Control Center", url: "/admin/control-center", icon: Settings },
    ],
  },
  {
    label: "Conteúdo",
    items: [
      { title: "Editorial", url: "/admin/editorial", icon: PenTool },
    ],
  },
  {
    label: "Dados & Sync",
    items: [
      { title: "Qualidade de Dados", url: "/admin/qualidade-dados", icon: AlertTriangle },
      { title: "Slugs", url: "/admin/slugs", icon: Link2 },
      { title: "Times / Aliases", url: "/admin/times", icon: GitMerge },
      { title: "CSV Import", url: "/admin/csv-import", icon: FileText },
      { title: "Cartola FC", url: "/admin/cartola", icon: Trophy },
      { title: "Fontes Históricas", url: "/admin/fontes-historicas", icon: BookOpen },
    ],
  },
  {
    label: "Usuários & Monetização",
    items: [
      { title: "Usuários", url: "/admin/usuarios", icon: UsersIcon },
      { title: "Planos", url: "/admin/planos", icon: Crown },
      { title: "Gamificação", url: "/admin/gamificacao", icon: Trophy },
      { title: "Webhooks MP", url: "/admin/webhooks", icon: Zap },
    ],
  },
  {
    label: "Configurações",
    items: [
      { title: "Analytics", url: "/admin/integracoes/analytics", icon: BarChart3 },
      { title: "LGPD / Privacidade", url: "/admin/privacidade/lgpd", icon: Shield },
    ],
  },
];

export function AdminSidebar() {
  const location = useLocation();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const isActive = (url: string, end?: boolean) => {
    if (end) return location.pathname === url;
    return location.pathname.startsWith(url);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-1">
          <img src={statballLogo} alt="Statball" className="h-6 w-6 rounded" />
          {!collapsed && (
            <span className="font-display text-sm font-bold tracking-wide text-sidebar-foreground">
              ADMIN
            </span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {menuGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.url, item.end)}
                      tooltip={item.title}
                    >
                      <NavLink
                        to={item.url}
                        end={item.end}
                        className="hover:bg-sidebar-accent/50"
                        activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
