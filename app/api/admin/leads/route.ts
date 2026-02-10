/**
 * Admin Leads API Endpoint
 *
 * GET /api/admin/leads
 *
 * Returns contact_requests with user/analysis context + KPIs.
 * Requires authenticated admin user.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createAdminSupabaseClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Auth: get token from Authorization header
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

    // Verify admin
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

    // KPI queries + list query in parallel
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const [
      allContactsResult,
      thisMonthResult,
      totalAnalysesResult,
      leadsListResult
    ] = await Promise.all([
      // All contact_requests (for method breakdown)
      adminClient
        .from('contact_requests')
        .select('contact_method, cta_source'),

      // This month count
      adminClient
        .from('contact_requests')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', monthStart),

      // Total analyses for conversion rate (exclude admin test analyses)
      adminClient
        .from('analyses')
        .select('id', { count: 'exact', head: true })
        .is('deleted_at', null)
        .eq('is_test_analysis', false),

      // Detailed list with joins (latest 100)
      adminClient
        .from('contact_requests')
        .select(`
          id, user_id, analysis_id, name, email, message,
          cta_source, contact_method, client_country, created_at,
          profile:profiles(email, full_name),
          analysis:analyses(filename, score, verdict)
        `)
        .order('created_at', { ascending: false })
        .limit(100)
    ])

    // Compute KPIs
    const allContacts = allContactsResult.data || []
    const totalLeads = allContacts.length
    const leadsThisMonth = thisMonthResult.count || 0
    const totalAnalyses = totalAnalysesResult.count || 0

    // Method breakdown
    const byMethod: Record<string, number> = {}
    allContacts.forEach((c: { contact_method: string }) => {
      const method = c.contact_method || 'unknown'
      byMethod[method] = (byMethod[method] || 0) + 1
    })

    // CTA source breakdown
    const bySource: Record<string, number> = {}
    allContacts.forEach((c: { cta_source: string | null }) => {
      const source = c.cta_source || 'unknown'
      bySource[source] = (bySource[source] || 0) + 1
    })

    // Conversion rate
    const conversionRate = totalAnalyses > 0
      ? Math.round((totalLeads / totalAnalyses) * 1000) / 10
      : 0

    return NextResponse.json({
      leads: leadsListResult.data || [],
      kpi: {
        total: totalLeads,
        thisMonth: leadsThisMonth,
        byMethod: Object.entries(byMethod).map(([method, count]) => ({ method, count })),
        bySource: Object.entries(bySource).map(([source, count]) => ({ source, count })),
        conversionRate,
        totalAnalyses
      }
    })

  } catch (error) {
    console.error('Admin leads API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
