import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DataTable, Column } from '@/components/common/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import type { Tables } from '@/integrations/supabase/types';

type Vehicle = Tables<'vehicles'>;

export default function Vehicles() {
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const { toast } = useToast();
  const { role } = useAuth();
  const queryClient = useQueryClient();

  const canEdit = role && ['super_admin', 'manager', 'data_entry'].includes(role);

  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ['vehicles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .order('registration_number');
      if (error) throw error;
      return data as Vehicle[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (vehicle: Omit<Vehicle, 'id' | 'created_at' | 'updated_at'>) => {
      const { error } = await supabase.from('vehicles').insert([vehicle]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast({ title: 'Vehicle added successfully' });
      setDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: 'Error adding vehicle', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...vehicle }: Partial<Vehicle> & { id: string }) => {
      const { error } = await supabase.from('vehicles').update(vehicle).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast({ title: 'Vehicle updated successfully' });
      setDialogOpen(false);
      setEditingVehicle(null);
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating vehicle', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('vehicles').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast({ title: 'Vehicle deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting vehicle', description: error.message, variant: 'destructive' });
    },
  });

  const filteredVehicles = vehicles.filter(
    (v) =>
      v.registration_number.toLowerCase().includes(search.toLowerCase()) ||
      v.make?.toLowerCase().includes(search.toLowerCase()) ||
      v.model?.toLowerCase().includes(search.toLowerCase()) ||
      v.vehicle_type?.toLowerCase().includes(search.toLowerCase())
  );

  const getExpiryStatus = (expiryDate: string | null) => {
    if (!expiryDate) return null;
    const days = differenceInDays(parseISO(expiryDate), new Date());
    if (days < 0) return { label: 'Expired', variant: 'destructive' as const, icon: true };
    if (days <= 30) return { label: `${days}d left`, variant: 'outline' as const, icon: true };
    return { label: format(parseISO(expiryDate), 'dd MMM yyyy'), variant: 'secondary' as const, icon: false };
  };

  const columns: Column<Vehicle>[] = [
    { key: 'registration_number', header: 'Registration No.' },
    { key: 'vehicle_type', header: 'Type' },
    {
      key: 'make_model',
      header: 'Make / Model',
      cell: (v) => `${v.make || '-'} ${v.model || ''}`.trim() || '-',
    },
    { key: 'purpose', header: 'Purpose' },
    {
      key: 'fitness_expiry',
      header: 'Fitness Expiry',
      cell: (v) => {
        const status = getExpiryStatus(v.fitness_expiry);
        if (!status) return '-';
        return (
          <Badge variant={status.variant} className="gap-1">
            {status.icon && <AlertTriangle className="h-3 w-3" />}
            {status.label}
          </Badge>
        );
      },
    },
    {
      key: 'insurance_expiry',
      header: 'Insurance Expiry',
      cell: (v) => {
        const status = getExpiryStatus(v.insurance_expiry);
        if (!status) return '-';
        return (
          <Badge variant={status.variant} className="gap-1">
            {status.icon && <AlertTriangle className="h-3 w-3" />}
            {status.label}
          </Badge>
        );
      },
    },
    {
      key: 'gps_enabled',
      header: 'GPS',
      cell: (v) => (
        <Badge variant={v.gps_enabled ? 'default' : 'outline'}>
          {v.gps_enabled ? 'Yes' : 'No'}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (v) => (
        <Badge variant={v.status === 'active' ? 'default' : 'secondary'}>
          {v.status}
        </Badge>
      ),
    },
    ...(canEdit
      ? [
          {
            key: 'actions',
            header: 'Actions',
            cell: (v: Vehicle) => (
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setEditingVehicle(v);
                    setDialogOpen(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (confirm('Delete this vehicle?')) deleteMutation.mutate(v.id);
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ),
          },
        ]
      : []),
  ];

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const vehicle = {
      registration_number: formData.get('registration_number') as string,
      vehicle_type: formData.get('vehicle_type') as string,
      make: formData.get('make') as string,
      model: formData.get('model') as string,
      purpose: formData.get('purpose') as string,
      fitness_expiry: (formData.get('fitness_expiry') as string) || null,
      insurance_expiry: (formData.get('insurance_expiry') as string) || null,
      gps_enabled: formData.get('gps_enabled') === 'on',
      status: formData.get('status') as string,
    };

    if (editingVehicle) {
      updateMutation.mutate({ id: editingVehicle.id, ...vehicle });
    } else {
      createMutation.mutate(vehicle);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Vehicles</h1>
          <p className="text-muted-foreground">Manage company vehicles and track document expiries</p>
        </div>

        <DataTable
          columns={columns}
          data={filteredVehicles}
          loading={isLoading}
          searchPlaceholder="Search vehicles..."
          searchValue={search}
          onSearchChange={setSearch}
          onAdd={() => {
            setEditingVehicle(null);
            setDialogOpen(true);
          }}
          addLabel="Add Vehicle"
          canAdd={!!canEdit}
          emptyMessage="No vehicles found"
        />

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingVehicle ? 'Edit Vehicle' : 'Add Vehicle'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="registration_number">Registration No. *</Label>
                  <Input
                    id="registration_number"
                    name="registration_number"
                    defaultValue={editingVehicle?.registration_number || ''}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vehicle_type">Vehicle Type</Label>
                  <Select name="vehicle_type" defaultValue={editingVehicle?.vehicle_type || ''}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Truck">Truck</SelectItem>
                      <SelectItem value="Van">Van</SelectItem>
                      <SelectItem value="Car">Car</SelectItem>
                      <SelectItem value="Bike">Bike</SelectItem>
                      <SelectItem value="Tempo">Tempo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="make">Make</Label>
                  <Input id="make" name="make" defaultValue={editingVehicle?.make || ''} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model">Model</Label>
                  <Input id="model" name="model" defaultValue={editingVehicle?.model || ''} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="purpose">Purpose</Label>
                <Input id="purpose" name="purpose" defaultValue={editingVehicle?.purpose || ''} placeholder="e.g., Delivery, Staff Transport" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fitness_expiry">Fitness Expiry</Label>
                  <Input
                    id="fitness_expiry"
                    name="fitness_expiry"
                    type="date"
                    defaultValue={editingVehicle?.fitness_expiry || ''}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="insurance_expiry">Insurance Expiry</Label>
                  <Input
                    id="insurance_expiry"
                    name="insurance_expiry"
                    type="date"
                    defaultValue={editingVehicle?.insurance_expiry || ''}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    id="gps_enabled"
                    name="gps_enabled"
                    defaultChecked={editingVehicle?.gps_enabled || false}
                  />
                  <Label htmlFor="gps_enabled">GPS Enabled</Label>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select name="status" defaultValue={editingVehicle?.status || 'active'}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingVehicle ? 'Update' : 'Add'} Vehicle
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
