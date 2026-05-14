import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import Hero from '@/components/landing/hero'

export const metadata: Metadata = {
  title: 'Mirror — Ask your portfolio anything',
  description:
    'Upload a trade confirmation. Ask anything about your investments. Mirror is an AI-powered portfolio tracker that answers your questions.',
  openGraph: {
    title: 'Mirror — Ask your portfolio anything',
    description: 'See your financial self clearly.',
    images: ['/og-image.png'],
  },
}

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return <Hero isAuthenticated={!!user} />
}
