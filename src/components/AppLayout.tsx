import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

function MicrosoftIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <rect x="1" y="1" width="10" height="10" fill="#F25022"/>
      <rect x="13" y="1" width="10" height="10" fill="#7FBA00"/>
      <rect x="1" y="13" width="10" height="10" fill="#00A4EF"/>
      <rect x="13" y="13" width="10" height="10" fill="#FFB900"/>
    </svg>
  );
}

export function AppLayout() {
  const { msProviderToken, user } = useAuth();

  const isMicrosoftUser = user?.app_metadata?.provider === "azure";
  const showConnectButton = !isMicrosoftUser && !msProviderToken;

  const handleConnectMicrosoft = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "azure",
      options: {
        redirectTo: window.location.origin + "/dashboard",
        scopes: "openid profile email offline_access Calendars.Read",
      },
    });
    if (error) toast.error(error.message);
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-transparent">
        <AppSidebar />
        <div className="relative flex-1 flex min-w-0 flex-col">
          <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border/70 bg-background/70 px-4 backdrop-blur-xl md:px-6">
            <SidebarTrigger className="h-9 w-9 rounded-xl border border-border/70 bg-card/80" />

            {showConnectButton && (
              <div className="relative group">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleConnectMicrosoft}
                  className="h-9 w-9 rounded-xl border border-border/70 bg-card/80"
                >
                  <MicrosoftIcon />
                </Button>
                <div className="pointer-events-none absolute right-0 top-10 z-50 whitespace-nowrap rounded-md bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                  Connect Microsoft
                </div>
              </div>
            )}

            {msProviderToken && (
              <div className="relative group">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-card/80 opacity-70">
                  <MicrosoftIcon />
                </span>
                <div className="pointer-events-none absolute right-0 top-10 z-50 whitespace-nowrap rounded-md bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                  Microsoft Calendar connected
                </div>
              </div>
            )}
          </header>
          <main className="relative flex-1 overflow-auto">
            <div className="pointer-events-none absolute left-0 top-0 -z-10 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
            <div className="pointer-events-none absolute bottom-0 right-10 -z-10 h-56 w-56 rounded-full bg-accent/10 blur-3xl" />
            <div className="mx-auto w-full max-w-7xl p-4 md:p-8">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}