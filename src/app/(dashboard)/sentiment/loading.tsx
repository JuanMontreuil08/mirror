export default function SentimentLoading() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <div className="mb-6">
        <div className="h-8 w-48 bg-gray-100 rounded animate-pulse mb-2" />
        <div className="h-4 w-96 bg-gray-100 rounded animate-pulse" />
      </div>
      <div className="mb-8">
        <div className="h-10 w-72 bg-gray-100 rounded animate-pulse" />
      </div>
      <div className="space-y-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="rounded-lg border border-gray-100 bg-white p-6">
            <div className="h-6 w-40 bg-gray-100 rounded animate-pulse mb-3" />
            <div className="h-4 w-full bg-gray-50 rounded animate-pulse mb-2" />
            <div className="h-4 w-3/4 bg-gray-50 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}
