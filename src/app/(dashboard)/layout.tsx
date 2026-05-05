import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/app/actions/auth'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-canvas">
      <nav className="border-b border-stone-200/70 bg-white/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="px-6 h-12 flex items-center justify-between">
          {/* Brand */}
          <Link
            href="/dashboard"
            className="flex items-center gap-2 group"
          >
            <div className="w-5 h-5 bg-gray-900 rounded-md flex items-center justify-center flex-shrink-0 group-hover:bg-black transition-colors">
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-gray-900 tracking-tight">mirror</span>
          </Link>

          {/* Nav links + user */}
          <div className="flex items-center gap-1">
            <Link
              href="/sentiment"
              className="text-xs font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors px-3 py-1.5 rounded-lg"
            >
              Sentiment
            </Link>
            <Link
              href="/dashboard/upload"
              className="text-xs font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors px-3 py-1.5 rounded-lg"
            >
              + Add position
            </Link>
            <div className="w-px h-3.5 bg-gray-200 mx-2" />
            <span className="text-xs text-gray-400 hidden sm:block">{user?.email}</span>
            <form action={signOut}>
              <button
                type="submit"
                className="text-xs font-medium text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors px-3 py-1.5 rounded-lg ml-1"
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
