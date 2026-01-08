import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import KEILOperations from "./pages/KEILOperations";
import SMSContracts from "./pages/SMSContracts";
import Employees from "./pages/masters/Employees";
import Vehicles from "./pages/masters/Vehicles";
import RawMaterials from "./pages/masters/RawMaterials";
import FinishedGoods from "./pages/masters/FinishedGoods";
import Suppliers from "./pages/masters/Suppliers";
import Customers from "./pages/masters/Customers";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/auth" replace />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/masters/employees" element={<Employees />} />
            <Route path="/masters/vehicles" element={<Vehicles />} />
            <Route path="/masters/raw-materials" element={<RawMaterials />} />
            <Route path="/masters/finished-goods" element={<FinishedGoods />} />
            <Route path="/masters/suppliers" element={<Suppliers />} />
            <Route path="/masters/customers" element={<Customers />} />
            <Route path="/keil" element={<KEILOperations />} />
            <Route path="/sms" element={<SMSContracts />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
