export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
    >
      <div className="relative w-full max-w-sm animate-fade-up">
        {/* Brand mark */}
        <div className="text-center mb-10">
          <p
            className="text-[28px] font-ui font-medium tracking-tight"
            style={{ color: 'var(--color-text)' }}
          >
            Mirror.
          </p>
          <p
            className="font-ui text-sm mt-1"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Your portfolio, clearly reflected.
          </p>
        </div>
        {children}
      </div>
    </div>
  )
}
