/**
 * Admin Stats API Endpoint
 *
 * GET /api/admin/stats
 *
 * Returns aggregated KPIs, score/verdict distributions,
 * format breakdown, country stats, and revenue data.
 * Requires authenticated admin user.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createAdminSupabaseClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          }
        }
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Use service role client (bypasses RLS) for all admin operations
    const adminClient = createAdminSupabaseClient()

    // Check admin status using service role client
    const { data: profile } = await adminClient
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // Run all queries in parallel
    const today = new Date().toISOString().split('T')[0]
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

    const [
      usersResult,
      analysesResult,
      activeSubsResult,
      revenueResult,
      todayAnalysesResult,
      scoresResult,
      verdictsResult,
      formatsResult,
      countriesResult,
      dailyResult,
      revSubsResult,
      revSingleResult,
      revAddonResult
    ] = await Promise.all([
      // Total users
      adminClient.from('profiles').select('id', { count: 'exact', head: true }),

      // Total analyses
      adminClient.from('analyses').select('id', { count: 'exact', head: true })
        .is('deleted_at', null),

      // Active Pro subscriptions
      adminClient.from('subscriptions')
        .select('id, plan:plans!inner(type)', { count: 'exact', head: true })
        .eq('status', 'active')
        .eq('plans.type', 'pro'),

      // Revenue this month
      adminClient.from('payments')
        .select('amount')
        .eq('status', 'succeeded')
        .gte('created_at', monthStart),

      // Analyses today
      adminClient.from('analyses')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', today)
        .is('deleted_at', null),

      // Score data for avg + distribution
      adminClient.from('analyses')
        .select('score')
        .is('deleted_at', null),

      // Verdict distribution
      adminClient.from('analyses')
        .select('verdict')
        .is('deleted_at', null),

      // File format breakdown
      adminClient.from('analyses')
        .select('file_format')
        .is('deleted_at', null),

      // Top countries
      adminClient.from('profiles')
        .select('detected_country_code'),

      // Daily analyses (last 30 days)
      adminClient.from('analyses')
        .select('created_at')
        .gte('created_at', thirtyDaysAgo)
        .is('deleted_at', null)
        .order('created_at', { ascending: true }),

      // Revenue from subscriptions this month
      adminClient.from('payments')
        .select('amount')
        .eq('status', 'succeeded')
        .gte('created_at', monthStart)
        .not('subscription_id', 'is', null),

      // Revenue from single purchases this month
      adminClient.from('purchases')
        .select('amount, plan:plans!inner(type)')
        .eq('status', 'succeeded')
        .eq('plans.type', 'single')
        .gte('created_at', monthStart),

      // Revenue from addon purchases this month
      adminClient.from('purchases')
        .select('amount, plan:plans!inner(type)')
        .eq('status', 'succeeded')
        .eq('plans.type', 'addon')
        .gte('created_at', monthStart)
    ])

    // Calculate KPIs
    const totalUsers = usersResult.count || 0
    const totalAnalyses = analysesResult.count || 0
    const activeProSubscriptions = activeSubsResult.count || 0
    const revenueThisMonth = (revenueResult.data || []).reduce((sum, p) => sum + (p.amount || 0), 0)
    const analysesToday = todayAnalysesResult.count || 0

    // Score calculations
    const scores = (scoresResult.data || []).map(a => a.score).filter(s => s != null)
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0

    // Score distribution
    const scoreDistribution = [
      { range: '90-100', count: scores.filter(s => s >= 90).length, color: '#10b981' },
      { range: '70-89', count: scores.filter(s => s >= 70 && s < 90).length, color: '#3b82f6' },
      { range: '50-69', count: scores.filter(s => s >= 50 && s < 70).length, color: '#f59e0b' },
      { range: '0-49', count: scores.filter(s => s < 50).length, color: '#ef4444' }
    ]

    // Verdict distribution
    const verdicts = (verdictsResult.data || []).map(a => a.verdict)
    const verdictDistribution = [
      { verdict: 'ready', count: verdicts.filter(v => v === 'ready').length, color: '#10b981' },
      { verdict: 'almost_ready', count: verdicts.filter(v => v === 'almost_ready').length, color: '#3b82f6' },
      { verdict: 'needs_work', count: verdicts.filter(v => v === 'needs_work').length, color: '#f59e0b' },
      { verdict: 'critical', count: verdicts.filter(v => v === 'critical').length, color: '#ef4444' }
    ]

    // Format breakdown
    const formats = (formatsResult.data || []).map(a => (a.file_format || 'unknown').toLowerCase())
    const formatBreakdown = [
      { format: 'wav', count: formats.filter(f => f === 'wav').length },
      { format: 'mp3', count: formats.filter(f => f === 'mp3').length },
      { format: 'aiff', count: formats.filter(f => f === 'aiff' || f === 'aif').length },
      { format: 'other', count: formats.filter(f => !['wav', 'mp3', 'aiff', 'aif'].includes(f)).length }
    ].filter(f => f.count > 0)

    // Top countries
    const countries = (countriesResult.data || [])
      .map(p => p.detected_country_code)
      .filter(Boolean) as string[]
    const countryMap: Record<string, number> = {}
    countries.forEach(c => { countryMap[c] = (countryMap[c] || 0) + 1 })
    const topCountries = Object.entries(countryMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([country, count]) => ({ country, count }))

    // Daily analyses (last 30 days)
    const dailyMap: Record<string, number> = {}
    ;(dailyResult.data || []).forEach(a => {
      const day = a.created_at.split('T')[0]
      dailyMap[day] = (dailyMap[day] || 0) + 1
    })
    // Fill in missing days with 0
    const analysesPerDay: { date: string; count: number }[] = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      const dateStr = d.toISOString().split('T')[0]
      analysesPerDay.push({ date: dateStr, count: dailyMap[dateStr] || 0 })
    }

    // Revenue breakdown
    const revenueSubscriptions = (revSubsResult.data || []).reduce((sum, p) => sum + (p.amount || 0), 0)
    const revenueSingle = (revSingleResult.data || []).reduce((sum, p) => sum + (p.amount || 0), 0)
    const revenueAddon = (revAddonResult.data || []).reduce((sum, p) => sum + (p.amount || 0), 0)

    return NextResponse.json({
      kpi: {
        totalUsers,
        totalAnalyses,
        activeProSubscriptions,
        revenueThisMonth: Math.round(revenueThisMonth * 100) / 100,
        analysesToday,
        avgScore: Math.round(avgScore * 10) / 10
      },
      scoreDistribution,
      verdictDistribution,
      formatBreakdown,
      topCountries,
      analysesPerDay,
      revenueBreakdown: {
        subscriptions: Math.round(revenueSubscriptions * 100) / 100,
        single: Math.round(revenueSingle * 100) / 100,
        addon: Math.round(revenueAddon * 100) / 100
      }
    })
  } catch (error) {
    console.error('Admin stats error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
