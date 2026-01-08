import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { FileDown, Filter, TrendingUp, Weight, Package, Route } from "lucide-react";

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function KEILCollectionReport() {
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [selectedRoute, setSelectedRoute] = useState<string>("all");

  // Fetch routes for filter
  const { data: routes = [] } = useQuery({
    queryKey: ['keil-routes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('keil_routes' as any)
        .select('*')
        .eq('status', 'active')
        .order('route_name');
      if (error) throw error;
      return (data || []) as any[];
    }
  });

  // Fetch collections with filters
  const { data: collections = [], isLoading } = useQuery({
    queryKey: ['keil-collection-report', startDate, endDate, selectedRoute],
    queryFn: async () => {
      let query = supabase
        .from('keil_collections' as any)
        .select(`
          *,
          route:keil_routes(route_name, route_code, area),
          vehicle:vehicles(registration_number),
          driver:employees!keil_collections_driver_id_fkey(name),
          helper:employees!keil_collections_helper_id_fkey(name)
        `)
        .gte('collection_date', startDate)
        .lte('collection_date', endDate)
        .order('collection_date', { ascending: false });

      if (selectedRoute !== "all") {
        query = query.eq('route_id', selectedRoute);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as any[];
    }
  });

  // Calculate summary stats
  const totalWeight = collections.reduce((sum, c) => sum + (c.total_weight || 0), 0);
  const totalBags = collections.reduce((sum, c) => sum + (c.total_bags || 0), 0);
  const totalTrips = collections.length;
  const avgWeightPerTrip = totalTrips > 0 ? (totalWeight / totalTrips).toFixed(2) : 0;

  // Route-wise analytics
  const routeWiseData = collections.reduce((acc: any[], collection) => {
    const routeName = collection.route?.route_name || 'Unknown';
    const existing = acc.find(item => item.route === routeName);
    if (existing) {
      existing.weight += collection.total_weight || 0;
      existing.bags += collection.total_bags || 0;
      existing.trips += 1;
    } else {
      acc.push({
        route: routeName,
        weight: collection.total_weight || 0,
        bags: collection.total_bags || 0,
        trips: 1
      });
    }
    return acc;
  }, []);

  // Date-wise trend data
  const dateWiseData = collections.reduce((acc: any[], collection) => {
    const date = collection.collection_date;
    const existing = acc.find(item => item.date === date);
    if (existing) {
      existing.weight += collection.total_weight || 0;
      existing.bags += collection.total_bags || 0;
    } else {
      acc.push({
        date,
        weight: collection.total_weight || 0,
        bags: collection.total_bags || 0
      });
    }
    return acc;
  }, []).sort((a, b) => a.date.localeCompare(b.date));

  const handleExport = () => {
    const csvContent = [
      ['Date', 'Collection No', 'Route', 'Vehicle', 'Driver', 'Helper', 'Total Weight (kg)', 'Total Bags', 'Start KM', 'End KM', 'Status'].join(','),
      ...collections.map(c => [
        c.collection_date,
        c.collection_number,
        c.route?.route_name || '',
        c.vehicle?.registration_number || '',
        c.driver?.name || '',
        c.helper?.name || '',
        c.total_weight || 0,
        c.total_bags || 0,
        c.start_km || 0,
        c.end_km || 0,
        c.status
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `keil-collection-report-${startDate}-to-${endDate}.csv`;
    a.click();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">KEIL Collection Report</h1>
            <p className="text-muted-foreground">Analyze waste collection data with route-wise analytics</p>
          </div>
          <Button onClick={handleExport} variant="outline">
            <FileDown className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Route</Label>
                <Select value={selectedRoute} onValueChange={setSelectedRoute}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Routes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Routes</SelectItem>
                    {routes.map((route: any) => (
                      <SelectItem key={route.id} value={route.id}>
                        {route.route_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Weight className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Weight</p>
                  <p className="text-2xl font-bold">{totalWeight.toFixed(2)} kg</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-secondary/10 rounded-lg">
                  <Package className="h-6 w-6 text-secondary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Bags</p>
                  <p className="text-2xl font-bold">{totalBags}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-accent/10 rounded-lg">
                  <Route className="h-6 w-6 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Trips</p>
                  <p className="text-2xl font-bold">{totalTrips}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg Weight/Trip</p>
                  <p className="text-2xl font-bold">{avgWeightPerTrip} kg</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Route-wise Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Route-wise Collection (Weight in kg)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={routeWiseData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="route" type="category" width={100} tick={{ fontSize: 12 }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }} 
                    />
                    <Bar dataKey="weight" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Route Distribution Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Route Distribution (by Trips)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={routeWiseData}
                      dataKey="trips"
                      nameKey="route"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ route, percent }) => `${route}: ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {routeWiseData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }} 
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Date-wise Trend */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Daily Collection Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dateWiseData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }} 
                      tickFormatter={(value) => format(new Date(value), 'dd MMM')}
                    />
                    <YAxis />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      labelFormatter={(value) => format(new Date(value), 'dd MMM yyyy')}
                    />
                    <Bar dataKey="weight" name="Weight (kg)" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Route-wise Summary Table */}
        <Card>
          <CardHeader>
            <CardTitle>Route-wise Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Route</TableHead>
                  <TableHead className="text-right">Total Trips</TableHead>
                  <TableHead className="text-right">Total Weight (kg)</TableHead>
                  <TableHead className="text-right">Total Bags</TableHead>
                  <TableHead className="text-right">Avg Weight/Trip</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {routeWiseData.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{row.route}</TableCell>
                    <TableCell className="text-right">{row.trips}</TableCell>
                    <TableCell className="text-right">{row.weight.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{row.bags}</TableCell>
                    <TableCell className="text-right">{(row.weight / row.trips).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                {routeWiseData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No data available for the selected period
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Detailed Collections Table */}
        <Card>
          <CardHeader>
            <CardTitle>Collection Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Collection No</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead className="text-right">Weight (kg)</TableHead>
                  <TableHead className="text-right">Bags</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">Loading...</TableCell>
                  </TableRow>
                ) : collections.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No collections found for the selected filters
                    </TableCell>
                  </TableRow>
                ) : (
                  collections.map((collection) => (
                    <TableRow key={collection.id}>
                      <TableCell>{format(new Date(collection.collection_date), 'dd MMM yyyy')}</TableCell>
                      <TableCell className="font-medium">{collection.collection_number}</TableCell>
                      <TableCell>{collection.route?.route_name || '-'}</TableCell>
                      <TableCell>{collection.vehicle?.registration_number || '-'}</TableCell>
                      <TableCell>{collection.driver?.name || '-'}</TableCell>
                      <TableCell className="text-right">{collection.total_weight || 0}</TableCell>
                      <TableCell className="text-right">{collection.total_bags || 0}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          collection.status === 'completed' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100'
                        }`}>
                          {collection.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
