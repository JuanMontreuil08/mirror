import { task, logger } from '@trigger.dev/sdk/v3'
import { extractVoucherFromEmail } from '@/lib/claude/voucher-extractor'
import { createServiceClient } from '@/lib/supabase/service'

// Brokers whose emails we process
const BROKER_DOMAINS = ['hapi.trade']

interface Payload {
  userId: string
  historyId: string          // latest historyId from the Pub/Sub push
  previousHistoryId: string  // last saved historyId — used to fetch delta
  accessToken: string
  refreshToken: string
  tokenExpiresAt: string
}

export const processGmailVoucher = task({
  id: 'process-gmail-voucher',
  retry: { maxAttempts: 3, minTimeoutInMs: 2000, factor: 2 },

  run: async (payload: Payload) => {
    const { userId, historyId, previousHistoryId } = payload
    const supabase = createServiceClient()

    // 1. Refresh access token if expired
    const accessToken = await getValidToken(payload, supabase)

    // 2. Fetch Gmail history since last known point to get new message IDs
    const historyRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/history` +
      `?startHistoryId=${previousHistoryId}&historyTypes=messageAdded`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )

    if (!historyRes.ok) {
      const text = await historyRes.text()
      logger.error('Gmail history fetch failed', { status: historyRes.status, text })
      await supabase.from('user_integrations')
        .update({ status: 'error', error_message: `History fetch failed: ${historyRes.status}` })
        .eq('user_id', userId).eq('provider', 'gmail')
      return { processed: 0, error: 'history_fetch_failed' }
    }

    const history = await historyRes.json()
    const messages: { id: string }[] = (history.history ?? [])
      .flatMap((h: { messagesAdded?: { message: { id: string } }[] }) =>
        h.messagesAdded?.map((m: { message: { id: string } }) => m.message) ?? []
      )

    if (messages.length === 0) {
      logger.info('No new messages in history', { userId })
      await supabase.from('user_integrations')
        .update({ gmail_history_id: historyId })
        .eq('user_id', userId).eq('provider', 'gmail')
      return { processed: 0 }
    }

    let processed = 0

    for (const { id: messageId } of messages) {
      // 3. Deduplication — skip if already processed
      const { data: integration } = await supabase
        .from('user_integrations')
        .select('last_processed_message_id')
        .eq('user_id', userId).eq('provider', 'gmail')
        .single()

      if (integration?.last_processed_message_id === messageId) {
        logger.info('Skipping already processed message', { messageId })
        continue
      }

      // 4. Fetch full message
      const msgRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )
      if (!msgRes.ok) continue
      const msg = await msgRes.json()

      // 5. Filter by broker domain
      const fromHeader: string = msg.payload?.headers
        ?.find((h: { name: string; value: string }) => h.name === 'From')?.value ?? ''
      if (!BROKER_DOMAINS.some(domain => fromHeader.includes(domain))) continue

      // 6. Extract HTML body
      const htmlBody = extractHtmlBody(msg)
      if (!htmlBody) {
        logger.warn('No HTML body in message', { messageId })
        continue
      }

      // 7. AI extraction
      logger.info('Extracting voucher', { messageId, from: fromHeader })
      const extraction = await extractVoucherFromEmail(htmlBody)

      if (extraction.transactions.length === 0) {
        logger.info('No transactions found', { messageId })
        continue
      }

      // 8. Store as a pending file_import — user will review and confirm via the upload tab
      const subjectHeader: string = msg.payload?.headers
        ?.find((h: { name: string; value: string }) => h.name === 'Subject')?.value ?? ''
      const fileName = subjectHeader || `Email from ${fromHeader}`

      await supabase.from('file_imports').insert({
        user_id: userId,
        file_name: fileName,
        file_type: 'email_voucher',
        file_url: null,
        status: 'pending',
        extracted_data: extraction,
        processed_at: new Date().toISOString(),
      })

      // 9. Mark message as processed
      await supabase.from('user_integrations')
        .update({ last_processed_message_id: messageId })
        .eq('user_id', userId).eq('provider', 'gmail')

      processed++
      logger.info('Voucher queued for review', { messageId, count: extraction.transactions.length })
    }

    // 10. Advance historyId for next push
    await supabase.from('user_integrations')
      .update({ gmail_history_id: historyId, status: 'active', error_message: null })
      .eq('user_id', userId).eq('provider', 'gmail')

    return { processed }
  },
})

// --- helpers ---

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
