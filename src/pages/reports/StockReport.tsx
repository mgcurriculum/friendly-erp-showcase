import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { Package, Boxes, AlertTriangle, TrendingUp, IndianRupee, Activity } from "lucide-react";

const StockReport = () => {
  const { data: rawMaterials = [] } = useQuery({
    queryKey: ['raw-materials'],
    queryFn: async () => {
      const { data, error } = await supabase.from('raw_materials').select('*');
      if (error) throw error;
      return data;
    },
  });

  const { data: finishedGoods = [] } = useQuery({
    queryKey: ['finished-goods'],
    queryFn: async () => {
      const { data, error } = await supabase.from('finished_goods').select('*');
      if (error) throw error;
      return data;
    },
  });

  // Calculations
  const totalRMValue = rawMaterials.reduce((sum, rm) => sum + (rm.current_stock || 0) * (rm.rate || 0), 0);
  const totalFGValue = finishedGoods.reduce((sum, fg) => sum + (fg.current_stock || 0) * (fg.rate || 0), 0);
  const totalInventoryValue = totalRMValue + totalFGValue;

  const lowStockRM = rawMaterials.filter(rm => (rm.current_stock || 0) <= (rm.min_stock_level || 0));
  const lowStockFG = finishedGoods.filter(fg => (fg.current_stock || 0) <= (fg.min_stock_level || 0));
  const totalLowStock = lowStockRM.length + lowStockFG.length;

  const outOfStockRM = rawMaterials.filter(rm => (rm.current_stock || 0) === 0);
  const outOfStockFG = finishedGoods.filter(fg => (fg.current_stock || 0) === 0);
  const totalOutOfStock = outOfStockRM.length + outOfStockFG.length;

  const totalItems = rawMaterials.length + finishedGoods.length;
  const healthyItems = totalItems - totalLowStock;
  const healthScore = totalItems > 0 ? Math.round((healthyItems / totalItems) * 100) : 100;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Chart data
  const valueDistributionData = [
    { name: 'Raw Materials', value: totalRMValue, color: 'hsl(var(--chart-1))' },
    { name: 'Finished Goods', value: totalFGValue, color: 'hsl(var(--chart-2))' },
  ];

  const stockStatusData = [
    { name: 'In Stock', rm: rawMaterials.length - lowStockRM.length, fg: finishedGoods.length - lowStockFG.length },
    { name: 'Low Stock', rm: lowStockRM.length - outOfStockRM.length, fg: lowStockFG.length - outOfStockFG.length },
    { name: 'Out of Stock', rm: outOfStockRM.length, fg: outOfStockFG.length },
  ];

  // Top items by value
  const allItems = [
    ...rawMaterials.map(rm => ({ 
      name: rm.name, 
      value: (rm.current_stock || 0) * (rm.rate || 0), 
      type: 'RM',
      stock: rm.current_stock || 0,
      rate: rm.rate || 0
    })),
    ...finishedGoods.map(fg => ({ 
      name: fg.name, 
      value: (fg.current_stock || 0) * (fg.rate || 0), 
      type: 'FG',
      stock: fg.current_stock || 0,
      rate: fg.rate || 0
    })),
  ].sort((a, b) => b.value - a.value).slice(0, 8);

  // Current vs Min stock comparison (top items by gap)
  const stockComparisonData = [
    ...rawMaterials.map(rm => ({
      name: rm.name.substring(0, 15),
      current: rm.current_stock || 0,
      min: rm.min_stock_level || 0,
    })),
    ...finishedGoods.map(fg => ({
      name: fg.name.substring(0, 15),
      current: fg.current_stock || 0,
      min: fg.min_stock_level || 0,
    })),
  ].filter(item => item.min > 0).slice(0, 10);

  // Critical items (below minimum)
  const criticalItems = [
    ...lowStockRM.map(rm => ({
      code: rm.code,
      name: rm.name,
      type: 'Raw Material',
      current: rm.current_stock || 0,
      min: rm.min_stock_level || 0,
      gap: (rm.min_stock_level || 0) - (rm.current_stock || 0),
      value: (rm.current_stock || 0) * (rm.rate || 0),
    })),
    ...lowStockFG.map(fg => ({
      code: fg.code,
      name: fg.name,
      type: 'Finished Good',
      current: fg.current_stock || 0,
      min: fg.min_stock_level || 0,
      gap: (fg.min_stock_level || 0) - (fg.current_stock || 0),
      value: (fg.current_stock || 0) * (fg.rate || 0),
    })),
  ].sort((a, b) => b.gap - a.gap);

  const chartConfig = {
    rm: { label: 'Raw Materials', color: 'hsl(var(--chart-1))' },
    fg: { label: 'Finished Goods', color: 'hsl(var(--chart-2))' },
    current: { label: 'Current Stock', color: 'hsl(var(--chart-1))' },
    min: { label: 'Min Level', color: 'hsl(var(--chart-3))' },
    value: { label: 'Value', color: 'hsl(var(--chart-1))' },
  };

  const getStockBadge = (current: number, min: number) => {
    if (current === 0) return <Badge variant="destructive">Out of Stock</Badge>;
    if (current <= min) return <Badge variant="secondary" className="bg-amber-100 text-amber-800">Low Stock</Badge>;
    return <Badge variant="secondary" className="bg-green-100 text-green-800">In Stock</Badge>;
  };

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: 'Reports', href: '/reports' },
        { label: 'Stock Report' },
      ]}
    >
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Stock Analytics Report</h1>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Raw Materials</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{rawMaterials.length}</div>
              <p className="text-xs text-muted-foreground">{formatCurrency(totalRMValue)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Finished Goods</CardTitle>
              <Boxes className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{finishedGoods.length}</div>
              <p className="text-xs text-muted-foreground">{formatCurrency(totalFGValue)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Value</CardTitle>
              <IndianRupee className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalInventoryValue)}</div>
              <p className="text-xs text-muted-foreground">Combined inventory</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Low Stock Alerts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{totalLowStock}</div>
              <p className="text-xs text-muted-foreground">{totalOutOfStock} out of stock</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Health Score</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${healthScore >= 80 ? 'text-green-600' : healthScore >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                {healthScore}%
              </div>
              <p className="text-xs text-muted-foreground">{healthyItems} of {totalItems} healthy</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Value Distribution Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Stock Value Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={valueDistributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {valueDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <ChartTooltip 
                      content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} 
                    />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Stock Status Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Stock Status Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stockStatusData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" className="text-xs" />
                    <YAxis className="text-xs" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="rm" name="Raw Materials" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="fg" name="Finished Goods" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Top Items by Value */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Top Items by Value</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={allItems} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} className="text-xs" />
                    <YAxis dataKey="name" type="category" width={100} className="text-xs" tick={{ fontSize: 10 }} />
                    <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} />
                    <Bar dataKey="value" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Current vs Min Stock Levels */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Current vs Minimum Levels</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stockComparisonData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" className="text-xs" tick={{ fontSize: 9 }} angle={-45} textAnchor="end" height={60} />
                    <YAxis className="text-xs" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="current" name="Current Stock" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="min" name="Min Level" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Tables */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Detailed Inventory</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="critical">
              <TabsList>
                <TabsTrigger value="critical">Critical Stock ({criticalItems.length})</TabsTrigger>
                <TabsTrigger value="high-value">High Value Items</TabsTrigger>
                <TabsTrigger value="all">All Items</TabsTrigger>
              </TabsList>

              <TabsContent value="critical" className="mt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Current</TableHead>
                      <TableHead className="text-right">Min Level</TableHead>
                      <TableHead className="text-right">Gap</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {criticalItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          No critical stock items
                        </TableCell>
                      </TableRow>
                    ) : (
                      criticalItems.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-mono">{item.code}</TableCell>
                          <TableCell>{item.name}</TableCell>
                          <TableCell>{item.type}</TableCell>
                          <TableCell className="text-right">{item.current}</TableCell>
                          <TableCell className="text-right">{item.min}</TableCell>
                          <TableCell className="text-right text-red-600">-{item.gap}</TableCell>
                          <TableCell>{getStockBadge(item.current, item.min)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="high-value" className="mt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead className="text-right">Total Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allItems.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{item.name}</TableCell>
                        <TableCell>{item.type === 'RM' ? 'Raw Material' : 'Finished Good'}</TableCell>
                        <TableCell className="text-right">{item.stock}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.rate)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(item.value)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="all" className="mt-4">
                <div className="space-y-6">
                  <div>
                    <h4 className="font-medium mb-2">Raw Materials ({rawMaterials.length})</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Code</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Grade</TableHead>
                          <TableHead className="text-right">Stock</TableHead>
                          <TableHead className="text-right">Min Level</TableHead>
                          <TableHead className="text-right">Rate</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rawMaterials.map((rm) => (
                          <TableRow key={rm.id}>
                            <TableCell className="font-mono">{rm.code}</TableCell>
                            <TableCell>{rm.name}</TableCell>
                            <TableCell>{rm.grade || '-'}</TableCell>
                            <TableCell className="text-right">{rm.current_stock || 0} {rm.unit}</TableCell>
                            <TableCell className="text-right">{rm.min_stock_level || 0}</TableCell>
                            <TableCell className="text-right">{formatCurrency(rm.rate || 0)}</TableCell>
                            <TableCell>{getStockBadge(rm.current_stock || 0, rm.min_stock_level || 0)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Finished Goods ({finishedGoods.length})</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Code</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Size</TableHead>
                          <TableHead className="text-right">Stock</TableHead>
                          <TableHead className="text-right">Min Level</TableHead>
                          <TableHead className="text-right">Rate</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {finishedGoods.map((fg) => (
                          <TableRow key={fg.id}>
                            <TableCell className="font-mono">{fg.code}</TableCell>
                            <TableCell>{fg.name}</TableCell>
                            <TableCell>{fg.size || '-'}</TableCell>
                            <TableCell className="text-right">{fg.current_stock || 0} {fg.unit}</TableCell>
                            <TableCell className="text-right">{fg.min_stock_level || 0}</TableCell>
                            <TableCell className="text-right">{formatCurrency(fg.rate || 0)}</TableCell>
                            <TableCell>{getStockBadge(fg.current_stock || 0, fg.min_stock_level || 0)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default StockReport;
