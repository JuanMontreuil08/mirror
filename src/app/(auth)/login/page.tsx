import Link from 'next/link'
import { signIn } from '@/app/actions/auth'

interface Props {
  searchParams: Promise<{ error?: string; info?: string }>
}

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams

  return (
    <div className="bg-white rounded-2xl shadow-card border border-stone-200/80 p-8">
      <h1 className="text-xl font-semibold text-gray-900 mb-0.5 tracking-tight">Welcome back</h1>
      <p className="text-sm text-gray-400 mb-7">Sign in to your portfolio</p>

      {params.error && (
        <div className="mb-5 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
          {params.error}
        </div>
      )}

      {params.info && (
        <div className="mb-5 p-3 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-600">
          {params.info}
        </div>
      )}

      <form action={signIn} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-xs font-medium text-gray-600 mb-1.5 tracking-wide">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400 focus:bg-white focus:ring-0 transition-all"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-xs font-medium text-gray-600 mb-1.5 tracking-wide">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400 focus:bg-white focus:ring-0 transition-all"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-gray-900 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-black transition-colors mt-1 shadow-sm"
        >
          Sign in
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-gray-400">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="text-gray-700 font-medium hover:text-gray-900 transition-colors">
          Sign up
        </Link>
      </p>
    </div>
  )
}
