import { createFreshQueryClient } from '@/lib/supabase'

export interface HistoryData {
  isPro: boolean
  analyses: any[]
}

export async function fetchHistoryData({
  accessToken,
  refreshToken,
  userId,
}: {
  accessToken: string
  refreshToken: string
  userId: string
}): Promise<HistoryData> {
  const client = await createFreshQueryClient({
    access_token: accessToken,
    refresh_token: refreshToken,
  })
  if (!client) throw new Error('No session')

  const [subResult, analysesResult] = await Promise.all([
    client.from('subscriptions').select('*, plan:plans(type, name)').eq('user_id', userId).eq('status', 'active').single(),
    client.from('analyses').select('*').eq('user_id', userId).is('deleted_at', null).order('created_at', { ascending: false }),
  ])

  if (subResult.error && subResult.error.code !== 'PGRST116') {
    console.error('[History] Subscription error:', subResult.error.message)
  }
  if (analysesResult.error) {
    console.error('[History] Analyses error:', analysesResult.error.message)
  }

  const isPro = subResult.data?.plan?.type === 'pro' || subResult.data?.plan?.type === 'studio'

  return {
    isPro,
    analyses: analysesResult.data ?? [],
  }
}
