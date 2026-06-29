import { Switch, Route, Router as WouterRouter } from "wouter";
import { setBaseUrl } from "@workspace/api-client-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Layout from "@/components/layout";
import Home from "@/pages/home";
import Onboarding from "@/pages/onboarding";
import Navigate from "@/pages/navigate";
import Report from "@/pages/report";
import SafeRooms from "@/pages/safe-rooms";
import Emergency from "@/pages/emergency";
import Assistant from "@/pages/assistant";
import Admin from "@/pages/admin";
import Profile from "@/pages/profile";
import Leaderboard from "@/pages/leaderboard";
import CameraScan from "@/pages/camera-scan";
import { useEffect } from "react";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } },
});
setBaseUrl("http://localhost:8080");

function applyTheme() {
  const theme = localStorage.getItem("pathable-theme") || "theme-standard";
  document.body.className = theme;
}

function Router() {
  useEffect(() => {
    applyTheme();
  }, []);

  return (
    <Switch>
      <Route path="/onboarding" component={Onboarding} />
      <Route>
        <Layout>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/navigate" component={Navigate} />
            <Route path="/report" component={Report} />
            <Route path="/safe-rooms" component={SafeRooms} />
            <Route path="/emergency" component={Emergency} />
            <Route path="/assistant" component={Assistant} />
            <Route path="/admin" component={Admin} />
            <Route path="/profile" component={Profile} />
            <Route path="/leaderboard" component={Leaderboard} />
            <Route path="/camera-scan" component={CameraScan} />
            <Route component={NotFound} />
          </Switch>
        </Layout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
