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
import SalesInvoices from "./pages/sales/SalesInvoices";
import CustomerOrders from "./pages/sales/CustomerOrders";
import Deliveries from "./pages/sales/Deliveries";
import ProductionEntry from "./pages/production/ProductionEntry";
import MaterialConsumption from "./pages/production/MaterialConsumption";
import Wastage from "./pages/production/Wastage";
import PurchaseOrders from "./pages/inventory/PurchaseOrders";
import Purchases from "./pages/inventory/Purchases";
import StockReport from "./pages/inventory/StockReport";
import Collections from "./pages/finance/Collections";
import Payments from "./pages/finance/Payments";
import PettyCash from "./pages/finance/PettyCash";
import Attendance from "./pages/hr/Attendance";
import SalesReport from "./pages/reports/SalesReport";
import StockReportPage from "./pages/reports/StockReport";
import CollectionReport from "./pages/reports/CollectionReport";
import SystemSettings from "./pages/settings/SystemSettings";
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
            {/* Masters */}
            <Route path="/masters/employees" element={<Employees />} />
            <Route path="/masters/vehicles" element={<Vehicles />} />
            <Route path="/masters/raw-materials" element={<RawMaterials />} />
            <Route path="/masters/finished-goods" element={<FinishedGoods />} />
            <Route path="/masters/suppliers" element={<Suppliers />} />
            <Route path="/masters/customers" element={<Customers />} />
            {/* Production */}
            <Route path="/production/entry" element={<ProductionEntry />} />
            <Route path="/production/consumption" element={<MaterialConsumption />} />
            <Route path="/production/wastage" element={<Wastage />} />
            {/* Inventory */}
            <Route path="/inventory/purchase-orders" element={<PurchaseOrders />} />
            <Route path="/inventory/purchases" element={<Purchases />} />
            <Route path="/inventory/stock" element={<StockReport />} />
            {/* Sales */}
            <Route path="/sales/orders" element={<CustomerOrders />} />
            <Route path="/sales/invoices" element={<SalesInvoices />} />
            <Route path="/sales/deliveries" element={<Deliveries />} />
            {/* Finance */}
            <Route path="/finance/collections" element={<Collections />} />
            <Route path="/finance/payments" element={<Payments />} />
            <Route path="/finance/petty-cash" element={<PettyCash />} />
            {/* HR */}
            <Route path="/hr/attendance" element={<Attendance />} />
            {/* Reports */}
            <Route path="/reports/sales" element={<SalesReport />} />
            <Route path="/reports/stock" element={<StockReportPage />} />
            <Route path="/reports/collection" element={<CollectionReport />} />
            {/* Settings */}
            <Route path="/settings/system" element={<SystemSettings />} />
            {/* External */}
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
