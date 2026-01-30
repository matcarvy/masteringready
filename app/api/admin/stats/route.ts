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
import { createClient } from '@supabase/supabase-js'
import { createAdminSupabaseClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Get access token from Authorization header
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')

    // Verify the token by getting the user
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

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
      revAddonResult,
      feedbackRatingsResult,
      ctaClicksResult,
      contactRequestsResult,
      spectralResult,
      categoricalResult,
      energyResult,
      performanceResult,
      filesResult,
      engagementResult,
      profileAnalysesResult
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
        .gte('created_at', monthStart),

      // Analysis ratings (thumbs up/down feedback)
      adminClient.from('user_feedback')
        .select('rating_bool')
        .eq('feedback_type', 'analysis_rating')
        .not('rating_bool', 'is', null),

      // CTA clicks
      adminClient.from('cta_clicks')
        .select('cta_type, score_at_click, client_country, created_at'),

      // Contact requests
      adminClient.from('contact_requests')
        .select('contact_method, cta_source, client_country, created_at'),

      // Spectral profiles with scores (for aggregate by score range)
      adminClient.from('analyses')
        .select('score, spectral_6band')
        .is('deleted_at', null)
        .not('spectral_6band', 'is', null),

      // Categorical flags (for % with issues)
      adminClient.from('analyses')
        .select('categorical_flags')
        .is('deleted_at', null)
        .not('categorical_flags', 'is', null),

      // Energy analysis (peak position + temporal distribution)
      adminClient.from('analyses')
        .select('energy_analysis')
        .is('deleted_at', null)
        .not('energy_analysis', 'is', null),

      // Performance: processing time + chunked flag
      adminClient.from('analyses')
        .select('processing_time_seconds, is_chunked_analysis')
        .is('deleted_at', null),

      // Files: duration + size
      adminClient.from('analyses')
        .select('duration_seconds, file_size_bytes')
        .is('deleted_at', null),

      // Engagement: analyses with user_id + created_at for active user counts
      adminClient.from('analyses')
        .select('user_id, created_at')
        .is('deleted_at', null)
        .not('user_id', 'is', null),

      // Engagement: users with >1 analysis
      adminClient.from('profiles')
        .select('total_analyses')
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

    // Satisfaction (analysis ratings)
    const ratings = (feedbackRatingsResult.data || [])
    const thumbsUp = ratings.filter(r => r.rating_bool === true).length
    const thumbsDown = ratings.filter(r => r.rating_bool === false).length
    const satisfactionTotal = thumbsUp + thumbsDown
    const satisfactionRate = satisfactionTotal > 0 ? Math.round((thumbsUp / satisfactionTotal) * 100) : 0

    // CTA stats
    const ctaClicks = ctaClicksResult.data || []
    const ctaTotalClicks = ctaClicks.length
    const ctaClickRate = totalAnalyses > 0 ? Math.round((ctaTotalClicks / totalAnalyses) * 1000) / 10 : 0
    const ctaByType: Record<string, number> = {}
    ctaClicks.forEach(c => { ctaByType[c.cta_type] = (ctaByType[c.cta_type] || 0) + 1 })
    const ctaByScore = [
      { range: '90-100', count: ctaClicks.filter(c => c.score_at_click != null && c.score_at_click >= 90).length },
      { range: '70-89', count: ctaClicks.filter(c => c.score_at_click != null && c.score_at_click >= 70 && c.score_at_click < 90).length },
      { range: '50-69', count: ctaClicks.filter(c => c.score_at_click != null && c.score_at_click >= 50 && c.score_at_click < 70).length },
      { range: '0-49', count: ctaClicks.filter(c => c.score_at_click != null && c.score_at_click < 50).length }
    ]
    const ctaCountryMap: Record<string, number> = {}
    ctaClicks.forEach(c => {
      if (c.client_country) ctaCountryMap[c.client_country] = (ctaCountryMap[c.client_country] || 0) + 1
    })
    const ctaTopCountries = Object.entries(ctaCountryMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([country, count]) => ({ country, count }))

    // Contact stats
    const contacts = contactRequestsResult.data || []
    const totalContacts = contacts.length
    const contactConversionRate = ctaTotalClicks > 0 ? Math.round((totalContacts / ctaTotalClicks) * 1000) / 10 : 0
    const contactByMethod: Record<string, number> = {}
    contacts.forEach(c => { contactByMethod[c.contact_method] = (contactByMethod[c.contact_method] || 0) + 1 })

    // Technical Insights: Aggregate spectral profiles by score range
    const bands = ['sub', 'low', 'low_mid', 'mid', 'high_mid', 'high'] as const
    const spectralRows = (spectralResult.data || []).filter((r: any) => r.spectral_6band && r.score != null)
    const spectralByScore: Record<string, { avg: Record<string, number>; count: number }> = {}
    const scoreRanges = [
      { key: '90-100', min: 90, max: 101 },
      { key: '70-89', min: 70, max: 90 },
      { key: '50-69', min: 50, max: 70 },
      { key: '0-49', min: 0, max: 50 }
    ]
    for (const range of scoreRanges) {
      const inRange = spectralRows.filter((r: any) => r.score >= range.min && r.score < range.max)
      const sums: Record<string, number> = {}
      bands.forEach(b => { sums[b] = 0 })
      inRange.forEach((r: any) => {
        const s6 = r.spectral_6band
        bands.forEach(b => { sums[b] += (s6[b] || 0) })
      })
      const count = inRange.length
      const avg: Record<string, number> = {}
      bands.forEach(b => { avg[b] = count > 0 ? Math.round((sums[b] / count) * 10) / 10 : 0 })
      spectralByScore[range.key] = { avg, count }
    }
    // Overall average spectral
    const overallSums: Record<string, number> = {}
    bands.forEach(b => { overallSums[b] = 0 })
    spectralRows.forEach((r: any) => {
      const s6 = r.spectral_6band
      bands.forEach(b => { overallSums[b] += (s6[b] || 0) })
    })
    const spectralTotal = spectralRows.length
    const overallAvg: Record<string, number> = {}
    bands.forEach(b => { overallAvg[b] = spectralTotal > 0 ? Math.round((overallSums[b] / spectralTotal) * 10) / 10 : 0 })

    // Technical Insights: Categorical flags percentages
    const catRows = (categoricalResult.data || []).filter((r: any) => r.categorical_flags)
    const catTotal = catRows.length
    const headroomOk = catRows.filter((r: any) => r.categorical_flags.headroom_ok === true).length
    const truePeakSafe = catRows.filter((r: any) => r.categorical_flags.true_peak_safe === true).length
    const dynamicOk = catRows.filter((r: any) => r.categorical_flags.dynamic_ok === true).length
    const stereoRiskHigh = catRows.filter((r: any) => r.categorical_flags.stereo_risk === 'high').length
    const stereoRiskMild = catRows.filter((r: any) => r.categorical_flags.stereo_risk === 'mild').length
    const pct = (n: number) => catTotal > 0 ? Math.round((n / catTotal) * 1000) / 10 : 0

    // Technical Insights: Energy patterns
    const energyRows = (energyResult.data || []).filter((r: any) => r.energy_analysis)
    const energyTotal = energyRows.length
    let peakPosSum = 0
    const distSums = { low: 0, mid: 0, high: 0 }
    energyRows.forEach((r: any) => {
      const ea = r.energy_analysis
      peakPosSum += ea.peak_energy_time_pct || 0
      if (ea.energy_distribution) {
        distSums.low += ea.energy_distribution.low || 0
        distSums.mid += ea.energy_distribution.mid || 0
        distSums.high += ea.energy_distribution.high || 0
      }
    })
    const avgPeakPos = energyTotal > 0 ? Math.round((peakPosSum / energyTotal) * 10) / 10 : 0
    const avgDist = {
      low: energyTotal > 0 ? Math.round((distSums.low / energyTotal) * 10) / 10 : 0,
      mid: energyTotal > 0 ? Math.round((distSums.mid / energyTotal) * 10) / 10 : 0,
      high: energyTotal > 0 ? Math.round((distSums.high / energyTotal) * 10) / 10 : 0
    }

    // Performance stats
    const perfRows = (performanceResult.data || []).filter((r: any) => r.processing_time_seconds != null)
    const processingTimes = perfRows.map((r: any) => r.processing_time_seconds as number)
    const avgProcessingTime = processingTimes.length > 0
      ? Math.round((processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length) * 10) / 10
      : 0
    const fastestAnalysis = processingTimes.length > 0 ? Math.round(Math.min(...processingTimes) * 10) / 10 : 0
    const longestAnalysis = processingTimes.length > 0 ? Math.round(Math.max(...processingTimes) * 10) / 10 : 0
    const chunkedRows = (performanceResult.data || []).filter((r: any) => r.is_chunked_analysis === true)
    const totalPerfRows = (performanceResult.data || []).length
    const chunkedPct = totalPerfRows > 0 ? Math.round((chunkedRows.length / totalPerfRows) * 1000) / 10 : 0

    // File stats
    const fileRows = (filesResult.data || [])
    const durations = fileRows.map((r: any) => r.duration_seconds).filter((d: any) => d != null) as number[]
    const avgDuration = durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0
    const fileSizes = fileRows.map((r: any) => r.file_size_bytes).filter((s: any) => s != null) as number[]
    const avgFileSize = fileSizes.length > 0
      ? Math.round((fileSizes.reduce((a, b) => a + b, 0) / fileSizes.length) / 1048576 * 10) / 10
      : 0

    // Engagement stats
    const now = Date.now()
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000
    const thirtyDaysAgoMs = now - 30 * 24 * 60 * 60 * 1000
    const engagementRows = (engagementResult.data || []) as { user_id: string; created_at: string }[]
    const activeUsers7d = new Set(
      engagementRows
        .filter(r => new Date(r.created_at).getTime() >= sevenDaysAgo)
        .map(r => r.user_id)
    ).size
    const activeUsers30d = new Set(
      engagementRows
        .filter(r => new Date(r.created_at).getTime() >= thirtyDaysAgoMs)
        .map(r => r.user_id)
    ).size
    const profileRows = (profileAnalysesResult.data || []) as { total_analyses: number }[]
    const usersWithMultiple = profileRows.filter(p => p.total_analyses > 1).length
    const usersWithMultiplePct = profileRows.length > 0
      ? Math.round((usersWithMultiple / profileRows.length) * 1000) / 10
      : 0

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
      },
      satisfaction: {
        thumbsUp,
        thumbsDown,
        total: satisfactionTotal,
        rate: satisfactionRate
      },
      ctaStats: {
        totalClicks: ctaTotalClicks,
        clickRate: ctaClickRate,
        byType: Object.entries(ctaByType).map(([type, count]) => ({ type, count })),
        byScore: ctaByScore,
        topCountries: ctaTopCountries
      },
      contactStats: {
        totalContacts,
        conversionRate: contactConversionRate,
        byMethod: Object.entries(contactByMethod).map(([method, count]) => ({ method, count }))
      },
      performance: {
        avgProcessingTime,
        fastestAnalysis,
        longestAnalysis,
        chunkedPct,
        totalMeasured: processingTimes.length
      },
      fileStats: {
        avgDuration,
        avgFileSize,
        totalWithDuration: durations.length,
        totalWithSize: fileSizes.length
      },
      engagement: {
        activeUsers7d,
        activeUsers30d,
        usersWithMultiple,
        usersWithMultiplePct,
        totalProfiles: profileRows.length
      },
      technicalInsights: {
        spectral: {
          overall: overallAvg,
          byScore: spectralByScore,
          totalAnalyzed: spectralTotal
        },
        categoricalFlags: {
          total: catTotal,
          headroomOk: { count: headroomOk, pct: pct(headroomOk) },
          truePeakSafe: { count: truePeakSafe, pct: pct(truePeakSafe) },
          dynamicOk: { count: dynamicOk, pct: pct(dynamicOk) },
          stereoRiskNone: { count: catTotal - stereoRiskHigh - stereoRiskMild, pct: pct(catTotal - stereoRiskHigh - stereoRiskMild) },
          stereoRiskMild: { count: stereoRiskMild, pct: pct(stereoRiskMild) },
          stereoRiskHigh: { count: stereoRiskHigh, pct: pct(stereoRiskHigh) }
        },
        energy: {
          totalAnalyzed: energyTotal,
          avgPeakPositionPct: avgPeakPos,
          avgDistribution: avgDist
        }
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
