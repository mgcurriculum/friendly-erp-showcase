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
import RouteManagement from "./pages/keil/RouteManagement";
import HCEDetails from "./pages/keil/HCEDetails";
import DailyCollection from "./pages/keil/DailyCollection";
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
import CuttingSealing from "./pages/production/CuttingSealing";
import Packing from "./pages/production/Packing";
import MaterialConsumption from "./pages/production/MaterialConsumption";
import Wastage from "./pages/production/Wastage";
import PurchaseOrders from "./pages/inventory/PurchaseOrders";
import Purchases from "./pages/inventory/Purchases";
import PurchaseReturns from "./pages/inventory/PurchaseReturns";
import StockReport from "./pages/inventory/StockReport";
import FuelConsumption from "./pages/inventory/FuelConsumption";
import Collections from "./pages/finance/Collections";
import Payments from "./pages/finance/Payments";
import PettyCash from "./pages/finance/PettyCash";
import Attendance from "./pages/hr/Attendance";
import MarketingVisits from "./pages/hr/MarketingVisits";
import SalesReport from "./pages/reports/SalesReport";
import PurchaseReport from "./pages/reports/PurchaseReport";
import ProductionReport from "./pages/reports/ProductionReport";
import AttendanceReport from "./pages/reports/AttendanceReport";
import Scorecard from "./pages/reports/Scorecard";
import StockReportPage from "./pages/reports/StockReport";
import CollectionReport from "./pages/reports/CollectionReport";
import KEILCollectionReport from "./pages/reports/KEILCollectionReport";
import SystemSettings from "./pages/settings/SystemSettings";
import UserManagement from "./pages/settings/UserManagement";
import SalesReturns from "./pages/sales/SalesReturns";
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
            <Route path="/production/cutting-sealing" element={<CuttingSealing />} />
            <Route path="/production/packing" element={<Packing />} />
            <Route path="/production/consumption" element={<MaterialConsumption />} />
            <Route path="/production/wastage" element={<Wastage />} />
            {/* Inventory */}
            <Route path="/inventory/purchase-orders" element={<PurchaseOrders />} />
            <Route path="/inventory/purchases" element={<Purchases />} />
            <Route path="/inventory/purchase-returns" element={<PurchaseReturns />} />
            <Route path="/inventory/stock" element={<StockReport />} />
            <Route path="/inventory/fuel" element={<FuelConsumption />} />
            {/* Sales */}
            <Route path="/sales/orders" element={<CustomerOrders />} />
            <Route path="/sales/invoices" element={<SalesInvoices />} />
            <Route path="/sales/deliveries" element={<Deliveries />} />
            <Route path="/sales/returns" element={<SalesReturns />} />
            {/* Finance */}
            <Route path="/finance/collections" element={<Collections />} />
            <Route path="/finance/payments" element={<Payments />} />
            <Route path="/finance/petty-cash" element={<PettyCash />} />
            {/* HR */}
            <Route path="/hr/attendance" element={<Attendance />} />
            <Route path="/hr/marketing-visits" element={<MarketingVisits />} />
            {/* Reports */}
            <Route path="/reports/sales" element={<SalesReport />} />
            <Route path="/reports/purchase" element={<PurchaseReport />} />
            <Route path="/reports/production" element={<ProductionReport />} />
            <Route path="/reports/attendance" element={<AttendanceReport />} />
            <Route path="/reports/scorecard" element={<Scorecard />} />
            <Route path="/reports/stock" element={<StockReportPage />} />
            <Route path="/reports/collection" element={<CollectionReport />} />
            <Route path="/reports/keil-collection" element={<KEILCollectionReport />} />
            {/* Settings */}
            <Route path="/settings/system" element={<SystemSettings />} />
            <Route path="/settings/users" element={<UserManagement />} />
            {/* KEIL Operations */}
            <Route path="/keil" element={<KEILOperations />} />
            <Route path="/keil/routes" element={<RouteManagement />} />
            <Route path="/keil/hce" element={<HCEDetails />} />
            <Route path="/keil/collection" element={<DailyCollection />} />
            {/* External */}
            <Route path="/sms" element={<SMSContracts />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
