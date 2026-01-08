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

interface KeilHCE {
  id: string;
  hce_code: string;
  hce_name: string;
  hce_type: string;
  address: string | null;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  route_id: string | null;
  license_number: string | null;
  beds_count: number;
  waste_category: string | null;
  collection_frequency: string;
  status: string;
  keil_routes?: { route_code: string; route_name: string } | null;
}

interface KeilRoute {
  id: string;
  route_code: string;
  route_name: string;
}

export default function HCEDetails() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingHCE, setEditingHCE] = useState<KeilHCE | null>(null);
  const [searchValue, setSearchValue] = useState('');
  const [formData, setFormData] = useState({
    hce_code: '',
    hce_name: '',
    hce_type: 'hospital',
    address: '',
    contact_person: '',
    phone: '',
    email: '',
    route_id: '',
    license_number: '',
    beds_count: 0,
    waste_category: '',
    collection_frequency: 'daily',
    status: 'active',
  });
  const queryClient = useQueryClient();

  const { data: hces = [], isLoading } = useQuery({
    queryKey: ['keil-hce'],
    queryFn: async () => {
      const { data, error } = await (supabase.from('keil_hce' as any).select('*, keil_routes(route_code, route_name)').order('hce_code') as any);
      if (error) throw error;
      return (data || []) as unknown as KeilHCE[];
    },
  });

  const { data: routes = [] } = useQuery({
    queryKey: ['keil-routes'],
    queryFn: async () => {
      const { data, error } = await (supabase.from('keil_routes' as any).select('id, route_code, route_name').eq('status', 'active').order('route_code') as any);
      if (error) throw error;
      return (data || []) as unknown as KeilRoute[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const insertData = { ...data, route_id: data.route_id || null };
      const { error } = await (supabase.from('keil_hce' as any).insert([insertData]) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keil-hce'] });
      toast.success('HCE created successfully');
      resetForm();
    },
    onError: (error: any) => toast.error(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const updateData = { ...data, route_id: data.route_id || null };
      const { error } = await (supabase.from('keil_hce' as any).update(updateData).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keil-hce'] });
      toast.success('HCE updated successfully');
      resetForm();
    },
    onError: (error: any) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('keil_hce' as any).delete().eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keil-hce'] });
      toast.success('HCE deleted successfully');
    },
    onError: (error: any) => toast.error(error.message),
  });

  const resetForm = () => {
    setFormData({ hce_code: '', hce_name: '', hce_type: 'hospital', address: '', contact_person: '', phone: '', email: '', route_id: '', license_number: '', beds_count: 0, waste_category: '', collection_frequency: 'daily', status: 'active' });
    setEditingHCE(null);
    setIsOpen(false);
  };

  const handleEdit = (hce: KeilHCE) => {
    setEditingHCE(hce);
    setFormData({
      hce_code: hce.hce_code,
      hce_name: hce.hce_name,
      hce_type: hce.hce_type || 'hospital',
      address: hce.address || '',
      contact_person: hce.contact_person || '',
      phone: hce.phone || '',
      email: hce.email || '',
      route_id: hce.route_id || '',
      license_number: hce.license_number || '',
      beds_count: hce.beds_count || 0,
      waste_category: hce.waste_category || '',
      collection_frequency: hce.collection_frequency || 'daily',
      status: hce.status || 'active',
    });
    setIsOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingHCE) {
      updateMutation.mutate({ id: editingHCE.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const filteredHces = hces.filter(h =>
    h.hce_name.toLowerCase().includes(searchValue.toLowerCase()) ||
    h.hce_code.toLowerCase().includes(searchValue.toLowerCase())
  );

  const columns: Column<KeilHCE>[] = [
    { key: 'hce_code', header: 'HCE Code' },
    { key: 'hce_name', header: 'HCE Name' },
    { key: 'hce_type', header: 'Type' },
    { key: 'route', header: 'Route', cell: (item) => item.keil_routes?.route_name || '-' },
    { key: 'contact_person', header: 'Contact', cell: (item) => item.contact_person || '-' },
    { key: 'phone', header: 'Phone', cell: (item) => item.phone || '-' },
    { key: 'beds_count', header: 'Beds' },
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
    <DashboardLayout breadcrumbs={[{ label: 'KEIL Operations' }, { label: 'HCE Details' }]}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Healthcare Establishment Details</h1>
        </div>

        <DataTable
          columns={columns}
          data={filteredHces}
          loading={isLoading}
          searchPlaceholder="Search HCEs..."
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          onAdd={() => { resetForm(); setIsOpen(true); }}
          addLabel="Add HCE"
        />

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingHCE ? 'Edit HCE' : 'Add New HCE'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div><Label>HCE Code *</Label><Input value={formData.hce_code} onChange={e => setFormData({ ...formData, hce_code: e.target.value })} required /></div>
                <div><Label>HCE Name *</Label><Input value={formData.hce_name} onChange={e => setFormData({ ...formData, hce_name: e.target.value })} required /></div>
                <div><Label>HCE Type</Label>
                  <Select value={formData.hce_type} onValueChange={v => setFormData({ ...formData, hce_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hospital">Hospital</SelectItem>
                      <SelectItem value="clinic">Clinic</SelectItem>
                      <SelectItem value="lab">Laboratory</SelectItem>
                      <SelectItem value="pharmacy">Pharmacy</SelectItem>
                      <SelectItem value="nursing_home">Nursing Home</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Route</Label>
                  <Select value={formData.route_id} onValueChange={v => setFormData({ ...formData, route_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select route" /></SelectTrigger>
                    <SelectContent>
                      {routes.map(r => <SelectItem key={r.id} value={r.id}>{r.route_code} - {r.route_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>License Number</Label><Input value={formData.license_number} onChange={e => setFormData({ ...formData, license_number: e.target.value })} /></div>
              </div>
              <div><Label>Address</Label><Textarea value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} /></div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label>Contact Person</Label><Input value={formData.contact_person} onChange={e => setFormData({ ...formData, contact_person: e.target.value })} /></div>
                <div><Label>Phone</Label><Input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} /></div>
                <div><Label>Email</Label><Input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div><Label>Beds Count</Label><Input type="number" value={formData.beds_count} onChange={e => setFormData({ ...formData, beds_count: Number(e.target.value) })} /></div>
                <div><Label>Waste Category</Label><Input value={formData.waste_category} onChange={e => setFormData({ ...formData, waste_category: e.target.value })} /></div>
                <div><Label>Collection Frequency</Label>
                  <Select value={formData.collection_frequency} onValueChange={v => setFormData({ ...formData, collection_frequency: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="alternate">Alternate Days</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
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
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
                <Button type="submit">{editingHCE ? 'Update' : 'Create'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
