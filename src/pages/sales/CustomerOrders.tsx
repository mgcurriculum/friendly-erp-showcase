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
import { Eye, Trash2, Plus, X } from 'lucide-react';
import { format } from 'date-fns';

interface CustomerOrder {
  id: string;
  order_number: string;
  customer_id: string | null;
  order_date: string;
  expected_delivery: string | null;
  total_amount: number;
  status: string;
  notes: string | null;
  created_at: string;
  customers?: { name: string; code: string } | null;
}

interface OrderItem {
  finished_good_id: string;
  quantity: string;
  rate: string;
  amount: number;
}

export default function CustomerOrders() {
  const { role } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewingOrder, setViewingOrder] = useState<CustomerOrder | null>(null);

  const canEdit = role === 'super_admin' || role === 'manager' || role === 'data_entry';

  const [formData, setFormData] = useState({
    customer_id: '',
    order_date: format(new Date(), 'yyyy-MM-dd'),
    expected_delivery: '',
    status: 'pending',
    notes: '',
  });
  const [items, setItems] = useState<OrderItem[]>([{ finished_good_id: '', quantity: '', rate: '', amount: 0 }]);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['customer-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_orders')
        .select('*, customers(name, code)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as CustomerOrder[];
    },
  });

  const { data: orderItems = [] } = useQuery({
    queryKey: ['customer-order-items', viewingOrder?.id],
    queryFn: async () => {
      if (!viewingOrder?.id) return [];
      const { data, error } = await supabase
        .from('customer_order_items')
        .select('*, finished_goods(name, code, unit)')
        .eq('order_id', viewingOrder.id);
      if (error) throw error;
      return data;
    },
    enabled: !!viewingOrder?.id,
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('customers').select('id, code, name').order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: finishedGoods = [] } = useQuery({
    queryKey: ['finished-goods-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('finished_goods').select('id, code, name, rate, unit').order('name');
      if (error) throw error;
      return data;
    },
  });

  const generateOrderNumber = async () => {
    const today = format(new Date(), 'yyyyMMdd');
    const { count } = await supabase
      .from('customer_orders')
      .select('*', { count: 'exact', head: true })
      .like('order_number', `SO-${today}%`);
    return `SO-${today}-${String((count || 0) + 1).padStart(3, '0')}`;
  };

  const createMutation = useMutation({
    mutationFn: async ({ formData: data, items }: { formData: typeof formData; items: OrderItem[] }) => {
      const order_number = await generateOrderNumber();
      const total_amount = items.reduce((sum, item) => sum + item.amount, 0);
      
      const { data: order, error: orderError } = await supabase
        .from('customer_orders')
        .insert({
          order_number,
          customer_id: formData.customer_id || null,
          order_date: formData.order_date,
          expected_delivery: formData.expected_delivery || null,
          total_amount,
          status: formData.status,
          notes: formData.notes || null,
        })
        .select()
        .single();
      if (orderError) throw orderError;

      const itemsToInsert = items
        .filter(item => item.finished_good_id && parseFloat(item.quantity) > 0)
        .map(item => ({
          order_id: order.id,
          finished_good_id: item.finished_good_id,
          quantity: parseFloat(item.quantity),
          rate: parseFloat(item.rate),
          amount: item.amount,
        }));

      if (itemsToInsert.length > 0) {
        const { error: itemsError } = await supabase.from('customer_order_items').insert(itemsToInsert);
        if (itemsError) throw itemsError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-orders'] });
      toast({ title: 'Order created successfully' });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating order', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('customer_order_items').delete().eq('order_id', id);
      const { error } = await supabase.from('customer_orders').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-orders'] });
      toast({ title: 'Order deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting order', description: error.message, variant: 'destructive' });
    },
  });

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setFormData({
      customer_id: '',
      order_date: format(new Date(), 'yyyy-MM-dd'),
      expected_delivery: '',
      status: 'pending',
      notes: '',
    });
    setItems([{ finished_good_id: '', quantity: '', rate: '', amount: 0 }]);
  };

  const handleItemChange = (index: number, field: keyof OrderItem, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    if (field === 'finished_good_id') {
      const product = finishedGoods.find(fg => fg.id === value);
      if (product) {
        newItems[index].rate = String(product.rate);
      }
    }
    
    if (field === 'quantity' || field === 'rate') {
      const qty = parseFloat(newItems[index].quantity) || 0;
      const rate = parseFloat(newItems[index].rate) || 0;
      newItems[index].amount = qty * rate;
    }
    
    setItems(newItems);
  };

  const addItem = () => setItems([...items, { finished_good_id: '', quantity: '', rate: '', amount: 0 }]);
  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ formData, items });
  };

  const filteredOrders = orders.filter(
    (o) =>
      o.order_number.toLowerCase().includes(search.toLowerCase()) ||
      o.customers?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'outline',
      confirmed: 'default',
      delivered: 'secondary',
      cancelled: 'destructive',
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

  const columns: Column<CustomerOrder>[] = [
    { key: 'order_number', header: 'Order No.' },
    { key: 'order_date', header: 'Date', cell: (o) => format(new Date(o.order_date), 'dd/MM/yyyy') },
    { key: 'customer', header: 'Customer', cell: (o) => o.customers?.name || '-' },
    { key: 'expected_delivery', header: 'Expected', cell: (o) => o.expected_delivery ? format(new Date(o.expected_delivery), 'dd/MM/yyyy') : '-' },
    { key: 'total_amount', header: 'Amount', cell: (o) => formatCurrency(o.total_amount) },
    { key: 'status', header: 'Status', cell: (o) => getStatusBadge(o.status) },
    {
      key: 'actions',
      header: 'Actions',
      cell: (o) => (
        <div className="flex gap-2">
          <Button size="icon" variant="ghost" onClick={() => setViewingOrder(o)}>
            <Eye className="h-4 w-4" />
          </Button>
          {canEdit && (
            <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(o.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: 'Sales', href: '/sales/orders' },
        { label: 'Customer Orders' },
      ]}
    >
      <DataTable
        columns={columns}
        data={filteredOrders}
        searchPlaceholder="Search orders..."
        searchValue={search}
        onSearchChange={setSearch}
        onAdd={() => setIsDialogOpen(true)}
        addLabel="New Order"
        loading={isLoading}
        emptyMessage="No customer orders found"
        canAdd={canEdit}
      />

      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Customer Order</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Customer</Label>
                <Select value={formData.customer_id} onValueChange={(v) => setFormData({ ...formData, customer_id: v })} required>
                  <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.code} - {c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Order Date</Label>
                <Input type="date" value={formData.order_date} onChange={(e) => setFormData({ ...formData, order_date: e.target.value })} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Expected Delivery</Label>
                <Input type="date" value={formData.expected_delivery} onChange={(e) => setFormData({ ...formData, expected_delivery: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Line Items</Label>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="h-4 w-4 mr-1" /> Add Item
                </Button>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-2 text-left">Product</th>
                      <th className="p-2 text-left w-24">Qty</th>
                      <th className="p-2 text-left w-28">Rate</th>
                      <th className="p-2 text-right w-28">Amount</th>
                      <th className="p-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={index} className="border-t">
                        <td className="p-2">
                          <Select value={item.finished_good_id} onValueChange={(v) => handleItemChange(index, 'finished_good_id', v)}>
                            <SelectTrigger className="h-8"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>
                              {finishedGoods.map((fg) => (
                                <SelectItem key={fg.id} value={fg.id}>{fg.code} - {fg.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-2">
                          <Input type="number" step="0.01" className="h-8" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} />
                        </td>
                        <td className="p-2">
                          <Input type="number" step="0.01" className="h-8" value={item.rate} onChange={(e) => handleItemChange(index, 'rate', e.target.value)} />
                        </td>
                        <td className="p-2 text-right">{formatCurrency(item.amount)}</td>
                        <td className="p-2">
                          {items.length > 1 && (
                            <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => removeItem(index)}>
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted font-medium">
                    <tr>
                      <td colSpan={3} className="p-2 text-right">Total:</td>
                      <td className="p-2 text-right">{formatCurrency(totalAmount)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleCloseDialog}>Cancel</Button>
              <Button type="submit">Create Order</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingOrder} onOpenChange={() => setViewingOrder(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Order: {viewingOrder?.order_number}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">Customer:</span> {viewingOrder?.customers?.name}</div>
              <div><span className="text-muted-foreground">Date:</span> {viewingOrder?.order_date && format(new Date(viewingOrder.order_date), 'dd/MM/yyyy')}</div>
              <div><span className="text-muted-foreground">Expected:</span> {viewingOrder?.expected_delivery ? format(new Date(viewingOrder.expected_delivery), 'dd/MM/yyyy') : '-'}</div>
              <div><span className="text-muted-foreground">Status:</span> {viewingOrder?.status && getStatusBadge(viewingOrder.status)}</div>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-2 text-left">Product</th>
                    <th className="p-2 text-right">Qty</th>
                    <th className="p-2 text-right">Rate</th>
                    <th className="p-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {orderItems.map((item: any) => (
                    <tr key={item.id} className="border-t">
                      <td className="p-2">{item.finished_goods?.code} - {item.finished_goods?.name}</td>
                      <td className="p-2 text-right">{item.quantity} {item.finished_goods?.unit}</td>
                      <td className="p-2 text-right">{formatCurrency(item.rate)}</td>
                      <td className="p-2 text-right">{formatCurrency(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-muted font-medium">
                  <tr>
                    <td colSpan={3} className="p-2 text-right">Total:</td>
                    <td className="p-2 text-right">{formatCurrency(viewingOrder?.total_amount || 0)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {viewingOrder?.notes && (
              <div className="text-sm"><span className="text-muted-foreground">Notes:</span> {viewingOrder.notes}</div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
