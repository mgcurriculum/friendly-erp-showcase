import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DataTable, Column } from '@/components/common/DataTable';
import { Badge } from '@/components/ui/badge';
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
import { useAuth } from '@/hooks/useAuth';
import { Edit, Trash2, Phone, Mail } from 'lucide-react';
import type { Employee } from '@/types/erp';

const departments = ['Production', 'Sales', 'Accounts', 'Logistics', 'Admin', 'Maintenance', 'HR'];
const statuses = ['active', 'inactive', 'on_leave'];

export default function Employees() {
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { role } = useAuth();

  const canEdit = role === 'super_admin' || role === 'manager' || role === 'data_entry';

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('code', { ascending: true });
      if (error) throw error;
      return data as Employee[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (employee: { code: string; name: string; department?: string; designation?: string; phone?: string; email?: string; address?: string; joining_date?: string | null; salary?: number; status?: string }) => {
      const { data, error } = await supabase
        .from('employees')
        .insert([employee])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({ title: 'Employee created successfully' });
      setDialogOpen(false);
    },
    onError: (error) => {
      toast({ title: 'Error creating employee', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...employee }: Partial<Employee> & { id: string }) => {
      const { data, error } = await supabase
        .from('employees')
        .update(employee)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({ title: 'Employee updated successfully' });
      setDialogOpen(false);
      setEditingEmployee(null);
    },
    onError: (error) => {
      toast({ title: 'Error updating employee', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('employees').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({ title: 'Employee deleted successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error deleting employee', description: error.message, variant: 'destructive' });
    },
  });

  const filteredEmployees = useMemo(() => {
    if (!search) return employees;
    const searchLower = search.toLowerCase();
    return employees.filter(
      (emp) =>
        emp.code.toLowerCase().includes(searchLower) ||
        emp.name.toLowerCase().includes(searchLower) ||
        emp.department?.toLowerCase().includes(searchLower) ||
        emp.designation?.toLowerCase().includes(searchLower)
    );
  }, [employees, search]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const employee = {
      code: formData.get('code') as string,
      name: formData.get('name') as string,
      department: formData.get('department') as string,
      designation: formData.get('designation') as string,
      phone: formData.get('phone') as string,
      email: formData.get('email') as string,
      address: formData.get('address') as string,
      joining_date: formData.get('joining_date') as string || null,
      salary: parseFloat(formData.get('salary') as string) || 0,
      status: formData.get('status') as string,
    };

    if (editingEmployee) {
      updateMutation.mutate({ id: editingEmployee.id, ...employee });
    } else {
      createMutation.mutate(employee);
    }
  };

  const openEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingEmployee(null);
  };

  const columns: Column<Employee>[] = [
    { key: 'code', header: 'Code', className: 'font-medium' },
    { key: 'name', header: 'Name', className: 'font-medium' },
    { key: 'department', header: 'Department' },
    { key: 'designation', header: 'Designation' },
    {
      key: 'contact',
      header: 'Contact',
      cell: (emp) => (
        <div className="space-y-1">
          {emp.phone && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Phone className="h-3 w-3" />
              {emp.phone}
            </div>
          )}
          {emp.email && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Mail className="h-3 w-3" />
              {emp.email}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'salary',
      header: 'Salary',
      className: 'text-right',
      cell: (emp) => (
        <span className="font-medium">₹{emp.salary.toLocaleString('en-IN')}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (emp) => (
        <Badge
          variant={emp.status === 'active' ? 'default' : emp.status === 'on_leave' ? 'secondary' : 'outline'}
        >
          {emp.status.replace('_', ' ')}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      cell: (emp) => (
        <div className="flex gap-1">
          {canEdit && (
            <>
              <Button variant="ghost" size="icon" onClick={() => openEdit(emp)}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive"
                onClick={() => deleteMutation.mutate(emp.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Employees</h1>
          <p className="text-muted-foreground">Manage employee records and details</p>
        </div>

        <DataTable
          columns={columns}
          data={filteredEmployees}
          loading={isLoading}
          searchPlaceholder="Search employees..."
          searchValue={search}
          onSearchChange={setSearch}
          onAdd={() => setDialogOpen(true)}
          addLabel="Add Employee"
          canAdd={canEdit}
          emptyMessage="No employees found"
        />

        <Dialog open={dialogOpen} onOpenChange={closeDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingEmployee ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Employee Code *</Label>
                  <Input
                    id="code"
                    name="code"
                    required
                    defaultValue={editingEmployee?.code}
                    placeholder="EMP001"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    required
                    defaultValue={editingEmployee?.name}
                    placeholder="Enter full name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Select name="department" defaultValue={editingEmployee?.department || ''}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="designation">Designation</Label>
                  <Input
                    id="designation"
                    name="designation"
                    defaultValue={editingEmployee?.designation || ''}
                    placeholder="Enter designation"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    defaultValue={editingEmployee?.phone || ''}
                    placeholder="9876543210"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    defaultValue={editingEmployee?.email || ''}
                    placeholder="employee@company.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  name="address"
                  defaultValue={editingEmployee?.address || ''}
                  placeholder="Enter full address"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="joining_date">Joining Date</Label>
                  <Input
                    id="joining_date"
                    name="joining_date"
                    type="date"
                    defaultValue={editingEmployee?.joining_date || ''}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="salary">Salary (₹)</Label>
                  <Input
                    id="salary"
                    name="salary"
                    type="number"
                    min="0"
                    defaultValue={editingEmployee?.salary || 0}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select name="status" defaultValue={editingEmployee?.status || 'active'}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {statuses.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status.replace('_', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={closeDialog}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingEmployee ? 'Update' : 'Create'} Employee
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
