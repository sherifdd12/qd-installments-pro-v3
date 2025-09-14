-- Fix function conflicts and add user management
-- Drop existing functions that have conflicts
DROP FUNCTION IF EXISTS public.get_dashboard_stats() CASCADE;
DROP FUNCTION IF EXISTS public.record_payment(UUID, DECIMAL, DATE) CASCADE;
DROP FUNCTION IF EXISTS public.check_overdue_transactions() CASCADE;

-- Create clean dashboard stats function
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

-- Create record payment function
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

-- Create function to update user roles (admin only)
CREATE OR REPLACE FUNCTION public.update_user_role(
    target_user_id UUID,
    new_role app_role
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check if current user is admin
    IF NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Only admins can update user roles';
    END IF;

    -- Update or insert user role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, new_role)
    ON CONFLICT (user_id, role) 
    DO UPDATE SET role = new_role;

    RETURN TRUE;
END;
$$;

-- Create function to get all users with their roles (admin only)
CREATE OR REPLACE FUNCTION public.get_all_users()
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    full_name TEXT,
    role app_role,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check if current user is admin
    IF NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Only admins can view all users';
    END IF;

    RETURN QUERY
    SELECT 
        u.id as user_id,
        u.email,
        COALESCE(p.full_name, '') as full_name,
        ur.role,
        u.created_at
    FROM auth.users u
    LEFT JOIN public.user_roles ur ON u.id = ur.user_id
    LEFT JOIN public.profiles p ON u.id = p.id
    ORDER BY u.created_at DESC;
END;
$$;

-- Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_payment(UUID, DECIMAL, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_overdue_transactions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_role(UUID, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_users() TO authenticated;
