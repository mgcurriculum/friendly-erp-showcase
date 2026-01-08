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
import { Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface KeilRoute {
  id: string;
  route_code: string;
  route_name: string;
  route_type: string;
  branch: string | null;
  area: string | null;
  description: string | null;
  status: string;
  created_at: string;
}

export default function RouteManagement() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<KeilRoute | null>(null);
  const [searchValue, setSearchValue] = useState('');
  const [formData, setFormData] = useState({
    route_code: '',
    route_name: '',
    route_type: 'regular',
    branch: '',
    area: '',
    description: '',
    status: 'active',
  });
  const queryClient = useQueryClient();

  const { data: routes = [], isLoading } = useQuery({
    queryKey: ['keil-routes'],
    queryFn: async () => {
      const { data, error } = await (supabase.from('keil_routes' as any).select('*').order('route_code') as any);
      if (error) throw error;
      return (data || []) as unknown as KeilRoute[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await (supabase.from('keil_routes' as any).insert([data]) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keil-routes'] });
      toast.success('Route created successfully');
      resetForm();
    },
    onError: (error: any) => toast.error(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await (supabase.from('keil_routes' as any).update(data).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keil-routes'] });
      toast.success('Route updated successfully');
      resetForm();
    },
    onError: (error: any) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('keil_routes' as any).delete().eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keil-routes'] });
      toast.success('Route deleted successfully');
    },
    onError: (error: any) => toast.error(error.message),
  });

  const resetForm = () => {
    setFormData({ route_code: '', route_name: '', route_type: 'regular', branch: '', area: '', description: '', status: 'active' });
    setEditingRoute(null);
    setIsOpen(false);
  };

  const handleEdit = (route: KeilRoute) => {
    setEditingRoute(route);
    setFormData({
      route_code: route.route_code,
      route_name: route.route_name,
      route_type: route.route_type || 'regular',
      branch: route.branch || '',
      area: route.area || '',
      description: route.description || '',
      status: route.status || 'active',
    });
    setIsOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRoute) {
      updateMutation.mutate({ id: editingRoute.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const filteredRoutes = routes.filter(r =>
    r.route_name.toLowerCase().includes(searchValue.toLowerCase()) ||
    r.route_code.toLowerCase().includes(searchValue.toLowerCase())
  );

  const columns: Column<KeilRoute>[] = [
    { key: 'route_code', header: 'Route Code' },
    { key: 'route_name', header: 'Route Name' },
    { key: 'route_type', header: 'Type' },
    { key: 'branch', header: 'Branch', cell: (item) => item.branch || '-' },
    { key: 'area', header: 'Area', cell: (item) => item.area || '-' },
    { key: 'status', header: 'Status', cell: (item) => (
      <span className={`px-2 py-1 rounded-full text-xs ${item.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
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
    <DashboardLayout breadcrumbs={[{ label: 'KEIL Operations' }, { label: 'Route Management' }]}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Route Management</h1>
        </div>

        <DataTable
          columns={columns}
          data={filteredRoutes}
          loading={isLoading}
          searchPlaceholder="Search routes..."
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          onAdd={() => { resetForm(); setIsOpen(true); }}
          addLabel="Add Route"
        />

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingRoute ? 'Edit Route' : 'Add New Route'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Route Code *</Label><Input value={formData.route_code} onChange={e => setFormData({ ...formData, route_code: e.target.value })} required /></div>
                <div><Label>Route Name *</Label><Input value={formData.route_name} onChange={e => setFormData({ ...formData, route_name: e.target.value })} required /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Route Type</Label>
                  <Select value={formData.route_type} onValueChange={v => setFormData({ ...formData, route_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="regular">Regular</SelectItem>
                      <SelectItem value="express">Express</SelectItem>
                      <SelectItem value="special">Special</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Status</Label>
                  <Select value={formData.status} onValueChange={v => setFormData({ ...formData, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Branch</Label><Input value={formData.branch} onChange={e => setFormData({ ...formData, branch: e.target.value })} /></div>
                <div><Label>Area</Label><Input value={formData.area} onChange={e => setFormData({ ...formData, area: e.target.value })} /></div>
              </div>
              <div><Label>Description</Label><Textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} /></div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
                <Button type="submit">{editingRoute ? 'Update' : 'Create'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
