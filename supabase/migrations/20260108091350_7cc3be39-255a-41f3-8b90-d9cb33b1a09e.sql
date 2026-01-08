-- Fix the search_path warning by updating the handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$;

-- Fix generate_order_number function
CREATE OR REPLACE FUNCTION public.generate_order_number(prefix TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;