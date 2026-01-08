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

interface Delivery {
  id: string;
  delivery_number: string;
  invoice_id: string | null;
  customer_id: string | null;
  vehicle_id: string | null;
  delivery_date: string;
  driver_name: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  sales_invoices?: { invoice_number: string } | null;
  customers?: { name: string; code: string } | null;
  vehicles?: { registration_number: string } | null;
}

export default function Deliveries() {
  const { role } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDelivery, setEditingDelivery] = useState<Delivery | null>(null);

  const canEdit = role === 'super_admin' || role === 'manager' || role === 'data_entry';

  const [formData, setFormData] = useState({
    invoice_id: '',
    customer_id: '',
    vehicle_id: '',
    delivery_date: format(new Date(), 'yyyy-MM-dd'),
    driver_name: '',
    status: 'pending',
    notes: '',
  });

  const { data: deliveries = [], isLoading } = useQuery({
    queryKey: ['deliveries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deliveries')
        .select('*, sales_invoices(invoice_number), customers(name, code), vehicles(registration_number)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Delivery[];
    },
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['pending-invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_invoices')
        .select('id, invoice_number, customer_id, customers(name)')
        .order('invoice_date', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
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

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicles')
        .select('id, registration_number, vehicle_type')
        .eq('status', 'active')
        .order('registration_number');
      if (error) throw error;
      return data;
    },
  });

  const generateDeliveryNumber = async () => {
    const today = format(new Date(), 'yyyyMMdd');
    const { count } = await supabase
      .from('deliveries')
      .select('*', { count: 'exact', head: true })
      .like('delivery_number', `DN-${today}%`);
    return `DN-${today}-${String((count || 0) + 1).padStart(3, '0')}`;
  };

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const delivery_number = await generateDeliveryNumber();
      const { error } = await supabase.from('deliveries').insert({
        delivery_number,
        invoice_id: data.invoice_id || null,
        customer_id: data.customer_id || null,
        vehicle_id: data.vehicle_id || null,
        delivery_date: data.delivery_date,
        driver_name: data.driver_name || null,
        status: data.status,
        notes: data.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      toast({ title: 'Delivery created successfully' });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating delivery', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from('deliveries')
        .update({
          invoice_id: data.invoice_id || null,
          customer_id: data.customer_id || null,
          vehicle_id: data.vehicle_id || null,
          delivery_date: data.delivery_date,
          driver_name: data.driver_name || null,
          status: data.status,
          notes: data.notes || null,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      toast({ title: 'Delivery updated successfully' });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating delivery', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('deliveries').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      toast({ title: 'Delivery deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting delivery', description: error.message, variant: 'destructive' });
    },
  });

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingDelivery(null);
    setFormData({
      invoice_id: '',
      customer_id: '',
      vehicle_id: '',
      delivery_date: format(new Date(), 'yyyy-MM-dd'),
      driver_name: '',
      status: 'pending',
      notes: '',
    });
  };

  const handleEdit = (delivery: Delivery) => {
    setEditingDelivery(delivery);
    setFormData({
      invoice_id: delivery.invoice_id || '',
      customer_id: delivery.customer_id || '',
      vehicle_id: delivery.vehicle_id || '',
      delivery_date: delivery.delivery_date,
      driver_name: delivery.driver_name || '',
      status: delivery.status,
      notes: delivery.notes || '',
    });
    setIsDialogOpen(true);
  };

  const handleInvoiceSelect = (invoiceId: string) => {
    const invoice = invoices.find((i: any) => i.id === invoiceId);
    if (invoice) {
      setFormData({ ...formData, invoice_id: invoiceId, customer_id: invoice.customer_id || '' });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingDelivery) {
      updateMutation.mutate({ id: editingDelivery.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const filteredDeliveries = deliveries.filter(
    (d) =>
      d.delivery_number.toLowerCase().includes(search.toLowerCase()) ||
      d.customers?.name?.toLowerCase().includes(search.toLowerCase()) ||
      d.driver_name?.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'outline',
      dispatched: 'default',
      delivered: 'secondary',
      cancelled: 'destructive',
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  const columns: Column<Delivery>[] = [
    { key: 'delivery_number', header: 'Delivery No.' },
    { key: 'delivery_date', header: 'Date', cell: (d) => format(new Date(d.delivery_date), 'dd/MM/yyyy') },
    { key: 'invoice', header: 'Invoice', cell: (d) => d.sales_invoices?.invoice_number || '-' },
    { key: 'customer', header: 'Customer', cell: (d) => d.customers?.name || '-' },
    { key: 'vehicle', header: 'Vehicle', cell: (d) => d.vehicles?.registration_number || '-' },
    { key: 'driver', header: 'Driver', cell: (d) => d.driver_name || '-' },
    { key: 'status', header: 'Status', cell: (d) => getStatusBadge(d.status) },
    {
      key: 'actions',
      header: 'Actions',
      cell: (d) =>
        canEdit && (
          <div className="flex gap-2">
            <Button size="icon" variant="ghost" onClick={() => handleEdit(d)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(d.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
    },
  ];

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: 'Sales', href: '/sales/deliveries' },
        { label: 'Deliveries' },
      ]}
    >
      <DataTable
        columns={columns}
        data={filteredDeliveries}
        searchPlaceholder="Search deliveries..."
        searchValue={search}
        onSearchChange={setSearch}
        onAdd={() => setIsDialogOpen(true)}
        addLabel="New Delivery"
        loading={isLoading}
        emptyMessage="No deliveries found"
        canAdd={canEdit}
      />

      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingDelivery ? 'Edit Delivery' : 'New Delivery'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Invoice (Optional)</Label>
              <Select value={formData.invoice_id} onValueChange={handleInvoiceSelect}>
                <SelectTrigger><SelectValue placeholder="Select invoice" /></SelectTrigger>
                <SelectContent>
                  {invoices.map((inv: any) => (
                    <SelectItem key={inv.id} value={inv.id}>
                      {inv.invoice_number} - {inv.customers?.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Delivery Date</Label>
                <Input
                  type="date"
                  value={formData.delivery_date}
                  onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Vehicle</Label>
                <Select value={formData.vehicle_id} onValueChange={(v) => setFormData({ ...formData, vehicle_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                  <SelectContent>
                    {vehicles.map((v) => (
                      <SelectItem key={v.id} value={v.id}>{v.registration_number}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Driver Name</Label>
                <Input
                  value={formData.driver_name}
                  onChange={(e) => setFormData({ ...formData, driver_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="dispatched">Dispatched</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
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
              <Button type="submit">{editingDelivery ? 'Update' : 'Create'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
