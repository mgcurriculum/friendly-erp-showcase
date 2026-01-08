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

interface Purchase {
  id: string;
  purchase_number: string;
  supplier_id: string | null;
  order_id: string | null;
  purchase_date: string;
  invoice_number: string | null;
  total_amount: number;
  status: string;
  notes: string | null;
  created_at: string;
  suppliers?: { name: string; code: string } | null;
  purchase_orders?: { order_number: string } | null;
}

interface PurchaseItem {
  raw_material_id: string;
  quantity: string;
  rate: string;
  amount: number;
}

export default function Purchases() {
  const { role } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewingPurchase, setViewingPurchase] = useState<Purchase | null>(null);

  const canEdit = role === 'super_admin' || role === 'manager' || role === 'data_entry';

  const [formData, setFormData] = useState({
    supplier_id: '',
    order_id: '',
    purchase_date: format(new Date(), 'yyyy-MM-dd'),
    invoice_number: '',
    status: 'completed',
    notes: '',
  });
  const [items, setItems] = useState<PurchaseItem[]>([{ raw_material_id: '', quantity: '', rate: '', amount: 0 }]);

  const { data: purchases = [], isLoading } = useQuery({
    queryKey: ['purchases'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchases')
        .select('*, suppliers(name, code), purchase_orders(order_number)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Purchase[];
    },
  });

  const { data: purchaseItems = [] } = useQuery({
    queryKey: ['purchase-items', viewingPurchase?.id],
    queryFn: async () => {
      if (!viewingPurchase?.id) return [];
      const { data, error } = await supabase
        .from('purchase_items')
        .select('*, raw_materials(name, code, unit)')
        .eq('purchase_id', viewingPurchase.id);
      if (error) throw error;
      return data;
    },
    enabled: !!viewingPurchase?.id,
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('suppliers').select('id, code, name').order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ['pending-purchase-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select('id, order_number, supplier_id')
        .in('status', ['pending', 'confirmed'])
        .order('order_date', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: rawMaterials = [] } = useQuery({
    queryKey: ['raw-materials-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('raw_materials').select('id, code, name, rate, unit').order('name');
      if (error) throw error;
      return data;
    },
  });

  const generatePurchaseNumber = async () => {
    const today = format(new Date(), 'yyyyMMdd');
    const { count } = await supabase
      .from('purchases')
      .select('*', { count: 'exact', head: true })
      .like('purchase_number', `GRN-${today}%`);
    return `GRN-${today}-${String((count || 0) + 1).padStart(3, '0')}`;
  };

  const createMutation = useMutation({
    mutationFn: async ({ formData: data, items }: { formData: typeof formData; items: PurchaseItem[] }) => {
      const purchase_number = await generatePurchaseNumber();
      const total_amount = items.reduce((sum, item) => sum + item.amount, 0);
      
      const { data: purchase, error: purchaseError } = await supabase
        .from('purchases')
        .insert({
          purchase_number,
          supplier_id: formData.supplier_id || null,
          order_id: formData.order_id || null,
          purchase_date: formData.purchase_date,
          invoice_number: formData.invoice_number || null,
          total_amount,
          status: formData.status,
          notes: formData.notes || null,
        })
        .select()
        .single();
      if (purchaseError) throw purchaseError;

      const itemsToInsert = items
        .filter(item => item.raw_material_id && parseFloat(item.quantity) > 0)
        .map(item => ({
          purchase_id: purchase.id,
          raw_material_id: item.raw_material_id,
          quantity: parseFloat(item.quantity),
          rate: parseFloat(item.rate),
          amount: item.amount,
        }));

      if (itemsToInsert.length > 0) {
        const { error: itemsError } = await supabase.from('purchase_items').insert(itemsToInsert);
        if (itemsError) throw itemsError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      toast({ title: 'Purchase recorded successfully' });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({ title: 'Error recording purchase', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('purchase_items').delete().eq('purchase_id', id);
      const { error } = await supabase.from('purchases').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      toast({ title: 'Purchase deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting purchase', description: error.message, variant: 'destructive' });
    },
  });

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setFormData({
      supplier_id: '',
      order_id: '',
      purchase_date: format(new Date(), 'yyyy-MM-dd'),
      invoice_number: '',
      status: 'completed',
      notes: '',
    });
    setItems([{ raw_material_id: '', quantity: '', rate: '', amount: 0 }]);
  };

  const handleOrderSelect = (orderId: string) => {
    const order = purchaseOrders.find(o => o.id === orderId);
    if (order) {
      setFormData({ ...formData, order_id: orderId, supplier_id: order.supplier_id || '' });
    }
  };

  const handleItemChange = (index: number, field: keyof PurchaseItem, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    if (field === 'raw_material_id') {
      const material = rawMaterials.find(rm => rm.id === value);
      if (material) {
        newItems[index].rate = String(material.rate);
      }
    }
    
    if (field === 'quantity' || field === 'rate') {
      const qty = parseFloat(newItems[index].quantity) || 0;
      const rate = parseFloat(newItems[index].rate) || 0;
      newItems[index].amount = qty * rate;
    }
    
    setItems(newItems);
  };

  const addItem = () => setItems([...items, { raw_material_id: '', quantity: '', rate: '', amount: 0 }]);
  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ formData, items });
  };

  const filteredPurchases = purchases.filter(
    (p) =>
      p.purchase_number.toLowerCase().includes(search.toLowerCase()) ||
      p.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
      p.suppliers?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      completed: 'secondary',
      pending: 'outline',
      cancelled: 'destructive',
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

  const columns: Column<Purchase>[] = [
    { key: 'purchase_number', header: 'GRN No.' },
    { key: 'purchase_date', header: 'Date', cell: (p) => format(new Date(p.purchase_date), 'dd/MM/yyyy') },
    { key: 'supplier', header: 'Supplier', cell: (p) => p.suppliers?.name || '-' },
    { key: 'invoice_number', header: 'Invoice', cell: (p) => p.invoice_number || '-' },
    { key: 'order', header: 'PO Ref', cell: (p) => p.purchase_orders?.order_number || '-' },
    { key: 'total_amount', header: 'Amount', cell: (p) => formatCurrency(p.total_amount) },
    { key: 'status', header: 'Status', cell: (p) => getStatusBadge(p.status) },
    {
      key: 'actions',
      header: 'Actions',
      cell: (p) => (
        <div className="flex gap-2">
          <Button size="icon" variant="ghost" onClick={() => setViewingPurchase(p)}>
            <Eye className="h-4 w-4" />
          </Button>
          {canEdit && (
            <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(p.id)}>
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
        { label: 'Inventory', href: '/inventory/purchases' },
        { label: 'Purchases (GRN)' },
      ]}
    >
      <DataTable
        columns={columns}
        data={filteredPurchases}
        searchPlaceholder="Search purchases..."
        searchValue={search}
        onSearchChange={setSearch}
        onAdd={() => setIsDialogOpen(true)}
        addLabel="Record Purchase"
        loading={isLoading}
        emptyMessage="No purchases found"
        canAdd={canEdit}
      />

      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record Purchase (GRN)</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Against PO (Optional)</Label>
                <Select value={formData.order_id} onValueChange={handleOrderSelect}>
                  <SelectTrigger><SelectValue placeholder="Select PO" /></SelectTrigger>
                  <SelectContent>
                    {purchaseOrders.map((o) => (
                      <SelectItem key={o.id} value={o.id}>{o.order_number}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Supplier</Label>
                <Select value={formData.supplier_id} onValueChange={(v) => setFormData({ ...formData, supplier_id: v })} required>
                  <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.code} - {s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Purchase Date</Label>
                <Input type="date" value={formData.purchase_date} onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Supplier Invoice No.</Label>
                <Input value={formData.invoice_number} onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })} />
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
                      <th className="p-2 text-left">Material</th>
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
                          <Select value={item.raw_material_id} onValueChange={(v) => handleItemChange(index, 'raw_material_id', v)}>
                            <SelectTrigger className="h-8"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>
                              {rawMaterials.map((rm) => (
                                <SelectItem key={rm.id} value={rm.id}>{rm.code} - {rm.name}</SelectItem>
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
              <Button type="submit">Record Purchase</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingPurchase} onOpenChange={() => setViewingPurchase(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Purchase: {viewingPurchase?.purchase_number}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">Supplier:</span> {viewingPurchase?.suppliers?.name}</div>
              <div><span className="text-muted-foreground">Date:</span> {viewingPurchase?.purchase_date && format(new Date(viewingPurchase.purchase_date), 'dd/MM/yyyy')}</div>
              <div><span className="text-muted-foreground">Invoice:</span> {viewingPurchase?.invoice_number || '-'}</div>
              <div><span className="text-muted-foreground">Status:</span> {viewingPurchase?.status && getStatusBadge(viewingPurchase.status)}</div>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-2 text-left">Material</th>
                    <th className="p-2 text-right">Qty</th>
                    <th className="p-2 text-right">Rate</th>
                    <th className="p-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseItems.map((item: any) => (
                    <tr key={item.id} className="border-t">
                      <td className="p-2">{item.raw_materials?.code} - {item.raw_materials?.name}</td>
                      <td className="p-2 text-right">{item.quantity} {item.raw_materials?.unit}</td>
                      <td className="p-2 text-right">{formatCurrency(item.rate)}</td>
                      <td className="p-2 text-right">{formatCurrency(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-muted font-medium">
                  <tr>
                    <td colSpan={3} className="p-2 text-right">Total:</td>
                    <td className="p-2 text-right">{formatCurrency(viewingPurchase?.total_amount || 0)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
