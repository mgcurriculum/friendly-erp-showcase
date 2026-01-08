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
import { Badge } from '@/components/ui/badge';
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

interface PackingEntry {
  id: string;
  packing_number: string;
  job_date: string;
  shift: string | null;
  cutting_sealing_id: string | null;
  quantity_packed: number;
  status: string;
  notes: string | null;
  created_at: string;
  cutting_sealing_entries?: { cutting_number: string; production_batches?: { finished_goods?: { name: string } | null } | null } | null;
}

export default function Packing() {
  const { role } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<PackingEntry | null>(null);

  const canEdit = role === 'super_admin' || role === 'manager' || role === 'data_entry';

  const [formData, setFormData] = useState({
    job_date: format(new Date(), 'yyyy-MM-dd'),
    shift: '',
    cutting_sealing_id: '',
    quantity_packed: '',
    status: 'pending',
    notes: '',
  });

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['packing-entries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('packing_entries' as any)
        .select('*, cutting_sealing_entries(cutting_number, production_batches(finished_goods(name)))')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as PackingEntry[];
    },
  });

  const { data: cuttingSealingEntries = [] } = useQuery({
    queryKey: ['cutting-sealing-completed'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cutting_sealing_entries' as any)
        .select('id, cutting_number, production_batches(finished_goods(name))')
        .eq('status', 'completed')
        .order('job_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const generatePackingNumber = async () => {
    const today = format(new Date(), 'yyyyMMdd');
    const { count } = await supabase
      .from('packing_entries')
      .select('*', { count: 'exact', head: true })
      .like('packing_number', `PK-${today}%`);
    return `PK-${today}-${String((count || 0) + 1).padStart(3, '0')}`;
  };

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const packing_number = await generatePackingNumber();
      const { error } = await supabase.from('packing_entries' as any).insert({
        packing_number,
        job_date: data.job_date,
        shift: data.shift || null,
        cutting_sealing_id: data.cutting_sealing_id || null,
        quantity_packed: parseFloat(data.quantity_packed) || 0,
        status: data.status,
        notes: data.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packing-entries'] });
      toast({ title: 'Packing entry created successfully' });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating entry', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from('packing_entries' as any)
        .update({
          job_date: data.job_date,
          shift: data.shift || null,
          cutting_sealing_id: data.cutting_sealing_id || null,
          quantity_packed: parseFloat(data.quantity_packed) || 0,
          status: data.status,
          notes: data.notes || null,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packing-entries'] });
      toast({ title: 'Entry updated successfully' });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating entry', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('packing_entries' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packing-entries'] });
      toast({ title: 'Entry deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting entry', description: error.message, variant: 'destructive' });
    },
  });

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingEntry(null);
    setFormData({
      job_date: format(new Date(), 'yyyy-MM-dd'),
      shift: '',
      cutting_sealing_id: '',
      quantity_packed: '',
      status: 'pending',
      notes: '',
    });
  };

  const handleEdit = (entry: PackingEntry) => {
    setEditingEntry(entry);
    setFormData({
      job_date: entry.job_date,
      shift: entry.shift || '',
      cutting_sealing_id: entry.cutting_sealing_id || '',
      quantity_packed: String(entry.quantity_packed),
      status: entry.status,
      notes: entry.notes || '',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingEntry) {
      updateMutation.mutate({ id: editingEntry.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const filteredEntries = entries.filter(
    (e) =>
      e.packing_number.toLowerCase().includes(search.toLowerCase()) ||
      e.cutting_sealing_entries?.cutting_number?.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'outline',
      in_progress: 'default',
      completed: 'secondary',
    };
    return <Badge variant={variants[status] || 'outline'}>{status.replace('_', ' ')}</Badge>;
  };

  const columns: Column<PackingEntry>[] = [
    { key: 'packing_number', header: 'Packing No.' },
    { key: 'job_date', header: 'Date', cell: (e) => format(new Date(e.job_date), 'dd/MM/yyyy') },
    { key: 'shift', header: 'Shift', cell: (e) => e.shift || '-' },
    { key: 'cutting', header: 'Cutting No.', cell: (e) => e.cutting_sealing_entries?.cutting_number || '-' },
    { key: 'product', header: 'Product', cell: (e) => e.cutting_sealing_entries?.production_batches?.finished_goods?.name || '-' },
    { key: 'quantity_packed', header: 'Qty Packed', cell: (e) => e.quantity_packed.toLocaleString('en-IN') },
    { key: 'status', header: 'Status', cell: (e) => getStatusBadge(e.status) },
    {
      key: 'actions',
      header: 'Actions',
      cell: (e) =>
        canEdit && (
          <div className="flex gap-2">
            <Button size="icon" variant="ghost" onClick={() => handleEdit(e)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(e.id)}>
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
        { label: 'Packing' },
      ]}
    >
      <DataTable
        columns={columns}
        data={filteredEntries}
        searchPlaceholder="Search entries..."
        searchValue={search}
        onSearchChange={setSearch}
        onAdd={() => setIsDialogOpen(true)}
        addLabel="New Entry"
        loading={isLoading}
        emptyMessage="No packing entries found"
        canAdd={canEdit}
      />

      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingEntry ? 'Edit Entry' : 'New Packing Entry'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Job Date</Label>
                <Input
                  type="date"
                  value={formData.job_date}
                  onChange={(e) => setFormData({ ...formData, job_date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Shift</Label>
                <Select value={formData.shift} onValueChange={(v) => setFormData({ ...formData, shift: v })}>
                  <SelectTrigger><SelectValue placeholder="Select shift" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">Morning</SelectItem>
                    <SelectItem value="afternoon">Afternoon</SelectItem>
                    <SelectItem value="night">Night</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Cutting & Sealing Entry</Label>
              <Select value={formData.cutting_sealing_id} onValueChange={(v) => setFormData({ ...formData, cutting_sealing_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select entry" /></SelectTrigger>
                <SelectContent>
                  {cuttingSealingEntries.map((cs: any) => (
                    <SelectItem key={cs.id} value={cs.id}>
                      {cs.cutting_number} - {cs.production_batches?.finished_goods?.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantity Packed</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.quantity_packed}
                  onChange={(e) => setFormData({ ...formData, quantity_packed: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleCloseDialog}>Cancel</Button>
              <Button type="submit">{editingEntry ? 'Update' : 'Create'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
