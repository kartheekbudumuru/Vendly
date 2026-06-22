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
import ProductDetails from "@/pages/ProductDetails";
import Cart from "@/pages/Cart";
import Wishlist from "@/pages/Wishlist";
import Checkout from "@/pages/Checkout";
import CustomerPortal from "@/pages/CustomerPortal";
import VendorOffers from "@/pages/VendorOffers";
import VendorPrebookings from "@/pages/VendorPrebookings";
import AdminPanel from "@/pages/AdminPanel";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AuthProvider } from "@/hooks/use-auth";
import { CartProvider } from "@/hooks/use-cart";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/register" component={Register} />
      <Route path="/login" component={Login} />
      
      <Route path="/product/:productId" component={ProductDetails} />
      
      <Route path="/reset-password">
        <ProtectedRoute>
          <ResetPassword />
        </ProtectedRoute>
      </Route>
      
      <Route path="/cart">
        <ProtectedRoute>
          <Cart />
        </ProtectedRoute>
      </Route>
      
      <Route path="/wishlist">
        <ProtectedRoute>
          <Wishlist />
        </ProtectedRoute>
      </Route>
      
      <Route path="/checkout">
        <ProtectedRoute>
          <Checkout />
        </ProtectedRoute>
      </Route>
      
      <Route path="/customer/portal">
        <ProtectedRoute>
          <CustomerPortal />
        </ProtectedRoute>
      </Route>
      
      <Route path="/dashboard">
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Route>
      
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
      
      <Route path="/admin">
        <ProtectedRoute>
          <AdminPanel />
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
        <CartProvider>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
