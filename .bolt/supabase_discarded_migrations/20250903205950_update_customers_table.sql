-- Add sequence_number and alternate_phone columns, make civil_id optional
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_civil_id_key;
ALTER TABLE customers ALTER COLUMN civil_id DROP NOT NULL;

-- Add new columns
ALTER TABLE customers ADD COLUMN IF NOT EXISTS sequence_number TEXT UNIQUE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS alternate_phone TEXT;

-- Create function to generate next sequence number
CREATE OR REPLACE FUNCTION generate_customer_sequence()
RETURNS TEXT AS $$
DECLARE
    next_val INTEGER;
    formatted_val TEXT;
BEGIN
    -- Get the current max numeric value from sequence_number
    SELECT COALESCE(MAX(NULLIF(REGEXP_REPLACE(sequence_number, '[^0-9]', '', 'g'), '')::INTEGER), 0) + 1
    INTO next_val
    FROM customers;
    
    -- Format as 4 digits with leading zeros
    formatted_val := LPAD(next_val::TEXT, 4, '0');
    
    RETURN formatted_val;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate sequence_number if not provided
CREATE OR REPLACE FUNCTION set_customer_sequence_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.sequence_number IS NULL THEN
        NEW.sequence_number := generate_customer_sequence();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS set_customer_sequence_number ON customers;

-- Create trigger
CREATE TRIGGER set_customer_sequence_number
    BEFORE INSERT ON customers
    FOR EACH ROW
    EXECUTE FUNCTION set_customer_sequence_number();

-- Update existing records that don't have a sequence_number
DO $$
DECLARE
    r RECORD;
    seq_num TEXT;
BEGIN
    FOR r IN SELECT id FROM customers WHERE sequence_number IS NULL ORDER BY created_at
    LOOP
        seq_num := generate_customer_sequence();
        UPDATE customers SET sequence_number = seq_num WHERE id = r.id;
    END LOOP;
END $$;
