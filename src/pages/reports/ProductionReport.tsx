import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Factory, TrendingUp, Box, Users } from 'lucide-react';
import { format, subDays } from 'date-fns';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', '#8884d8', '#82ca9d', '#ffc658'];

export default function ProductionReport() {
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { data: batches = [], isLoading } = useQuery({
    queryKey: ['production-report', dateFrom, dateTo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('production_batches')
        .select('*, finished_goods(name, code), employees(name)')
        .gte('production_date', dateFrom)
        .lte('production_date', dateTo)
        .order('production_date', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const totalProduction = batches.reduce((sum, b) => sum + (b.quantity_produced || 0), 0);
  const completedBatches = batches.filter((b) => b.status === 'completed').length;
  const avgBatchSize = batches.length > 0 ? totalProduction / batches.length : 0;
  const uniqueOperators = new Set(batches.map((b) => b.employee_id)).size;

  const shiftData = batches.reduce((acc: Record<string, number>, b) => {
    const shift = b.shift || 'Unknown';
    acc[shift] = (acc[shift] || 0) + (b.quantity_produced || 0);
    return acc;
  }, {});

  const shiftChartData = Object.entries(shiftData).map(([name, value]) => ({ name, value }));

  const productData = batches.reduce((acc: Record<string, number>, b) => {
    const name = b.finished_goods?.name || 'Unknown';
    acc[name] = (acc[name] || 0) + (b.quantity_produced || 0);
    return acc;
  }, {});

  const productChartData = Object.entries(productData)
    .map(([name, value]) => ({ name: name.substring(0, 20), value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const getStatusBadge = (status: string | null) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      in_progress: 'default',
      completed: 'secondary',
      cancelled: 'destructive',
    };
    return <Badge variant={variants[status || 'in_progress'] || 'outline'}>{status?.replace('_', ' ') || 'in progress'}</Badge>;
  };

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: 'Reports', href: '/reports/sales' },
        { label: 'Production Report' },
      ]}
    >
      <div className="space-y-6">
        {/* Date Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 items-end">
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
                setDateFrom(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
                setDateTo(format(new Date(), 'yyyy-MM-dd'));
              }}>
                Last 30 Days
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Production</CardTitle>
              <Factory className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalProduction.toLocaleString('en-IN')}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Batches Completed</CardTitle>
              <Box className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedBatches} / {batches.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Avg. Batch Size</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgBatchSize.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Operators</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{uniqueOperators}</div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Production by Product</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={productChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Production by Shift</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={shiftChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {shiftChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transactions Table */}
        <Card>
          <CardHeader>
            <CardTitle>Production Batches</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : batches.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No production batches found</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Batch No.</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Shift</TableHead>
                    <TableHead>Operator</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batches.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{b.batch_number}</TableCell>
                      <TableCell>{format(new Date(b.production_date), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>{b.finished_goods?.name || '-'}</TableCell>
                      <TableCell>{b.shift || '-'}</TableCell>
                      <TableCell>{b.employees?.name || '-'}</TableCell>
                      <TableCell className="text-right">{(b.quantity_produced || 0).toLocaleString('en-IN')}</TableCell>
                      <TableCell>{getStatusBadge(b.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
