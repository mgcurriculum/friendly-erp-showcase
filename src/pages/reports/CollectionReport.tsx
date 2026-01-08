import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { IndianRupee, Clock, AlertTriangle, Users } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

export default function CollectionReport() {
  const [asOfDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { data: customers = [] } = useQuery({
    queryKey: ['customers-outstanding'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['outstanding-invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_invoices')
        .select('*, customers(name, code, credit_period)')
        .neq('status', 'paid')
        .order('invoice_date', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

  // Calculate aging buckets
  const today = new Date();
  const agingBuckets = {
    current: 0, // 0-30 days
    days30_60: 0, // 31-60 days
    days60_90: 0, // 61-90 days
    over90: 0, // 90+ days
  };

  const invoicesWithAging = invoices.map((inv) => {
    const outstanding = (inv.total_amount || 0) - (inv.paid_amount || 0);
    const daysOld = differenceInDays(today, new Date(inv.invoice_date));
    
    if (daysOld <= 30) agingBuckets.current += outstanding;
    else if (daysOld <= 60) agingBuckets.days30_60 += outstanding;
    else if (daysOld <= 90) agingBuckets.days60_90 += outstanding;
    else agingBuckets.over90 += outstanding;

    return { ...inv, outstanding, daysOld };
  });

  const totalOutstanding = invoicesWithAging.reduce((sum, inv) => sum + inv.outstanding, 0);

  // Customer-wise outstanding
  const customerOutstanding = customers
    .map((cust) => {
      const custInvoices = invoicesWithAging.filter((inv) => inv.customer_id === cust.id);
      const outstanding = custInvoices.reduce((sum, inv) => sum + inv.outstanding, 0);
      const oldestDays = Math.max(...custInvoices.map((inv) => inv.daysOld), 0);
      return { ...cust, outstanding, oldestDays, invoiceCount: custInvoices.length };
    })
    .filter((c) => c.outstanding > 0)
    .sort((a, b) => b.outstanding - a.outstanding);

  const overdueInvoices = invoicesWithAging.filter((inv) => {
    const creditPeriod = inv.customers?.credit_period || 30;
    return inv.daysOld > creditPeriod && inv.outstanding > 0;
  });

  const getAgingBadge = (days: number) => {
    if (days <= 30) return <Badge variant="secondary">Current</Badge>;
    if (days <= 60) return <Badge variant="outline" className="text-yellow-600 border-yellow-300">31-60 Days</Badge>;
    if (days <= 90) return <Badge variant="outline" className="text-orange-600 border-orange-300">61-90 Days</Badge>;
    return <Badge variant="destructive">90+ Days</Badge>;
  };

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: 'Reports', href: '/reports/collection' },
        { label: 'Collection Report' },
      ]}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
              <IndianRupee className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalOutstanding)}</div>
              <p className="text-xs text-muted-foreground">{invoicesWithAging.filter(i => i.outstanding > 0).length} invoices</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Current (0-30)</CardTitle>
              <Clock className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(agingBuckets.current)}</div>
              <p className="text-xs text-muted-foreground">Not yet due</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Overdue</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {formatCurrency(agingBuckets.days30_60 + agingBuckets.days60_90)}
              </div>
              <p className="text-xs text-muted-foreground">31-90 days</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Critical</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{formatCurrency(agingBuckets.over90)}</div>
              <p className="text-xs text-muted-foreground">90+ days</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="customer-wise">
          <TabsList>
            <TabsTrigger value="customer-wise">Customer-wise</TabsTrigger>
            <TabsTrigger value="overdue">Overdue Invoices ({overdueInvoices.length})</TabsTrigger>
            <TabsTrigger value="aging">Aging Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="customer-wise" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Customer-wise Outstanding</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="p-3 text-left">Customer</th>
                        <th className="p-3 text-center">Invoices</th>
                        <th className="p-3 text-right">Outstanding</th>
                        <th className="p-3 text-center">Oldest</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customerOutstanding.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-muted-foreground">No outstanding amounts</td>
                        </tr>
                      ) : (
                        customerOutstanding.map((cust) => (
                          <tr key={cust.id} className="border-t hover:bg-muted/50">
                            <td className="p-3">{cust.code} - {cust.name}</td>
                            <td className="p-3 text-center">{cust.invoiceCount}</td>
                            <td className="p-3 text-right font-medium">{formatCurrency(cust.outstanding)}</td>
                            <td className="p-3 text-center">{getAgingBadge(cust.oldestDays)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot className="bg-muted font-medium">
                      <tr>
                        <td className="p-3">Total ({customerOutstanding.length} customers)</td>
                        <td className="p-3 text-center">{invoicesWithAging.filter(i => i.outstanding > 0).length}</td>
                        <td className="p-3 text-right">{formatCurrency(totalOutstanding)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="overdue" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Overdue Invoices</CardTitle>
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
                        <th className="p-3 text-right">Outstanding</th>
                        <th className="p-3 text-center">Days Overdue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overdueInvoices.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-muted-foreground">No overdue invoices</td>
                        </tr>
                      ) : (
                        overdueInvoices.map((inv) => {
                          const creditPeriod = inv.customers?.credit_period || 30;
                          const daysOverdue = inv.daysOld - creditPeriod;
                          return (
                            <tr key={inv.id} className="border-t hover:bg-muted/50">
                              <td className="p-3 font-medium">{inv.invoice_number}</td>
                              <td className="p-3">{format(new Date(inv.invoice_date), 'dd/MM/yyyy')}</td>
                              <td className="p-3">{inv.customers?.name || '-'}</td>
                              <td className="p-3 text-right">{formatCurrency(inv.total_amount || 0)}</td>
                              <td className="p-3 text-right text-red-600">{formatCurrency(inv.outstanding)}</td>
                              <td className="p-3 text-center">
                                <Badge variant="destructive">{daysOverdue} days</Badge>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                    <tfoot className="bg-muted font-medium">
                      <tr>
                        <td colSpan={4} className="p-3 text-right">Total Overdue:</td>
                        <td className="p-3 text-right text-red-600">
                          {formatCurrency(overdueInvoices.reduce((s, i) => s + i.outstanding, 0))}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="aging" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Aging Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="p-3 text-left">Aging Bucket</th>
                        <th className="p-3 text-right">Amount</th>
                        <th className="p-3 text-right">% of Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t hover:bg-muted/50">
                        <td className="p-3">
                          <Badge variant="secondary">0-30 Days (Current)</Badge>
                        </td>
                        <td className="p-3 text-right">{formatCurrency(agingBuckets.current)}</td>
                        <td className="p-3 text-right">{totalOutstanding > 0 ? ((agingBuckets.current / totalOutstanding) * 100).toFixed(1) : 0}%</td>
                      </tr>
                      <tr className="border-t hover:bg-muted/50">
                        <td className="p-3">
                          <Badge variant="outline" className="text-yellow-600 border-yellow-300">31-60 Days</Badge>
                        </td>
                        <td className="p-3 text-right">{formatCurrency(agingBuckets.days30_60)}</td>
                        <td className="p-3 text-right">{totalOutstanding > 0 ? ((agingBuckets.days30_60 / totalOutstanding) * 100).toFixed(1) : 0}%</td>
                      </tr>
                      <tr className="border-t hover:bg-muted/50">
                        <td className="p-3">
                          <Badge variant="outline" className="text-orange-600 border-orange-300">61-90 Days</Badge>
                        </td>
                        <td className="p-3 text-right">{formatCurrency(agingBuckets.days60_90)}</td>
                        <td className="p-3 text-right">{totalOutstanding > 0 ? ((agingBuckets.days60_90 / totalOutstanding) * 100).toFixed(1) : 0}%</td>
                      </tr>
                      <tr className="border-t hover:bg-muted/50">
                        <td className="p-3">
                          <Badge variant="destructive">90+ Days</Badge>
                        </td>
                        <td className="p-3 text-right text-red-600">{formatCurrency(agingBuckets.over90)}</td>
                        <td className="p-3 text-right">{totalOutstanding > 0 ? ((agingBuckets.over90 / totalOutstanding) * 100).toFixed(1) : 0}%</td>
                      </tr>
                    </tbody>
                    <tfoot className="bg-muted font-medium">
                      <tr>
                        <td className="p-3">Total Outstanding</td>
                        <td className="p-3 text-right">{formatCurrency(totalOutstanding)}</td>
                        <td className="p-3 text-right">100%</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
