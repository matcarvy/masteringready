import { createFreshQueryClient } from '@/lib/supabase'

export interface DashboardData {
  profile: any
  subscription: any
  analyses: any[]
  userStatus: any
  canBuyAddon: boolean
}

export async function fetchDashboardData({
  accessToken,
  refreshToken,
  userId,
}: {
  accessToken: string
  refreshToken: string
  userId: string
}): Promise<DashboardData> {
  const client = await createFreshQueryClient({
    access_token: accessToken,
    refresh_token: refreshToken,
  })
  if (!client) throw new Error('No session')

  const [profileResult, subResult, analysesResult, statusResult, addonResult] = await Promise.all([
    client.from('profiles').select('*').eq('id', userId).single(),
    client.from('subscriptions').select('*, plan:plans(type, name)').eq('user_id', userId).eq('status', 'active').single(),
    client.from('analyses').select('*').eq('user_id', userId).is('deleted_at', null).order('created_at', { ascending: false }).limit(50),
    client.rpc('get_user_analysis_status', { p_user_id: userId }),
    client.rpc('can_buy_addon', { p_user_id: userId }),
  ])

  if (profileResult.error && profileResult.error.code !== 'PGRST116') {
    console.error('[Dashboard] Profile error:', profileResult.error.message)
  }
  if (subResult.error && subResult.error.code !== 'PGRST116') {
    console.error('[Dashboard] Subscription error:', subResult.error.message)
  }
  if (analysesResult.error) {
    console.error('[Dashboard] Analyses error:', analysesResult.error.message)
  }
  if (statusResult.error) {
    console.error('[Dashboard] Status error:', statusResult.error.message)
  }

  const status = statusResult.data
    ? Array.isArray(statusResult.data) ? statusResult.data[0] : statusResult.data
    : null

  const addon = addonResult.data
    ? Array.isArray(addonResult.data) ? addonResult.data[0] : addonResult.data
    : null

  return {
    profile: profileResult.data ?? null,
    subscription: subResult.data ?? null,
    analyses: analysesResult.data ?? [],
    userStatus: status,
    canBuyAddon: status?.plan_type === 'pro' ? (addon?.can_buy ?? false) : false,
  }
}
