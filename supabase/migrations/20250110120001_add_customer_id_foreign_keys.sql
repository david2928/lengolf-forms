-- Customer Management System: Add customer_id foreign keys to related tables
-- CMS-002: Add customer_id to Related Tables

-- Add customer_id to public.bookings
ALTER TABLE public.bookings 
ADD COLUMN customer_id UUID REFERENCES public.customers(id);

-- Create index for fast lookups
CREATE INDEX idx_bookings_customer_id ON public.bookings(customer_id);

-- Add customer_id to pos.lengolf_sales
ALTER TABLE pos.lengolf_sales 
ADD COLUMN customer_id UUID REFERENCES public.customers(id);

-- Create index for analytics queries
CREATE INDEX idx_lengolf_sales_customer_id ON pos.lengolf_sales(customer_id);

-- Add customer_id to backoffice.packages
ALTER TABLE backoffice.packages 
ADD COLUMN customer_id UUID REFERENCES public.customers(id);

-- Create index for customer package lookups
CREATE INDEX idx_packages_customer_id ON backoffice.packages(customer_id);

-- Customer Lifetime Spending Calculation Function
CREATE OR REPLACE FUNCTION calculate_customer_lifetime_spending(p_customer_id UUID)
RETURNS DECIMAL(12,2) AS $$
BEGIN
  RETURN (
    SELECT COALESCE(SUM(sales_net), 0.00)
    FROM pos.lengolf_sales 
    WHERE customer_id = p_customer_id
      AND is_voided != true
  );
END;
$$ LANGUAGE plpgsql;

-- Update trigger to keep lifetime spending current
CREATE OR REPLACE FUNCTION update_customer_lifetime_spending()
RETURNS TRIGGER AS $$
BEGIN
  -- Update customer's lifetime spending when sales change
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.customer_id IS NOT NULL THEN
      UPDATE public.customers 
      SET total_lifetime_value = calculate_customer_lifetime_spending(NEW.customer_id),
          updated_at = now()
      WHERE id = NEW.customer_id;
    END IF;
  END IF;
  
  -- Handle deletions
  IF TG_OP = 'DELETE' THEN
    IF OLD.customer_id IS NOT NULL THEN
      UPDATE public.customers 
      SET total_lifetime_value = calculate_customer_lifetime_spending(OLD.customer_id),
          updated_at = now()
      WHERE id = OLD.customer_id;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_customer_lifetime_spending
  AFTER INSERT OR UPDATE OR DELETE ON pos.lengolf_sales
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_lifetime_spending();

-- Function to update customer visit count from bookings
CREATE OR REPLACE FUNCTION update_customer_visit_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update customer's visit stats when bookings change
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.customer_id IS NOT NULL THEN
      UPDATE public.customers 
      SET total_visits = (
            SELECT COUNT(*)
            FROM public.bookings 
            WHERE customer_id = NEW.customer_id
              AND status NOT IN ('cancelled', 'no_show')
          ),
          last_visit_date = (
            SELECT MAX(date)
            FROM public.bookings 
            WHERE customer_id = NEW.customer_id
              AND status NOT IN ('cancelled', 'no_show')
              AND date <= CURRENT_DATE
          ),
          updated_at = now()
      WHERE id = NEW.customer_id;
    END IF;
  END IF;
  
  -- Handle deletions
  IF TG_OP = 'DELETE' THEN
    IF OLD.customer_id IS NOT NULL THEN
      UPDATE public.customers 
      SET total_visits = (
            SELECT COUNT(*)
            FROM public.bookings 
            WHERE customer_id = OLD.customer_id
              AND status NOT IN ('cancelled', 'no_show')
          ),
          last_visit_date = (
            SELECT MAX(date)
            FROM public.bookings 
            WHERE customer_id = OLD.customer_id
              AND status NOT IN ('cancelled', 'no_show')
              AND date <= CURRENT_DATE
          ),
          updated_at = now()
      WHERE id = OLD.customer_id;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_customer_visit_stats
  AFTER INSERT OR UPDATE OR DELETE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_visit_stats();