-- Drop existing delete policies
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.transactions;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.customers;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.payments;

-- Create new delete policies that require conditions
CREATE POLICY "Enable delete for authenticated users" ON public.transactions 
    FOR DELETE 
    USING (
        auth.role() = 'authenticated' 
        AND (
            -- Allow delete by ID
            id IS NOT NULL 
            -- Allow delete by created_at date range
            OR created_at IS NOT NULL
            -- Allow delete by customer_id
            OR customer_id IS NOT NULL
        )
    );

CREATE POLICY "Enable delete for authenticated users" ON public.customers 
    FOR DELETE 
    USING (
        auth.role() = 'authenticated' 
        AND (
            -- Allow delete by ID
            id IS NOT NULL 
            -- Allow delete by created_at date range
            OR created_at IS NOT NULL
        )
    );

CREATE POLICY "Enable delete for authenticated users" ON public.payments 
    FOR DELETE 
    USING (
        auth.role() = 'authenticated' 
        AND (
            -- Allow delete by ID
            id IS NOT NULL 
            -- Allow delete by created_at date range
            OR created_at IS NOT NULL
            -- Allow delete by transaction_id
            OR transaction_id IS NOT NULL
            -- Allow delete by customer_id
            OR customer_id IS NOT NULL
        )
    );
