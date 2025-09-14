-- Function to generate a deterministic UUID from a string
CREATE OR REPLACE FUNCTION public.string_to_uuid(input_str text)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
    namespace uuid := '6ba7b810-9dad-11d1-80b4-00c04fd430c8';  -- A fixed namespace UUID
    result uuid;
BEGIN
    -- Use MD5 to create a deterministic UUID from the input string and namespace
    SELECT uuid_generate_v5(namespace, input_str) INTO result;
    RETURN result;
END;
$$;
