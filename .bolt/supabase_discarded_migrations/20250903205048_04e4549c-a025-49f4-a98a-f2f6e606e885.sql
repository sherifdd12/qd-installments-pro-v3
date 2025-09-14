-- Fix search_path security issues for existing database functions

-- Fix record_payment function
CREATE OR REPLACE FUNCTION public.record_payment(p_transaction_id uuid, p_amount real)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
    current_paid REAL;
    current_remaining REAL;
BEGIN
    -- Lock the transaction row for update
    PERFORM * FROM public.transactions WHERE id = p_transaction_id FOR UPDATE;

    -- Get current values from the transaction
    SELECT
        amountPaid,
        remainingBalance
    INTO
        current_paid,
        current_remaining
    FROM
        public.transactions
    WHERE
        id = p_transaction_id;

    -- Insert the new payment
    INSERT INTO public.payments (transactionId, amount)
    VALUES (p_transaction_id, p_amount);

    -- Update the transaction
    UPDATE public.transactions
    SET
        amountPaid = current_paid + p_amount,
        remainingBalance = current_remaining - p_amount
    WHERE
        id = p_transaction_id;
END;
$function$;

-- Fix get_dashboard_stats function
CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
    stats JSON;
BEGIN
    SELECT json_build_object(
        'totalCustomers', (SELECT COUNT(*) FROM public.customers),
        'totalActiveTransactions', (SELECT COUNT(*) FROM public.transactions WHERE "remainingBalance" > 0),
        'totalRevenue', (SELECT COALESCE(SUM("totalAmount"), 0) FROM public.transactions),
        'totalOutstanding', (SELECT COALESCE(SUM("remainingBalance"), 0) FROM public.transactions),
        'totalOverdue', (SELECT COALESCE(SUM("overdueAmount"), 0) FROM public.transactions),
        'overdueTransactions', (SELECT COUNT(*) FROM public.transactions WHERE "overdueAmount" > 0)
    ) INTO stats;

    RETURN stats;
END;
$function$;

-- Fix check_overdue_transactions function
CREATE OR REPLACE FUNCTION public.check_overdue_transactions()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
    t RECORD;
    updates INT := 0;
    today DATE := CURRENT_DATE;
    months_passed INT;
    paid_installments INT;
    expected_paid_installments INT;
    overdue_installments INT;
    overdue_amount REAL;
BEGIN
    FOR t IN
        SELECT * FROM public.transactions WHERE "remainingBalance" > 0 AND "legalCase" = false
    LOOP
        months_passed := (EXTRACT(YEAR FROM today) - EXTRACT(YEAR FROM t."firstInstallmentDate")) * 12 +
                         (EXTRACT(MONTH FROM today) - EXTRACT(MONTH FROM t."firstInstallmentDate"));

        IF months_passed >= 0 THEN
            paid_installments := floor(t."amountPaid" / t."installmentAmount");
            expected_paid_installments := months_passed + 1;
            overdue_installments := expected_paid_installments - paid_installments;

            IF overdue_installments > 0 THEN
                overdue_amount := overdue_installments * t."installmentAmount";
                IF t."overdueInstallments" != overdue_installments OR t."overdueAmount" != overdue_amount THEN
                    UPDATE public.transactions
                    SET "overdueInstallments" = overdue_installments, "overdueAmount" = overdue_amount
                    WHERE id = t.id;
                    updates := updates + 1;
                END IF;
            END IF;
        END IF;
    END LOOP;

    RETURN 'Overdue status checked. ' || updates || ' transactions updated.';
END;
$function$;