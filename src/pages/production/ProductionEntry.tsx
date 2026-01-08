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

interface ProductionBatch {
  id: string;
  batch_number: string;
  production_date: string;
  shift: string | null;
  finished_good_id: string | null;
  employee_id: string | null;
  quantity_produced: number;
  status: string;
  notes: string | null;
  created_at: string;
  finished_goods?: { name: string; code: string } | null;
  employees?: { name: string; code: string } | null;
}

export default function ProductionEntry() {
  const { role } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<ProductionBatch | null>(null);

  const canEdit = role === 'super_admin' || role === 'manager' || role === 'data_entry';

  const [formData, setFormData] = useState({
    production_date: format(new Date(), 'yyyy-MM-dd'),
    shift: '',
    finished_good_id: '',
    employee_id: '',
    quantity_produced: '',
    status: 'in_progress',
    notes: '',
  });

  const { data: batches = [], isLoading } = useQuery({
    queryKey: ['production-batches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('production_batches')
        .select('*, finished_goods(name, code), employees(name, code)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ProductionBatch[];
    },
  });

  const { data: finishedGoods = [] } = useQuery({
    queryKey: ['finished-goods-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('finished_goods')
        .select('id, code, name')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('id, code, name')
        .eq('status', 'active')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const generateBatchNumber = async () => {
    const today = format(new Date(), 'yyyyMMdd');
    const { count } = await supabase
      .from('production_batches')
      .select('*', { count: 'exact', head: true })
      .like('batch_number', `PB-${today}%`);
    return `PB-${today}-${String((count || 0) + 1).padStart(3, '0')}`;
  };

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const batch_number = await generateBatchNumber();
      const { error } = await supabase.from('production_batches').insert({
        batch_number,
        production_date: data.production_date,
        shift: data.shift || null,
        finished_good_id: data.finished_good_id || null,
        employee_id: data.employee_id || null,
        quantity_produced: parseFloat(data.quantity_produced) || 0,
        status: data.status,
        notes: data.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-batches'] });
      toast({ title: 'Production batch created successfully' });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating batch', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from('production_batches')
        .update({
          production_date: data.production_date,
          shift: data.shift || null,
          finished_good_id: data.finished_good_id || null,
          employee_id: data.employee_id || null,
          quantity_produced: parseFloat(data.quantity_produced) || 0,
          status: data.status,
          notes: data.notes || null,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-batches'] });
      toast({ title: 'Production batch updated successfully' });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating batch', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('production_batches').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-batches'] });
      toast({ title: 'Production batch deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting batch', description: error.message, variant: 'destructive' });
    },
  });

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingBatch(null);
    setFormData({
      production_date: format(new Date(), 'yyyy-MM-dd'),
      shift: '',
      finished_good_id: '',
      employee_id: '',
      quantity_produced: '',
      status: 'in_progress',
      notes: '',
    });
  };

  const handleEdit = (batch: ProductionBatch) => {
    setEditingBatch(batch);
    setFormData({
      production_date: batch.production_date,
      shift: batch.shift || '',
      finished_good_id: batch.finished_good_id || '',
      employee_id: batch.employee_id || '',
      quantity_produced: String(batch.quantity_produced),
      status: batch.status,
      notes: batch.notes || '',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingBatch) {
      updateMutation.mutate({ id: editingBatch.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const filteredBatches = batches.filter(
    (b) =>
      b.batch_number.toLowerCase().includes(search.toLowerCase()) ||
      b.finished_goods?.name?.toLowerCase().includes(search.toLowerCase()) ||
      b.employees?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      in_progress: 'default',
      completed: 'secondary',
      cancelled: 'destructive',
    };
    return <Badge variant={variants[status] || 'outline'}>{status.replace('_', ' ')}</Badge>;
  };

  const columns: Column<ProductionBatch>[] = [
    { key: 'batch_number', header: 'Batch No.' },
    { key: 'production_date', header: 'Date', cell: (b) => format(new Date(b.production_date), 'dd/MM/yyyy') },
    { key: 'shift', header: 'Shift', cell: (b) => b.shift || '-' },
    { key: 'product', header: 'Product', cell: (b) => b.finished_goods?.name || '-' },
    { key: 'operator', header: 'Operator', cell: (b) => b.employees?.name || '-' },
    { key: 'quantity_produced', header: 'Qty', cell: (b) => b.quantity_produced.toLocaleString('en-IN') },
    { key: 'status', header: 'Status', cell: (b) => getStatusBadge(b.status) },
    {
      key: 'actions',
      header: 'Actions',
      cell: (b) =>
        canEdit && (
          <div className="flex gap-2">
            <Button size="icon" variant="ghost" onClick={() => handleEdit(b)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(b.id)}>
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
        { label: 'Production Entry' },
      ]}
    >
      <DataTable
        columns={columns}
        data={filteredBatches}
        searchPlaceholder="Search batches..."
        searchValue={search}
        onSearchChange={setSearch}
        onAdd={() => setIsDialogOpen(true)}
        addLabel="New Batch"
        loading={isLoading}
        emptyMessage="No production batches found"
        canAdd={canEdit}
      />

      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingBatch ? 'Edit Batch' : 'New Production Batch'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Production Date</Label>
                <Input
                  type="date"
                  value={formData.production_date}
                  onChange={(e) => setFormData({ ...formData, production_date: e.target.value })}
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
              <Label>Finished Good</Label>
              <Select value={formData.finished_good_id} onValueChange={(v) => setFormData({ ...formData, finished_good_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                <SelectContent>
                  {finishedGoods.map((fg) => (
                    <SelectItem key={fg.id} value={fg.id}>{fg.code} - {fg.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Operator</Label>
              <Select value={formData.employee_id} onValueChange={(v) => setFormData({ ...formData, employee_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select operator" /></SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.code} - {emp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantity Produced</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.quantity_produced}
                  onChange={(e) => setFormData({ ...formData, quantity_produced: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
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
              <Button type="submit">{editingBatch ? 'Update' : 'Create'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
