export default function SentimentLoading() {
  return (
    <div className="pt-20 pb-16 px-6 max-w-4xl mx-auto space-y-5">
      {[1, 2, 3, 4].map(i => (
        <div
          key={i}
          className="rounded-[20px] p-6 animate-pulse"
          style={{
            background: 'rgba(255,255,255,0.70)',
            border: '1px solid rgba(0,0,0,0.07)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          }}
        >
          <div className="h-4 w-32 rounded-full mb-3" style={{ background: 'rgba(0,0,0,0.07)' }} />
          <div className="h-3 w-full rounded-full mb-2" style={{ background: 'rgba(0,0,0,0.05)' }} />
          <div className="h-3 w-2/3 rounded-full" style={{ background: 'rgba(0,0,0,0.05)' }} />
        </div>
      ))}
    </div>
  )
}
