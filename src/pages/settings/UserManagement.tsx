import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
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
import { Edit, Shield, ShieldCheck, ShieldAlert, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { AppRole } from '@/types/erp';

interface UserWithRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
  profiles?: {
    full_name: string | null;
  } | null;
  email?: string;
}

export default function UserManagement() {
  const { role } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [selectedRole, setSelectedRole] = useState<AppRole>('viewer');

  const canEdit = role === 'super_admin';

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['user-roles'],
    queryFn: async () => {
      const { data: roles, error } = await supabase
        .from('user_roles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (roles || []) as unknown as UserWithRole[];
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: AppRole }) => {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-roles'] });
      toast({ title: 'User role updated successfully' });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating role', description: error.message, variant: 'destructive' });
    },
  });

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingUser(null);
    setSelectedRole('viewer');
  };

  const handleEdit = (user: UserWithRole) => {
    setEditingUser(user);
    setSelectedRole(user.role);
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      updateRoleMutation.mutate({ userId: editingUser.user_id, newRole: selectedRole });
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.profiles?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.role.toLowerCase().includes(search.toLowerCase())
  );

  const getRoleIcon = (role: AppRole) => {
    switch (role) {
      case 'super_admin':
        return <ShieldAlert className="h-4 w-4" />;
      case 'manager':
        return <ShieldCheck className="h-4 w-4" />;
      case 'data_entry':
        return <Shield className="h-4 w-4" />;
      default:
        return <Eye className="h-4 w-4" />;
    }
  };

  const getRoleBadge = (role: AppRole) => {
    const variants: Record<AppRole, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      super_admin: 'destructive',
      manager: 'default',
      data_entry: 'secondary',
      viewer: 'outline',
    };
    return (
      <Badge variant={variants[role]} className="flex items-center gap-1 w-fit">
        {getRoleIcon(role)}
        {role.replace('_', ' ')}
      </Badge>
    );
  };

  const columns: Column<UserWithRole>[] = [
    { 
      key: 'name', 
      header: 'Name', 
      cell: (u) => u.profiles?.full_name || 'Unknown User' 
    },
    { 
      key: 'role', 
      header: 'Role', 
      cell: (u) => getRoleBadge(u.role) 
    },
    { 
      key: 'created_at', 
      header: 'Joined', 
      cell: (u) => format(new Date(u.created_at), 'dd/MM/yyyy') 
    },
    {
      key: 'actions',
      header: 'Actions',
      cell: (u) =>
        canEdit && (
          <Button size="icon" variant="ghost" onClick={() => handleEdit(u)}>
            <Edit className="h-4 w-4" />
          </Button>
        ),
    },
  ];

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: 'Settings', href: '/settings/system' },
        { label: 'User Management' },
      ]}
    >
      <DataTable
        columns={columns}
        data={filteredUsers}
        searchPlaceholder="Search users..."
        searchValue={search}
        onSearchChange={setSearch}
        loading={isLoading}
        emptyMessage="No users found"
        canAdd={false}
      />

      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User Role</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>User</Label>
              <Input value={editingUser?.profiles?.full_name || ''} disabled />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as AppRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="data_entry">Data Entry</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleCloseDialog}>Cancel</Button>
              <Button type="submit" disabled={updateRoleMutation.isPending}>
                {updateRoleMutation.isPending ? 'Updating...' : 'Update Role'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
