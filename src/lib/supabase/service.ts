import { createClient } from '@supabase/supabase-js'

// Service role client — bypasses RLS, for use in background jobs only.
// Never expose this on the client side.
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
