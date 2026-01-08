import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Package, ShoppingCart, Users, Factory, Truck } from 'lucide-react';
import { format, subDays, subMonths, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';

export default function Scorecard() {
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  // Fetch sales data
  const { data: salesData = [] } = useQuery({
    queryKey: ['scorecard-sales', dateFrom, dateTo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_invoices')
        .select('invoice_date, total_amount, paid_amount')
        .gte('invoice_date', dateFrom)
        .lte('invoice_date', dateTo);
      if (error) throw error;
      return data;
    },
  });

  // Fetch collection data
  const { data: collectionsData = [] } = useQuery({
    queryKey: ['scorecard-collections', dateFrom, dateTo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_payments')
        .select('payment_date, amount')
        .gte('payment_date', dateFrom)
        .lte('payment_date', dateTo);
      if (error) throw error;
      return data;
    },
  });

  // Fetch production data
  const { data: productionData = [] } = useQuery({
    queryKey: ['scorecard-production', dateFrom, dateTo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('production_batches')
        .select('production_date, quantity_produced, status')
        .gte('production_date', dateFrom)
        .lte('production_date', dateTo);
      if (error) throw error;
      return data;
    },
  });

  // Fetch purchase data
  const { data: purchaseData = [] } = useQuery({
    queryKey: ['scorecard-purchases', dateFrom, dateTo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchases')
        .select('purchase_date, total_amount')
        .gte('purchase_date', dateFrom)
        .lte('purchase_date', dateTo);
      if (error) throw error;
      return data;
    },
  });

  // Calculate metrics
  const totalSales = salesData.reduce((sum, s) => sum + (s.total_amount || 0), 0);
  const totalCollections = collectionsData.reduce((sum, c) => sum + (c.amount || 0), 0);
  const totalProduction = productionData.reduce((sum, p) => sum + (p.quantity_produced || 0), 0);
  const totalPurchases = purchaseData.reduce((sum, p) => sum + (p.total_amount || 0), 0);
  const collectionRate = totalSales > 0 ? (totalCollections / totalSales) * 100 : 0;
  const outstanding = totalSales - totalCollections;

  // Generate trend data
  const days = eachDayOfInterval({ start: new Date(dateFrom), end: new Date(dateTo) });
  const trendData = days.map((day) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const daySales = salesData
      .filter((s) => s.invoice_date === dateStr)
      .reduce((sum, s) => sum + (s.total_amount || 0), 0);
    const dayCollections = collectionsData
      .filter((c) => c.payment_date === dateStr)
      .reduce((sum, c) => sum + (c.amount || 0), 0);
    return {
      date: format(day, 'dd/MM'),
      sales: daySales,
      collections: dayCollections,
    };
  });

  const handlePeriodChange = (value: string) => {
    setPeriod(value as 'daily' | 'weekly' | 'monthly');
    const today = new Date();
    if (value === 'daily') {
      setDateFrom(format(subDays(today, 7), 'yyyy-MM-dd'));
      setDateTo(format(today, 'yyyy-MM-dd'));
    } else if (value === 'weekly') {
      setDateFrom(format(subDays(today, 30), 'yyyy-MM-dd'));
      setDateTo(format(today, 'yyyy-MM-dd'));
    } else {
      setDateFrom(format(startOfMonth(today), 'yyyy-MM-dd'));
      setDateTo(format(endOfMonth(today), 'yyyy-MM-dd'));
    }
  };

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: 'Reports', href: '/reports/sales' },
        { label: 'Scorecard' },
      ]}
    >
      <div className="space-y-6">
        {/* Period Selection */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="space-y-2">
                <Label>Period</Label>
                <Select value={period} onValueChange={handlePeriodChange}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>From Date</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>To Date</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
              <Button variant="outline" onClick={() => {
                setDateFrom(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
                setDateTo(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
                setPeriod('monthly');
              }}>
                This Month
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{totalSales.toLocaleString('en-IN')}</div>
              <p className="text-xs text-muted-foreground flex items-center mt-1">
                <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                {salesData.length} invoices
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Collections</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{totalCollections.toLocaleString('en-IN')}</div>
              <div className="mt-2">
                <Progress value={collectionRate} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">{collectionRate.toFixed(1)}% of sales</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">₹{outstanding.toLocaleString('en-IN')}</div>
              <p className="text-xs text-muted-foreground flex items-center mt-1">
                {outstanding > 0 ? (
                  <>
                    <TrendingDown className="h-3 w-3 mr-1 text-amber-500" />
                    Pending collection
                  </>
                ) : (
                  <>
                    <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                    Fully collected
                  </>
                )}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Production</CardTitle>
              <Factory className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalProduction.toLocaleString('en-IN')}</div>
              <p className="text-xs text-muted-foreground flex items-center mt-1">
                <Package className="h-3 w-3 mr-1" />
                {productionData.length} batches
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Secondary KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Purchases</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{totalPurchases.toLocaleString('en-IN')}</div>
              <p className="text-xs text-muted-foreground mt-1">{purchaseData.length} purchase orders</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Gross Margin</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ₹{(totalSales - totalPurchases).toLocaleString('en-IN')}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {totalSales > 0 ? (((totalSales - totalPurchases) / totalSales) * 100).toFixed(1) : 0}% margin
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Completed Batches</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {productionData.filter((p) => p.status === 'completed').length}
              </div>
              <div className="mt-2">
                <Progress 
                  value={productionData.length > 0 
                    ? (productionData.filter((p) => p.status === 'completed').length / productionData.length) * 100 
                    : 0
                  } 
                  className="h-2" 
                />
                <p className="text-xs text-muted-foreground mt-1">of {productionData.length} total</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Sales vs Collections Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip 
                    formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, '']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="sales" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    name="Sales"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="collections" 
                    stroke="hsl(var(--secondary))" 
                    strokeWidth={2}
                    name="Collections"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
