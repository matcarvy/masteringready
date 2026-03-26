/**
 * Content Generator API — POST /api/admin/content/generate
 * Takes an input and generates 9 content formats via Claude API.
 * Also supports single-format regeneration when format_type + item_id are provided.
 * Admin-only.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createAdminSupabaseClient } from '@/lib/supabase'
import Anthropic from '@anthropic-ai/sdk'
import { buildSystemPrompt, buildUserPrompt, buildSingleFormatUserPrompt, FORMAT_DEFS } from '@/lib/content-prompts'
import type { InputType, FormatKey } from '@/lib/content-prompts'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const adminClient = createAdminSupabaseClient()
    const { data: profile } = await adminClient
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Parse request
    const body = await request.json()
    const { input_type, input_text, format_type, item_id } = body as {
      input_type: InputType
      input_text: string
      format_type?: FormatKey
      item_id?: string
    }

    if (!input_type || !input_text?.trim()) {
      return NextResponse.json({ error: 'input_type and input_text are required' }, { status: 400 })
    }

    // Call Claude API
    const anthropicKey = process.env.ANTHROPIC_API_KEY
    if (!anthropicKey) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
    }

    const anthropic = new Anthropic({ apiKey: anthropicKey })

    // Single format regeneration mode
    if (format_type && item_id) {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        system: buildSystemPrompt(),
        messages: [{ role: 'user', content: buildSingleFormatUserPrompt(input_type, input_text, format_type) }],
      })

      const textBlock = message.content.find(b => b.type === 'text')
      if (!textBlock || textBlock.type !== 'text') {
        return NextResponse.json({ error: 'No response from AI' }, { status: 500 })
      }

      let rawText = textBlock.text.trim()
      if (rawText.startsWith('```')) {
        rawText = rawText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
      }

      let generated: Record<string, { es?: string; en?: string }>
      try {
        generated = JSON.parse(rawText)
      } catch {
        return NextResponse.json({ error: 'Failed to parse AI response', raw: rawText }, { status: 500 })
      }

      const formatData = generated[format_type]
      if (!formatData) {
        return NextResponse.json({ error: `Format "${format_type}" not found in AI response` }, { status: 500 })
      }

      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (formatData.es !== undefined) updates.content_es = formatData.es
      if (formatData.en !== undefined) updates.content_en = formatData.en

      const { data: updatedRow, error: updateError } = await adminClient
        .from('content_queue')
        .update(updates)
        .eq('id', item_id)
        .select()
        .single()

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }

      return NextResponse.json({ item: updatedRow })
    }

    // Full batch generation mode (existing behavior)
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      system: buildSystemPrompt(),
      messages: [{ role: 'user', content: buildUserPrompt(input_type, input_text) }],
    })

    // Extract text content
    const textBlock = message.content.find(b => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json({ error: 'No response from AI' }, { status: 500 })
    }

    // Parse JSON from response (handle markdown code blocks)
    let rawText = textBlock.text.trim()
    if (rawText.startsWith('```')) {
      rawText = rawText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    }

    let generated: Record<string, { es?: string; en?: string }>
    try {
      generated = JSON.parse(rawText)
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI response', raw: rawText }, { status: 500 })
    }

    // Insert into content_queue
    const batchId = crypto.randomUUID()
    const rows = FORMAT_DEFS.map(f => ({
      batch_id: batchId,
      input_type,
      input_text,
      format_type: f.key,
      content_es: generated[f.key]?.es || null,
      content_en: generated[f.key]?.en || null,
      platform: f.platforms,
      status: 'draft',
    }))

    const { data: inserted, error: insertError } = await adminClient
      .from('content_queue')
      .insert(rows)
      .select()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ batch_id: batchId, items: inserted })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
