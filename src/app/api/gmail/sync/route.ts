// POST /api/gmail/sync — manually trigger a scan of unread Hapi emails
import { NextResponse } from 'next/server'
import { tasks } from '@trigger.dev/sdk'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: integration } = await supabase
    .from('user_integrations')
    .select('access_token, refresh_token, token_expires_at')
    .eq('user_id', user.id)
    .eq('provider', 'gmail')
    .eq('status', 'active')
    .single()

  if (!integration) {
    return NextResponse.json({ error: 'Gmail not connected' }, { status: 400 })
  }

  await tasks.trigger('process-gmail-voucher', {
    userId: user.id,
    accessToken: integration.access_token,
    refreshToken: integration.refresh_token,
    tokenExpiresAt: integration.token_expires_at,
  })

  return NextResponse.json({ ok: true })
}
