import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DataTable } from "@/components/common/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Plus, Pencil, Trash2, Fuel, TrendingUp, IndianRupee } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface FuelEntry {
  id: string;
  vehicle_id: string | null;
  fuel_date: string;
  fuel_type: string | null;
  quantity_liters: number;
  price_per_liter: number;
  total_amount: number;
  odometer_reading: number | null;
  fuel_station: string | null;
  receipt_number: string | null;
  notes: string | null;
  vehicle?: { registration_number: string } | null;
}

export default function FuelConsumption() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<FuelEntry | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [formData, setFormData] = useState({
    vehicle_id: "",
    fuel_date: format(new Date(), 'yyyy-MM-dd'),
    fuel_type: "diesel",
    quantity_liters: "",
    price_per_liter: "",
    odometer_reading: "",
    fuel_station: "",
    receipt_number: "",
    notes: "",
  });

  // Fetch vehicles
  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicles')
        .select('id, registration_number')
        .eq('status', 'active')
        .order('registration_number');
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch fuel entries
  const { data: fuelEntries = [], isLoading } = useQuery({
    queryKey: ['fuel-consumption'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fuel_consumption' as any)
        .select(`
          *,
          vehicle:vehicle_id(registration_number)
        `)
        .order('fuel_date', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as FuelEntry[];
    }
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase
        .from('fuel_consumption' as any)
        .insert([data]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-consumption'] });
      toast({ title: "Success", description: "Fuel entry created successfully" });
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { error } = await supabase
        .from('fuel_consumption' as any)
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-consumption'] });
      toast({ title: "Success", description: "Fuel entry updated successfully" });
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('fuel_consumption' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-consumption'] });
      toast({ title: "Success", description: "Fuel entry deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const resetForm = () => {
    setFormData({
      vehicle_id: "",
      fuel_date: format(new Date(), 'yyyy-MM-dd'),
      fuel_type: "diesel",
      quantity_liters: "",
      price_per_liter: "",
      odometer_reading: "",
      fuel_station: "",
      receipt_number: "",
      notes: "",
    });
    setEditingEntry(null);
    setIsOpen(false);
  };

  const handleEdit = (entry: FuelEntry) => {
    setEditingEntry(entry);
    setFormData({
      vehicle_id: entry.vehicle_id || "",
      fuel_date: entry.fuel_date,
      fuel_type: entry.fuel_type || "diesel",
      quantity_liters: entry.quantity_liters.toString(),
      price_per_liter: entry.price_per_liter.toString(),
      odometer_reading: entry.odometer_reading?.toString() || "",
      fuel_station: entry.fuel_station || "",
      receipt_number: entry.receipt_number || "",
      notes: entry.notes || "",
    });
    setIsOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const quantity = parseFloat(formData.quantity_liters);
    const pricePerLiter = parseFloat(formData.price_per_liter);
    const totalAmount = quantity * pricePerLiter;

    const data = {
      vehicle_id: formData.vehicle_id || null,
      fuel_date: formData.fuel_date,
      fuel_type: formData.fuel_type,
      quantity_liters: quantity,
      price_per_liter: pricePerLiter,
      total_amount: totalAmount,
      odometer_reading: formData.odometer_reading ? parseFloat(formData.odometer_reading) : null,
      fuel_station: formData.fuel_station || null,
      receipt_number: formData.receipt_number || null,
      notes: formData.notes || null,
    };

    if (editingEntry) {
      updateMutation.mutate({ id: editingEntry.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  // Calculate summary stats
  const totalLiters = fuelEntries.reduce((sum, e) => sum + (e.quantity_liters || 0), 0);
  const totalCost = fuelEntries.reduce((sum, e) => sum + (e.total_amount || 0), 0);
  const avgPricePerLiter = fuelEntries.length > 0 
    ? fuelEntries.reduce((sum, e) => sum + (e.price_per_liter || 0), 0) / fuelEntries.length 
    : 0;

  // Filter entries based on search
  const filteredEntries = fuelEntries.filter(entry => 
    entry.vehicle?.registration_number?.toLowerCase().includes(searchValue.toLowerCase()) ||
    entry.fuel_station?.toLowerCase().includes(searchValue.toLowerCase()) ||
    entry.receipt_number?.toLowerCase().includes(searchValue.toLowerCase())
  );
  const columns = [
    {
      key: 'fuel_date',
      header: 'Date',
      cell: (entry: FuelEntry) => format(new Date(entry.fuel_date), 'dd MMM yyyy')
    },
    {
      key: 'vehicle',
      header: 'Vehicle',
      cell: (entry: FuelEntry) => entry.vehicle?.registration_number || '-'
    },
    {
      key: 'fuel_type',
      header: 'Fuel Type',
      cell: (entry: FuelEntry) => (
        <span className="capitalize">{entry.fuel_type}</span>
      )
    },
    {
      key: 'quantity_liters',
      header: 'Quantity (L)',
      cell: (entry: FuelEntry) => entry.quantity_liters.toFixed(2)
    },
    {
      key: 'price_per_liter',
      header: 'Rate/L (₹)',
      cell: (entry: FuelEntry) => `₹${entry.price_per_liter.toFixed(2)}`
    },
    {
      key: 'total_amount',
      header: 'Total (₹)',
      cell: (entry: FuelEntry) => `₹${entry.total_amount.toFixed(2)}`
    },
    {
      key: 'odometer_reading',
      header: 'Odometer',
      cell: (entry: FuelEntry) => entry.odometer_reading ? `${entry.odometer_reading} km` : '-'
    },
    {
      key: 'fuel_station',
      header: 'Station',
      cell: (entry: FuelEntry) => entry.fuel_station || '-'
    },
    {
      key: 'actions',
      header: 'Actions',
      cell: (entry: FuelEntry) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={() => handleEdit(entry)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => {
              if (confirm('Are you sure you want to delete this entry?')) {
                deleteMutation.mutate(entry.id);
              }
            }}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Fuel Consumption</h1>
          <p className="text-muted-foreground">Track fuel purchases and consumption for vehicles</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Fuel className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Fuel</p>
                  <p className="text-2xl font-bold">{totalLiters.toFixed(2)} L</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-secondary/10 rounded-lg">
                  <IndianRupee className="h-6 w-6 text-secondary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Cost</p>
                  <p className="text-2xl font-bold">₹{totalCost.toFixed(2)}</p>
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
                  <p className="text-sm text-muted-foreground">Avg Rate/L</p>
                  <p className="text-2xl font-bold">₹{avgPricePerLiter.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DataTable
          data={filteredEntries}
          columns={columns}
          searchPlaceholder="Search by vehicle, station..."
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          loading={isLoading}
          onAdd={() => setIsOpen(true)}
          addLabel="Add Fuel Entry"
        />

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingEntry ? 'Edit Fuel Entry' : 'Add Fuel Entry'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Vehicle *</Label>
                  <Select 
                    value={formData.vehicle_id} 
                    onValueChange={(value) => setFormData({ ...formData, vehicle_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Vehicle" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicles.map((vehicle) => (
                        <SelectItem key={vehicle.id} value={vehicle.id}>
                          {vehicle.registration_number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Date *</Label>
                  <Input
                    type="date"
                    value={formData.fuel_date}
                    onChange={(e) => setFormData({ ...formData, fuel_date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fuel Type *</Label>
                  <Select 
                    value={formData.fuel_type} 
                    onValueChange={(value) => setFormData({ ...formData, fuel_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="diesel">Diesel</SelectItem>
                      <SelectItem value="petrol">Petrol</SelectItem>
                      <SelectItem value="cng">CNG</SelectItem>
                      <SelectItem value="electric">Electric</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Quantity (Liters) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.quantity_liters}
                    onChange={(e) => setFormData({ ...formData, quantity_liters: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Price per Liter (₹) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.price_per_liter}
                    onChange={(e) => setFormData({ ...formData, price_per_liter: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Total Amount</Label>
                  <Input
                    type="text"
                    value={formData.quantity_liters && formData.price_per_liter 
                      ? `₹${(parseFloat(formData.quantity_liters) * parseFloat(formData.price_per_liter)).toFixed(2)}`
                      : '₹0.00'}
                    disabled
                    className="bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Odometer Reading (km)</Label>
                  <Input
                    type="number"
                    value={formData.odometer_reading}
                    onChange={(e) => setFormData({ ...formData, odometer_reading: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fuel Station</Label>
                  <Input
                    value={formData.fuel_station}
                    onChange={(e) => setFormData({ ...formData, fuel_station: e.target.value })}
                    placeholder="Station name"
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Receipt Number</Label>
                  <Input
                    value={formData.receipt_number}
                    onChange={(e) => setFormData({ ...formData, receipt_number: e.target.value })}
                    placeholder="Receipt/Bill number"
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional notes"
                    rows={2}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingEntry ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
