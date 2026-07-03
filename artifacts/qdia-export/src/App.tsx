import { Switch, Route, Router as WouterRouter } from "wouter";
import { ScrollToTop } from "@/components/ScrollToTop";
import { Toaster } from "@/components/ui/toaster";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import NotFound from "@/pages/not-found";

import Home from "@/pages/Home";
import Catalog from "@/pages/Catalog";
import ProductDetail from "@/pages/ProductDetail";
import Studio from "@/pages/Studio";
import Rfq from "@/pages/Rfq";
import Supplier from "@/pages/Supplier";
import Dashboard from "@/pages/Dashboard";
import Inquiries from "@/pages/Inquiries";
import Verification from "@/pages/Verification";
import AdminReview from "@/pages/AdminReview";
import AgentIA from "@/pages/AgentIA";
import Profile from "@/pages/Profile";
import Messages from "@/pages/Messages";
import Legal from "@/pages/Legal";
import MyRfqs from "@/pages/MyRfqs";
import Facturation from "@/pages/Facturation";
import Favorites from "@/pages/Favorites";
import Transactions from "@/pages/Transactions";
import SupplierPublic from "@/pages/SupplierPublic";
import ProductEdit from "@/pages/ProductEdit";
import Cart from "@/pages/Cart";
import Checkout from "@/pages/Checkout";
import Orders from "@/pages/Orders";
import TradeAssurance from "@/pages/TradeAssurance";
import Tracking from "@/pages/Tracking";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/products" component={Catalog} />
      <Route path="/products/:id" component={ProductDetail} />
      <Route path="/panier">
        <ProtectedRoute><Cart /></ProtectedRoute>
      </Route>
      <Route path="/checkout">
        <ProtectedRoute><Checkout /></ProtectedRoute>
      </Route>
      <Route path="/commandes">
        <ProtectedRoute><Orders /></ProtectedRoute>
      </Route>
      <Route path="/trade-assurance">
        <ProtectedRoute><TradeAssurance /></ProtectedRoute>
      </Route>
      <Route path="/suivi" component={Tracking} />
      <Route path="/rfq" component={Rfq} />
      <Route path="/mes-rfq">
        <ProtectedRoute><MyRfqs /></ProtectedRoute>
      </Route>
      <Route path="/favoris">
        <ProtectedRoute><Favorites /></ProtectedRoute>
      </Route>
      <Route path="/transactions">
        <ProtectedRoute roles={["supplier", "admin"]}><Transactions /></ProtectedRoute>
      </Route>
      <Route path="/suppliers/:id" component={SupplierPublic} />
      <Route path="/supplier/products/:id/edit">
        <ProtectedRoute roles={["supplier", "admin"]}><ProductEdit /></ProtectedRoute>
      </Route>
      <Route path="/facturation">
        <ProtectedRoute roles={["supplier", "admin"]}><Facturation /></ProtectedRoute>
      </Route>
      <Route path="/legal/:page?" component={Legal} />
      <Route path="/profile">
        <ProtectedRoute><Profile /></ProtectedRoute>
      </Route>
      <Route path="/messages">
        <ProtectedRoute><Messages /></ProtectedRoute>
      </Route>
      <Route path="/studio">
        <ProtectedRoute roles={["supplier", "admin"]}><Studio /></ProtectedRoute>
      </Route>
      <Route path="/supplier">
        <ProtectedRoute roles={["supplier", "admin"]}><Supplier /></ProtectedRoute>
      </Route>
      <Route path="/dashboard">
        <ProtectedRoute roles={["supplier", "admin"]}><Dashboard /></ProtectedRoute>
      </Route>
      <Route path="/agent-ia">
        <ProtectedRoute roles={["supplier", "admin"]}><AgentIA /></ProtectedRoute>
      </Route>
      <Route path="/inquiries">
        <ProtectedRoute roles={["supplier", "admin"]}><Inquiries /></ProtectedRoute>
      </Route>
      <Route path="/verification">
        <ProtectedRoute roles={["supplier", "admin"]}><Verification /></ProtectedRoute>
      </Route>
      <Route path="/admin">
        <ProtectedRoute roles={["admin"]}><AdminReview /></ProtectedRoute>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <ScrollToTop />
      <Router />
      <Toaster />
    </WouterRouter>
  );
}

export default App;
