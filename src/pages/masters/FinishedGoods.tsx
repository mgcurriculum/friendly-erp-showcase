import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DataTable, Column } from '@/components/common/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { useAuth } from '@/hooks/useAuth';
import { Pencil, Trash2, AlertTriangle } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type FinishedGood = Tables<'finished_goods'>;

export default function FinishedGoods() {
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FinishedGood | null>(null);
  const { toast } = useToast();
  const { role } = useAuth();
  const queryClient = useQueryClient();

  const canEdit = role && ['super_admin', 'manager', 'data_entry'].includes(role);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['finished_goods'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('finished_goods')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as FinishedGood[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (item: Omit<FinishedGood, 'id' | 'created_at' | 'updated_at'>) => {
      const { error } = await supabase.from('finished_goods').insert([item]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finished_goods'] });
      toast({ title: 'Finished good added successfully' });
      setDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: 'Error adding item', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...item }: Partial<FinishedGood> & { id: string }) => {
      const { error } = await supabase.from('finished_goods').update(item).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finished_goods'] });
      toast({ title: 'Finished good updated successfully' });
      setDialogOpen(false);
      setEditingItem(null);
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating item', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('finished_goods').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finished_goods'] });
      toast({ title: 'Finished good deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting item', description: error.message, variant: 'destructive' });
    },
  });

  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.code.toLowerCase().includes(search.toLowerCase()) ||
      item.size?.toLowerCase().includes(search.toLowerCase()) ||
      item.color?.toLowerCase().includes(search.toLowerCase())
  );

  const getStockStatus = (current: number | null, min: number | null) => {
    const currentStock = current ?? 0;
    const minStock = min ?? 0;
    if (minStock === 0) return null;
    if (currentStock === 0) return { label: 'Out of Stock', variant: 'destructive' as const, icon: true };
    if (currentStock <= minStock) return { label: 'Low Stock', variant: 'destructive' as const, icon: true };
    if (currentStock <= minStock * 1.5) return { label: 'Warning', variant: 'outline' as const, icon: true };
    return null;
  };

  const formatNumber = (val: number | null) => {
    if (val === null) return '-';
    return new Intl.NumberFormat('en-IN').format(val);
  };

  const columns: Column<FinishedGood>[] = [
    { key: 'code', header: 'Code' },
    { key: 'name', header: 'Name' },
    {
      key: 'specs',
      header: 'Specifications',
      cell: (item) => {
        const specs = [
          item.size && `Size: ${item.size}`,
          item.color && `Color: ${item.color}`,
          item.thickness && `${item.thickness}mm`,
        ].filter(Boolean);
        return specs.length > 0 ? specs.join(' | ') : '-';
      },
    },
    { key: 'unit', header: 'Unit' },
    {
      key: 'current_stock',
      header: 'Stock',
      className: 'text-right',
      cell: (item) => {
        const status = getStockStatus(item.current_stock, item.min_stock_level);
        return (
          <div className="flex items-center justify-end gap-2">
            <span>{formatNumber(item.current_stock)}</span>
            {status && (
              <Badge variant={status.variant} className="gap-1">
                {status.icon && <AlertTriangle className="h-3 w-3" />}
                {status.label}
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      key: 'min_stock_level',
      header: 'Min Stock',
      className: 'text-right',
      cell: (item) => formatNumber(item.min_stock_level),
    },
    {
      key: 'rate',
      header: 'Rate (₹)',
      className: 'text-right',
      cell: (item) => formatNumber(item.rate),
    },
    {
      key: 'no_per_kg',
      header: 'No/Kg',
      className: 'text-right',
      cell: (item) => item.no_per_kg ?? '-',
    },
    ...(canEdit
      ? [
          {
            key: 'actions',
            header: 'Actions',
            cell: (item: FinishedGood) => (
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setEditingItem(item);
                    setDialogOpen(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (confirm('Delete this finished good?')) deleteMutation.mutate(item.id);
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ),
          },
        ]
      : []),
  ];

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const item = {
      code: formData.get('code') as string,
      name: formData.get('name') as string,
      size: (formData.get('size') as string) || null,
      color: (formData.get('color') as string) || null,
      thickness: parseFloat(formData.get('thickness') as string) || null,
      unit: formData.get('unit') as string,
      current_stock: parseFloat(formData.get('current_stock') as string) || 0,
      min_stock_level: parseFloat(formData.get('min_stock_level') as string) || 0,
      rate: parseFloat(formData.get('rate') as string) || 0,
      no_per_kg: parseFloat(formData.get('no_per_kg') as string) || null,
    };

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, ...item });
    } else {
      createMutation.mutate(item);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Finished Goods</h1>
          <p className="text-muted-foreground">Manage finished goods inventory with specifications</p>
        </div>

        <DataTable
          columns={columns}
          data={filteredItems}
          loading={isLoading}
          searchPlaceholder="Search products..."
          searchValue={search}
          onSearchChange={setSearch}
          onAdd={() => {
            setEditingItem(null);
            setDialogOpen(true);
          }}
          addLabel="Add Product"
          canAdd={!!canEdit}
          emptyMessage="No finished goods found"
        />

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Edit Finished Good' : 'Add Finished Good'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Code *</Label>
                  <Input
                    id="code"
                    name="code"
                    defaultValue={editingItem?.code || ''}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={editingItem?.name || ''}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="size">Size</Label>
                  <Input id="size" name="size" defaultValue={editingItem?.size || ''} placeholder="e.g., 10x12" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="color">Color</Label>
                  <Input id="color" name="color" defaultValue={editingItem?.color || ''} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="thickness">Thickness (mm)</Label>
                  <Input
                    id="thickness"
                    name="thickness"
                    type="number"
                    step="0.01"
                    defaultValue={editingItem?.thickness ?? ''}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="unit">Unit</Label>
                  <Select name="unit" defaultValue={editingItem?.unit || 'Kg'}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Kg">Kg</SelectItem>
                      <SelectItem value="Pcs">Pcs</SelectItem>
                      <SelectItem value="Box">Box</SelectItem>
                      <SelectItem value="Pack">Pack</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="no_per_kg">No. per Kg</Label>
                  <Input
                    id="no_per_kg"
                    name="no_per_kg"
                    type="number"
                    step="0.01"
                    defaultValue={editingItem?.no_per_kg ?? ''}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="current_stock">Current Stock</Label>
                  <Input
                    id="current_stock"
                    name="current_stock"
                    type="number"
                    step="0.01"
                    defaultValue={editingItem?.current_stock ?? 0}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="min_stock_level">Min Stock Level</Label>
                  <Input
                    id="min_stock_level"
                    name="min_stock_level"
                    type="number"
                    step="0.01"
                    defaultValue={editingItem?.min_stock_level ?? 0}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rate">Rate (₹)</Label>
                  <Input
                    id="rate"
                    name="rate"
                    type="number"
                    step="0.01"
                    defaultValue={editingItem?.rate ?? 0}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingItem ? 'Update' : 'Add'} Product
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
