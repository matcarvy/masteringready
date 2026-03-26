/**
 * Content Queue CRUD API — /api/admin/content
 * GET: List content (filterable by status, batch_id, scheduled_from/to)
 * PATCH: Update status, content, notes, scheduled_date, image_url
 * DELETE: Remove content piece or entire batch
 * Admin-only.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createAdminSupabaseClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

async function verifyAdmin(request: NextRequest) {
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

  return profile?.is_admin ? { user, adminClient } : null
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdmin(request)
    if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const batch_id = searchParams.get('batch_id')
    const limit = parseInt(searchParams.get('limit') || '100')
    const scheduled_from = searchParams.get('scheduled_from')
    const scheduled_to = searchParams.get('scheduled_to')

    let query = auth.adminClient
      .from('content_queue')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (status) query = query.eq('status', status)
    if (batch_id) query = query.eq('batch_id', batch_id)
    if (scheduled_from) query = query.gte('scheduled_date', scheduled_from)
    if (scheduled_to) query = query.lte('scheduled_date', scheduled_to)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ items: data })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await verifyAdmin(request)
    if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const { id, status, content_es, content_en, notes, scheduled_date, image_url } = body

    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (status) updates.status = status
    if (content_es !== undefined) updates.content_es = content_es
    if (content_en !== undefined) updates.content_en = content_en
    if (notes !== undefined) updates.notes = notes
    if (scheduled_date !== undefined) updates.scheduled_date = scheduled_date
    if (image_url !== undefined) updates.image_url = image_url

    const { data, error } = await auth.adminClient
      .from('content_queue')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ item: data })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifyAdmin(request)
    if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const batch_id = searchParams.get('batch_id')

    if (!id && !batch_id) {
      return NextResponse.json({ error: 'id or batch_id required' }, { status: 400 })
    }

    if (id) {
      const { error } = await auth.adminClient
        .from('content_queue')
        .delete()
        .eq('id', id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    } else if (batch_id) {
      const { error } = await auth.adminClient
        .from('content_queue')
        .delete()
        .eq('batch_id', batch_id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
