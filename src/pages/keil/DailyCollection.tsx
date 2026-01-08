import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DataTable, Column } from '@/components/common/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Pencil, Trash2, Truck, MapPin, Weight, Package } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface KeilCollection {
  id: string;
  collection_number: string;
  collection_date: string;
  route_id: string | null;
  vehicle_id: string | null;
  driver_id: string | null;
  helper_id: string | null;
  start_time: string | null;
  end_time: string | null;
  start_km: number;
  end_km: number;
  total_weight: number;
  total_bags: number;
  notes: string | null;
  status: string;
  keil_routes?: { route_code: string; route_name: string } | null;
  vehicles?: { registration_number: string } | null;
}

export default function DailyCollection() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<KeilCollection | null>(null);
  const [searchValue, setSearchValue] = useState('');
  const [formData, setFormData] = useState({
    collection_number: '',
    collection_date: format(new Date(), 'yyyy-MM-dd'),
    route_id: '',
    vehicle_id: '',
    driver_id: '',
    helper_id: '',
    start_time: '',
    end_time: '',
    start_km: 0,
    end_km: 0,
    total_weight: 0,
    total_bags: 0,
    notes: '',
    status: 'pending',
  });
  const queryClient = useQueryClient();

  const { data: collections = [], isLoading } = useQuery({
    queryKey: ['keil-collections'],
    queryFn: async () => {
      const { data, error } = await (supabase.from('keil_collections' as any).select('*, keil_routes(route_code, route_name), vehicles(registration_number)').order('collection_date', { ascending: false }) as any);
      if (error) throw error;
      return (data || []) as unknown as KeilCollection[];
    },
  });

  const { data: routes = [] } = useQuery({
    queryKey: ['keil-routes-active'],
    queryFn: async () => {
      const { data, error } = await (supabase.from('keil_routes' as any).select('id, route_code, route_name').eq('status', 'active').order('route_code') as any);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles-active'],
    queryFn: async () => {
      const { data, error } = await supabase.from('vehicles').select('id, registration_number').eq('status', 'active').order('registration_number');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees-active'],
    queryFn: async () => {
      const { data, error } = await supabase.from('employees').select('id, code, name').eq('status', 'active').order('name');
      if (error) throw error;
      return data || [];
    },
  });

  const generateNumber = () => {
    const date = new Date();
    const prefix = 'COL';
    const timestamp = format(date, 'yyyyMMddHHmmss');
    return `${prefix}${timestamp}`;
  };

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const insertData = {
        ...data,
        collection_number: data.collection_number || generateNumber(),
        route_id: data.route_id || null,
        vehicle_id: data.vehicle_id || null,
        driver_id: data.driver_id || null,
        helper_id: data.helper_id || null,
        start_time: data.start_time || null,
        end_time: data.end_time || null,
      };
      const { error } = await (supabase.from('keil_collections' as any).insert([insertData]) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keil-collections'] });
      toast.success('Collection entry created successfully');
      resetForm();
    },
    onError: (error: any) => toast.error(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const updateData = {
        ...data,
        route_id: data.route_id || null,
        vehicle_id: data.vehicle_id || null,
        driver_id: data.driver_id || null,
        helper_id: data.helper_id || null,
        start_time: data.start_time || null,
        end_time: data.end_time || null,
      };
      const { error } = await (supabase.from('keil_collections' as any).update(updateData).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keil-collections'] });
      toast.success('Collection entry updated successfully');
      resetForm();
    },
    onError: (error: any) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('keil_collections' as any).delete().eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keil-collections'] });
      toast.success('Collection entry deleted successfully');
    },
    onError: (error: any) => toast.error(error.message),
  });

  const resetForm = () => {
    setFormData({ collection_number: '', collection_date: format(new Date(), 'yyyy-MM-dd'), route_id: '', vehicle_id: '', driver_id: '', helper_id: '', start_time: '', end_time: '', start_km: 0, end_km: 0, total_weight: 0, total_bags: 0, notes: '', status: 'pending' });
    setEditingCollection(null);
    setIsOpen(false);
  };

  const handleEdit = (collection: KeilCollection) => {
    setEditingCollection(collection);
    setFormData({
      collection_number: collection.collection_number,
      collection_date: collection.collection_date,
      route_id: collection.route_id || '',
      vehicle_id: collection.vehicle_id || '',
      driver_id: collection.driver_id || '',
      helper_id: collection.helper_id || '',
      start_time: collection.start_time || '',
      end_time: collection.end_time || '',
      start_km: collection.start_km || 0,
      end_km: collection.end_km || 0,
      total_weight: collection.total_weight || 0,
      total_bags: collection.total_bags || 0,
      notes: collection.notes || '',
      status: collection.status || 'pending',
    });
    setIsOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCollection) {
      updateMutation.mutate({ id: editingCollection.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  // Summary stats
  const todayCollections = collections.filter(c => c.collection_date === format(new Date(), 'yyyy-MM-dd'));
  const totalWeight = todayCollections.reduce((sum, c) => sum + (c.total_weight || 0), 0);
  const totalBags = todayCollections.reduce((sum, c) => sum + (c.total_bags || 0), 0);

  const filteredCollections = collections.filter(c =>
    c.collection_number.toLowerCase().includes(searchValue.toLowerCase())
  );

  const columns: Column<KeilCollection>[] = [
    { key: 'collection_number', header: 'Collection #' },
    { key: 'collection_date', header: 'Date', cell: (item) => format(new Date(item.collection_date), 'dd/MM/yyyy') },
    { key: 'route', header: 'Route', cell: (item) => item.keil_routes?.route_name || '-' },
    { key: 'vehicle', header: 'Vehicle', cell: (item) => item.vehicles?.registration_number || '-' },
    { key: 'total_weight', header: 'Weight (kg)' },
    { key: 'total_bags', header: 'Bags' },
    { key: 'km_run', header: 'KM Run', cell: (item) => (item.end_km - item.start_km) || 0 },
    { key: 'status', header: 'Status', cell: (item) => (
      <span className={`px-2 py-1 rounded-full text-xs ${item.status === 'completed' ? 'bg-green-100 text-green-800' : item.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>
        {item.status}
      </span>
    )},
    { key: 'actions', header: 'Actions', cell: (item) => (
      <div className="flex gap-2">
        <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}><Pencil className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
      </div>
    )},
  ];

  return (
    <DashboardLayout breadcrumbs={[{ label: 'KEIL Operations' }, { label: 'Daily Collection' }]}>
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Today's Collections</CardTitle><Truck className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{todayCollections.length}</div></CardContent></Card>
          <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Weight</CardTitle><Weight className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{totalWeight.toFixed(2)} kg</div></CardContent></Card>
          <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Bags</CardTitle><Package className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{totalBags}</div></CardContent></Card>
          <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Active Routes</CardTitle><MapPin className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{routes.length}</div></CardContent></Card>
        </div>

        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Daily Collection Entry</h1>
        </div>

        <DataTable
          columns={columns}
          data={filteredCollections}
          loading={isLoading}
          searchPlaceholder="Search collections..."
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          onAdd={() => { resetForm(); setFormData(f => ({ ...f, collection_number: generateNumber() })); setIsOpen(true); }}
          addLabel="New Collection"
        />

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{editingCollection ? 'Edit Collection' : 'New Collection Entry'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div><Label>Collection Number</Label><Input value={formData.collection_number} readOnly className="bg-muted" /></div>
                <div><Label>Date *</Label><Input type="date" value={formData.collection_date} onChange={e => setFormData({ ...formData, collection_date: e.target.value })} required /></div>
                <div><Label>Status</Label>
                  <Select value={formData.status} onValueChange={v => setFormData({ ...formData, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Route</Label>
                  <Select value={formData.route_id} onValueChange={v => setFormData({ ...formData, route_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select route" /></SelectTrigger>
                    <SelectContent>
                      {routes.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.route_code} - {r.route_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Vehicle</Label>
                  <Select value={formData.vehicle_id} onValueChange={v => setFormData({ ...formData, vehicle_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                    <SelectContent>
                      {vehicles.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.registration_number}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Driver</Label>
                  <Select value={formData.driver_id} onValueChange={v => setFormData({ ...formData, driver_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select driver" /></SelectTrigger>
                    <SelectContent>
                      {employees.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.code} - {e.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Helper</Label>
                  <Select value={formData.helper_id} onValueChange={v => setFormData({ ...formData, helper_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select helper" /></SelectTrigger>
                    <SelectContent>
                      {employees.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.code} - {e.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div><Label>Start Time</Label><Input type="time" value={formData.start_time} onChange={e => setFormData({ ...formData, start_time: e.target.value })} /></div>
                <div><Label>End Time</Label><Input type="time" value={formData.end_time} onChange={e => setFormData({ ...formData, end_time: e.target.value })} /></div>
                <div><Label>Start KM</Label><Input type="number" value={formData.start_km} onChange={e => setFormData({ ...formData, start_km: Number(e.target.value) })} /></div>
                <div><Label>End KM</Label><Input type="number" value={formData.end_km} onChange={e => setFormData({ ...formData, end_km: Number(e.target.value) })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Total Weight (kg)</Label><Input type="number" step="0.01" value={formData.total_weight} onChange={e => setFormData({ ...formData, total_weight: Number(e.target.value) })} /></div>
                <div><Label>Total Bags</Label><Input type="number" value={formData.total_bags} onChange={e => setFormData({ ...formData, total_bags: Number(e.target.value) })} /></div>
              </div>
              <div><Label>Notes</Label><Textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} /></div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
                <Button type="submit">{editingCollection ? 'Update' : 'Create'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
