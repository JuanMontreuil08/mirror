import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/app/actions/auth'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen">
      {/* Glass nav */}
      <nav
        className="glass sticky top-0 z-30 border-b-0"
        style={{ borderBottom: '1px solid var(--color-border-sub)' }}
      >
        <div className="px-6 h-12 flex items-center justify-between max-w-[1280px] mx-auto">
          {/* Brand */}
          <Link
            href="/dashboard"
            className="font-ui font-medium text-xl tracking-tight transition-opacity hover:opacity-70"
            style={{ color: 'var(--color-text)' }}
          >
            Mirror.
          </Link>

          {/* Nav links + user */}
          <div className="flex items-center gap-1">
            <Link
              href="/sentiment"
              className="mirror-nav-link text-xs font-medium px-3 py-1.5 rounded-[6px] transition-colors"
            >
              Sentiment
            </Link>
            <Link
              href="/dashboard/upload"
              className="mirror-nav-link text-xs font-medium px-3 py-1.5 rounded-[6px] transition-colors"
            >
              + Add position
            </Link>
            <div
              className="w-px h-3.5 mx-2"
              style={{ backgroundColor: 'var(--color-border-sub)' }}
            />
            <span
              className="text-xs hidden sm:block"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {user?.email}
            </span>
            <form action={signOut}>
              <button
                type="submit"
                className="mirror-nav-link text-xs font-medium px-3 py-1.5 rounded-[6px] transition-colors ml-1"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </nav>
      <main>{children}</main>
    </div>
  )
}
