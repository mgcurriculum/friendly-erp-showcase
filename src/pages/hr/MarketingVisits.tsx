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

interface MarketingVisit {
  id: string;
  visit_date: string;
  employee_id: string | null;
  customer_name: string;
  customer_place: string | null;
  entry_time: string | null;
  exit_time: string | null;
  person_met: string | null;
  contact_number: string | null;
  remarks: string | null;
  created_at: string;
  employees?: { code: string; name: string } | null;
}

export default function MarketingVisits() {
  const { role } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVisit, setEditingVisit] = useState<MarketingVisit | null>(null);

  const canEdit = role === 'super_admin' || role === 'manager' || role === 'data_entry';

  const [formData, setFormData] = useState({
    visit_date: format(new Date(), 'yyyy-MM-dd'),
    employee_id: '',
    customer_name: '',
    customer_place: '',
    entry_time: '',
    exit_time: '',
    person_met: '',
    contact_number: '',
    remarks: '',
  });

  const { data: visits = [], isLoading } = useQuery({
    queryKey: ['marketing-visits'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketing_visits' as any)
        .select('*, employees(code, name)')
        .order('visit_date', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as MarketingVisit[];
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

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from('marketing_visits' as any).insert({
        visit_date: data.visit_date,
        employee_id: data.employee_id || null,
        customer_name: data.customer_name,
        customer_place: data.customer_place || null,
        entry_time: data.entry_time || null,
        exit_time: data.exit_time || null,
        person_met: data.person_met || null,
        contact_number: data.contact_number || null,
        remarks: data.remarks || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-visits'] });
      toast({ title: 'Visit recorded successfully' });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({ title: 'Error recording visit', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from('marketing_visits' as any)
        .update({
          visit_date: data.visit_date,
          employee_id: data.employee_id || null,
          customer_name: data.customer_name,
          customer_place: data.customer_place || null,
          entry_time: data.entry_time || null,
          exit_time: data.exit_time || null,
          person_met: data.person_met || null,
          contact_number: data.contact_number || null,
          remarks: data.remarks || null,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-visits'] });
      toast({ title: 'Visit updated successfully' });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating visit', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('marketing_visits' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-visits'] });
      toast({ title: 'Visit deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting visit', description: error.message, variant: 'destructive' });
    },
  });

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingVisit(null);
    setFormData({
      visit_date: format(new Date(), 'yyyy-MM-dd'),
      employee_id: '',
      customer_name: '',
      customer_place: '',
      entry_time: '',
      exit_time: '',
      person_met: '',
      contact_number: '',
      remarks: '',
    });
  };

  const handleEdit = (visit: MarketingVisit) => {
    setEditingVisit(visit);
    setFormData({
      visit_date: visit.visit_date,
      employee_id: visit.employee_id || '',
      customer_name: visit.customer_name,
      customer_place: visit.customer_place || '',
      entry_time: visit.entry_time || '',
      exit_time: visit.exit_time || '',
      person_met: visit.person_met || '',
      contact_number: visit.contact_number || '',
      remarks: visit.remarks || '',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingVisit) {
      updateMutation.mutate({ id: editingVisit.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const filteredVisits = visits.filter(
    (v) =>
      v.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      v.employees?.name?.toLowerCase().includes(search.toLowerCase()) ||
      v.customer_place?.toLowerCase().includes(search.toLowerCase())
  );

  const columns: Column<MarketingVisit>[] = [
    { key: 'visit_date', header: 'Date', cell: (v) => format(new Date(v.visit_date), 'dd/MM/yyyy') },
    { key: 'employee', header: 'Employee', cell: (v) => v.employees ? `${v.employees.code} - ${v.employees.name}` : '-' },
    { key: 'customer_name', header: 'Customer' },
    { key: 'customer_place', header: 'Place', cell: (v) => v.customer_place || '-' },
    { key: 'entry_time', header: 'Entry', cell: (v) => v.entry_time || '-' },
    { key: 'exit_time', header: 'Exit', cell: (v) => v.exit_time || '-' },
    { key: 'person_met', header: 'Person Met', cell: (v) => v.person_met || '-' },
    {
      key: 'actions',
      header: 'Actions',
      cell: (v) =>
        canEdit && (
          <div className="flex gap-2">
            <Button size="icon" variant="ghost" onClick={() => handleEdit(v)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(v.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
    },
  ];

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: 'HR', href: '/hr/attendance' },
        { label: 'Marketing Visits' },
      ]}
    >
      <DataTable
        columns={columns}
        data={filteredVisits}
        searchPlaceholder="Search visits..."
        searchValue={search}
        onSearchChange={setSearch}
        onAdd={() => setIsDialogOpen(true)}
        addLabel="New Visit"
        loading={isLoading}
        emptyMessage="No marketing visits found"
        canAdd={canEdit}
      />

      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingVisit ? 'Edit Visit' : 'New Marketing Visit'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Visit Date</Label>
                <Input
                  type="date"
                  value={formData.visit_date}
                  onChange={(e) => setFormData({ ...formData, visit_date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Employee</Label>
                <Select value={formData.employee_id} onValueChange={(v) => setFormData({ ...formData, employee_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                  <SelectContent>
                    {employees.map((emp: any) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.code} - {emp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Customer Name</Label>
                <Input
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Place</Label>
                <Input
                  value={formData.customer_place}
                  onChange={(e) => setFormData({ ...formData, customer_place: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Entry Time</Label>
                <Input
                  type="time"
                  value={formData.entry_time}
                  onChange={(e) => setFormData({ ...formData, entry_time: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Exit Time</Label>
                <Input
                  type="time"
                  value={formData.exit_time}
                  onChange={(e) => setFormData({ ...formData, exit_time: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Person Met</Label>
                <Input
                  value={formData.person_met}
                  onChange={(e) => setFormData({ ...formData, person_met: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Contact Number</Label>
                <Input
                  value={formData.contact_number}
                  onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Remarks</Label>
              <Textarea
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleCloseDialog}>Cancel</Button>
              <Button type="submit">{editingVisit ? 'Update' : 'Create'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
