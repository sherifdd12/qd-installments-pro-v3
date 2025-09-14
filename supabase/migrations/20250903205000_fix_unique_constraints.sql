-- Add unique constraints to AI feature tables
DO $$ 
BEGIN
    -- Add unique constraint to customer_risk_scores if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'customer_risk_scores_customer_id_key'
    ) THEN
        ALTER TABLE customer_risk_scores 
        ADD CONSTRAINT customer_risk_scores_customer_id_key 
        UNIQUE (customer_id);
    END IF;

    -- Add unique constraint to payment_predictions if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'payment_predictions_transaction_id_key'
    ) THEN
        ALTER TABLE payment_predictions 
        ADD CONSTRAINT payment_predictions_transaction_id_key 
        UNIQUE (transaction_id);
    END IF;
END $$;

-- Add foreign key relationships with ON DELETE CASCADE
ALTER TABLE transactions 
  DROP CONSTRAINT IF EXISTS transactions_customer_id_fkey,
  ADD CONSTRAINT transactions_customer_id_fkey 
    FOREIGN KEY (customer_id) 
    REFERENCES customers(id) 
    ON DELETE CASCADE;

-- Update functions to use new column names
CREATE OR REPLACE FUNCTION update_customer_risk_score(customer_id_param UUID)
RETURNS customer_risk_scores AS $$
DECLARE
  result customer_risk_scores;
  score_val INTEGER := 100;
  factors_array JSONB := '[]'::JSONB;
  late_payments INTEGER;
  total_debt DECIMAL;
  total_paid DECIMAL;
BEGIN
  -- Calculate late payments in last 6 months
  SELECT COUNT(*) INTO late_payments
  FROM payments p
  WHERE p.customer_id = customer_id_param
    AND p.payment_date > p.due_date
    AND p.payment_date > NOW() - INTERVAL '6 months';
  
  -- Deduct points for late payments
  IF late_payments > 0 THEN
    score_val := score_val - (late_payments * 5);
    factors_array := factors_array || jsonb_build_array('تأخر في ' || late_payments || ' دفعة/دفعات');
  END IF;

  -- Calculate debt ratio
  SELECT 
    COALESCE(SUM(t.amount), 0),
    COALESCE(SUM(t.amount - t.remaining_balance), 0)
  INTO total_debt, total_paid
  FROM transactions t
  WHERE t.customer_id = customer_id_param;

  IF total_debt > 0 AND (total_paid / total_debt) < 0.3 THEN
    score_val := score_val - 20;
    factors_array := factors_array || jsonb_build_array('نسبة الدين المتبقي مرتفعة');
  END IF;

  -- Ensure score stays within bounds
  score_val := GREATEST(0, LEAST(100, score_val));

  -- Insert or update risk score
  INSERT INTO customer_risk_scores (customer_id, score, factors, last_updated)
  VALUES (customer_id_param, score_val, factors_array, NOW())
  ON CONFLICT (customer_id) DO UPDATE
    SET score = EXCLUDED.score,
        factors = EXCLUDED.factors,
        last_updated = EXCLUDED.last_updated
  RETURNING * INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION predict_late_payment(transaction_id_param UUID)
RETURNS payment_predictions AS $$
DECLARE
  result payment_predictions;
  probability_val DECIMAL := 0;
  customer_id_val UUID;
  next_payment_date_val DATE;
  late_payments_count INTEGER;
  avg_payment DECIMAL;
  current_amount DECIMAL;
BEGIN
  -- Get transaction details
  SELECT customer_id, start_date + (
    FLOOR(EXTRACT(EPOCH FROM NOW() - start_date) / (30 * 24 * 60 * 60)) * INTERVAL '1 month'
  )::DATE INTO customer_id_val, next_payment_date_val
  FROM transactions
  WHERE id = transaction_id_param;

  -- Calculate recent late payments
  SELECT COUNT(*) INTO late_payments_count
  FROM payments p
  WHERE p.customer_id = customer_id_val
    AND p.payment_date > p.due_date
    AND p.payment_date > NOW() - INTERVAL '3 months';

  -- Add probability based on late payments
  probability_val := probability_val + (LEAST(late_payments_count, 3) * 0.2);

  -- Compare current amount with average
  SELECT 
    t.installment_amount,
    AVG(p.amount)
  INTO current_amount, avg_payment
  FROM transactions t
  LEFT JOIN payments p ON p.customer_id = t.customer_id
  WHERE t.id = transaction_id_param
  GROUP BY t.installment_amount;

  IF current_amount > avg_payment * 1.2 THEN
    probability_val := probability_val + 0.2;
  END IF;

  -- Add probability for end of month payments
  IF EXTRACT(DAY FROM next_payment_date_val) > 25 THEN
    probability_val := probability_val + 0.1;
  END IF;

  -- Ensure probability stays within bounds
  probability_val := GREATEST(0, LEAST(1, probability_val));

  -- Insert or update prediction
  INSERT INTO payment_predictions (
    customer_id,
    transaction_id,
    probability,
    next_payment_date,
    recommended_action,
    last_updated
  )
  VALUES (
    customer_id_val,
    transaction_id_param,
    probability_val,
    next_payment_date_val,
    CASE
      WHEN probability_val > 0.7 THEN 'إرسال تذكير مبكر وجدولة متابعة هاتفية'
      WHEN probability_val > 0.4 THEN 'إرسال تذكير عبر الواتساب'
      ELSE 'لا يلزم إجراء'
    END,
    NOW()
  )
  ON CONFLICT (transaction_id) DO UPDATE
    SET probability = EXCLUDED.probability,
        next_payment_date = EXCLUDED.next_payment_date,
        recommended_action = EXCLUDED.recommended_action,
        last_updated = EXCLUDED.last_updated
  RETURNING * INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql;
