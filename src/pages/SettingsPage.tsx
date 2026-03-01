import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Moon, LogOut } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const {
    user,
    signOut,
    connectGoogle,
    connectMicrosoft,
    isGoogleLinked,
    isMicrosoftLinked,
  } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const handleConnectGoogle = async () => {
    try {
      await connectGoogle();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to connect Google");
    }
  };

  const handleConnectMicrosoft = async () => {
    try {
      await connectMicrosoft();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to connect Microsoft");
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>

      <Card>
        <CardHeader><CardTitle className="text-lg">Account</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm"><span className="text-muted-foreground">Email:</span> {user?.email}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Appearance</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Moon className="h-4 w-4" />
              <Label>Dark mode</Label>
            </div>
            <Switch checked={theme === "dark"} onCheckedChange={toggleTheme} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Connected Accounts</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Google Workspace</p>
              <p className="text-xs text-muted-foreground">Gmail, Drive, Calendar sync</p>
            </div>
            <Button variant={isGoogleLinked ? "secondary" : "default"} onClick={handleConnectGoogle}>
              {isGoogleLinked ? "Connected" : "Connect Google"}
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Microsoft 365</p>
              <p className="text-xs text-muted-foreground">Outlook, OneDrive, Calendar sync</p>
            </div>
            <Button variant={isMicrosoftLinked ? "secondary" : "default"} onClick={handleConnectMicrosoft}>
              {isMicrosoftLinked ? "Connected" : "Connect Microsoft"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Danger Zone</CardTitle></CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
