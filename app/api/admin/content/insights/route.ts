/**
 * Content Insights API — GET /api/admin/content/insights
 * Pulls analysis data to surface content creation opportunities:
 * high scores (testimonials), weak metrics (educational content),
 * genre distribution (audience insights).
 * Admin-only.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createAdminSupabaseClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

interface MetricItem {
  internal_key: string
  score: number
  value?: string
  [key: string]: unknown
}

interface AnalysisRow {
  score: number | null
  metrics: MetricItem[] | null
  genre: string | null
}

interface HighScoreRow {
  id: string
  score: number
  created_at: string
  track_name: string | null
  genre: string | null
  user_id: string | null
}

export async function GET(request: NextRequest) {
  try {
    // Auth check — same pattern as stats route
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')

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

    const adminClient = createAdminSupabaseClient()

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

    // Queries — all using adminClient (bypasses RLS)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const [highScoresResult, totalAnalysesResult, recentAnalysesResult] = await Promise.all([
      // 1. Recent high scores (potential testimonials)
      adminClient
        .from('analyses')
        .select('id, score, created_at, track_name, genre, user_id')
        .eq('is_test_analysis', false)
        .gte('score', 85)
        .gte('created_at', thirtyDaysAgo)
        .order('score', { ascending: false })
        .limit(10),

      // 2. Recent analyses count
      adminClient
        .from('analyses')
        .select('*', { count: 'exact', head: true })
        .eq('is_test_analysis', false)
        .gte('created_at', thirtyDaysAgo),

      // 3. Score distribution for content ideas
      adminClient
        .from('analyses')
        .select('score, metrics, genre')
        .eq('is_test_analysis', false)
        .gte('created_at', thirtyDaysAgo)
        .not('score', 'is', null)
        .limit(200),
    ])

    const highScores = (highScoresResult.data || []) as HighScoreRow[]
    const totalAnalyses = totalAnalysesResult.count || 0
    const recentAnalyses = (recentAnalysesResult.data || []) as AnalysisRow[]

    // Compute avg_score
    const scores = recentAnalyses
      .map(a => a.score)
      .filter((s): s is number => s != null)
    const avgScore = scores.length > 0
      ? Math.round((scores.reduce((sum, s) => sum + s, 0) / scores.length) * 10) / 10
      : 0

    // Compute weak_metrics — count how many times each metric scores below 60
    const metricLowCounts: Record<string, number> = {}
    const metricTotalCounts: Record<string, number> = {}

    for (const analysis of recentAnalyses) {
      const metrics = analysis.metrics
      if (!Array.isArray(metrics)) continue

      for (const metric of metrics) {
        if (!metric.internal_key || typeof metric.score !== 'number') continue
        const key = metric.internal_key
        metricTotalCounts[key] = (metricTotalCounts[key] || 0) + 1
        if (metric.score < 60) {
          metricLowCounts[key] = (metricLowCounts[key] || 0) + 1
        }
      }
    }

    const weakMetrics = Object.entries(metricLowCounts)
      .map(([metric, low_count]) => ({
        metric,
        low_count,
        total: metricTotalCounts[metric] || 0,
      }))
      .sort((a, b) => b.low_count - a.low_count)
      .slice(0, 5)

    // Compute genre_distribution
    const genreCounts: Record<string, number> = {}
    for (const analysis of recentAnalyses) {
      const genre = analysis.genre || 'Unknown'
      genreCounts[genre] = (genreCounts[genre] || 0) + 1
    }

    const genreDistribution = Object.entries(genreCounts)
      .map(([genre, count]) => ({ genre, count }))
      .sort((a, b) => b.count - a.count)

    return NextResponse.json({
      high_scores: highScores,
      total_analyses_30d: totalAnalyses,
      avg_score: avgScore,
      weak_metrics: weakMetrics,
      genre_distribution: genreDistribution,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
