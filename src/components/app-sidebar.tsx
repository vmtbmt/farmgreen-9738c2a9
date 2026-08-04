import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Sprout, Leaf, LogOut, Sparkles, CloudSun } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";

const items = [
  { title: "Tổng quan", url: "/", icon: LayoutDashboard, match: ["/"] },
  { title: "Khu vườn", url: "/gardens", icon: Sprout, match: ["/gardens", "/garden", "/logs"] },
  { title: "Thời tiết", url: "/weather", icon: CloudSun, match: ["/weather"] },
  { title: "AI", url: "/assistant", icon: Sparkles, match: ["/assistant", "/diagnose", "/reports"] },
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (item: (typeof items)[number]) =>
    item.url === "/"
      ? pathname === "/"
      : item.match.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  const navigate = useNavigate();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setEmail(s?.user?.email ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success("Đã đăng xuất");
    navigate({ to: "/auth" });
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary">
            <Leaf className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold text-sidebar-foreground">Nông Trại Xanh</span>
            <span className="text-xs text-sidebar-foreground/70">Trợ lý AI nông nghiệp</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Điều hướng</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item)} tooltip={item.title}>
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      {email && (
        <SidebarFooter>
          <div className="px-2 pb-1 text-xs text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden truncate">
            {email}
          </div>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={signOut} tooltip="Đăng xuất">
                <LogOut />
                <span>Đăng xuất</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
