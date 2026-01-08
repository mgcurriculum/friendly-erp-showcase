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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Pencil, Trash2, Plus, Eye } from "lucide-react";
import type { Customer, FinishedGood } from "@/types/erp";

interface SalesInvoice {
  id: string;
  invoice_number: string;
  customer_id: string | null;
  order_id: string | null;
  invoice_date: string;
  subtotal: number;
  gst_amount: number;
  total_amount: number;
  paid_amount: number;
  status: string;
  notes: string | null;
  created_at: string;
  customers?: Customer;
}

interface InvoiceItem {
  id?: string;
  finished_good_id: string;
  quantity: number;
  rate: number;
  amount: number;
  finished_goods?: FinishedGood;
}

const SalesInvoices = () => {
  const { toast } = useToast();
  const { role, user } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<SalesInvoice | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [formData, setFormData] = useState({
    customer_id: "",
    invoice_date: new Date().toISOString().split("T")[0],
    gst_percentage: 18,
    notes: "",
  });
  const [lineItems, setLineItems] = useState<InvoiceItem[]>([]);

  const canEdit = role && ["super_admin", "manager", "data_entry"].includes(role);

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["sales-invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales_invoices")
        .select("*, customers(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as SalesInvoice[];
    },
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as Customer[];
    },
  });

  const { data: finishedGoods = [] } = useQuery({
    queryKey: ["finished-goods"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("finished_goods")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as FinishedGood[];
    },
  });

  const filteredInvoices = invoices.filter(
    (inv) =>
      inv.invoice_number.toLowerCase().includes(searchValue.toLowerCase()) ||
      inv.customers?.name?.toLowerCase().includes(searchValue.toLowerCase())
  );

  const generateInvoiceNumber = async () => {
    const today = new Date();
    const prefix = `INV-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}`;
    const { count } = await supabase
      .from("sales_invoices")
      .select("*", { count: "exact", head: true })
      .like("invoice_number", `${prefix}%`);
    return `${prefix}-${String((count || 0) + 1).padStart(4, "0")}`;
  };

  const createMutation = useMutation({
    mutationFn: async (data: {
      formData: typeof formData;
      lineItems: InvoiceItem[];
    }) => {
      const invoiceNumber = await generateInvoiceNumber();
      const subtotal = data.lineItems.reduce((sum, item) => sum + item.amount, 0);
      const gstAmount = (subtotal * data.formData.gst_percentage) / 100;
      const totalAmount = subtotal + gstAmount;

      const { data: invoice, error: invoiceError } = await supabase
        .from("sales_invoices")
        .insert({
          invoice_number: invoiceNumber,
          customer_id: data.formData.customer_id,
          invoice_date: data.formData.invoice_date,
          subtotal,
          gst_amount: gstAmount,
          total_amount: totalAmount,
          notes: data.formData.notes || null,
          status: "pending",
          created_by: user?.id,
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      const itemsToInsert = data.lineItems.map((item) => ({
        invoice_id: invoice.id,
        finished_good_id: item.finished_good_id,
        quantity: item.quantity,
        rate: item.rate,
        amount: item.amount,
      }));

      const { error: itemsError } = await supabase
        .from("sales_invoice_items")
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      return invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-invoices"] });
      toast({ title: "Invoice created successfully" });
      handleCloseDialog();
    },
    onError: (error) => {
      toast({ title: "Error creating invoice", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error: itemsError } = await supabase
        .from("sales_invoice_items")
        .delete()
        .eq("invoice_id", id);
      if (itemsError) throw itemsError;

      const { error } = await supabase.from("sales_invoices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-invoices"] });
      toast({ title: "Invoice deleted successfully" });
    },
    onError: (error) => {
      toast({ title: "Error deleting invoice", description: error.message, variant: "destructive" });
    },
  });

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setIsViewMode(false);
    setEditingInvoice(null);
    setFormData({
      customer_id: "",
      invoice_date: new Date().toISOString().split("T")[0],
      gst_percentage: 18,
      notes: "",
    });
    setLineItems([]);
  };

  const handleView = async (invoice: SalesInvoice) => {
    const { data: items } = await supabase
      .from("sales_invoice_items")
      .select("*, finished_goods(*)")
      .eq("invoice_id", invoice.id);

    setEditingInvoice(invoice);
    setFormData({
      customer_id: invoice.customer_id || "",
      invoice_date: invoice.invoice_date,
      gst_percentage: invoice.subtotal > 0 ? (invoice.gst_amount / invoice.subtotal) * 100 : 18,
      notes: invoice.notes || "",
    });
    setLineItems(items || []);
    setIsViewMode(true);
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (lineItems.length === 0) {
      toast({ title: "Please add at least one line item", variant: "destructive" });
      return;
    }
    createMutation.mutate({ formData, lineItems });
  };

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      { finished_good_id: "", quantity: 1, rate: 0, amount: 0 },
    ]);
  };

  const updateLineItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };

    if (field === "finished_good_id") {
      const product = finishedGoods.find((p) => p.id === value);
      if (product) {
        updated[index].rate = product.rate;
        updated[index].amount = product.rate * updated[index].quantity;
      }
    }

    if (field === "quantity" || field === "rate") {
      updated[index].amount = updated[index].quantity * updated[index].rate;
    }

    setLineItems(updated);
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const gstAmount = (subtotal * formData.gst_percentage) / 100;
  const totalAmount = subtotal + gstAmount;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge variant="default">Paid</Badge>;
      case "partial":
        return <Badge variant="secondary">Partial</Badge>;
      case "pending":
        return <Badge variant="outline">Pending</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const columns: Column<SalesInvoice>[] = [
    { key: "invoice_number", header: "Invoice #" },
    {
      key: "customer_id",
      header: "Customer",
      cell: (row) => row.customers?.name || "-",
    },
    {
      key: "invoice_date",
      header: "Date",
      cell: (row) => new Date(row.invoice_date).toLocaleDateString("en-IN"),
    },
    {
      key: "total_amount",
      header: "Total",
      cell: (row) => formatCurrency(row.total_amount),
    },
    {
      key: "paid_amount",
      header: "Paid",
      cell: (row) => formatCurrency(row.paid_amount),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => getStatusBadge(row.status || "pending"),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={() => handleView(row)}>
            <Eye className="h-4 w-4" />
          </Button>
          {canEdit && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => deleteMutation.mutate(row.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Sales Invoices</h1>
          <p className="text-muted-foreground">
            Create and manage sales invoices for customers
          </p>
        </div>

        <DataTable
          columns={columns}
          data={filteredInvoices}
          searchPlaceholder="Search invoices..."
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          onAdd={canEdit ? () => setIsDialogOpen(true) : undefined}
          addLabel="New Invoice"
          loading={isLoading}
        />

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {isViewMode
                  ? `Invoice: ${editingInvoice?.invoice_number}`
                  : "Create Sales Invoice"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customer">Customer *</Label>
                  <Select
                    value={formData.customer_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, customer_id: value })
                    }
                    disabled={isViewMode}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invoice_date">Invoice Date *</Label>
                  <Input
                    id="invoice_date"
                    type="date"
                    value={formData.invoice_date}
                    onChange={(e) =>
                      setFormData({ ...formData, invoice_date: e.target.value })
                    }
                    disabled={isViewMode}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gst_percentage">GST %</Label>
                  <Input
                    id="gst_percentage"
                    type="number"
                    value={formData.gst_percentage}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        gst_percentage: parseFloat(e.target.value) || 0,
                      })
                    }
                    disabled={isViewMode}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-base font-semibold">Line Items</Label>
                  {!isViewMode && (
                    <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Item
                    </Button>
                  )}
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-3 text-sm font-medium">Product</th>
                        <th className="text-right p-3 text-sm font-medium w-24">Qty</th>
                        <th className="text-right p-3 text-sm font-medium w-32">Rate (₹)</th>
                        <th className="text-right p-3 text-sm font-medium w-32">Amount (₹)</th>
                        {!isViewMode && <th className="w-12"></th>}
                      </tr>
                    </thead>
                    <tbody>
                      {lineItems.map((item, index) => (
                        <tr key={index} className="border-t">
                          <td className="p-2">
                            {isViewMode ? (
                              <span>{item.finished_goods?.name || "-"}</span>
                            ) : (
                              <Select
                                value={item.finished_good_id}
                                onValueChange={(value) =>
                                  updateLineItem(index, "finished_good_id", value)
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select product" />
                                </SelectTrigger>
                                <SelectContent>
                                  {finishedGoods.map((product) => (
                                    <SelectItem key={product.id} value={product.id}>
                                      {product.name} ({product.code})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) =>
                                updateLineItem(index, "quantity", parseFloat(e.target.value) || 0)
                              }
                              disabled={isViewMode}
                              className="text-right"
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              min="0"
                              value={item.rate}
                              onChange={(e) =>
                                updateLineItem(index, "rate", parseFloat(e.target.value) || 0)
                              }
                              disabled={isViewMode}
                              className="text-right"
                            />
                          </td>
                          <td className="p-2 text-right font-medium">
                            {formatCurrency(item.amount)}
                          </td>
                          {!isViewMode && (
                            <td className="p-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeLineItem(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          )}
                        </tr>
                      ))}
                      {lineItems.length === 0 && (
                        <tr>
                          <td colSpan={isViewMode ? 4 : 5} className="p-8 text-center text-muted-foreground">
                            No items added
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span>{formatCurrency(isViewMode ? editingInvoice?.subtotal || 0 : subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">GST ({formData.gst_percentage}%):</span>
                      <span>{formatCurrency(isViewMode ? editingInvoice?.gst_amount || 0 : gstAmount)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg border-t pt-2">
                      <span>Total:</span>
                      <span>{formatCurrency(isViewMode ? editingInvoice?.total_amount || 0 : totalAmount)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  disabled={isViewMode}
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  {isViewMode ? "Close" : "Cancel"}
                </Button>
                {!isViewMode && (
                  <Button type="submit" disabled={createMutation.isPending}>
                    Create Invoice
                  </Button>
                )}
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default SalesInvoices;
