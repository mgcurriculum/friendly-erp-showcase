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

interface CustomerPayment {
  id: string;
  payment_number: string;
  customer_id: string | null;
  invoice_id: string | null;
  payment_date: string;
  amount: number;
  payment_mode: string;
  reference_number: string | null;
  notes: string | null;
  created_at: string;
  customers?: { name: string; code: string } | null;
  sales_invoices?: { invoice_number: string } | null;
}

export default function Collections() {
  const { role } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<CustomerPayment | null>(null);

  const canEdit = role === 'super_admin' || role === 'manager' || role === 'data_entry';

  const [formData, setFormData] = useState({
    customer_id: '',
    invoice_id: '',
    payment_date: format(new Date(), 'yyyy-MM-dd'),
    amount: '',
    payment_mode: 'cash',
    reference_number: '',
    notes: '',
  });

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['customer-payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_payments')
        .select('*, customers(name, code), sales_invoices(invoice_number)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as CustomerPayment[];
    },
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('customers').select('id, code, name').order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['customer-invoices', formData.customer_id],
    queryFn: async () => {
      if (!formData.customer_id) return [];
      const { data, error } = await supabase
        .from('sales_invoices')
        .select('id, invoice_number, total_amount, paid_amount')
        .eq('customer_id', formData.customer_id)
        .order('invoice_date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!formData.customer_id,
  });

  const generatePaymentNumber = async () => {
    const today = format(new Date(), 'yyyyMMdd');
    const { count } = await supabase
      .from('customer_payments')
      .select('*', { count: 'exact', head: true })
      .like('payment_number', `REC-${today}%`);
    return `REC-${today}-${String((count || 0) + 1).padStart(3, '0')}`;
  };

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payment_number = await generatePaymentNumber();
      const { error } = await supabase.from('customer_payments').insert({
        payment_number,
        customer_id: data.customer_id || null,
        invoice_id: data.invoice_id || null,
        payment_date: data.payment_date,
        amount: parseFloat(data.amount) || 0,
        payment_mode: data.payment_mode,
        reference_number: data.reference_number || null,
        notes: data.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-payments'] });
      toast({ title: 'Payment recorded successfully' });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({ title: 'Error recording payment', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from('customer_payments')
        .update({
          customer_id: data.customer_id || null,
          invoice_id: data.invoice_id || null,
          payment_date: data.payment_date,
          amount: parseFloat(data.amount) || 0,
          payment_mode: data.payment_mode,
          reference_number: data.reference_number || null,
          notes: data.notes || null,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-payments'] });
      toast({ title: 'Collection updated successfully' });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating collection', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('customer_payments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-payments'] });
      toast({ title: 'Payment deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting payment', description: error.message, variant: 'destructive' });
    },
  });

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingPayment(null);
    setFormData({
      customer_id: '',
      invoice_id: '',
      payment_date: format(new Date(), 'yyyy-MM-dd'),
      amount: '',
      payment_mode: 'cash',
      reference_number: '',
      notes: '',
    });
  };

  const handleEdit = (payment: CustomerPayment) => {
    setEditingPayment(payment);
    setFormData({
      customer_id: payment.customer_id || '',
      invoice_id: payment.invoice_id || '',
      payment_date: payment.payment_date,
      amount: String(payment.amount),
      payment_mode: payment.payment_mode,
      reference_number: payment.reference_number || '',
      notes: payment.notes || '',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPayment) {
      updateMutation.mutate({ id: editingPayment.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const filteredPayments = payments.filter(
    (p) =>
      p.payment_number.toLowerCase().includes(search.toLowerCase()) ||
      p.customers?.name?.toLowerCase().includes(search.toLowerCase()) ||
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

  const columns: Column<CustomerPayment>[] = [
    { key: 'payment_number', header: 'Receipt No.' },
    { key: 'payment_date', header: 'Date', cell: (p) => format(new Date(p.payment_date), 'dd/MM/yyyy') },
    { key: 'customer', header: 'Customer', cell: (p) => p.customers?.name || '-' },
    { key: 'invoice', header: 'Invoice', cell: (p) => p.sales_invoices?.invoice_number || '-' },
    { key: 'amount', header: 'Amount', cell: (p) => formatCurrency(p.amount) },
    { key: 'payment_mode', header: 'Mode', cell: (p) => getModeBadge(p.payment_mode) },
    { key: 'reference_number', header: 'Reference', cell: (p) => p.reference_number || '-' },
    {
      key: 'actions',
      header: 'Actions',
      cell: (p) =>
        canEdit && (
          <div className="flex gap-2">
            <Button size="icon" variant="ghost" onClick={() => handleEdit(p)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(p.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
    },
  ];

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: 'Finance', href: '/finance/collections' },
        { label: 'Collections' },
      ]}
    >
      <DataTable
        columns={columns}
        data={filteredPayments}
        searchPlaceholder="Search payments..."
        searchValue={search}
        onSearchChange={setSearch}
        onAdd={() => setIsDialogOpen(true)}
        addLabel="Record Collection"
        loading={isLoading}
        emptyMessage="No collections found"
        canAdd={canEdit}
      />

      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPayment ? 'Edit Collection' : 'Record Collection'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Customer</Label>
              <Select value={formData.customer_id} onValueChange={(v) => setFormData({ ...formData, customer_id: v, invoice_id: '' })} required>
                <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.code} - {c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Invoice (Optional)</Label>
              <Select value={formData.invoice_id} onValueChange={(v) => setFormData({ ...formData, invoice_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select invoice" /></SelectTrigger>
                <SelectContent>
                  {invoices.map((inv: any) => (
                    <SelectItem key={inv.id} value={inv.id}>
                      {inv.invoice_number} - {formatCurrency(inv.total_amount - inv.paid_amount)} due
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
              <Button type="submit">{editingPayment ? 'Update' : 'Record'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
