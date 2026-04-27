import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/app/actions/auth'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-gray-100">
        <div className="px-6 h-12 flex items-center justify-between">
          <Link href="/dashboard" className="text-sm font-medium text-gray-900 tracking-tight">
            Stock Tracker
          </Link>
          <div className="flex items-center gap-5">
            <span className="text-xs text-gray-300">{user?.email}</span>
            <form action={signOut}>
              <button
                type="submit"
                className="text-xs text-gray-400 hover:text-gray-900 transition-colors"
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
