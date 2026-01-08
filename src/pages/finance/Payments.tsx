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
import { Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface SupplierPayment {
  id: string;
  payment_number: string;
  supplier_id: string | null;
  purchase_id: string | null;
  payment_date: string;
  amount: number;
  payment_mode: string;
  reference_number: string | null;
  notes: string | null;
  created_at: string;
  suppliers?: { name: string; code: string } | null;
  purchases?: { purchase_number: string } | null;
}

export default function Payments() {
  const { role } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const canEdit = role === 'super_admin' || role === 'manager' || role === 'data_entry';

  const [formData, setFormData] = useState({
    supplier_id: '',
    purchase_id: '',
    payment_date: format(new Date(), 'yyyy-MM-dd'),
    amount: '',
    payment_mode: 'bank',
    reference_number: '',
    notes: '',
  });

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['supplier-payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supplier_payments')
        .select('*, suppliers(name, code), purchases(purchase_number)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as SupplierPayment[];
    },
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('suppliers').select('id, code, name').order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: purchases = [] } = useQuery({
    queryKey: ['supplier-purchases', formData.supplier_id],
    queryFn: async () => {
      if (!formData.supplier_id) return [];
      const { data, error } = await supabase
        .from('purchases')
        .select('id, purchase_number, total_amount')
        .eq('supplier_id', formData.supplier_id)
        .order('purchase_date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!formData.supplier_id,
  });

  const generatePaymentNumber = async () => {
    const today = format(new Date(), 'yyyyMMdd');
    const { count } = await supabase
      .from('supplier_payments')
      .select('*', { count: 'exact', head: true })
      .like('payment_number', `PAY-${today}%`);
    return `PAY-${today}-${String((count || 0) + 1).padStart(3, '0')}`;
  };

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payment_number = await generatePaymentNumber();
      const { error } = await supabase.from('supplier_payments').insert({
        payment_number,
        supplier_id: data.supplier_id || null,
        purchase_id: data.purchase_id || null,
        payment_date: data.payment_date,
        amount: parseFloat(data.amount) || 0,
        payment_mode: data.payment_mode,
        reference_number: data.reference_number || null,
        notes: data.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-payments'] });
      toast({ title: 'Payment recorded successfully' });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({ title: 'Error recording payment', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('supplier_payments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-payments'] });
      toast({ title: 'Payment deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting payment', description: error.message, variant: 'destructive' });
    },
  });

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setFormData({
      supplier_id: '',
      purchase_id: '',
      payment_date: format(new Date(), 'yyyy-MM-dd'),
      amount: '',
      payment_mode: 'bank',
      reference_number: '',
      notes: '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const filteredPayments = payments.filter(
    (p) =>
      p.payment_number.toLowerCase().includes(search.toLowerCase()) ||
      p.suppliers?.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.reference_number?.toLowerCase().includes(search.toLowerCase())
  );

  const getModeBadge = (mode: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
      cash: 'default',
      bank: 'secondary',
      cheque: 'outline',
      upi: 'secondary',
    };
    return <Badge variant={variants[mode] || 'outline'}>{mode.toUpperCase()}</Badge>;
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

  const columns: Column<SupplierPayment>[] = [
    { key: 'payment_number', header: 'Payment No.' },
    { key: 'payment_date', header: 'Date', cell: (p) => format(new Date(p.payment_date), 'dd/MM/yyyy') },
    { key: 'supplier', header: 'Supplier', cell: (p) => p.suppliers?.name || '-' },
    { key: 'purchase', header: 'Purchase', cell: (p) => p.purchases?.purchase_number || '-' },
    { key: 'amount', header: 'Amount', cell: (p) => formatCurrency(p.amount) },
    { key: 'payment_mode', header: 'Mode', cell: (p) => getModeBadge(p.payment_mode) },
    { key: 'reference_number', header: 'Reference', cell: (p) => p.reference_number || '-' },
    {
      key: 'actions',
      header: 'Actions',
      cell: (p) =>
        canEdit && (
          <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(p.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        ),
    },
  ];

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: 'Finance', href: '/finance/payments' },
        { label: 'Payments' },
      ]}
    >
      <DataTable
        columns={columns}
        data={filteredPayments}
        searchPlaceholder="Search payments..."
        searchValue={search}
        onSearchChange={setSearch}
        onAdd={() => setIsDialogOpen(true)}
        addLabel="Record Payment"
        loading={isLoading}
        emptyMessage="No payments found"
        canAdd={canEdit}
      />

      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Supplier</Label>
              <Select value={formData.supplier_id} onValueChange={(v) => setFormData({ ...formData, supplier_id: v, purchase_id: '' })} required>
                <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.code} - {s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Purchase (Optional)</Label>
              <Select value={formData.purchase_id} onValueChange={(v) => setFormData({ ...formData, purchase_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select purchase" /></SelectTrigger>
                <SelectContent>
                  {purchases.map((pur: any) => (
                    <SelectItem key={pur.id} value={pur.id}>
                      {pur.purchase_number} - {formatCurrency(pur.total_amount)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Payment Date</Label>
                <Input
                  type="date"
                  value={formData.payment_date}
                  onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Payment Mode</Label>
                <Select value={formData.payment_mode} onValueChange={(v) => setFormData({ ...formData, payment_mode: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank">Bank Transfer</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Reference No.</Label>
                <Input
                  value={formData.reference_number}
                  onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                  placeholder="Cheque/UTR no."
                />
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
              <Button type="submit">Record</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
