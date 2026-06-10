import { createClient } from '@/lib/supabase/server'

// Tells Gmail to push notifications to our Pub/Sub topic when new emails arrive.
// Must be called after OAuth and renewed every 7 days (Gmail watch expires).
export async function setupGmailWatch(userId: string, accessToken: string) {
  const topicName = process.env.GOOGLE_PUBSUB_TOPIC
  if (!topicName) {
    console.error('GOOGLE_PUBSUB_TOPIC not set — skipping watch setup')
    return
  }

  const res = await fetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/watch',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topicName,
        labelIds: ['INBOX'],
        labelFilterBehavior: 'INCLUDE',
      }),
    }
  )

  if (!res.ok) {
    console.error('gmail.watch() failed:', await res.text())
    return
  }

  const { historyId, expiration } = await res.json()

  // Save watch state — historyId is used to fetch only new messages on each push
  const supabase = await createClient()
  await supabase
    .from('user_integrations')
    .update({
      gmail_history_id: historyId,
      gmail_watch_expiry: new Date(Number(expiration)).toISOString(),
    })
    .eq('user_id', userId)
    .eq('provider', 'gmail')
}
