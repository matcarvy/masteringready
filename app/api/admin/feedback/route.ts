/**
 * Admin Feedback Management API
 *
 * PATCH /api/admin/feedback
 *
 * Updates feedback status, admin notes, and responses.
 * Requires authenticated admin user.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createAdminSupabaseClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

interface FeedbackUpdateRequest {
  feedbackId: string
  status?: string
  adminNotes?: string
  responseEs?: string
  responseEn?: string
}

export async function PATCH(request: NextRequest) {
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

    const body: FeedbackUpdateRequest = await request.json()
    const { feedbackId, status, adminNotes, responseEs, responseEn } = body

    if (!feedbackId) {
      return NextResponse.json(
        { error: 'feedbackId is required' },
        { status: 400 }
      )
    }

    // Use service role client (bypasses RLS) for admin operations
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

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    }

    if (status) updateData.status = status
    if (adminNotes !== undefined) updateData.admin_notes = adminNotes

    if (responseEs !== undefined || responseEn !== undefined) {
      if (responseEs !== undefined) updateData.response_es = responseEs
      if (responseEn !== undefined) updateData.response_en = responseEn
      updateData.responded_at = new Date().toISOString()
      updateData.responded_by = user.id
    }

    const { data, error } = await adminClient
      .from('user_feedback')
      .update(updateData)
      .eq('id', feedbackId)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, feedback: data })
  } catch (error) {
    console.error('Admin feedback error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
