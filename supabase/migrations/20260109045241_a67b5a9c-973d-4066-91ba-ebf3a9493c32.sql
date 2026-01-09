-- Create fuel consumption table
CREATE TABLE public.fuel_consumption (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID REFERENCES public.vehicles(id),
  fuel_date DATE NOT NULL DEFAULT CURRENT_DATE,
  fuel_type TEXT DEFAULT 'diesel',
  quantity_liters NUMERIC NOT NULL,
  price_per_liter NUMERIC NOT NULL,
  total_amount NUMERIC NOT NULL,
  odometer_reading NUMERIC,
  fuel_station TEXT,
  receipt_number TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fuel_consumption ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Authenticated users can view fuel_consumption" 
ON public.fuel_consumption 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert fuel_consumption" 
ON public.fuel_consumption 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update fuel_consumption" 
ON public.fuel_consumption 
FOR UPDATE 
USING (true);

CREATE POLICY "Authenticated users can delete fuel_consumption" 
ON public.fuel_consumption 
FOR DELETE 
USING (true);

-- Create index for faster queries
CREATE INDEX idx_fuel_consumption_vehicle_id ON public.fuel_consumption(vehicle_id);
CREATE INDEX idx_fuel_consumption_fuel_date ON public.fuel_consumption(fuel_date);