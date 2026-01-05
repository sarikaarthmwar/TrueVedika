import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/authContext";
import NotFound from "@/pages/not-found";

import AuthPage from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import Explore from "@/pages/Explore";
import InitiativeDetail from "@/pages/InitiativeDetail";
import Admin from "@/pages/Admin";
import Landing from "@/pages/Landing";

function Router() {
  const { user } = useAuth();

  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/">
        {() => user ? <Dashboard /> : <Landing />}
      </Route>
      <Route path="/explore" component={Explore} />
      <Route path="/initiative/:id" component={InitiativeDetail} />
      <Route path="/admin" component={Admin} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
