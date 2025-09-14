-- Enable RLS and create security policies for sensitive tables

-- Enable RLS on customers table
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Enable RLS on transactions table  
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Enable RLS on payments table
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Enable RLS on customer_risk_scores table
ALTER TABLE public.customer_risk_scores ENABLE ROW LEVEL SECURITY;

-- Enable RLS on payment_predictions table
ALTER TABLE public.payment_predictions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for customers table (restrict to authenticated users only)
CREATE POLICY "Authenticated users can view customers" 
ON public.customers 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can create customers" 
ON public.customers 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update customers" 
ON public.customers 
FOR UPDATE 
TO authenticated 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete customers" 
ON public.customers 
FOR DELETE 
TO authenticated 
USING (true);

-- Create RLS policies for transactions table
CREATE POLICY "Authenticated users can view transactions" 
ON public.transactions 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can create transactions" 
ON public.transactions 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update transactions" 
ON public.transactions 
FOR UPDATE 
TO authenticated 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete transactions" 
ON public.transactions 
FOR DELETE 
TO authenticated 
USING (true);

-- Create RLS policies for payments table
CREATE POLICY "Authenticated users can view payments" 
ON public.payments 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can create payments" 
ON public.payments 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update payments" 
ON public.payments 
FOR UPDATE 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Create RLS policies for customer_risk_scores table
CREATE POLICY "Authenticated users can view risk scores" 
ON public.customer_risk_scores 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can manage risk scores" 
ON public.customer_risk_scores 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Create RLS policies for payment_predictions table
CREATE POLICY "Authenticated users can view predictions" 
ON public.payment_predictions 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can manage predictions" 
ON public.payment_predictions 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);