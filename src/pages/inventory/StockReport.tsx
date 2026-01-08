import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Package, AlertTriangle, TrendingDown } from 'lucide-react';

export default function StockReport() {
  const [search, setSearch] = useState('');

  const { data: rawMaterials = [], isLoading: loadingRM } = useQuery({
    queryKey: ['raw-materials-stock'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('raw_materials')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: finishedGoods = [], isLoading: loadingFG } = useQuery({
    queryKey: ['finished-goods-stock'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('finished_goods')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const lowStockRM = rawMaterials.filter(rm => rm.current_stock <= rm.min_stock_level);
  const lowStockFG = finishedGoods.filter(fg => fg.current_stock <= fg.min_stock_level);

  const totalRMValue = rawMaterials.reduce((sum, rm) => sum + (rm.current_stock * rm.rate), 0);
  const totalFGValue = finishedGoods.reduce((sum, fg) => sum + (fg.current_stock * fg.rate), 0);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

  const filteredRM = rawMaterials.filter(
    (rm) =>
      rm.code.toLowerCase().includes(search.toLowerCase()) ||
      rm.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredFG = finishedGoods.filter(
    (fg) =>
      fg.code.toLowerCase().includes(search.toLowerCase()) ||
      fg.name.toLowerCase().includes(search.toLowerCase())
  );

  const getStockBadge = (current: number, min: number) => {
    if (current <= 0) return <Badge variant="destructive">Out of Stock</Badge>;
    if (current <= min) return <Badge variant="outline" className="text-orange-600 border-orange-300">Low Stock</Badge>;
    return <Badge variant="secondary">In Stock</Badge>;
  };

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: 'Inventory', href: '/inventory/stock' },
        { label: 'Stock Report' },
      ]}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Raw Materials</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{rawMaterials.length}</div>
              <p className="text-xs text-muted-foreground">Total items</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Finished Goods</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{finishedGoods.length}</div>
              <p className="text-xs text-muted-foreground">Total items</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Stock Value</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalRMValue + totalFGValue)}</div>
              <p className="text-xs text-muted-foreground">Total inventory value</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{lowStockRM.length + lowStockFG.length}</div>
              <p className="text-xs text-muted-foreground">Items need reorder</p>
            </CardContent>
          </Card>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Tabs defaultValue="raw-materials">
          <TabsList>
            <TabsTrigger value="raw-materials">Raw Materials ({rawMaterials.length})</TabsTrigger>
            <TabsTrigger value="finished-goods">Finished Goods ({finishedGoods.length})</TabsTrigger>
            <TabsTrigger value="low-stock">Low Stock ({lowStockRM.length + lowStockFG.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="raw-materials" className="mt-4">
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-3 text-left">Code</th>
                    <th className="p-3 text-left">Name</th>
                    <th className="p-3 text-left">Grade</th>
                    <th className="p-3 text-right">Current Stock</th>
                    <th className="p-3 text-right">Min Level</th>
                    <th className="p-3 text-right">Rate</th>
                    <th className="p-3 text-right">Value</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingRM ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center">
                        <div className="flex items-center justify-center">
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        </div>
                      </td>
                    </tr>
                  ) : filteredRM.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-muted-foreground">No items found</td>
                    </tr>
                  ) : (
                    filteredRM.map((rm) => (
                      <tr key={rm.id} className="border-t hover:bg-muted/50">
                        <td className="p-3 font-medium">{rm.code}</td>
                        <td className="p-3">{rm.name}</td>
                        <td className="p-3">{rm.grade || '-'}</td>
                        <td className="p-3 text-right">{rm.current_stock.toLocaleString('en-IN')} {rm.unit}</td>
                        <td className="p-3 text-right">{rm.min_stock_level.toLocaleString('en-IN')}</td>
                        <td className="p-3 text-right">{formatCurrency(rm.rate)}</td>
                        <td className="p-3 text-right">{formatCurrency(rm.current_stock * rm.rate)}</td>
                        <td className="p-3 text-center">{getStockBadge(rm.current_stock, rm.min_stock_level)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot className="bg-muted font-medium">
                  <tr>
                    <td colSpan={6} className="p-3 text-right">Total Value:</td>
                    <td className="p-3 text-right">{formatCurrency(totalRMValue)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="finished-goods" className="mt-4">
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-3 text-left">Code</th>
                    <th className="p-3 text-left">Name</th>
                    <th className="p-3 text-left">Color/Size</th>
                    <th className="p-3 text-right">Current Stock</th>
                    <th className="p-3 text-right">Min Level</th>
                    <th className="p-3 text-right">Rate</th>
                    <th className="p-3 text-right">Value</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingFG ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center">
                        <div className="flex items-center justify-center">
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        </div>
                      </td>
                    </tr>
                  ) : filteredFG.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-muted-foreground">No items found</td>
                    </tr>
                  ) : (
                    filteredFG.map((fg) => (
                      <tr key={fg.id} className="border-t hover:bg-muted/50">
                        <td className="p-3 font-medium">{fg.code}</td>
                        <td className="p-3">{fg.name}</td>
                        <td className="p-3">{[fg.color, fg.size].filter(Boolean).join(' / ') || '-'}</td>
                        <td className="p-3 text-right">{fg.current_stock.toLocaleString('en-IN')} {fg.unit}</td>
                        <td className="p-3 text-right">{fg.min_stock_level.toLocaleString('en-IN')}</td>
                        <td className="p-3 text-right">{formatCurrency(fg.rate)}</td>
                        <td className="p-3 text-right">{formatCurrency(fg.current_stock * fg.rate)}</td>
                        <td className="p-3 text-center">{getStockBadge(fg.current_stock, fg.min_stock_level)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot className="bg-muted font-medium">
                  <tr>
                    <td colSpan={6} className="p-3 text-right">Total Value:</td>
                    <td className="p-3 text-right">{formatCurrency(totalFGValue)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="low-stock" className="mt-4">
            <div className="space-y-4">
              {lowStockRM.length > 0 && (
                <div>
                  <h3 className="font-medium mb-2">Raw Materials</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="p-3 text-left">Code</th>
                          <th className="p-3 text-left">Name</th>
                          <th className="p-3 text-right">Current Stock</th>
                          <th className="p-3 text-right">Min Level</th>
                          <th className="p-3 text-right">Shortage</th>
                          <th className="p-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lowStockRM.map((rm) => (
                          <tr key={rm.id} className="border-t hover:bg-muted/50">
                            <td className="p-3 font-medium">{rm.code}</td>
                            <td className="p-3">{rm.name}</td>
                            <td className="p-3 text-right">{rm.current_stock.toLocaleString('en-IN')} {rm.unit}</td>
                            <td className="p-3 text-right">{rm.min_stock_level.toLocaleString('en-IN')}</td>
                            <td className="p-3 text-right text-destructive">
                              {(rm.min_stock_level - rm.current_stock).toLocaleString('en-IN')}
                            </td>
                            <td className="p-3 text-center">{getStockBadge(rm.current_stock, rm.min_stock_level)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {lowStockFG.length > 0 && (
                <div>
                  <h3 className="font-medium mb-2">Finished Goods</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="p-3 text-left">Code</th>
                          <th className="p-3 text-left">Name</th>
                          <th className="p-3 text-right">Current Stock</th>
                          <th className="p-3 text-right">Min Level</th>
                          <th className="p-3 text-right">Shortage</th>
                          <th className="p-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lowStockFG.map((fg) => (
                          <tr key={fg.id} className="border-t hover:bg-muted/50">
                            <td className="p-3 font-medium">{fg.code}</td>
                            <td className="p-3">{fg.name}</td>
                            <td className="p-3 text-right">{fg.current_stock.toLocaleString('en-IN')} {fg.unit}</td>
                            <td className="p-3 text-right">{fg.min_stock_level.toLocaleString('en-IN')}</td>
                            <td className="p-3 text-right text-destructive">
                              {(fg.min_stock_level - fg.current_stock).toLocaleString('en-IN')}
                            </td>
                            <td className="p-3 text-center">{getStockBadge(fg.current_stock, fg.min_stock_level)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {lowStockRM.length === 0 && lowStockFG.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  All items are adequately stocked.
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
