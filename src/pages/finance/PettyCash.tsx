import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DataTable, Column } from '@/components/common/DataTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Edit, Trash2, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { format } from 'date-fns';

interface PettyCashRecord {
  id: string;
  transaction_date: string;
  transaction_type: string;
  category: string | null;
  description: string;
  amount: number;
  reference: string | null;
  created_at: string;
}

export default function PettyCash() {
  const { role } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PettyCashRecord | null>(null);

  const canEdit = role === 'super_admin' || role === 'manager' || role === 'data_entry';

  const [formData, setFormData] = useState({
    transaction_date: format(new Date(), 'yyyy-MM-dd'),
    transaction_type: 'expense',
    category: '',
    description: '',
    amount: '',
    reference: '',
  });

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['petty-cash'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('petty_cash')
        .select('*')
        .order('transaction_date', { ascending: false });
      if (error) throw error;
      return data as PettyCashRecord[];
    },
  });

  const totalIncome = transactions
    .filter(t => t.transaction_type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter(t => t.transaction_type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalIncome - totalExpense;

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from('petty_cash').insert({
        transaction_date: data.transaction_date,
        transaction_type: data.transaction_type,
        category: data.category || null,
        description: data.description,
        amount: parseFloat(data.amount) || 0,
        reference: data.reference || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['petty-cash'] });
      toast({ title: 'Transaction recorded successfully' });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({ title: 'Error recording transaction', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from('petty_cash')
        .update({
          transaction_date: data.transaction_date,
          transaction_type: data.transaction_type,
          category: data.category || null,
          description: data.description,
          amount: parseFloat(data.amount) || 0,
          reference: data.reference || null,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['petty-cash'] });
      toast({ title: 'Transaction updated successfully' });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating transaction', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('petty_cash').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['petty-cash'] });
      toast({ title: 'Transaction deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting transaction', description: error.message, variant: 'destructive' });
    },
  });

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingRecord(null);
    setFormData({
      transaction_date: format(new Date(), 'yyyy-MM-dd'),
      transaction_type: 'expense',
      category: '',
      description: '',
      amount: '',
      reference: '',
    });
  };

  const handleEdit = (record: PettyCashRecord) => {
    setEditingRecord(record);
    setFormData({
      transaction_date: record.transaction_date,
      transaction_type: record.transaction_type,
      category: record.category || '',
      description: record.description,
      amount: String(record.amount),
      reference: record.reference || '',
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

  const filteredTransactions = transactions.filter(
    (t) =>
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      t.category?.toLowerCase().includes(search.toLowerCase()) ||
      t.reference?.toLowerCase().includes(search.toLowerCase())
  );

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

  const columns: Column<PettyCashRecord>[] = [
    { key: 'transaction_date', header: 'Date', cell: (t) => format(new Date(t.transaction_date), 'dd/MM/yyyy') },
    {
      key: 'transaction_type',
      header: 'Type',
      cell: (t) => (
        <Badge variant={t.transaction_type === 'income' ? 'default' : 'secondary'}>
          {t.transaction_type === 'income' ? '↑ Income' : '↓ Expense'}
        </Badge>
      ),
    },
    { key: 'category', header: 'Category', cell: (t) => t.category || '-' },
    { key: 'description', header: 'Description' },
    {
      key: 'amount',
      header: 'Amount',
      cell: (t) => (
        <span className={t.transaction_type === 'income' ? 'text-green-600' : 'text-red-600'}>
          {t.transaction_type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
        </span>
      ),
    },
    { key: 'reference', header: 'Reference', cell: (t) => t.reference || '-' },
    {
      key: 'actions',
      header: 'Actions',
      cell: (t) =>
        canEdit && (
          <div className="flex gap-2">
            <Button size="icon" variant="ghost" onClick={() => handleEdit(t)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(t.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
    },
  ];

  const categories = [
    'Office Supplies',
    'Travel',
    'Food & Beverages',
    'Utilities',
    'Maintenance',
    'Postage',
    'Miscellaneous',
    'Refund',
    'Cash Deposit',
  ];

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: 'Finance', href: '/finance/petty-cash' },
        { label: 'Petty Cash' },
      ]}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Income</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(totalIncome)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Expense</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{formatCurrency(totalExpense)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(balance)}
              </div>
            </CardContent>
          </Card>
        </div>

        <DataTable
          columns={columns}
          data={filteredTransactions}
          searchPlaceholder="Search transactions..."
          searchValue={search}
          onSearchChange={setSearch}
          onAdd={() => setIsDialogOpen(true)}
          addLabel="Add Transaction"
          loading={isLoading}
          emptyMessage="No transactions found"
          canAdd={canEdit}
        />
      </div>

      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingRecord ? 'Edit Transaction' : 'Add Transaction'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={formData.transaction_date}
                  onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={formData.transaction_type} onValueChange={(v) => setFormData({ ...formData, transaction_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
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
              <div className="space-y-2">
                <Label>Reference</Label>
                <Input
                  value={formData.reference}
                  onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                  placeholder="Bill/Voucher no."
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleCloseDialog}>Cancel</Button>
              <Button type="submit">{editingRecord ? 'Update' : 'Add'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
