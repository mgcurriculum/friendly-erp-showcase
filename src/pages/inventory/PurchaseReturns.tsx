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

interface PurchaseReturn {
  id: string;
  return_number: string;
  return_date: string;
  purchase_id: string | null;
  return_method: string | null;
  total_amount: number;
  reason: string | null;
  status: string;
  created_at: string;
  purchases?: { purchase_number: string; suppliers?: { name: string } | null } | null;
}

export default function PurchaseReturns() {
  const { role } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingReturn, setEditingReturn] = useState<PurchaseReturn | null>(null);

  const canEdit = role === 'super_admin' || role === 'manager' || role === 'data_entry';

  const [formData, setFormData] = useState({
    return_date: format(new Date(), 'yyyy-MM-dd'),
    purchase_id: '',
    return_method: 'direct',
    total_amount: '',
    reason: '',
    status: 'pending',
  });

  const { data: returns = [], isLoading } = useQuery({
    queryKey: ['purchase-returns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_returns' as any)
        .select('*, purchases(purchase_number, suppliers(name))')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as PurchaseReturn[];
    },
  });

  const { data: purchases = [] } = useQuery({
    queryKey: ['purchases-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchases')
        .select('id, purchase_number, suppliers(name), total_amount')
        .order('purchase_date', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const generateReturnNumber = async () => {
    const today = format(new Date(), 'yyyyMMdd');
    const { count } = await supabase
      .from('purchase_returns')
      .select('*', { count: 'exact', head: true })
      .like('return_number', `PR-${today}%`);
    return `PR-${today}-${String((count || 0) + 1).padStart(3, '0')}`;
  };

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const return_number = await generateReturnNumber();
      const { error } = await supabase.from('purchase_returns' as any).insert({
        return_number,
        return_date: data.return_date,
        purchase_id: data.purchase_id || null,
        return_method: data.return_method,
        total_amount: parseFloat(data.total_amount) || 0,
        reason: data.reason || null,
        status: data.status,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-returns'] });
      toast({ title: 'Purchase return created successfully' });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating return', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from('purchase_returns' as any)
        .update({
          return_date: data.return_date,
          purchase_id: data.purchase_id || null,
          return_method: data.return_method,
          total_amount: parseFloat(data.total_amount) || 0,
          reason: data.reason || null,
          status: data.status,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-returns'] });
      toast({ title: 'Return updated successfully' });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating return', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('purchase_returns' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-returns'] });
      toast({ title: 'Return deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting return', description: error.message, variant: 'destructive' });
    },
  });

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingReturn(null);
    setFormData({
      return_date: format(new Date(), 'yyyy-MM-dd'),
      purchase_id: '',
      return_method: 'direct',
      total_amount: '',
      reason: '',
      status: 'pending',
    });
  };

  const handleEdit = (ret: PurchaseReturn) => {
    setEditingReturn(ret);
    setFormData({
      return_date: ret.return_date,
      purchase_id: ret.purchase_id || '',
      return_method: ret.return_method || 'direct',
      total_amount: String(ret.total_amount),
      reason: ret.reason || '',
      status: ret.status,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingReturn) {
      updateMutation.mutate({ id: editingReturn.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const filteredReturns = returns.filter(
    (r) =>
      r.return_number.toLowerCase().includes(search.toLowerCase()) ||
      r.purchases?.purchase_number?.toLowerCase().includes(search.toLowerCase()) ||
      r.purchases?.suppliers?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'outline',
      approved: 'default',
      completed: 'secondary',
      rejected: 'destructive',
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  const columns: Column<PurchaseReturn>[] = [
    { key: 'return_number', header: 'Return No.' },
    { key: 'return_date', header: 'Date', cell: (r) => format(new Date(r.return_date), 'dd/MM/yyyy') },
    { key: 'purchase', header: 'Purchase No.', cell: (r) => r.purchases?.purchase_number || '-' },
    { key: 'supplier', header: 'Supplier', cell: (r) => r.purchases?.suppliers?.name || '-' },
    { key: 'return_method', header: 'Method', cell: (r) => r.return_method || '-' },
    { key: 'total_amount', header: 'Amount', cell: (r) => `₹${r.total_amount.toLocaleString('en-IN')}` },
    { key: 'status', header: 'Status', cell: (r) => getStatusBadge(r.status) },
    {
      key: 'actions',
      header: 'Actions',
      cell: (r) =>
        canEdit && (
          <div className="flex gap-2">
            <Button size="icon" variant="ghost" onClick={() => handleEdit(r)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(r.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
    },
  ];

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: 'Inventory', href: '/inventory/purchases' },
        { label: 'Purchase Returns' },
      ]}
    >
      <DataTable
        columns={columns}
        data={filteredReturns}
        searchPlaceholder="Search returns..."
        searchValue={search}
        onSearchChange={setSearch}
        onAdd={() => setIsDialogOpen(true)}
        addLabel="New Return"
        loading={isLoading}
        emptyMessage="No purchase returns found"
        canAdd={canEdit}
      />

      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingReturn ? 'Edit Return' : 'New Purchase Return'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Return Date</Label>
                <Input
                  type="date"
                  value={formData.return_date}
                  onChange={(e) => setFormData({ ...formData, return_date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Return Method</Label>
                <Select value={formData.return_method} onValueChange={(v) => setFormData({ ...formData, return_method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="direct">Direct</SelectItem>
                    <SelectItem value="courier">Courier</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Purchase Invoice</Label>
              <Select value={formData.purchase_id} onValueChange={(v) => setFormData({ ...formData, purchase_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select purchase" /></SelectTrigger>
                <SelectContent>
                  {purchases.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.purchase_number} - {p.suppliers?.name} (₹{p.total_amount?.toLocaleString('en-IN')})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Total Amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.total_amount}
                  onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                rows={2}
                placeholder="Reason for return..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleCloseDialog}>Cancel</Button>
              <Button type="submit">{editingReturn ? 'Update' : 'Create'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
