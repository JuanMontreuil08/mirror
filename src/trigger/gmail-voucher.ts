import { task, logger } from '@trigger.dev/sdk'
import { extractVoucherFromEmail } from '@/lib/claude/voucher-extractor'
import { createServiceClient } from '@/lib/supabase/service'

const BROKER_QUERY = 'from:hapi.trade subject:"Order Executed" is:unread'

interface Payload {
  userId: string
  accessToken: string
  refreshToken: string
  tokenExpiresAt: string
}

export const processGmailVoucher = task({
  id: 'process-gmail-voucher',
  retry: { maxAttempts: 3, minTimeoutInMs: 2000, factor: 2 },

  run: async (payload: Payload) => {
    const supabase = createServiceClient()
    const accessToken = await getValidToken(payload, supabase)

    // Search unread emails from Hapi
    const searchRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(BROKER_QUERY)}&maxResults=20`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )

    if (!searchRes.ok) {
      logger.error('Gmail search failed', { status: searchRes.status })
      return { processed: 0, error: 'search_failed' }
    }

    const search = await searchRes.json()
    const messages: { id: string }[] = search.messages ?? []

    if (messages.length === 0) {
      logger.info('No unread Hapi emails found')
      return { processed: 0 }
    }

    logger.info(`Found ${messages.length} unread Hapi emails`)
    let processed = 0

    for (const { id: messageId } of messages) {
      // Fetch full message
      const msgRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )
      if (!msgRes.ok) continue
      const msg = await msgRes.json()

      const subjectHeader: string = msg.payload?.headers
        ?.find((h: { name: string; value: string }) => h.name === 'Subject')?.value ?? ''
      const fromHeader: string = msg.payload?.headers
        ?.find((h: { name: string; value: string }) => h.name === 'From')?.value ?? ''

      const htmlBody = extractHtmlBody(msg)
      if (!htmlBody) {
        logger.warn('No HTML body', { messageId })
        await markAsRead(messageId, accessToken)
        continue
      }

      // AI extraction
      logger.info('Extracting voucher', { messageId, subject: subjectHeader })
      const extraction = await extractVoucherFromEmail(htmlBody)

      if (extraction.transactions.length > 0) {
        await supabase.from('file_imports').insert({
          user_id: payload.userId,
          file_name: subjectHeader || `Email from ${fromHeader}`,
          file_type: 'email_voucher',
          file_url: null,
          status: 'pending',
          extracted_data: extraction,
          processed_at: new Date().toISOString(),
        })
        processed++
        logger.info('Voucher queued for review', { messageId, count: extraction.transactions.length })
      } else {
        logger.info('No transactions found in email', { messageId })
      }

      // Mark as read regardless — avoids reprocessing on next button press
      await markAsRead(messageId, accessToken)
    }

    return { processed }
  },
})

async function markAsRead(messageId: string, accessToken: string) {
  await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ removeLabelIds: ['UNREAD'] }),
    }
  )
}

function extractHtmlBody(msg: {
  payload: {
    mimeType: string
    body?: { data?: string }
    parts?: { mimeType: string; body?: { data?: string } }[]
  }
}): string | null {
  const { payload } = msg
  if (payload.mimeType === 'text/html' && payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64url').toString('utf-8')
  }
  const htmlPart = payload.parts?.find(p => p.mimeType === 'text/html')
  if (htmlPart?.body?.data) {
    return Buffer.from(htmlPart.body.data, 'base64url').toString('utf-8')
  }
  return null
}

async function getValidToken(
  payload: Payload,
  supabase: ReturnType<typeof createServiceClient>
): Promise<string> {
  const isExpired = Date.now() > new Date(payload.tokenExpiresAt).getTime() - 60_000
  if (!isExpired) return payload.accessToken

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: payload.refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`)

  const tokens = await res.json()
  const newExpiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

  await supabase.from('user_integrations')
    .update({ access_token: tokens.access_token, token_expires_at: newExpiry })
    .eq('user_id', payload.userId).eq('provider', 'gmail')

  return tokens.access_token
}
