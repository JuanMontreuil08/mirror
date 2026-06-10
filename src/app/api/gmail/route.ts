// GET /api/gmail — redirect user to Google OAuth consent screen
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
].join(' ')

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const clientId = process.env.GOOGLE_CLIENT_ID
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!clientId || !appUrl) {
    return NextResponse.json({ error: 'Missing GOOGLE_CLIENT_ID or NEXT_PUBLIC_APP_URL' }, { status: 500 })
  }

  // CSRF protection: bind user ID + random nonce, verify in callback
  const nonce = crypto.randomUUID()
  const state = `${user.id}:${nonce}`

  const response = NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
      client_id: clientId,
      redirect_uri: `${appUrl}/api/gmail/callback`,
      response_type: 'code',
      scope: SCOPES,
      access_type: 'offline',
      prompt: 'consent',
      state,
    }).toString()}`
  )

  // Short-lived httpOnly cookie to verify state in callback
  response.cookies.set('gmail_oauth_nonce', nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  })

  return response
}
