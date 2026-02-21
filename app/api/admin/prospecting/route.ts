/**
 * Admin Prospecting API Endpoint
 *
 * GET  /api/admin/prospecting — List leads with filters + KPIs (admin auth)
 * POST /api/admin/prospecting — Ingest leads from scraper (secret header auth)
 * PATCH /api/admin/prospecting — Update lead status/notes (admin auth)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createAdminSupabaseClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// Verify admin user from Bearer token
async function verifyAdmin(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

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

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdmin(request)
    if (!auth) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { adminClient } = auth
    const { searchParams } = new URL(request.url)

    const status = searchParams.get('status')
    const source = searchParams.get('source')
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    // KPI queries + list query in parallel
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

    // Build filtered query
    let listQuery = adminClient
      .from('prospecting_leads')
      .select('*', { count: 'exact' })
      .order('discovered_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status && status !== 'all') listQuery = listQuery.eq('status', status)
    if (source && source !== 'all') listQuery = listQuery.eq('source', source)
    if (category && category !== 'all') listQuery = listQuery.eq('pain_point_category', category)
    if (search) listQuery = listQuery.or(`author_username.ilike.%${search}%,content_snippet.ilike.%${search}%,title.ilike.%${search}%`)

    const [
      listResult,
      totalResult,
      newThisWeekResult,
      sourceBreakdownResult,
    ] = await Promise.all([
      listQuery,

      adminClient
        .from('prospecting_leads')
        .select('id', { count: 'exact', head: true }),

      adminClient
        .from('prospecting_leads')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'new')
        .gte('discovered_at', weekAgo),

      adminClient
        .from('prospecting_leads')
        .select('source'),
    ])

    // Compute KPIs
    const total = totalResult.count || 0
    const newThisWeek = newThisWeekResult.count || 0

    // Source breakdown
    const bySource: Record<string, number> = {}
    ;(sourceBreakdownResult.data || []).forEach((r: { source: string }) => {
      bySource[r.source] = (bySource[r.source] || 0) + 1
    })
    const topSource = Object.entries(bySource).sort((a, b) => b[1] - a[1])[0]

    // Avg relevance from current page results
    const leads = listResult.data || []
    const avgScore = leads.length > 0
      ? Math.round((leads.reduce((sum: number, l: any) => sum + l.relevance_score, 0) / leads.length) * 100) / 100
      : 0

    return NextResponse.json({
      leads,
      total: listResult.count || 0,
      kpi: {
        total,
        newThisWeek,
        avgScore,
        topSource: topSource ? { source: topSource[0], count: topSource[1] } : null,
        bySource: Object.entries(bySource).map(([source, count]) => ({ source, count })),
      }
    })

  } catch (error) {
    console.error('Prospecting GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Auth via shared secret (scraper has no user session)
    const secret = request.headers.get('X-Prospecting-Secret')
    const expectedSecret = process.env.PROSPECTING_SECRET

    if (!expectedSecret || secret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { leads } = body

    if (!Array.isArray(leads) || leads.length === 0) {
      return NextResponse.json({ error: 'No leads provided' }, { status: 400 })
    }

    const adminClient = createAdminSupabaseClient()

    // Upsert with ON CONFLICT DO NOTHING for dedup
    const { data, error } = await adminClient
      .from('prospecting_leads')
      .upsert(leads, {
        onConflict: 'source,source_id',
        ignoreDuplicates: true,
      })
      .select('id')

    if (error) {
      console.error('Prospecting POST upsert error:', error)
      return NextResponse.json({ error: 'Failed to insert leads' }, { status: 500 })
    }

    const inserted = data?.length || 0
    const skipped = leads.length - inserted

    return NextResponse.json({ inserted, skipped, total: leads.length })

  } catch (error) {
    console.error('Prospecting POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await verifyAdmin(request)
    if (!auth) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { adminClient } = auth
    const body = await request.json()
    const { id, status, admin_notes, contacted_via } = body

    if (!id) {
      return NextResponse.json({ error: 'Lead id required' }, { status: 400 })
    }

    const updateData: Record<string, any> = { updated_at: new Date().toISOString() }
    if (status) updateData.status = status
    if (admin_notes !== undefined) updateData.admin_notes = admin_notes
    if (contacted_via) updateData.contacted_via = contacted_via
    if (status === 'contacted') updateData.contacted_at = new Date().toISOString()

    const { error } = await adminClient
      .from('prospecting_leads')
      .update(updateData)
      .eq('id', id)

    if (error) {
      console.error('Prospecting PATCH error:', error)
      return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 })
    }

    return NextResponse.json({ updated: true })

  } catch (error) {
    console.error('Prospecting PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
