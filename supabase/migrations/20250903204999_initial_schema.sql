-- Drop existing tables if they exist
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;

-- Create customers table
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY,  -- Removed DEFAULT to allow setting custom IDs
    sequence_number TEXT,
    full_name TEXT NOT NULL,
    mobile_number TEXT NOT NULL,
    mobile_number2 TEXT,
    civil_id TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_sequence_number UNIQUE (sequence_number)
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id),
    amount DECIMAL(10,3) NOT NULL,
    cost_price DECIMAL(10,3) NOT NULL,
    profit DECIMAL(10,3) GENERATED ALWAYS AS (amount - cost_price) STORED,
    installment_amount DECIMAL(10,3) NOT NULL,
    start_date DATE NOT NULL,
    number_of_installments INTEGER NOT NULL,
    remaining_balance DECIMAL(10,3) NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    has_legal_case BOOLEAN NOT NULL DEFAULT false,
    legal_case_details TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT positive_amounts CHECK (amount > 0 AND installment_amount > 0 AND cost_price > 0),
    CONSTRAINT valid_installments CHECK (number_of_installments > 0),
    CONSTRAINT valid_cost_price CHECK (cost_price <= amount)
);

-- Create payments table
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES public.transactions(id),
    customer_id UUID NOT NULL REFERENCES public.customers(id),
    amount DECIMAL(10,3) NOT NULL,
    payment_date DATE NOT NULL,
    balance_before DECIMAL(10,3) NOT NULL,
    balance_after DECIMAL(10,3) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT positive_payment CHECK (amount > 0)
);

-- Create payment_predictions table for AI features
CREATE TABLE IF NOT EXISTS public.payment_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES public.transactions(id),
    customer_id UUID NOT NULL REFERENCES public.customers(id),
    probability DECIMAL(5,4) NOT NULL,
    predicted_payment_date DATE NOT NULL,
    recommended_action TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT valid_probability CHECK (probability >= 0 AND probability <= 1)
);

-- Create customer_risk_scores table for AI features
CREATE TABLE IF NOT EXISTS public.customer_risk_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id),
    score INTEGER NOT NULL,
    factors JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT valid_score CHECK (score >= 0 AND score <= 100)
);

-- Enable Row Level Security on all tables
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_risk_scores ENABLE ROW LEVEL SECURITY;

-- Create indices for better performance
DO $$ 
BEGIN
    -- Create indices if they don't exist
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_transactions_customer_id') THEN
        CREATE INDEX idx_transactions_customer_id ON public.transactions(customer_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_payments_transaction_id') THEN
        CREATE INDEX idx_payments_transaction_id ON public.payments(transaction_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_payments_customer_id') THEN
        CREATE INDEX idx_payments_customer_id ON public.payments(customer_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_predictions_transaction_id') THEN
        CREATE INDEX idx_predictions_transaction_id ON public.payment_predictions(transaction_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_predictions_customer_id') THEN
        CREATE INDEX idx_predictions_customer_id ON public.payment_predictions(customer_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_risk_scores_customer_id') THEN
        CREATE INDEX idx_risk_scores_customer_id ON public.customer_risk_scores(customer_id);
    END IF;
END $$;

-- Create RLS policies
DO $$ 
BEGIN
    -- Drop existing policies first to avoid conflicts
    DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.customers;
    DROP POLICY IF EXISTS "Enable write access for authenticated users" ON public.customers;
    DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.customers;
    DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.customers;
    
    -- Create new policies
    CREATE POLICY "Enable read access for authenticated users" ON public.customers FOR SELECT USING (auth.role() = 'authenticated');
    CREATE POLICY "Enable write access for authenticated users" ON public.customers FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    CREATE POLICY "Enable update for authenticated users" ON public.customers FOR UPDATE USING (auth.role() = 'authenticated');
    CREATE POLICY "Enable delete for authenticated users" ON public.customers FOR DELETE USING (auth.role() = 'authenticated');
END $$;

DO $$ 
BEGIN
    -- Drop existing policies first to avoid conflicts
    DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.transactions;
    DROP POLICY IF EXISTS "Enable write access for authenticated users" ON public.transactions;
    DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.transactions;
    DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.transactions;
    
    -- Create new policies
    CREATE POLICY "Enable read access for authenticated users" ON public.transactions FOR SELECT USING (auth.role() = 'authenticated');
    CREATE POLICY "Enable write access for authenticated users" ON public.transactions FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    CREATE POLICY "Enable update for authenticated users" ON public.transactions FOR UPDATE USING (auth.role() = 'authenticated');
    CREATE POLICY "Enable delete for authenticated users" ON public.transactions FOR DELETE USING (auth.role() = 'authenticated');
END $$;

DO $$ 
BEGIN
    -- Drop existing policies first to avoid conflicts
    DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.payments;
    DROP POLICY IF EXISTS "Enable write access for authenticated users" ON public.payments;
    DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.payments;
    DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.payments;
    
    -- Create new policies
    CREATE POLICY "Enable read access for authenticated users" ON public.payments FOR SELECT USING (auth.role() = 'authenticated');
    CREATE POLICY "Enable write access for authenticated users" ON public.payments FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    CREATE POLICY "Enable update for authenticated users" ON public.payments FOR UPDATE USING (auth.role() = 'authenticated');
    CREATE POLICY "Enable delete for authenticated users" ON public.payments FOR DELETE USING (auth.role() = 'authenticated');
END $$;

-- Create RLS policies for functions
DO $$ 
DECLARE
  func_exists boolean;
BEGIN
  -- Check if functions exist before trying to revoke
  SELECT EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'get_dashboard_stats'
  ) INTO func_exists;
  
  IF func_exists THEN
    REVOKE EXECUTE ON FUNCTION public.get_dashboard_stats() FROM PUBLIC;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'record_payment'
  ) INTO func_exists;
  
  IF func_exists THEN
    REVOKE EXECUTE ON FUNCTION public.record_payment(UUID, DECIMAL, DATE) FROM PUBLIC;
  END IF;
END $$;

-- Create functions first so we can grant permissions
CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS TABLE (
    total_customers BIGINT,
    total_active_transactions BIGINT,
    total_revenue DECIMAL,
    total_cost DECIMAL,
    total_profit DECIMAL,
    total_outstanding DECIMAL,
    total_overdue DECIMAL,
    overdue_transactions BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM customers)::BIGINT as total_customers,
        (SELECT COUNT(*) FROM transactions WHERE status = 'active')::BIGINT as total_active_transactions,
        (SELECT COALESCE(SUM(amount), 0) FROM transactions)::DECIMAL as total_revenue,
        (SELECT COALESCE(SUM(cost_price), 0) FROM transactions)::DECIMAL as total_cost,
        (SELECT COALESCE(SUM(profit), 0) FROM transactions)::DECIMAL as total_profit,
        (SELECT COALESCE(SUM(remaining_balance), 0) FROM transactions WHERE status = 'active')::DECIMAL as total_outstanding,
        (SELECT COALESCE(SUM(remaining_balance), 0) FROM transactions WHERE status = 'overdue')::DECIMAL as total_overdue,
        (SELECT COUNT(*) FROM transactions WHERE status = 'overdue')::BIGINT as overdue_transactions;
END;
$$;

-- Create helper functions
CREATE OR REPLACE FUNCTION public.record_payment(
    p_transaction_id UUID,
    p_amount DECIMAL,
    p_payment_date DATE DEFAULT CURRENT_DATE
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_customer_id UUID;
    v_balance_before DECIMAL;
    v_balance_after DECIMAL;
    v_payment_id UUID;
BEGIN
    -- Get transaction details and lock the row
    SELECT customer_id, remaining_balance 
    INTO v_customer_id, v_balance_before
    FROM transactions 
    WHERE id = p_transaction_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Transaction not found';
    END IF;

    -- Calculate new balance
    v_balance_after := v_balance_before - p_amount;
    
    IF v_balance_after < 0 THEN
        RAISE EXCEPTION 'Payment amount exceeds remaining balance';
    END IF;

    -- Create payment record
    INSERT INTO payments (
        transaction_id,
        customer_id,
        amount,
        payment_date,
        balance_before,
        balance_after
    ) VALUES (
        p_transaction_id,
        v_customer_id,
        p_amount,
        p_payment_date,
        v_balance_before,
        v_balance_after
    ) RETURNING id INTO v_payment_id;

    -- Update transaction
    UPDATE transactions 
    SET remaining_balance = v_balance_after,
        status = CASE 
            WHEN v_balance_after = 0 THEN 'completed'
            ELSE status 
        END
    WHERE id = p_transaction_id;

    RETURN v_payment_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_payment(UUID, DECIMAL, DATE) TO authenticated;

-- Drop existing functions before recreating
DROP FUNCTION IF EXISTS public.check_overdue_transactions();
DROP FUNCTION IF EXISTS public.get_dashboard_stats();
DROP FUNCTION IF EXISTS public.get_dashboard_stats();

-- Create function to get dashboard stats including profits
CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS TABLE (
    total_customers BIGINT,
    total_active_transactions BIGINT,
    total_revenue DECIMAL,
    total_cost DECIMAL,
    total_profit DECIMAL,
    total_outstanding DECIMAL,
    total_overdue DECIMAL,
    overdue_transactions BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM customers)::BIGINT as total_customers,
        (SELECT COUNT(*) FROM transactions WHERE status = 'active')::BIGINT as total_active_transactions,
        (SELECT COALESCE(SUM(amount), 0) FROM transactions)::DECIMAL as total_revenue,
        (SELECT COALESCE(SUM(cost_price), 0) FROM transactions)::DECIMAL as total_cost,
        (SELECT COALESCE(SUM(profit), 0) FROM transactions)::DECIMAL as total_profit,
        (SELECT COALESCE(SUM(remaining_balance), 0) FROM transactions WHERE status = 'active')::DECIMAL as total_outstanding,
        (SELECT COALESCE(SUM(remaining_balance), 0) FROM transactions WHERE status = 'overdue')::DECIMAL as total_overdue,
        (SELECT COUNT(*) FROM transactions WHERE status = 'overdue')::BIGINT as overdue_transactions;
END;
$$;

-- Create helper functions
CREATE OR REPLACE FUNCTION public.record_payment(
    p_transaction_id UUID,
    p_amount DECIMAL,
    p_payment_date DATE DEFAULT CURRENT_DATE
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_customer_id UUID;
    v_balance_before DECIMAL;
    v_balance_after DECIMAL;
    v_payment_id UUID;
BEGIN
    -- Get transaction details and lock the row
    SELECT customer_id, remaining_balance 
    INTO v_customer_id, v_balance_before
    FROM transactions 
    WHERE id = p_transaction_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Transaction not found';
    END IF;

    -- Calculate new balance
    v_balance_after := v_balance_before - p_amount;
    
    IF v_balance_after < 0 THEN
        RAISE EXCEPTION 'Payment amount exceeds remaining balance';
    END IF;

    -- Create payment record
    INSERT INTO payments (
        transaction_id,
        customer_id,
        amount,
        payment_date,
        balance_before,
        balance_after
    ) VALUES (
        p_transaction_id,
        v_customer_id,
        p_amount,
        p_payment_date,
        v_balance_before,
        v_balance_after
    ) RETURNING id INTO v_payment_id;

    -- Update transaction
    UPDATE transactions 
    SET remaining_balance = v_balance_after,
        status = CASE 
            WHEN v_balance_after = 0 THEN 'completed'
            ELSE status 
        END
    WHERE id = p_transaction_id;

    RETURN v_payment_id;
END;
$$;

-- Create function to check and update overdue transactions
CREATE OR REPLACE FUNCTION public.check_overdue_transactions()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    WITH overdue_txns AS (
        SELECT id
        FROM transactions
        WHERE status = 'active'
        AND remaining_balance > 0
        AND (
            -- If current date is past the final payment date (start_date + number_of_installments months)
            CURRENT_DATE > (start_date + (number_of_installments || ' months')::interval)
            OR
            -- If any payment is more than 30 days late
            CURRENT_DATE > (start_date + INTERVAL '1 month' * 
                CEIL(
                    (CURRENT_DATE - start_date) / INTERVAL '1 month'
                )::integer
            ) + INTERVAL '30 days'
        )
    )
    UPDATE transactions t
    SET status = 'overdue'
    FROM overdue_txns o
    WHERE t.id = o.id
    AND t.status = 'active'
    RETURNING 1
    INTO updated_count;

    IF updated_count > 0 THEN
        RETURN updated_count || ' معاملات تم تحديثها كمتأخرة';
    ELSE
        RETURN 'لا توجد معاملات متأخرة جديدة';
    END IF;
END;
$$;

-- Grant execute to authenticated users for the new function
GRANT EXECUTE ON FUNCTION public.check_overdue_transactions TO authenticated;
