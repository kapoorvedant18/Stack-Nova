import { LayoutDashboard, FolderKanban, CheckSquare, CalendarDays, StickyNote, Link2, Settings, LogOut, Zap, Moon, Sun, Mail, FileText } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Projects", url: "/projects", icon: FolderKanban },
  { title: "Tasks", url: "/tasks", icon: CheckSquare },
  { title: "Calendar", url: "/calendar", icon: CalendarDays },
  { title: "Emails", url: "/emails", icon: Mail },
  { title: "Files", url: "/files", icon: FileText },
  { title: "Notes", url: "/notes", icon: StickyNote },
  { title: "Links", url: "/links", icon: Link2 },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border/70">
      <SidebarContent>
        <SidebarGroup className="px-3 pt-3">
          <SidebarGroupLabel className="h-auto rounded-xl border border-sidebar-border/70 bg-sidebar/90 px-3 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Zap className="h-4 w-4" />
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="text-[11px] uppercase tracking-[0.18em] text-sidebar-foreground/70">Stack Nova</span>
                <span className="text-sm font-semibold text-sidebar-foreground">Workspace</span>
              </div>
            )}
          </SidebarGroupLabel>
          <SidebarGroupContent className="mt-3">
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/dashboard"}
                      className="rounded-xl border border-transparent px-2.5 py-2 transition-all duration-200 hover:border-sidebar-border hover:bg-sidebar-accent/70"
                      activeClassName="rounded-xl border-sidebar-border bg-sidebar-accent text-sidebar-accent-foreground shadow-sm font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="space-y-2 border-t border-sidebar-border/70 p-3">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start rounded-xl border border-transparent hover:border-sidebar-border hover:bg-sidebar-accent/70"
          onClick={toggleTheme}
        >
          {theme === "dark" ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
          {!collapsed && (theme === "dark" ? "Light mode" : "Dark mode")}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start rounded-xl border border-transparent text-destructive hover:border-destructive/25 hover:bg-destructive/10 hover:text-destructive"
          onClick={signOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          {!collapsed && "Sign out"}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
