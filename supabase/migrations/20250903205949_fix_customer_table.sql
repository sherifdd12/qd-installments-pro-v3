-- Create customers table
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "fullName" TEXT NOT NULL,
    "civilId" TEXT NOT NULL UNIQUE,
    "mobileNumber" TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Create indices
CREATE INDEX IF NOT EXISTS customers_civil_id_idx ON public.customers ("civilId");
CREATE INDEX IF NOT EXISTS customers_mobile_number_idx ON public.customers ("mobileNumber");
