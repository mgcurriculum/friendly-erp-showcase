-- Create role enum for user roles
CREATE TYPE public.app_role AS ENUM ('super_admin', 'manager', 'data_entry', 'viewer');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view own role"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Super admins can manage all roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- User profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- System settings (branding, company info)
CREATE TABLE public.system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT NOT NULL DEFAULT 'Maxtron Associates',
    logo_url TEXT,
    primary_color TEXT DEFAULT '#6366f1',
    secondary_color TEXT DEFAULT '#8b5cf6',
    address TEXT,
    phone TEXT,
    email TEXT,
    gst_number TEXT,
    license_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view settings"
ON public.system_settings FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Super admins can update settings"
ON public.system_settings FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Raw Materials Master
CREATE TABLE public.raw_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    grade TEXT,
    unit TEXT DEFAULT 'Kg',
    rate DECIMAL(10,2) DEFAULT 0,
    current_stock DECIMAL(10,2) DEFAULT 0,
    min_stock_level DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.raw_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view raw materials"
ON public.raw_materials FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Managers and above can manage raw materials"
ON public.raw_materials FOR ALL
TO authenticated
USING (
    public.has_role(auth.uid(), 'super_admin') OR 
    public.has_role(auth.uid(), 'manager') OR
    public.has_role(auth.uid(), 'data_entry')
);

-- Finished Goods Master
CREATE TABLE public.finished_goods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    color TEXT,
    thickness DECIMAL(5,2),
    size TEXT,
    no_per_kg DECIMAL(10,2),
    unit TEXT DEFAULT 'Kg',
    rate DECIMAL(10,2) DEFAULT 0,
    current_stock DECIMAL(10,2) DEFAULT 0,
    min_stock_level DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.finished_goods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view finished goods"
ON public.finished_goods FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Managers and above can manage finished goods"
ON public.finished_goods FOR ALL
TO authenticated
USING (
    public.has_role(auth.uid(), 'super_admin') OR 
    public.has_role(auth.uid(), 'manager') OR
    public.has_role(auth.uid(), 'data_entry')
);

-- Suppliers Master
CREATE TABLE public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    gst_number TEXT,
    credit_period INTEGER DEFAULT 30,
    credit_limit DECIMAL(12,2) DEFAULT 0,
    opening_balance DECIMAL(12,2) DEFAULT 0,
    current_balance DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view suppliers"
ON public.suppliers FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Managers and above can manage suppliers"
ON public.suppliers FOR ALL
TO authenticated
USING (
    public.has_role(auth.uid(), 'super_admin') OR 
    public.has_role(auth.uid(), 'manager') OR
    public.has_role(auth.uid(), 'data_entry')
);

-- Customers Master
CREATE TABLE public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    gst_number TEXT,
    credit_period INTEGER DEFAULT 30,
    credit_limit DECIMAL(12,2) DEFAULT 0,
    opening_balance DECIMAL(12,2) DEFAULT 0,
    current_balance DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view customers"
ON public.customers FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Managers and above can manage customers"
ON public.customers FOR ALL
TO authenticated
USING (
    public.has_role(auth.uid(), 'super_admin') OR 
    public.has_role(auth.uid(), 'manager') OR
    public.has_role(auth.uid(), 'data_entry')
);

-- Employees Master
CREATE TABLE public.employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    department TEXT,
    designation TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    joining_date DATE,
    salary DECIMAL(10,2) DEFAULT 0,
    loan_balance DECIMAL(10,2) DEFAULT 0,
    suspense_balance DECIMAL(10,2) DEFAULT 0,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view employees"
ON public.employees FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Managers and above can manage employees"
ON public.employees FOR ALL
TO authenticated
USING (
    public.has_role(auth.uid(), 'super_admin') OR 
    public.has_role(auth.uid(), 'manager') OR
    public.has_role(auth.uid(), 'data_entry')
);

-- Vehicles Master
CREATE TABLE public.vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_number TEXT NOT NULL UNIQUE,
    vehicle_type TEXT,
    make TEXT,
    model TEXT,
    fitness_expiry DATE,
    insurance_expiry DATE,
    purpose TEXT,
    gps_enabled BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view vehicles"
ON public.vehicles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Managers and above can manage vehicles"
ON public.vehicles FOR ALL
TO authenticated
USING (
    public.has_role(auth.uid(), 'super_admin') OR 
    public.has_role(auth.uid(), 'manager') OR
    public.has_role(auth.uid(), 'data_entry')
);

-- Purchase Orders
CREATE TABLE public.purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT NOT NULL UNIQUE,
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_delivery DATE,
    total_amount DECIMAL(12,2) DEFAULT 0,
    status TEXT DEFAULT 'pending',
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view purchase orders"
ON public.purchase_orders FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Managers and above can manage purchase orders"
ON public.purchase_orders FOR ALL
TO authenticated
USING (
    public.has_role(auth.uid(), 'super_admin') OR 
    public.has_role(auth.uid(), 'manager') OR
    public.has_role(auth.uid(), 'data_entry')
);

-- Purchase Order Items
CREATE TABLE public.purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    raw_material_id UUID REFERENCES public.raw_materials(id) ON DELETE SET NULL,
    quantity DECIMAL(10,2) NOT NULL,
    rate DECIMAL(10,2) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    received_quantity DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view purchase order items"
ON public.purchase_order_items FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Managers and above can manage purchase order items"
ON public.purchase_order_items FOR ALL
TO authenticated
USING (
    public.has_role(auth.uid(), 'super_admin') OR 
    public.has_role(auth.uid(), 'manager') OR
    public.has_role(auth.uid(), 'data_entry')
);

-- Purchases (Raw Material Receipts)
CREATE TABLE public.purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_number TEXT NOT NULL UNIQUE,
    order_id UUID REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
    purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
    invoice_number TEXT,
    total_amount DECIMAL(12,2) DEFAULT 0,
    status TEXT DEFAULT 'completed',
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view purchases"
ON public.purchases FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Managers and above can manage purchases"
ON public.purchases FOR ALL
TO authenticated
USING (
    public.has_role(auth.uid(), 'super_admin') OR 
    public.has_role(auth.uid(), 'manager') OR
    public.has_role(auth.uid(), 'data_entry')
);

-- Purchase Items
CREATE TABLE public.purchase_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id UUID REFERENCES public.purchases(id) ON DELETE CASCADE,
    raw_material_id UUID REFERENCES public.raw_materials(id) ON DELETE SET NULL,
    quantity DECIMAL(10,2) NOT NULL,
    rate DECIMAL(10,2) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view purchase items"
ON public.purchase_items FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Managers and above can manage purchase items"
ON public.purchase_items FOR ALL
TO authenticated
USING (
    public.has_role(auth.uid(), 'super_admin') OR 
    public.has_role(auth.uid(), 'manager') OR
    public.has_role(auth.uid(), 'data_entry')
);

-- Production Batches
CREATE TABLE public.production_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_number TEXT NOT NULL UNIQUE,
    production_date DATE NOT NULL DEFAULT CURRENT_DATE,
    shift TEXT,
    finished_good_id UUID REFERENCES public.finished_goods(id) ON DELETE SET NULL,
    quantity_produced DECIMAL(10,2) DEFAULT 0,
    employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'in_progress',
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.production_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view production batches"
ON public.production_batches FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Managers and above can manage production batches"
ON public.production_batches FOR ALL
TO authenticated
USING (
    public.has_role(auth.uid(), 'super_admin') OR 
    public.has_role(auth.uid(), 'manager') OR
    public.has_role(auth.uid(), 'data_entry')
);

-- Material Consumption
CREATE TABLE public.material_consumption (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID REFERENCES public.production_batches(id) ON DELETE CASCADE,
    raw_material_id UUID REFERENCES public.raw_materials(id) ON DELETE SET NULL,
    quantity DECIMAL(10,2) NOT NULL,
    consumption_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.material_consumption ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view material consumption"
ON public.material_consumption FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Managers and above can manage material consumption"
ON public.material_consumption FOR ALL
TO authenticated
USING (
    public.has_role(auth.uid(), 'super_admin') OR 
    public.has_role(auth.uid(), 'manager') OR
    public.has_role(auth.uid(), 'data_entry')
);

-- Customer Orders
CREATE TABLE public.customer_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT NOT NULL UNIQUE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_delivery DATE,
    total_amount DECIMAL(12,2) DEFAULT 0,
    status TEXT DEFAULT 'pending',
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view customer orders"
ON public.customer_orders FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Managers and above can manage customer orders"
ON public.customer_orders FOR ALL
TO authenticated
USING (
    public.has_role(auth.uid(), 'super_admin') OR 
    public.has_role(auth.uid(), 'manager') OR
    public.has_role(auth.uid(), 'data_entry')
);

-- Customer Order Items
CREATE TABLE public.customer_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.customer_orders(id) ON DELETE CASCADE,
    finished_good_id UUID REFERENCES public.finished_goods(id) ON DELETE SET NULL,
    quantity DECIMAL(10,2) NOT NULL,
    rate DECIMAL(10,2) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    delivered_quantity DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view customer order items"
ON public.customer_order_items FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Managers and above can manage customer order items"
ON public.customer_order_items FOR ALL
TO authenticated
USING (
    public.has_role(auth.uid(), 'super_admin') OR 
    public.has_role(auth.uid(), 'manager') OR
    public.has_role(auth.uid(), 'data_entry')
);

-- Sales Invoices
CREATE TABLE public.sales_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number TEXT NOT NULL UNIQUE,
    order_id UUID REFERENCES public.customer_orders(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    subtotal DECIMAL(12,2) DEFAULT 0,
    gst_amount DECIMAL(12,2) DEFAULT 0,
    total_amount DECIMAL(12,2) DEFAULT 0,
    paid_amount DECIMAL(12,2) DEFAULT 0,
    status TEXT DEFAULT 'pending',
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sales_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view sales invoices"
ON public.sales_invoices FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Managers and above can manage sales invoices"
ON public.sales_invoices FOR ALL
TO authenticated
USING (
    public.has_role(auth.uid(), 'super_admin') OR 
    public.has_role(auth.uid(), 'manager') OR
    public.has_role(auth.uid(), 'data_entry')
);

-- Sales Invoice Items
CREATE TABLE public.sales_invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES public.sales_invoices(id) ON DELETE CASCADE,
    finished_good_id UUID REFERENCES public.finished_goods(id) ON DELETE SET NULL,
    quantity DECIMAL(10,2) NOT NULL,
    rate DECIMAL(10,2) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sales_invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view sales invoice items"
ON public.sales_invoice_items FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Managers and above can manage sales invoice items"
ON public.sales_invoice_items FOR ALL
TO authenticated
USING (
    public.has_role(auth.uid(), 'super_admin') OR 
    public.has_role(auth.uid(), 'manager') OR
    public.has_role(auth.uid(), 'data_entry')
);

-- Deliveries
CREATE TABLE public.deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_number TEXT NOT NULL UNIQUE,
    invoice_id UUID REFERENCES public.sales_invoices(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    delivery_date DATE NOT NULL DEFAULT CURRENT_DATE,
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
    driver_name TEXT,
    status TEXT DEFAULT 'pending',
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view deliveries"
ON public.deliveries FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Managers and above can manage deliveries"
ON public.deliveries FOR ALL
TO authenticated
USING (
    public.has_role(auth.uid(), 'super_admin') OR 
    public.has_role(auth.uid(), 'manager') OR
    public.has_role(auth.uid(), 'data_entry')
);

-- Customer Payments (Collections)
CREATE TABLE public.customer_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_number TEXT NOT NULL UNIQUE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    invoice_id UUID REFERENCES public.sales_invoices(id) ON DELETE SET NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount DECIMAL(12,2) NOT NULL,
    payment_mode TEXT DEFAULT 'cash',
    reference_number TEXT,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view customer payments"
ON public.customer_payments FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Managers and above can manage customer payments"
ON public.customer_payments FOR ALL
TO authenticated
USING (
    public.has_role(auth.uid(), 'super_admin') OR 
    public.has_role(auth.uid(), 'manager') OR
    public.has_role(auth.uid(), 'data_entry')
);

-- Supplier Payments
CREATE TABLE public.supplier_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_number TEXT NOT NULL UNIQUE,
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
    purchase_id UUID REFERENCES public.purchases(id) ON DELETE SET NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount DECIMAL(12,2) NOT NULL,
    payment_mode TEXT DEFAULT 'bank',
    reference_number TEXT,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.supplier_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view supplier payments"
ON public.supplier_payments FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Managers and above can manage supplier payments"
ON public.supplier_payments FOR ALL
TO authenticated
USING (
    public.has_role(auth.uid(), 'super_admin') OR 
    public.has_role(auth.uid(), 'manager') OR
    public.has_role(auth.uid(), 'data_entry')
);

-- Petty Cash
CREATE TABLE public.petty_cash (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    transaction_type TEXT NOT NULL,
    category TEXT,
    reference TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.petty_cash ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view petty cash"
ON public.petty_cash FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Managers and above can manage petty cash"
ON public.petty_cash FOR ALL
TO authenticated
USING (
    public.has_role(auth.uid(), 'super_admin') OR 
    public.has_role(auth.uid(), 'manager') OR
    public.has_role(auth.uid(), 'data_entry')
);

-- Attendance
CREATE TABLE public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
    shift TEXT,
    status TEXT DEFAULT 'present',
    in_time TIME,
    out_time TIME,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (employee_id, attendance_date)
);

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view attendance"
ON public.attendance FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Managers and above can manage attendance"
ON public.attendance FOR ALL
TO authenticated
USING (
    public.has_role(auth.uid(), 'super_admin') OR 
    public.has_role(auth.uid(), 'manager') OR
    public.has_role(auth.uid(), 'data_entry')
);

-- Wastage/Damages
CREATE TABLE public.wastage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wastage_date DATE NOT NULL DEFAULT CURRENT_DATE,
    batch_id UUID REFERENCES public.production_batches(id) ON DELETE SET NULL,
    finished_good_id UUID REFERENCES public.finished_goods(id) ON DELETE SET NULL,
    quantity DECIMAL(10,2) NOT NULL,
    reason TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.wastage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view wastage"
ON public.wastage FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Managers and above can manage wastage"
ON public.wastage FOR ALL
TO authenticated
USING (
    public.has_role(auth.uid(), 'super_admin') OR 
    public.has_role(auth.uid(), 'manager') OR
    public.has_role(auth.uid(), 'data_entry')
);

-- Insert default system settings
INSERT INTO public.system_settings (company_name, address, phone, email)
VALUES ('Maxtron Associates', 'Your Company Address', '+91 9876543210', 'info@maxtron.com');

-- Function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to generate auto-increment numbers
CREATE OR REPLACE FUNCTION public.generate_order_number(prefix TEXT)
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
  result TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM LENGTH(prefix) + 1) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.purchase_orders
  WHERE order_number LIKE prefix || '%';
  
  result := prefix || LPAD(next_num::TEXT, 6, '0');
  RETURN result;
END;
$$ LANGUAGE plpgsql;