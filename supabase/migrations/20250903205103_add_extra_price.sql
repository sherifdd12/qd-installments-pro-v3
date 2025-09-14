-- Add extra_price to transactions table and make profit based on it
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS extra_price DECIMAL(10,3) NOT NULL DEFAULT 0;

-- Drop the old profit generated column
ALTER TABLE transactions DROP COLUMN IF EXISTS profit;

-- Add the new profit generated column based on extra_price
ALTER TABLE transactions 
ADD COLUMN profit DECIMAL(10,3) GENERATED ALWAYS AS (extra_price) STORED;
