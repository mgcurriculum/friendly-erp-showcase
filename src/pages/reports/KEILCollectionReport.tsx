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
import { FileDown, Filter, TrendingUp, Weight, Package, Route, Building2, User, Truck, Fuel } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
          vehicle:vehicles(id, registration_number, vehicle_type, insurance_expiry, fitness_expiry, status),
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

  // Fetch collection items for HCE-wise analytics
  const { data: collectionItems = [] } = useQuery({
    queryKey: ['keil-collection-items-report', startDate, endDate, selectedRoute],
    queryFn: async () => {
      // First get collection IDs based on filters
      let collectionsQuery = supabase
        .from('keil_collections' as any)
        .select('id')
        .gte('collection_date', startDate)
        .lte('collection_date', endDate);

      if (selectedRoute !== "all") {
        collectionsQuery = collectionsQuery.eq('route_id', selectedRoute);
      }

      const { data: filteredCollections, error: collectionsError } = await collectionsQuery;
      if (collectionsError) throw collectionsError;

      if (!filteredCollections || filteredCollections.length === 0) {
        return [];
      }

      const collectionIds = filteredCollections.map((c: any) => c.id);

      const { data, error } = await supabase
        .from('keil_collection_items' as any)
        .select(`
          *,
          hce:keil_hce(hce_name, hce_code, hce_type, route_id)
        `)
        .in('collection_id', collectionIds);

      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: collections.length > 0 || startDate !== '' || endDate !== ''
  });

  // Fetch fuel consumption data
  const { data: fuelData = [] } = useQuery({
    queryKey: ['fuel-report', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fuel_consumption' as any)
        .select(`
          *,
          vehicle:vehicle_id(registration_number)
        `)
        .gte('fuel_date', startDate)
        .lte('fuel_date', endDate)
        .order('fuel_date', { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    }
  });

  // Calculate summary stats
  const totalWeight = collections.reduce((sum, c) => sum + (c.total_weight || 0), 0);
  const totalBags = collections.reduce((sum, c) => sum + (c.total_bags || 0), 0);
  const totalTrips = collections.length;
  const avgWeightPerTrip = totalTrips > 0 ? (totalWeight / totalTrips).toFixed(2) : 0;
  const totalHCEs = new Set(collectionItems.map((item: any) => item.hce_id).filter(Boolean)).size;

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

  // HCE-wise analytics
  const hceWiseData = collectionItems.reduce((acc: any[], item: any) => {
    const hceName = item.hce?.hce_name || 'Unknown';
    const hceType = item.hce?.hce_type || 'Unknown';
    const existing = acc.find(h => h.hce === hceName);
    if (existing) {
      existing.weight += item.weight || 0;
      existing.bags += item.bags_count || 0;
      existing.collections += 1;
    } else {
      acc.push({
        hce: hceName,
        hceType,
        weight: item.weight || 0,
        bags: item.bags_count || 0,
        collections: 1
      });
    }
    return acc;
  }, []).sort((a, b) => b.weight - a.weight);

  // HCE Type distribution
  const hceTypeData = collectionItems.reduce((acc: any[], item: any) => {
    const hceType = item.hce?.hce_type || 'Unknown';
    const existing = acc.find(h => h.type === hceType);
    if (existing) {
      existing.weight += item.weight || 0;
      existing.bags += item.bags_count || 0;
      existing.count += 1;
    } else {
      acc.push({
        type: hceType,
        weight: item.weight || 0,
        bags: item.bags_count || 0,
        count: 1
      });
    }
    return acc;
  }, []);

  // Waste type distribution
  const wasteTypeData = collectionItems.reduce((acc: any[], item: any) => {
    const wasteType = item.waste_type || 'Unknown';
    const existing = acc.find(w => w.type === wasteType);
    if (existing) {
      existing.weight += item.weight || 0;
      existing.bags += item.bags_count || 0;
    } else {
      acc.push({
        type: wasteType,
        weight: item.weight || 0,
        bags: item.bags_count || 0
      });
    }
    return acc;
  }, []);

  // Driver performance analytics
  const driverWiseData = collections.reduce((acc: any[], collection) => {
    const driverName = collection.driver?.name || 'Unknown';
    const kmRun = Math.max(0, (collection.end_km || 0) - (collection.start_km || 0));
    const existing = acc.find(d => d.driver === driverName);
    if (existing) {
      existing.trips += 1;
      existing.weight += collection.total_weight || 0;
      existing.bags += collection.total_bags || 0;
      existing.km += kmRun;
    } else {
      acc.push({
        driver: driverName,
        trips: 1,
        weight: collection.total_weight || 0,
        bags: collection.total_bags || 0,
        km: kmRun
      });
    }
    return acc;
  }, []).sort((a, b) => b.weight - a.weight);

  const totalDrivers = driverWiseData.filter(d => d.driver !== 'Unknown').length;
  const totalKm = collections.reduce((sum, c) => sum + Math.max(0, (c.end_km || 0) - (c.start_km || 0)), 0);

  // Vehicle performance analytics
  const vehicleWiseData = collections.reduce((acc: any[], collection) => {
    const vehicleReg = collection.vehicle?.registration_number || 'Unknown';
    const vehicleType = collection.vehicle?.vehicle_type || 'Unknown';
    const vehicleId = collection.vehicle?.id;
    const insuranceExpiry = collection.vehicle?.insurance_expiry;
    const fitnessExpiry = collection.vehicle?.fitness_expiry;
    const vehicleStatus = collection.vehicle?.status || 'unknown';
    const kmRun = Math.max(0, (collection.end_km || 0) - (collection.start_km || 0));
    
    const existing = acc.find(v => v.vehicle === vehicleReg);
    if (existing) {
      existing.trips += 1;
      existing.weight += collection.total_weight || 0;
      existing.bags += collection.total_bags || 0;
      existing.km += kmRun;
    } else {
      acc.push({
        vehicle: vehicleReg,
        vehicleId,
        vehicleType,
        insuranceExpiry,
        fitnessExpiry,
        vehicleStatus,
        trips: 1,
        weight: collection.total_weight || 0,
        bags: collection.total_bags || 0,
        km: kmRun
      });
    }
    return acc;
  }, []).sort((a, b) => b.trips - a.trips);

  const totalVehicles = vehicleWiseData.filter(v => v.vehicle !== 'Unknown').length;
  const today = new Date();
  const vehiclesNeedingAttention = vehicleWiseData.filter(v => {
    if (!v.insuranceExpiry && !v.fitnessExpiry) return false;
    const insuranceDate = v.insuranceExpiry ? new Date(v.insuranceExpiry) : null;
    const fitnessDate = v.fitnessExpiry ? new Date(v.fitnessExpiry) : null;
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    return (insuranceDate && insuranceDate <= thirtyDaysFromNow) || (fitnessDate && fitnessDate <= thirtyDaysFromNow);
  }).length;

  // Fuel analytics
  const totalFuelLiters = fuelData.reduce((sum: number, f: any) => sum + (f.quantity_liters || 0), 0);
  const totalFuelCost = fuelData.reduce((sum: number, f: any) => sum + (f.total_amount || 0), 0);
  const avgFuelEfficiency = totalKm > 0 && totalFuelLiters > 0 ? (totalKm / totalFuelLiters).toFixed(2) : 0;

  // Fuel by vehicle
  const fuelByVehicle = fuelData.reduce((acc: any[], f: any) => {
    const vehicleReg = f.vehicle?.registration_number || 'Unknown';
    const existing = acc.find(v => v.vehicle === vehicleReg);
    if (existing) {
      existing.liters += f.quantity_liters || 0;
      existing.cost += f.total_amount || 0;
      existing.entries += 1;
    } else {
      acc.push({
        vehicle: vehicleReg,
        liters: f.quantity_liters || 0,
        cost: f.total_amount || 0,
        entries: 1
      });
    }
    return acc;
  }, []).sort((a, b) => b.cost - a.cost);

  // Fuel by date for trend
  const fuelByDate = fuelData.reduce((acc: any[], f: any) => {
    const date = f.fuel_date;
    const existing = acc.find(d => d.date === date);
    if (existing) {
      existing.liters += f.quantity_liters || 0;
      existing.cost += f.total_amount || 0;
    } else {
      acc.push({
        date,
        liters: f.quantity_liters || 0,
        cost: f.total_amount || 0
      });
    }
    return acc;
  }, []).sort((a, b) => a.date.localeCompare(b.date));

  // Combine vehicle performance with fuel data
  const vehicleWithFuel = vehicleWiseData.map(v => {
    const fuel = fuelByVehicle.find(f => f.vehicle === v.vehicle);
    return {
      ...v,
      fuelLiters: fuel?.liters || 0,
      fuelCost: fuel?.cost || 0,
      efficiency: fuel?.liters > 0 ? (v.km / fuel.liters).toFixed(2) : '-'
    };
  });

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
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <Building2 className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">HCEs Covered</p>
                  <p className="text-2xl font-bold">{totalHCEs}</p>
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

        {/* Tabs for Route-wise, HCE-wise, Driver, Vehicle and Fuel Analytics */}
        <Tabs defaultValue="routes" className="space-y-6">
          <TabsList className="flex-wrap">
            <TabsTrigger value="routes">Route Analytics</TabsTrigger>
            <TabsTrigger value="hce">HCE Analytics</TabsTrigger>
            <TabsTrigger value="driver">Driver Performance</TabsTrigger>
            <TabsTrigger value="vehicle">Vehicle Performance</TabsTrigger>
            <TabsTrigger value="fuel">Fuel Analytics</TabsTrigger>
            <TabsTrigger value="details">Collection Details</TabsTrigger>
          </TabsList>

          <TabsContent value="routes" className="space-y-6">
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
          </TabsContent>

          {/* HCE Analytics Tab */}
          <TabsContent value="hce" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* HCE-wise Bar Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Top HCEs by Collection Weight (kg)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={hceWiseData.slice(0, 10)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="hce" type="category" width={120} tick={{ fontSize: 11 }} />
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

              {/* HCE Type Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Collection by HCE Type</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={hceTypeData}
                          dataKey="weight"
                          nameKey="type"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={({ type, percent }) => `${type}: ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {hceTypeData.map((_, index) => (
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

              {/* Waste Type Distribution */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Waste Type Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={wasteTypeData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="type" tick={{ fontSize: 12 }} />
                        <YAxis />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }} 
                        />
                        <Bar dataKey="weight" name="Weight (kg)" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="bags" name="Bags" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* HCE-wise Summary Table */}
            <Card>
              <CardHeader>
                <CardTitle>HCE-wise Collection Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>HCE Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Collections</TableHead>
                      <TableHead className="text-right">Total Weight (kg)</TableHead>
                      <TableHead className="text-right">Total Bags</TableHead>
                      <TableHead className="text-right">Avg Weight</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {hceWiseData.map((row, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{row.hce}</TableCell>
                        <TableCell>
                          <span className="px-2 py-1 rounded-full text-xs bg-muted">
                            {row.hceType}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">{row.collections}</TableCell>
                        <TableCell className="text-right">{row.weight.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{row.bags}</TableCell>
                        <TableCell className="text-right">{(row.weight / row.collections).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                    {hceWiseData.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No HCE collection data available for the selected period
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* HCE Type Summary */}
            <Card>
              <CardHeader>
                <CardTitle>HCE Type Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>HCE Type</TableHead>
                      <TableHead className="text-right">HCE Count</TableHead>
                      <TableHead className="text-right">Total Weight (kg)</TableHead>
                      <TableHead className="text-right">Total Bags</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {hceTypeData.map((row, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium capitalize">{row.type}</TableCell>
                        <TableCell className="text-right">{row.count}</TableCell>
                        <TableCell className="text-right">{row.weight.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{row.bags}</TableCell>
                      </TableRow>
                    ))}
                    {hceTypeData.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          No data available
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Driver Performance Tab */}
          <TabsContent value="driver" className="space-y-6">
            {/* Driver Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Active Drivers</p>
                      <p className="text-2xl font-bold">{totalDrivers}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-secondary/10 rounded-lg">
                      <Route className="h-6 w-6 text-secondary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total KM Traveled</p>
                      <p className="text-2xl font-bold">{totalKm.toFixed(1)} km</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-accent/10 rounded-lg">
                      <TrendingUp className="h-6 w-6 text-accent-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Avg KM/Trip</p>
                      <p className="text-2xl font-bold">{totalTrips > 0 ? (totalKm / totalTrips).toFixed(1) : 0} km</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Driver-wise Weight Bar Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Driver-wise Collection (Weight in kg)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={driverWiseData.slice(0, 10)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="driver" type="category" width={100} tick={{ fontSize: 11 }} />
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

              {/* Driver-wise Trips Pie Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Trips Distribution by Driver</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={driverWiseData.slice(0, 8)}
                          dataKey="trips"
                          nameKey="driver"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={({ driver, percent }) => `${driver.split(' ')[0]}: ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {driverWiseData.slice(0, 8).map((_, index) => (
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

              {/* Driver-wise KM Chart */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Kilometers Traveled by Driver</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={driverWiseData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="driver" tick={{ fontSize: 11 }} />
                        <YAxis />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }} 
                        />
                        <Bar dataKey="km" name="KM Traveled" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Driver Performance Summary Table */}
            <Card>
              <CardHeader>
                <CardTitle>Driver Performance Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Driver Name</TableHead>
                      <TableHead className="text-right">Total Trips</TableHead>
                      <TableHead className="text-right">Total Weight (kg)</TableHead>
                      <TableHead className="text-right">Total Bags</TableHead>
                      <TableHead className="text-right">KM Traveled</TableHead>
                      <TableHead className="text-right">Avg Weight/Trip</TableHead>
                      <TableHead className="text-right">Avg KM/Trip</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {driverWiseData.map((row, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{row.driver}</TableCell>
                        <TableCell className="text-right">{row.trips}</TableCell>
                        <TableCell className="text-right">{row.weight.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{row.bags}</TableCell>
                        <TableCell className="text-right">{row.km.toFixed(1)}</TableCell>
                        <TableCell className="text-right">{(row.weight / row.trips).toFixed(2)}</TableCell>
                        <TableCell className="text-right">{(row.km / row.trips).toFixed(1)}</TableCell>
                      </TableRow>
                    ))}
                    {driverWiseData.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          No driver data available for the selected period
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Vehicle Performance Tab */}
          <TabsContent value="vehicle" className="space-y-6">
            {/* Vehicle Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <Truck className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Active Vehicles</p>
                      <p className="text-2xl font-bold">{totalVehicles}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-secondary/10 rounded-lg">
                      <Route className="h-6 w-6 text-secondary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Avg KM/Vehicle</p>
                      <p className="text-2xl font-bold">{totalVehicles > 0 ? (totalKm / totalVehicles).toFixed(1) : 0} km</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${vehiclesNeedingAttention > 0 ? 'bg-destructive/10' : 'bg-green-500/10'}`}>
                      <TrendingUp className={`h-6 w-6 ${vehiclesNeedingAttention > 0 ? 'text-destructive' : 'text-green-500'}`} />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Needs Attention</p>
                      <p className="text-2xl font-bold">{vehiclesNeedingAttention}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Vehicle-wise Trips Bar Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Vehicle-wise Trips</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={vehicleWiseData.slice(0, 10)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="vehicle" type="category" width={100} tick={{ fontSize: 11 }} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }} 
                        />
                        <Bar dataKey="trips" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Vehicle Mileage Pie Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Mileage Distribution by Vehicle</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={vehicleWiseData.filter(v => v.km > 0).slice(0, 8)}
                          dataKey="km"
                          nameKey="vehicle"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={({ vehicle, percent }) => `${vehicle.slice(-6)}: ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {vehicleWiseData.slice(0, 8).map((_, index) => (
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

              {/* Vehicle KM Chart */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Kilometers Traveled by Vehicle</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={vehicleWiseData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="vehicle" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                        <YAxis />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }} 
                        />
                        <Bar dataKey="km" name="KM Traveled" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Vehicle Performance Summary Table */}
            <Card>
              <CardHeader>
                <CardTitle>Vehicle Performance Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Total Trips</TableHead>
                      <TableHead className="text-right">Total Weight (kg)</TableHead>
                      <TableHead className="text-right">KM Traveled</TableHead>
                      <TableHead className="text-right">Avg KM/Trip</TableHead>
                      <TableHead>Insurance</TableHead>
                      <TableHead>Fitness</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vehicleWiseData.map((row, index) => {
                      const insuranceDate = row.insuranceExpiry ? new Date(row.insuranceExpiry) : null;
                      const fitnessDate = row.fitnessExpiry ? new Date(row.fitnessExpiry) : null;
                      const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
                      const insuranceExpired = insuranceDate && insuranceDate < today;
                      const insuranceExpiringSoon = insuranceDate && insuranceDate <= thirtyDaysFromNow && insuranceDate >= today;
                      const fitnessExpired = fitnessDate && fitnessDate < today;
                      const fitnessExpiringSoon = fitnessDate && fitnessDate <= thirtyDaysFromNow && fitnessDate >= today;
                      
                      return (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{row.vehicle}</TableCell>
                          <TableCell>
                            <span className="px-2 py-1 rounded-full text-xs bg-muted capitalize">
                              {row.vehicleType}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">{row.trips}</TableCell>
                          <TableCell className="text-right">{row.weight.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{row.km.toFixed(1)}</TableCell>
                          <TableCell className="text-right">{(row.km / row.trips).toFixed(1)}</TableCell>
                          <TableCell>
                            {insuranceDate ? (
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                insuranceExpired 
                                  ? 'bg-destructive/20 text-destructive' 
                                  : insuranceExpiringSoon 
                                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100'
                                    : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
                              }`}>
                                {format(insuranceDate, 'dd MMM yyyy')}
                              </span>
                            ) : '-'}
                          </TableCell>
                          <TableCell>
                            {fitnessDate ? (
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                fitnessExpired 
                                  ? 'bg-destructive/20 text-destructive' 
                                  : fitnessExpiringSoon 
                                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100'
                                    : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
                              }`}>
                                {format(fitnessDate, 'dd MMM yyyy')}
                              </span>
                            ) : '-'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {vehicleWiseData.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          No vehicle data available for the selected period
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Fuel Analytics Tab */}
          <TabsContent value="fuel" className="space-y-6">
            {/* Fuel Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <Fuel className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Fuel</p>
                      <p className="text-2xl font-bold">{totalFuelLiters.toFixed(1)} L</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-secondary/10 rounded-lg">
                      <Weight className="h-6 w-6 text-secondary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Cost</p>
                      <p className="text-2xl font-bold">₹{totalFuelCost.toFixed(0)}</p>
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
                      <p className="text-sm text-muted-foreground">Total KM</p>
                      <p className="text-2xl font-bold">{totalKm.toFixed(0)} km</p>
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
                      <p className="text-sm text-muted-foreground">Avg Efficiency</p>
                      <p className="text-2xl font-bold">{avgFuelEfficiency} km/L</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Fuel Cost by Vehicle */}
              <Card>
                <CardHeader>
                  <CardTitle>Fuel Cost by Vehicle (₹)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={fuelByVehicle.slice(0, 10)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="vehicle" type="category" width={100} tick={{ fontSize: 11 }} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                          formatter={(value: number) => [`₹${value.toFixed(2)}`, 'Cost']}
                        />
                        <Bar dataKey="cost" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Fuel Consumption by Vehicle */}
              <Card>
                <CardHeader>
                  <CardTitle>Fuel Consumption by Vehicle (Liters)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={fuelByVehicle.filter(v => v.liters > 0).slice(0, 8)}
                          dataKey="liters"
                          nameKey="vehicle"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={({ vehicle, percent }) => `${vehicle.slice(-6)}: ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {fuelByVehicle.slice(0, 8).map((_, index) => (
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

              {/* Fuel Cost Trend */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Daily Fuel Consumption Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={fuelByDate}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 11 }} 
                          tickFormatter={(value) => format(new Date(value), 'dd MMM')}
                        />
                        <YAxis yAxisId="left" orientation="left" />
                        <YAxis yAxisId="right" orientation="right" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                          labelFormatter={(value) => format(new Date(value), 'dd MMM yyyy')}
                        />
                        <Bar yAxisId="left" dataKey="liters" name="Liters" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        <Bar yAxisId="right" dataKey="cost" name="Cost (₹)" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Vehicle Fuel Efficiency Table */}
            <Card>
              <CardHeader>
                <CardTitle>Vehicle Fuel Efficiency Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vehicle</TableHead>
                      <TableHead className="text-right">Trips</TableHead>
                      <TableHead className="text-right">KM Traveled</TableHead>
                      <TableHead className="text-right">Fuel (L)</TableHead>
                      <TableHead className="text-right">Fuel Cost (₹)</TableHead>
                      <TableHead className="text-right">Efficiency (km/L)</TableHead>
                      <TableHead className="text-right">Cost/KM (₹)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vehicleWithFuel.map((row, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{row.vehicle}</TableCell>
                        <TableCell className="text-right">{row.trips}</TableCell>
                        <TableCell className="text-right">{row.km.toFixed(1)}</TableCell>
                        <TableCell className="text-right">{row.fuelLiters.toFixed(1)}</TableCell>
                        <TableCell className="text-right">₹{row.fuelCost.toFixed(0)}</TableCell>
                        <TableCell className="text-right">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            parseFloat(row.efficiency) >= 4 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
                              : parseFloat(row.efficiency) >= 2.5
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100'
                                : row.efficiency === '-' 
                                  ? 'bg-muted text-muted-foreground'
                                  : 'bg-destructive/20 text-destructive'
                          }`}>
                            {row.efficiency}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {row.km > 0 && row.fuelCost > 0 
                            ? `₹${(row.fuelCost / row.km).toFixed(2)}`
                            : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                    {vehicleWithFuel.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          No fuel data available for the selected period
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Collection Details Tab */}
          <TabsContent value="details" className="space-y-6">
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
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
