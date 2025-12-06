-- Neon Auth to public.User sync trigger
-- This trigger automatically creates or updates public."User" whenever neon_auth.users_sync changes

CREATE OR REPLACE FUNCTION neon_auth.sync_public_user()
RETURNS TRIGGER AS $$
DECLARE
  v_id TEXT;
  v_name TEXT;
BEGIN
  -- Extract id and displayName from raw_json
  v_id := NEW.raw_json->>'id';
  v_name := COALESCE(NEW.raw_json->>'display_name', '');
  
  -- Skip if deleted
  IF NEW.deleted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  -- Upsert into public."User"
  INSERT INTO public."User" (id, auth_id, name, "savedMeals", allergens)
  VALUES (
    gen_random_uuid()::text,
    v_id,
    v_name,
    ARRAY[]::text[],
    ARRAY[]::text[]
  )
  ON CONFLICT (auth_id) DO UPDATE
  SET name = EXCLUDED.name;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS sync_public_user_trigger ON neon_auth.users_sync;

-- Create trigger on INSERT or UPDATE
CREATE TRIGGER sync_public_user_trigger
AFTER INSERT OR UPDATE ON neon_auth.users_sync
FOR EACH ROW
EXECUTE FUNCTION neon_auth.sync_public_user();
