-- KEIL Routes table
CREATE TABLE public.keil_routes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  route_code TEXT NOT NULL UNIQUE,
  route_name TEXT NOT NULL,
  route_type TEXT DEFAULT 'regular',
  branch TEXT,
  area TEXT,
  description TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.keil_routes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view keil_routes" ON public.keil_routes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert keil_routes" ON public.keil_routes FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update keil_routes" ON public.keil_routes FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete keil_routes" ON public.keil_routes FOR DELETE USING (true);

-- KEIL HCE (Healthcare Establishments) table
CREATE TABLE public.keil_hce (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hce_code TEXT NOT NULL UNIQUE,
  hce_name TEXT NOT NULL,
  hce_type TEXT DEFAULT 'hospital',
  address TEXT,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  route_id UUID REFERENCES public.keil_routes(id),
  license_number TEXT,
  beds_count INTEGER DEFAULT 0,
  waste_category TEXT,
  collection_frequency TEXT DEFAULT 'daily',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.keil_hce ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view keil_hce" ON public.keil_hce FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert keil_hce" ON public.keil_hce FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update keil_hce" ON public.keil_hce FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete keil_hce" ON public.keil_hce FOR DELETE USING (true);

-- KEIL Daily Collections table
CREATE TABLE public.keil_collections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_number TEXT NOT NULL UNIQUE,
  collection_date DATE NOT NULL DEFAULT CURRENT_DATE,
  route_id UUID REFERENCES public.keil_routes(id),
  vehicle_id UUID REFERENCES public.vehicles(id),
  driver_id UUID REFERENCES public.employees(id),
  helper_id UUID REFERENCES public.employees(id),
  start_time TIME,
  end_time TIME,
  start_km NUMERIC DEFAULT 0,
  end_km NUMERIC DEFAULT 0,
  total_weight NUMERIC DEFAULT 0,
  total_bags INTEGER DEFAULT 0,
  notes TEXT,
  status TEXT DEFAULT 'pending',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.keil_collections ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view keil_collections" ON public.keil_collections FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert keil_collections" ON public.keil_collections FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update keil_collections" ON public.keil_collections FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete keil_collections" ON public.keil_collections FOR DELETE USING (true);

-- KEIL Collection Items (per HCE)
CREATE TABLE public.keil_collection_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id UUID REFERENCES public.keil_collections(id) ON DELETE CASCADE,
  hce_id UUID REFERENCES public.keil_hce(id),
  bags_count INTEGER DEFAULT 0,
  weight NUMERIC DEFAULT 0,
  waste_type TEXT,
  collection_time TIME,
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.keil_collection_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view keil_collection_items" ON public.keil_collection_items FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert keil_collection_items" ON public.keil_collection_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update keil_collection_items" ON public.keil_collection_items FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete keil_collection_items" ON public.keil_collection_items FOR DELETE USING (true);