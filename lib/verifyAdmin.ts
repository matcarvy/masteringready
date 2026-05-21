import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createAdminSupabaseClient } from '@/lib/supabase'

export async function verifyAdmin(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return null

  const token = authHeader.replace('Bearer ', '')
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return null

  const adminClient = createAdminSupabaseClient()
  const { data: profile } = await adminClient
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) return null
  return { user, adminClient }
}
