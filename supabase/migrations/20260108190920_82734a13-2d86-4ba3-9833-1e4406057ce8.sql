-- Create cutting_sealing_entries table
CREATE TABLE public.cutting_sealing_entries (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    cutting_number TEXT NOT NULL UNIQUE,
    job_date DATE NOT NULL DEFAULT CURRENT_DATE,
    shift TEXT,
    batch_id UUID REFERENCES public.production_batches(id),
    quantity_processed NUMERIC NOT NULL DEFAULT 0,
    status TEXT DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID
);

-- Create packing_entries table
CREATE TABLE public.packing_entries (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    packing_number TEXT NOT NULL UNIQUE,
    job_date DATE NOT NULL DEFAULT CURRENT_DATE,
    shift TEXT,
    cutting_sealing_id UUID REFERENCES public.cutting_sealing_entries(id),
    quantity_packed NUMERIC NOT NULL DEFAULT 0,
    status TEXT DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID
);

-- Create purchase_returns table
CREATE TABLE public.purchase_returns (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    return_number TEXT NOT NULL UNIQUE,
    return_date DATE NOT NULL DEFAULT CURRENT_DATE,
    purchase_id UUID REFERENCES public.purchases(id),
    return_method TEXT DEFAULT 'direct',
    total_amount NUMERIC NOT NULL DEFAULT 0,
    reason TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID
);

-- Create sales_returns table
CREATE TABLE public.sales_returns (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    return_number TEXT NOT NULL UNIQUE,
    return_date DATE NOT NULL DEFAULT CURRENT_DATE,
    invoice_id UUID REFERENCES public.sales_invoices(id),
    return_method TEXT DEFAULT 'direct',
    handled_by UUID REFERENCES public.employees(id),
    total_amount NUMERIC NOT NULL DEFAULT 0,
    reason TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID
);

-- Create marketing_visits table
CREATE TABLE public.marketing_visits (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
    employee_id UUID REFERENCES public.employees(id),
    customer_name TEXT NOT NULL,
    customer_place TEXT,
    entry_time TIME,
    exit_time TIME,
    person_met TEXT,
    contact_number TEXT,
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID
);

-- Enable RLS on all tables
ALTER TABLE public.cutting_sealing_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packing_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_visits ENABLE ROW LEVEL SECURITY;

-- RLS policies for authenticated users
CREATE POLICY "Authenticated users can view cutting_sealing_entries" ON public.cutting_sealing_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert cutting_sealing_entries" ON public.cutting_sealing_entries FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update cutting_sealing_entries" ON public.cutting_sealing_entries FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete cutting_sealing_entries" ON public.cutting_sealing_entries FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view packing_entries" ON public.packing_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert packing_entries" ON public.packing_entries FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update packing_entries" ON public.packing_entries FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete packing_entries" ON public.packing_entries FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view purchase_returns" ON public.purchase_returns FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert purchase_returns" ON public.purchase_returns FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update purchase_returns" ON public.purchase_returns FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete purchase_returns" ON public.purchase_returns FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view sales_returns" ON public.sales_returns FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert sales_returns" ON public.sales_returns FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update sales_returns" ON public.sales_returns FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete sales_returns" ON public.sales_returns FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view marketing_visits" ON public.marketing_visits FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert marketing_visits" ON public.marketing_visits FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update marketing_visits" ON public.marketing_visits FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete marketing_visits" ON public.marketing_visits FOR DELETE TO authenticated USING (true);