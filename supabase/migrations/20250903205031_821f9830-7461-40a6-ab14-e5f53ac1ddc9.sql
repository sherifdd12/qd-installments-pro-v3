-- Create user roles system if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'staff', 'user');
  END IF;
END
$$;

-- Create user_roles table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_roles') THEN
    CREATE TABLE public.user_roles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
      role app_role NOT NULL DEFAULT 'user',
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      UNIQUE (user_id, role)
    );
  END IF;
END
$$;

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user roles (prevents recursive RLS issues)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to check if user has admin or staff role
CREATE OR REPLACE FUNCTION public.is_authorized_user(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'staff')
  )
$$;

-- Drop the overly permissive policy on customers table
DROP POLICY IF EXISTS "Allow all access to authenticated users" ON public.customers;

-- Create secure RLS policies for customers table
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Authorized users can view customers" ON public.customers;
  DROP POLICY IF EXISTS "Authorized users can insert customers" ON public.customers;
  DROP POLICY IF EXISTS "Authorized users can update customers" ON public.customers;
  DROP POLICY IF EXISTS "Authorized users can delete customers" ON public.customers;

  -- Create new policies
  CREATE POLICY "Authorized users can view customers"
  ON public.customers
  FOR SELECT
  TO authenticated
  USING (public.is_authorized_user(auth.uid()));

  CREATE POLICY "Authorized users can insert customers"
  ON public.customers
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_authorized_user(auth.uid()));

  CREATE POLICY "Authorized users can update customers"
  ON public.customers
  FOR UPDATE
  TO authenticated
  USING (public.is_authorized_user(auth.uid()))
  WITH CHECK (public.is_authorized_user(auth.uid()));

  CREATE POLICY "Authorized users can delete customers"
  ON public.customers
  FOR DELETE
  TO authenticated
  USING (public.is_authorized_user(auth.uid()));
END
$$;

-- Create policies for user_roles table
DO $$
BEGIN
  -- Drop existing policies
  DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
  DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

  -- Create new policies
  CREATE POLICY "Users can view their own roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

  CREATE POLICY "Admins can manage all roles"
  ON public.user_roles
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
END
$$;

-- Create function to automatically assign staff role to first user (for setup)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Assign admin role to first user, staff role to subsequent users
  IF (SELECT COUNT(*) FROM public.user_roles) = 0 THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'staff');
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to assign roles on user creation if it doesn't exist
DO $$
BEGIN
  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
  
  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
END
$$;