import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DataTable, Column } from "@/components/common/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Pencil, Trash2 } from "lucide-react";
import type { Supplier } from "@/types/erp";

const Suppliers = () => {
  const { toast } = useToast();
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    contact_person: "",
    phone: "",
    email: "",
    address: "",
    gst_number: "",
    credit_period: 30,
    credit_limit: 0,
    opening_balance: 0,
  });

  const canEdit = role && ["super_admin", "manager", "data_entry"].includes(role);

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as Supplier[];
    },
  });

  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(searchValue.toLowerCase()) ||
      s.code.toLowerCase().includes(searchValue.toLowerCase()) ||
      s.contact_person?.toLowerCase().includes(searchValue.toLowerCase())
  );

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("suppliers").insert({
        ...data,
        current_balance: data.opening_balance,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast({ title: "Supplier created successfully" });
      handleCloseDialog();
    },
    onError: (error) => {
      toast({ title: "Error creating supplier", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from("suppliers")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast({ title: "Supplier updated successfully" });
      handleCloseDialog();
    },
    onError: (error) => {
      toast({ title: "Error updating supplier", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("suppliers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast({ title: "Supplier deleted successfully" });
    },
    onError: (error) => {
      toast({ title: "Error deleting supplier", description: error.message, variant: "destructive" });
    },
  });

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingSupplier(null);
    setFormData({
      code: "",
      name: "",
      contact_person: "",
      phone: "",
      email: "",
      address: "",
      gst_number: "",
      credit_period: 30,
      credit_limit: 0,
      opening_balance: 0,
    });
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      code: supplier.code,
      name: supplier.name,
      contact_person: supplier.contact_person || "",
      phone: supplier.phone || "",
      email: supplier.email || "",
      address: supplier.address || "",
      gst_number: supplier.gst_number || "",
      credit_period: supplier.credit_period,
      credit_limit: supplier.credit_limit,
      opening_balance: supplier.opening_balance,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSupplier) {
      updateMutation.mutate({ id: editingSupplier.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const getBalanceStatus = (balance: number, limit: number) => {
    if (balance <= 0) return { label: "Clear", variant: "default" as const };
    const percentage = (balance / limit) * 100;
    if (percentage >= 90) return { label: "Critical", variant: "destructive" as const };
    if (percentage >= 75) return { label: "High", variant: "secondary" as const };
    return { label: "Normal", variant: "outline" as const };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const columns: Column<Supplier>[] = [
    { key: "code", header: "Code" },
    { key: "name", header: "Name" },
    {
      key: "contact_person",
      header: "Contact",
      cell: (row) => (
        <div className="text-sm">
          <div className="font-medium">{row.contact_person || "-"}</div>
          <div className="text-muted-foreground">{row.phone || "-"}</div>
        </div>
      ),
    },
    {
      key: "gst_number",
      header: "GST Number",
      cell: (row) => row.gst_number || "-",
    },
    {
      key: "credit_period",
      header: "Credit Period",
      cell: (row) => `${row.credit_period} days`,
    },
    {
      key: "credit_limit",
      header: "Credit Limit",
      cell: (row) => formatCurrency(row.credit_limit),
    },
    {
      key: "current_balance",
      header: "Outstanding",
      cell: (row) => {
        const status = getBalanceStatus(row.current_balance, row.credit_limit);
        return (
          <div className="flex items-center gap-2">
            <span className={row.current_balance > 0 ? "text-destructive font-medium" : ""}>
              {formatCurrency(row.current_balance)}
            </span>
            {row.current_balance > 0 && row.credit_limit > 0 && (
              <Badge variant={status.variant}>{status.label}</Badge>
            )}
          </div>
        );
      },
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row) =>
        canEdit && (
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={() => handleEdit(row)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => deleteMutation.mutate(row.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Suppliers</h1>
          <p className="text-muted-foreground">
            Manage supplier information, credit limits, and outstanding balances
          </p>
        </div>

        <DataTable
          columns={columns}
          data={filteredSuppliers}
          searchPlaceholder="Search suppliers..."
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          onAdd={canEdit ? () => setIsDialogOpen(true) : undefined}
          addLabel="Add Supplier"
          loading={isLoading}
        />

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingSupplier ? "Edit Supplier" : "Add Supplier"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Code *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contact_person">Contact Person</Label>
                  <Input
                    id="contact_person"
                    value={formData.contact_person}
                    onChange={(e) =>
                      setFormData({ ...formData, contact_person: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gst_number">GST Number</Label>
                  <Input
                    id="gst_number"
                    value={formData.gst_number}
                    onChange={(e) =>
                      setFormData({ ...formData, gst_number: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="credit_period">Credit Period (days)</Label>
                  <Input
                    id="credit_period"
                    type="number"
                    value={formData.credit_period}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        credit_period: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="credit_limit">Credit Limit (₹)</Label>
                  <Input
                    id="credit_limit"
                    type="number"
                    value={formData.credit_limit}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        credit_limit: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="opening_balance">Opening Balance (₹)</Label>
                  <Input
                    id="opening_balance"
                    type="number"
                    value={formData.opening_balance}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        opening_balance: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {editingSupplier ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Suppliers;
