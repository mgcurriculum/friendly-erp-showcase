import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, ShoppingCart, Wallet, AlertTriangle, TrendingUp, Users } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

const salesData = [
  { name: 'Jan', sales: 4000 },
  { name: 'Feb', sales: 3000 },
  { name: 'Mar', sales: 5000 },
  { name: 'Apr', sales: 4500 },
  { name: 'May', sales: 6000 },
  { name: 'Jun', sales: 5500 },
];

const productionData = [
  { name: 'Mon', produced: 120, ordered: 100 },
  { name: 'Tue', produced: 150, ordered: 130 },
  { name: 'Wed', produced: 140, ordered: 145 },
  { name: 'Thu', produced: 160, ordered: 150 },
  { name: 'Fri', produced: 180, ordered: 170 },
  { name: 'Sat', produced: 90, ordered: 80 },
];

export default function Dashboard() {
  return (
    <DashboardLayout breadcrumbs={[{ label: 'Dashboard' }]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Welcome back!</h1>
          <p className="text-muted-foreground">Here's what's happening with your manufacturing operations today.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total Orders"
            value="156"
            description="from last month"
            icon={<ShoppingCart className="h-4 w-4" />}
            trend={{ value: 12, isPositive: true }}
          />
          <StatsCard
            title="Pending Deliveries"
            value="23"
            description="awaiting dispatch"
            icon={<Package className="h-4 w-4" />}
          />
          <StatsCard
            title="Collections Due"
            value="₹4,52,000"
            description="this week"
            icon={<Wallet className="h-4 w-4" />}
          />
          <StatsCard
            title="Low Stock Items"
            value="5"
            description="need reorder"
            icon={<AlertTriangle className="h-4 w-4" />}
            className="border-warning/50"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Sales Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Production vs Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={productionData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Line type="monotone" dataKey="produced" stroke="hsl(var(--primary))" strokeWidth={2} />
                  <Line type="monotone" dataKey="ordered" stroke="hsl(var(--accent))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader><CardTitle>Recent Orders</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>ORD-001 - ABC Traders - ₹25,000</p>
              <p>ORD-002 - XYZ Corp - ₹18,500</p>
              <p>ORD-003 - PQR Ltd - ₹42,000</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Pending Collections</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>INV-045 - Due Today - ₹15,000</p>
              <p>INV-042 - Overdue 2 days - ₹28,000</p>
              <p>INV-038 - Due Tomorrow - ₹12,500</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Low Stock Alerts</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>LDPE Natural - 50 Kg left</p>
              <p>HDPE Blue - 30 Kg left</p>
              <p>PP Clear - 45 Kg left</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
