// POST /api/webhooks/gmail
// Google Pub/Sub calls this endpoint when a new email arrives in a watched inbox.
// Payload is a base64-encoded Pub/Sub message containing { emailAddress, historyId }.
import { NextRequest, NextResponse } from 'next/server'
import { tasks } from '@trigger.dev/sdk/v3'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(req: NextRequest) {
  // Verify the request comes from Google (shared secret in query param)
  const token = req.nextUrl.searchParams.get('token')
  if (token !== process.env.PUBSUB_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const message = body?.message
  if (!message?.data) {
    return NextResponse.json({ ok: true }) // Pub/Sub requires 200 to ack
  }

  // Decode base64 Pub/Sub message
  const decoded = JSON.parse(Buffer.from(message.data, 'base64').toString('utf-8'))
  const { emailAddress, historyId } = decoded

  if (!emailAddress || !historyId) {
    return NextResponse.json({ ok: true })
  }

  // Find the user that owns this Gmail address
  const supabase = createServiceClient()
  const { data: integration } = await supabase
    .from('user_integrations')
    .select('user_id, access_token, refresh_token, token_expires_at, gmail_history_id')
    .eq('provider', 'gmail')
    .eq('status', 'active')
    .eq('email', emailAddress)
    .single()

  if (!integration) {
    return NextResponse.json({ ok: true })
  }

  // Trigger the background job — respond 200 immediately so Pub/Sub doesn't retry
  await tasks.trigger('process-gmail-voucher', {
    userId: integration.user_id,
    historyId,
    accessToken: integration.access_token,
    refreshToken: integration.refresh_token,
    tokenExpiresAt: integration.token_expires_at,
    previousHistoryId: integration.gmail_history_id,
  })

  return NextResponse.json({ ok: true })
}
