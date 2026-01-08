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

type RawMaterial = Tables<'raw_materials'>;

export default function RawMaterials() {
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<RawMaterial | null>(null);
  const { toast } = useToast();
  const { role } = useAuth();
  const queryClient = useQueryClient();

  const canEdit = role && ['super_admin', 'manager', 'data_entry'].includes(role);

  const { data: materials = [], isLoading } = useQuery({
    queryKey: ['raw_materials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('raw_materials')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as RawMaterial[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (material: Omit<RawMaterial, 'id' | 'created_at' | 'updated_at'>) => {
      const { error } = await supabase.from('raw_materials').insert([material]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raw_materials'] });
      toast({ title: 'Raw material added successfully' });
      setDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: 'Error adding material', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...material }: Partial<RawMaterial> & { id: string }) => {
      const { error } = await supabase.from('raw_materials').update(material).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raw_materials'] });
      toast({ title: 'Raw material updated successfully' });
      setDialogOpen(false);
      setEditingMaterial(null);
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating material', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('raw_materials').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raw_materials'] });
      toast({ title: 'Raw material deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting material', description: error.message, variant: 'destructive' });
    },
  });

  const filteredMaterials = materials.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.code.toLowerCase().includes(search.toLowerCase()) ||
      m.grade?.toLowerCase().includes(search.toLowerCase())
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

  const columns: Column<RawMaterial>[] = [
    { key: 'code', header: 'Code' },
    { key: 'name', header: 'Name' },
    { key: 'grade', header: 'Grade', cell: (m) => m.grade || '-' },
    { key: 'unit', header: 'Unit' },
    {
      key: 'current_stock',
      header: 'Current Stock',
      className: 'text-right',
      cell: (m) => {
        const status = getStockStatus(m.current_stock, m.min_stock_level);
        return (
          <div className="flex items-center justify-end gap-2">
            <span>{formatNumber(m.current_stock)}</span>
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
      cell: (m) => formatNumber(m.min_stock_level),
    },
    {
      key: 'rate',
      header: 'Rate (₹)',
      className: 'text-right',
      cell: (m) => formatNumber(m.rate),
    },
    ...(canEdit
      ? [
          {
            key: 'actions',
            header: 'Actions',
            cell: (m: RawMaterial) => (
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setEditingMaterial(m);
                    setDialogOpen(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (confirm('Delete this raw material?')) deleteMutation.mutate(m.id);
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
    const material = {
      code: formData.get('code') as string,
      name: formData.get('name') as string,
      grade: (formData.get('grade') as string) || null,
      unit: formData.get('unit') as string,
      current_stock: parseFloat(formData.get('current_stock') as string) || 0,
      min_stock_level: parseFloat(formData.get('min_stock_level') as string) || 0,
      rate: parseFloat(formData.get('rate') as string) || 0,
    };

    if (editingMaterial) {
      updateMutation.mutate({ id: editingMaterial.id, ...material });
    } else {
      createMutation.mutate(material);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Raw Materials</h1>
          <p className="text-muted-foreground">Manage raw material inventory and stock levels</p>
        </div>

        <DataTable
          columns={columns}
          data={filteredMaterials}
          loading={isLoading}
          searchPlaceholder="Search materials..."
          searchValue={search}
          onSearchChange={setSearch}
          onAdd={() => {
            setEditingMaterial(null);
            setDialogOpen(true);
          }}
          addLabel="Add Material"
          canAdd={!!canEdit}
          emptyMessage="No raw materials found"
        />

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingMaterial ? 'Edit Raw Material' : 'Add Raw Material'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Code *</Label>
                  <Input
                    id="code"
                    name="code"
                    defaultValue={editingMaterial?.code || ''}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={editingMaterial?.name || ''}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="grade">Grade</Label>
                  <Input id="grade" name="grade" defaultValue={editingMaterial?.grade || ''} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit">Unit</Label>
                  <Select name="unit" defaultValue={editingMaterial?.unit || 'Kg'}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Kg">Kg</SelectItem>
                      <SelectItem value="Ton">Ton</SelectItem>
                      <SelectItem value="Ltr">Ltr</SelectItem>
                      <SelectItem value="Pcs">Pcs</SelectItem>
                      <SelectItem value="Bag">Bag</SelectItem>
                    </SelectContent>
                  </Select>
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
                    defaultValue={editingMaterial?.current_stock ?? 0}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="min_stock_level">Min Stock Level</Label>
                  <Input
                    id="min_stock_level"
                    name="min_stock_level"
                    type="number"
                    step="0.01"
                    defaultValue={editingMaterial?.min_stock_level ?? 0}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rate">Rate (₹)</Label>
                  <Input
                    id="rate"
                    name="rate"
                    type="number"
                    step="0.01"
                    defaultValue={editingMaterial?.rate ?? 0}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingMaterial ? 'Update' : 'Add'} Material
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
