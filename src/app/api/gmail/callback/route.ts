// GET /api/gmail/callback — Google redirects here after user grants access
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { setupGmailWatch } from '@/lib/gmail/watch'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!

  if (error || !code || !state) {
    return NextResponse.redirect(`${appUrl}/dashboard?gmail=error`)
  }

  // Verify CSRF nonce: state = "userId:nonce"
  const [userId, nonce] = state.split(':')
  const expectedNonce = req.cookies.get('gmail_oauth_nonce')?.value
  if (!userId || !nonce || !expectedNonce || nonce !== expectedNonce) {
    return NextResponse.redirect(`${appUrl}/dashboard?gmail=error`)
  }

  // Exchange code for tokens
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${appUrl}/api/gmail/callback`,
      grant_type: 'authorization_code',
    }),
  })

  if (!tokenRes.ok) {
    console.error('Token exchange failed:', await tokenRes.text())
    return NextResponse.redirect(`${appUrl}/dashboard?gmail=error`)
  }

  const tokens = await tokenRes.json()
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

  // Fetch the Gmail address for this token so we can route Pub/Sub pushes
  const profileRes = await fetch(
    'https://www.googleapis.com/oauth2/v3/userinfo',
    { headers: { Authorization: `Bearer ${tokens.access_token}` } }
  )
  const profile = profileRes.ok ? await profileRes.json() : {}
  const gmailEmail: string | null = profile.email ?? null

  // Save to user_integrations (upsert — reconnect replaces old tokens)
  const supabase = await createClient()
  const { error: dbError } = await supabase
    .from('user_integrations')
    .upsert({
      user_id: userId,
      provider: 'gmail',
      status: 'active',
      email: gmailEmail,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: expiresAt,
      error_message: null,
    }, { onConflict: 'user_id,provider' })

  if (dbError) {
    console.error('DB upsert failed:', dbError)
    return NextResponse.redirect(`${appUrl}/dashboard?gmail=error`)
  }

  // Register Gmail push watch so Google notifies us on new emails
  await setupGmailWatch(userId, tokens.access_token)

  const redirectRes = NextResponse.redirect(`${appUrl}/dashboard?gmail=connected`)
  redirectRes.cookies.delete('gmail_oauth_nonce')
  return redirectRes
}
