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

interface AttendanceRecord {
  id: string;
  employee_id: string | null;
  attendance_date: string;
  shift: string | null;
  status: string;
  in_time: string | null;
  out_time: string | null;
  notes: string | null;
  created_at: string;
  employees?: { name: string; code: string } | null;
}

export default function Attendance() {
  const { role } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);

  const canEdit = role === 'super_admin' || role === 'manager' || role === 'data_entry';

  const [formData, setFormData] = useState({
    employee_id: '',
    attendance_date: format(new Date(), 'yyyy-MM-dd'),
    shift: '',
    status: 'present',
    in_time: '',
    out_time: '',
    notes: '',
  });

  const { data: attendance = [], isLoading } = useQuery({
    queryKey: ['attendance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance')
        .select('*, employees(name, code)')
        .order('attendance_date', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as AttendanceRecord[];
    },
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees-active'],
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
      const { error } = await supabase.from('attendance').insert({
        employee_id: data.employee_id || null,
        attendance_date: data.attendance_date,
        shift: data.shift || null,
        status: data.status,
        in_time: data.in_time || null,
        out_time: data.out_time || null,
        notes: data.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast({ title: 'Attendance recorded successfully' });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({ title: 'Error recording attendance', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from('attendance')
        .update({
          employee_id: data.employee_id || null,
          attendance_date: data.attendance_date,
          shift: data.shift || null,
          status: data.status,
          in_time: data.in_time || null,
          out_time: data.out_time || null,
          notes: data.notes || null,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast({ title: 'Attendance updated successfully' });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating attendance', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('attendance').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast({ title: 'Attendance record deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting record', description: error.message, variant: 'destructive' });
    },
  });

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingRecord(null);
    setFormData({
      employee_id: '',
      attendance_date: format(new Date(), 'yyyy-MM-dd'),
      shift: '',
      status: 'present',
      in_time: '',
      out_time: '',
      notes: '',
    });
  };

  const handleEdit = (record: AttendanceRecord) => {
    setEditingRecord(record);
    setFormData({
      employee_id: record.employee_id || '',
      attendance_date: record.attendance_date,
      shift: record.shift || '',
      status: record.status,
      in_time: record.in_time || '',
      out_time: record.out_time || '',
      notes: record.notes || '',
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

  const filteredAttendance = attendance.filter(
    (a) =>
      a.employees?.name?.toLowerCase().includes(search.toLowerCase()) ||
      a.employees?.code?.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      present: 'default',
      absent: 'destructive',
      half_day: 'secondary',
      leave: 'outline',
    };
    return <Badge variant={variants[status] || 'outline'}>{status.replace('_', ' ')}</Badge>;
  };

  const columns: Column<AttendanceRecord>[] = [
    { key: 'attendance_date', header: 'Date', cell: (a) => format(new Date(a.attendance_date), 'dd/MM/yyyy') },
    { key: 'employee', header: 'Employee', cell: (a) => a.employees ? `${a.employees.code} - ${a.employees.name}` : '-' },
    { key: 'shift', header: 'Shift', cell: (a) => a.shift || '-' },
    { key: 'status', header: 'Status', cell: (a) => getStatusBadge(a.status) },
    { key: 'in_time', header: 'In Time', cell: (a) => a.in_time || '-' },
    { key: 'out_time', header: 'Out Time', cell: (a) => a.out_time || '-' },
    { key: 'notes', header: 'Notes', cell: (a) => a.notes || '-' },
    {
      key: 'actions',
      header: 'Actions',
      cell: (a) =>
        canEdit && (
          <div className="flex gap-2">
            <Button size="icon" variant="ghost" onClick={() => handleEdit(a)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(a.id)}>
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
        { label: 'Attendance' },
      ]}
    >
      <DataTable
        columns={columns}
        data={filteredAttendance}
        searchPlaceholder="Search employees..."
        searchValue={search}
        onSearchChange={setSearch}
        onAdd={() => setIsDialogOpen(true)}
        addLabel="Mark Attendance"
        loading={isLoading}
        emptyMessage="No attendance records found"
        canAdd={canEdit}
      />

      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingRecord ? 'Edit Attendance' : 'Mark Attendance'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Employee</Label>
              <Select value={formData.employee_id} onValueChange={(v) => setFormData({ ...formData, employee_id: v })} required>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.code} - {emp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={formData.attendance_date}
                  onChange={(e) => setFormData({ ...formData, attendance_date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Shift</Label>
                <Select value={formData.shift} onValueChange={(v) => setFormData({ ...formData, shift: v })}>
                  <SelectTrigger><SelectValue placeholder="Select shift" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">Morning</SelectItem>
                    <SelectItem value="afternoon">Afternoon</SelectItem>
                    <SelectItem value="night">Night</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="half_day">Half Day</SelectItem>
                  <SelectItem value="leave">Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>In Time</Label>
                <Input
                  type="time"
                  value={formData.in_time}
                  onChange={(e) => setFormData({ ...formData, in_time: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Out Time</Label>
                <Input
                  type="time"
                  value={formData.out_time}
                  onChange={(e) => setFormData({ ...formData, out_time: e.target.value })}
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
              <Button type="submit">{editingRecord ? 'Update' : 'Save'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
