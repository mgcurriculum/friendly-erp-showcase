import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DataTable, Column } from '@/components/common/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface MaterialConsumption {
  id: string;
  batch_id: string | null;
  raw_material_id: string | null;
  quantity: number;
  consumption_date: string;
  created_at: string;
  production_batches?: { batch_number: string } | null;
  raw_materials?: { name: string; code: string; unit: string } | null;
}

export default function MaterialConsumption() {
  const { role } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MaterialConsumption | null>(null);

  const canEdit = role === 'super_admin' || role === 'manager' || role === 'data_entry';

  const [formData, setFormData] = useState({
    batch_id: '',
    raw_material_id: '',
    quantity: '',
    consumption_date: format(new Date(), 'yyyy-MM-dd'),
  });

  const { data: consumptions = [], isLoading } = useQuery({
    queryKey: ['material-consumption'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('material_consumption')
        .select('*, production_batches(batch_number), raw_materials(name, code, unit)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as MaterialConsumption[];
    },
  });

  const { data: batches = [] } = useQuery({
    queryKey: ['production-batches-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('production_batches')
        .select('id, batch_number')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const { data: rawMaterials = [] } = useQuery({
    queryKey: ['raw-materials-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('raw_materials')
        .select('id, code, name, unit')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from('material_consumption').insert({
        batch_id: data.batch_id || null,
        raw_material_id: data.raw_material_id || null,
        quantity: parseFloat(data.quantity) || 0,
        consumption_date: data.consumption_date,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-consumption'] });
      toast({ title: 'Consumption recorded successfully' });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({ title: 'Error recording consumption', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from('material_consumption')
        .update({
          batch_id: data.batch_id || null,
          raw_material_id: data.raw_material_id || null,
          quantity: parseFloat(data.quantity) || 0,
          consumption_date: data.consumption_date,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-consumption'] });
      toast({ title: 'Consumption updated successfully' });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating consumption', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('material_consumption').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-consumption'] });
      toast({ title: 'Consumption record deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting record', description: error.message, variant: 'destructive' });
    },
  });

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingRecord(null);
    setFormData({
      batch_id: '',
      raw_material_id: '',
      quantity: '',
      consumption_date: format(new Date(), 'yyyy-MM-dd'),
    });
  };

  const handleEdit = (record: MaterialConsumption) => {
    setEditingRecord(record);
    setFormData({
      batch_id: record.batch_id || '',
      raw_material_id: record.raw_material_id || '',
      quantity: String(record.quantity),
      consumption_date: record.consumption_date,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRecord) {
      updateMutation.mutate({ id: editingRecord.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const filteredConsumptions = consumptions.filter(
    (c) =>
      c.production_batches?.batch_number?.toLowerCase().includes(search.toLowerCase()) ||
      c.raw_materials?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const columns: Column<MaterialConsumption>[] = [
    { key: 'consumption_date', header: 'Date', cell: (c) => format(new Date(c.consumption_date), 'dd/MM/yyyy') },
    { key: 'batch', header: 'Batch No.', cell: (c) => c.production_batches?.batch_number || '-' },
    { key: 'material', header: 'Raw Material', cell: (c) => c.raw_materials ? `${c.raw_materials.code} - ${c.raw_materials.name}` : '-' },
    { key: 'quantity', header: 'Quantity', cell: (c) => `${c.quantity.toLocaleString('en-IN')} ${c.raw_materials?.unit || ''}` },
    {
      key: 'actions',
      header: 'Actions',
      cell: (c) =>
        canEdit && (
          <div className="flex gap-2">
            <Button size="icon" variant="ghost" onClick={() => handleEdit(c)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(c.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
    },
  ];

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: 'Production', href: '/production/entry' },
        { label: 'Material Consumption' },
      ]}
    >
      <DataTable
        columns={columns}
        data={filteredConsumptions}
        searchPlaceholder="Search consumption records..."
        searchValue={search}
        onSearchChange={setSearch}
        onAdd={() => setIsDialogOpen(true)}
        addLabel="Add Consumption"
        loading={isLoading}
        emptyMessage="No consumption records found"
        canAdd={canEdit}
      />

      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingRecord ? 'Edit Consumption' : 'Record Material Consumption'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Consumption Date</Label>
              <Input
                type="date"
                value={formData.consumption_date}
                onChange={(e) => setFormData({ ...formData, consumption_date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Production Batch</Label>
              <Select value={formData.batch_id} onValueChange={(v) => setFormData({ ...formData, batch_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select batch" /></SelectTrigger>
                <SelectContent>
                  {batches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.batch_number}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Raw Material</Label>
              <Select value={formData.raw_material_id} onValueChange={(v) => setFormData({ ...formData, raw_material_id: v })} required>
                <SelectTrigger><SelectValue placeholder="Select material" /></SelectTrigger>
                <SelectContent>
                  {rawMaterials.map((rm) => (
                    <SelectItem key={rm.id} value={rm.id}>{rm.code} - {rm.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quantity Consumed</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleCloseDialog}>Cancel</Button>
              <Button type="submit">{editingRecord ? 'Update' : 'Record'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
