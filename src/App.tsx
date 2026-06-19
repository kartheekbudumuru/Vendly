import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Register from "@/pages/Register";
import Login from "@/pages/Login";
import ResetPassword from "@/pages/ResetPassword";
import Dashboard from "@/pages/Dashboard";
import Customers from "@/pages/Customers";
import Rewards from "@/pages/Rewards";
import QRScanner from "@/pages/QRScanner";
import CustomerLogin from "@/pages/CustomerLogin";
import CustomerRegister from "@/pages/CustomerRegister";
import CustomerPortal from "@/pages/CustomerPortal";
import CustomerStoreView from "@/pages/CustomerStoreView";
import VendorOffers from "@/pages/VendorOffers";
import VendorPrebookings from "@/pages/VendorPrebookings";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AuthProvider } from "@/hooks/use-auth";


const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/login" component={Login} />
      <Route path="/reset-password">
        <ProtectedRoute>
          <ResetPassword />
        </ProtectedRoute>
      </Route>
      <Route path="/customers">
        <ProtectedRoute>
          <Customers />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard">
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/rewards">
        <ProtectedRoute>
          <Rewards />
        </ProtectedRoute>
      </Route>
      <Route path="/qr-scanner">
        <ProtectedRoute>
          <QRScanner />
        </ProtectedRoute>
      </Route>
      <Route path="/customer/login" component={CustomerLogin} />
      <Route path="/customer/register" component={CustomerRegister} />
      <Route path="/customer/portal" component={CustomerPortal} />
      <Route path="/customer/store/:vendorId" component={CustomerStoreView} />
      <Route path="/offers">
        <ProtectedRoute>
          <VendorOffers />
        </ProtectedRoute>
      </Route>
      <Route path="/prebookings">
        <ProtectedRoute>
          <VendorPrebookings />
        </ProtectedRoute>
      </Route>
      <Route component={NotFound} />

    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
