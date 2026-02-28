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
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b bg-card px-4">
            <SidebarTrigger />

            {showConnectButton && (
              <div className="relative group">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleConnectMicrosoft}
                  className="h-8 w-8"
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
                <span className="flex h-8 w-8 items-center justify-center opacity-50">
                  <MicrosoftIcon />
                </span>
                <div className="pointer-events-none absolute right-0 top-10 z-50 whitespace-nowrap rounded-md bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                  Microsoft Calendar connected
                </div>
              </div>
            )}
          </header>
          <main className="flex-1 overflow-auto p-4 md:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}