import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { IndianRupee, FileText, Users, TrendingUp } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line } from 'recharts';

export default function SalesReport() {
  const [dateRange, setDateRange] = useState({
    from: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    to: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['sales-report-invoices', dateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_invoices')
        .select('*, customers(name)')
        .gte('invoice_date', dateRange.from)
        .lte('invoice_date', dateRange.to)
        .order('invoice_date', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: collections = [] } = useQuery({
    queryKey: ['sales-report-collections', dateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_payments')
        .select('*')
        .gte('payment_date', dateRange.from)
        .lte('payment_date', dateRange.to);
      if (error) throw error;
      return data;
    },
  });

  const totalSales = invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
  const totalCollections = collections.reduce((sum, col) => sum + (col.amount || 0), 0);
  const totalOutstanding = totalSales - totalCollections;
  const uniqueCustomers = new Set(invoices.map(inv => inv.customer_id)).size;

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

  // Group sales by date for chart
  const salesByDate = invoices.reduce((acc: Record<string, number>, inv) => {
    const date = inv.invoice_date;
    acc[date] = (acc[date] || 0) + (inv.total_amount || 0);
    return acc;
  }, {});

  const chartData = Object.entries(salesByDate).map(([date, amount]) => ({
    date: format(new Date(date), 'dd MMM'),
    amount,
  }));

  // Top customers
  const customerSales = invoices.reduce((acc: Record<string, { name: string; amount: number }>, inv) => {
    const customerId = inv.customer_id || 'unknown';
    if (!acc[customerId]) {
      acc[customerId] = { name: inv.customers?.name || 'Unknown', amount: 0 };
    }
    acc[customerId].amount += inv.total_amount || 0;
    return acc;
  }, {});

  const topCustomers = Object.values(customerSales)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const chartConfig = {
    amount: {
      label: 'Sales',
      color: 'hsl(var(--primary))',
    },
  };

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: 'Reports', href: '/reports/sales' },
        { label: 'Sales Report' },
      ]}
    >
      <div className="space-y-6">
        <div className="flex gap-4 items-end">
          <div className="space-y-2">
            <Label>From Date</Label>
            <Input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>To Date</Label>
            <Input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
              <IndianRupee className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalSales)}</div>
              <p className="text-xs text-muted-foreground">{invoices.length} invoices</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Collections</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(totalCollections)}</div>
              <p className="text-xs text-muted-foreground">{collections.length} receipts</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
              <FileText className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{formatCurrency(totalOutstanding)}</div>
              <p className="text-xs text-muted-foreground">Pending collection</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{uniqueCustomers}</div>
              <p className="text-xs text-muted-foreground">Unique buyers</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Daily Sales Trend</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line type="monotone" dataKey="amount" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No data for selected period
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Customers</CardTitle>
            </CardHeader>
            <CardContent>
              {topCustomers.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topCustomers} layout="vertical">
                      <XAxis type="number" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
                      <YAxis type="category" dataKey="name" fontSize={12} tickLine={false} axisLine={false} width={100} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="amount" fill="hsl(var(--primary))" radius={4} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No customer data
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Invoice List</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-3 text-left">Invoice No.</th>
                    <th className="p-3 text-left">Date</th>
                    <th className="p-3 text-left">Customer</th>
                    <th className="p-3 text-right">Amount</th>
                    <th className="p-3 text-right">Paid</th>
                    <th className="p-3 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground">No invoices found</td>
                    </tr>
                  ) : (
                    invoices.map((inv) => (
                      <tr key={inv.id} className="border-t hover:bg-muted/50">
                        <td className="p-3 font-medium">{inv.invoice_number}</td>
                        <td className="p-3">{format(new Date(inv.invoice_date), 'dd/MM/yyyy')}</td>
                        <td className="p-3">{inv.customers?.name || '-'}</td>
                        <td className="p-3 text-right">{formatCurrency(inv.total_amount || 0)}</td>
                        <td className="p-3 text-right text-green-600">{formatCurrency(inv.paid_amount || 0)}</td>
                        <td className="p-3 text-right text-orange-600">{formatCurrency((inv.total_amount || 0) - (inv.paid_amount || 0))}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot className="bg-muted font-medium">
                  <tr>
                    <td colSpan={3} className="p-3 text-right">Total:</td>
                    <td className="p-3 text-right">{formatCurrency(totalSales)}</td>
                    <td className="p-3 text-right text-green-600">{formatCurrency(invoices.reduce((s, i) => s + (i.paid_amount || 0), 0))}</td>
                    <td className="p-3 text-right text-orange-600">{formatCurrency(invoices.reduce((s, i) => s + ((i.total_amount || 0) - (i.paid_amount || 0)), 0))}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
