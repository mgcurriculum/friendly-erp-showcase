import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DataTable, Column } from '@/components/common/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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

interface WastageRecord {
  id: string;
  batch_id: string | null;
  finished_good_id: string | null;
  quantity: number;
  wastage_date: string;
  reason: string | null;
  created_at: string;
  production_batches?: { batch_number: string } | null;
  finished_goods?: { name: string; code: string; unit: string } | null;
}

export default function Wastage() {
  const { role } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<WastageRecord | null>(null);

  const canEdit = role === 'super_admin' || role === 'manager' || role === 'data_entry';

  const [formData, setFormData] = useState({
    batch_id: '',
    finished_good_id: '',
    quantity: '',
    wastage_date: format(new Date(), 'yyyy-MM-dd'),
    reason: '',
  });

  const { data: wastages = [], isLoading } = useQuery({
    queryKey: ['wastage'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wastage')
        .select('*, production_batches(batch_number), finished_goods(name, code, unit)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as WastageRecord[];
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

  const { data: finishedGoods = [] } = useQuery({
    queryKey: ['finished-goods-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('finished_goods')
        .select('id, code, name, unit')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from('wastage').insert({
        batch_id: data.batch_id || null,
        finished_good_id: data.finished_good_id || null,
        quantity: parseFloat(data.quantity) || 0,
        wastage_date: data.wastage_date,
        reason: data.reason || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wastage'] });
      toast({ title: 'Wastage recorded successfully' });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({ title: 'Error recording wastage', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from('wastage')
        .update({
          batch_id: data.batch_id || null,
          finished_good_id: data.finished_good_id || null,
          quantity: parseFloat(data.quantity) || 0,
          wastage_date: data.wastage_date,
          reason: data.reason || null,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wastage'] });
      toast({ title: 'Wastage updated successfully' });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating wastage', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('wastage').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wastage'] });
      toast({ title: 'Wastage record deleted' });
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
      finished_good_id: '',
      quantity: '',
      wastage_date: format(new Date(), 'yyyy-MM-dd'),
      reason: '',
    });
  };

  const handleEdit = (record: WastageRecord) => {
    setEditingRecord(record);
    setFormData({
      batch_id: record.batch_id || '',
      finished_good_id: record.finished_good_id || '',
      quantity: String(record.quantity),
      wastage_date: record.wastage_date,
      reason: record.reason || '',
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

  const filteredWastages = wastages.filter(
    (w) =>
      w.production_batches?.batch_number?.toLowerCase().includes(search.toLowerCase()) ||
      w.finished_goods?.name?.toLowerCase().includes(search.toLowerCase()) ||
      w.reason?.toLowerCase().includes(search.toLowerCase())
  );

  const columns: Column<WastageRecord>[] = [
    { key: 'wastage_date', header: 'Date', cell: (w) => format(new Date(w.wastage_date), 'dd/MM/yyyy') },
    { key: 'batch', header: 'Batch No.', cell: (w) => w.production_batches?.batch_number || '-' },
    { key: 'product', header: 'Product', cell: (w) => w.finished_goods ? `${w.finished_goods.code} - ${w.finished_goods.name}` : '-' },
    { key: 'quantity', header: 'Quantity', cell: (w) => `${w.quantity.toLocaleString('en-IN')} ${w.finished_goods?.unit || ''}` },
    { key: 'reason', header: 'Reason', cell: (w) => w.reason || '-' },
    {
      key: 'actions',
      header: 'Actions',
      cell: (w) =>
        canEdit && (
          <div className="flex gap-2">
            <Button size="icon" variant="ghost" onClick={() => handleEdit(w)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(w.id)}>
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
        { label: 'Wastage & Damages' },
      ]}
    >
      <DataTable
        columns={columns}
        data={filteredWastages}
        searchPlaceholder="Search wastage records..."
        searchValue={search}
        onSearchChange={setSearch}
        onAdd={() => setIsDialogOpen(true)}
        addLabel="Record Wastage"
        loading={isLoading}
        emptyMessage="No wastage records found"
        canAdd={canEdit}
      />

      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingRecord ? 'Edit Wastage' : 'Record Wastage'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Wastage Date</Label>
              <Input
                type="date"
                value={formData.wastage_date}
                onChange={(e) => setFormData({ ...formData, wastage_date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Production Batch (Optional)</Label>
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
              <Label>Product</Label>
              <Select value={formData.finished_good_id} onValueChange={(v) => setFormData({ ...formData, finished_good_id: v })} required>
                <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                <SelectContent>
                  {finishedGoods.map((fg) => (
                    <SelectItem key={fg.id} value={fg.id}>{fg.code} - {fg.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="Describe the reason for wastage..."
                rows={2}
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
