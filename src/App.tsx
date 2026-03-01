import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import Tasks from "./pages/Tasks";
import CalendarPage from "./pages/CalendarPage";
import Notes from "./pages/Notes";
import Links from "./pages/Links";
import SettingsPage from "./pages/SettingsPage";
import Emails from "./pages/Emails";
import FilesPage from "./pages/FilesPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const [showFallbackBanner, setShowFallbackBanner] = useState(false);

  useEffect(() => {
    let mounted = true;

    fetch("/health")
      .then((response) => response.json())
      .then((data) => {
        if (!mounted) return;
        setShowFallbackBanner(data?.storageMode === "memory-fallback");
      })
      .catch(() => {
        if (!mounted) return;
        setShowFallbackBanner(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            {showFallbackBanner && (
              <div className="w-full bg-amber-500 px-4 py-2 text-center text-sm font-medium text-amber-950">
                Database unavailable: running in temporary memory mode.
              </div>
            )}
            <BrowserRouter
              future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true,
              }}
            >
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/projects" element={<Projects />} />
                  <Route path="/tasks" element={<Tasks />} />
                  <Route path="/calendar" element={<CalendarPage />} />
                  <Route path="/notes" element={<Notes />} />
                  <Route path="/links" element={<Links />} />
                  <Route path="/emails" element={<Emails />} />
                  <Route path="/files" element={<FilesPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
