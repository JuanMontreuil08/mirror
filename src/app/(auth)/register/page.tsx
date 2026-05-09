import Link from 'next/link'
import { signUp } from '@/app/actions/auth'

interface Props {
  searchParams: Promise<{ error?: string }>
}

export default async function RegisterPage({ searchParams }: Props) {
  const params = await searchParams

  return (
    <div className="glass-card rounded-[28px] p-8">
      <h1
        className="text-xl font-ui font-medium mb-1 tracking-tight"
        style={{ color: 'var(--color-text)' }}
      >
        Create account
      </h1>
      <p
        className="font-ui text-sm mb-7"
        style={{ color: 'var(--color-text-muted)' }}
      >
        Start tracking your portfolio
      </p>

      {params.error && (
        <div
          className="mb-5 p-3 rounded-[12px] text-sm"
          style={{ backgroundColor: 'var(--color-loss-bg)', color: 'var(--color-loss)' }}
        >
          {params.error}
        </div>
      )}

      <form action={signUp} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="block font-data text-[10px] uppercase tracking-[0.1em] mb-1.5"
            style={{ color: 'var(--color-text-faint)' }}
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className="w-full px-4 py-2.5 text-sm rounded-[12px] outline-none transition-all placeholder:text-[var(--color-text-faint)]"
            style={{
              backgroundColor: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.10)',
              color: 'var(--color-text)',
              fontFamily: 'var(--font-ui)',
            }}
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block font-data text-[10px] uppercase tracking-[0.1em] mb-1.5"
            style={{ color: 'var(--color-text-faint)' }}
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            className="w-full px-4 py-2.5 text-sm rounded-[12px] outline-none transition-all"
            style={{
              backgroundColor: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.10)',
              color: 'var(--color-text)',
              fontFamily: 'var(--font-ui)',
            }}
          />
          <p
            className="mt-1.5 font-data text-[10px]"
            style={{ color: 'var(--color-text-faint)' }}
          >
            Minimum 6 characters
          </p>
        </div>

        <button
          type="submit"
          className="w-full py-2.5 rounded-[12px] text-sm font-medium mt-1 transition-colors"
          style={{
            backgroundColor: 'rgba(255,255,255,0.90)',
            color: '#09090F',
            fontFamily: 'var(--font-ui)',
          }}
        >
          Create account
        </button>
      </form>

      <p
        className="mt-6 text-center text-xs"
        style={{ color: 'var(--color-text-faint)' }}
      >
        Already have an account?{' '}
        <Link
          href="/login"
          className="font-medium transition-colors hover:underline"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Sign in
        </Link>
      </p>
    </div>
  )
}
