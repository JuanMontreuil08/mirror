'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { processVoucher, confirmVoucherTransactions } from '@/app/actions/voucher'
import { ExtractedTransaction, VoucherExtractionResult } from '@/types'

type Step = 'upload' | 'processing' | 'review' | 'confirming'

export default function UploadPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>('upload')
  const [dragOver, setDragOver] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileImportId, setFileImportId] = useState<string | null>(null)
  const [extraction, setExtraction] = useState<VoucherExtractionResult | null>(null)
  const [transactions, setTransactions] = useState<ExtractedTransaction[]>([])
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 20)
    return () => clearTimeout(t)
  }, [])

  function handleFile(file: File) {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    if (!allowed.includes(file.type)) {
      setError('File type not supported. Use JPG, PNG, WebP, or PDF.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File too large. Maximum size is 10MB.')
      return
    }
    setSelectedFile(file)
    setError(null)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  async function handleAnalyze() {
    if (!selectedFile) return
    setStep('processing')
    setError(null)
    const formData = new FormData()
    formData.append('file', selectedFile)
    try {
      const result = await processVoucher(formData)
      setFileImportId(result.fileImportId)
      setExtraction(result.extraction)
      setTransactions(result.extraction.transactions)
      setStep('review')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setStep('upload')
    }
  }

  async function handleConfirm() {
    if (!fileImportId || transactions.length === 0) return
    setStep('confirming')
    setError(null)
    try {
      await confirmVoucherTransactions(fileImportId, transactions)
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setStep('review')
    }
  }

  function removeTransaction(index: number) {
    setTransactions((prev) => prev.filter((_, i) => i !== index))
  }

  function updateTransaction(index: number, field: keyof ExtractedTransaction, value: string) {
    setTransactions((prev) =>
      prev.map((tx, i) => {
        if (i !== index) return tx
        if (field === 'quantity' || field === 'price_per_share' || field === 'total_amount') {
          return { ...tx, [field]: parseFloat(value) || 0 }
        }
        return { ...tx, [field]: value }
      })
    )
  }

  function resetToUpload() {
    setStep('upload')
    setSelectedFile(null)
    setExtraction(null)
    setTransactions([])
    setError(null)
  }

  // ── Loading states ──────────────────────────────────────────────────────────
  if (step === 'processing' || step === 'confirming') {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-48px)] bg-canvas">
        <div className="text-center animate-fade-in">
          <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-xs font-medium text-gray-500">
            {step === 'processing' ? 'Analyzing your file…' : 'Saving transactions…'}
          </p>
          <p className="text-xs text-gray-300 mt-1">This may take a few seconds</p>
        </div>
      </div>
    )
  }

  // ── Review step ─────────────────────────────────────────────────────────────
  if (step === 'review' && extraction) {
    return (
      <div className={`bg-canvas min-h-[calc(100vh-48px)] transition-all duration-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
        <div className="px-8 py-8 max-w-4xl mx-auto animate-fade-up">
          <div className="flex items-center justify-between mb-6">
            <div>
              <button
                onClick={resetToUpload}
                className="text-xs text-gray-400 hover:text-gray-900 transition-colors mb-2 block flex items-center gap-1"
              >
                ← Back
              </button>
              <h1 className="text-base font-semibold text-gray-900 tracking-tight">Review extracted data</h1>
              {extraction.extraction_notes && (
                <p className="text-xs text-gray-400 mt-0.5">{extraction.extraction_notes}</p>
              )}
            </div>
          </div>

          {extraction.requires_review && (
            <div className="mb-5 text-xs text-amber-700 border border-amber-200 rounded-xl px-4 py-3 bg-amber-50 flex items-start gap-2">
              <span className="mt-0.5 flex-shrink-0">⚠️</span>
              <span>Some fields have low confidence — please review before confirming.</span>
            </div>
          )}

          {error && (
            <div className="mb-5 text-xs text-red-500 border border-red-100 rounded-xl px-4 py-3 bg-red-50">{error}</div>
          )}

          {transactions.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-12">No transactions found.</p>
          ) : (
            <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden mb-6 shadow-card">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-stone-100">
                    {[
                      { label: 'Stock', align: 'left' },
                      { label: 'Type', align: 'left' },
                      { label: 'Shares', align: 'right' },
                      { label: 'Price', align: 'right' },
                      { label: 'Total', align: 'right' },
                      { label: 'Date', align: 'right' },
                      { label: '', align: 'right' },
                    ].map((h) => (
                      <th
                        key={h.label}
                        className={`text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-4 py-3 text-${h.align} bg-stone-50/50`}
                      >
                        {h.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx, index) => (
                    <tr key={index} className="border-b border-stone-50 last:border-0 align-middle hover:bg-stone-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <input
                          className="w-20 text-sm font-semibold text-gray-900 bg-transparent border border-transparent rounded-lg px-1.5 py-0.5 hover:border-stone-200 focus:border-gray-400 focus:outline-none focus:bg-white uppercase transition-all"
                          value={tx.ticker}
                          onChange={(e) => updateTransaction(index, 'ticker', e.target.value.toUpperCase())}
                        />
                        {tx.warnings.length > 0 && (
                          <div className="text-[10px] text-amber-500 px-1.5 mt-0.5">{tx.warnings[0]}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={tx.transaction_type}
                          onChange={(e) => updateTransaction(index, 'transaction_type', e.target.value)}
                          className={`text-xs rounded-lg px-2.5 py-1 border-0 focus:outline-none cursor-pointer font-medium ${
                            tx.transaction_type === 'buy'
                              ? 'text-emerald-700 bg-emerald-50'
                              : 'text-red-600 bg-red-50'
                          }`}
                        >
                          <option value="buy">buy</option>
                          <option value="sell">sell</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <input type="number" step="any" className="w-24 text-sm text-gray-600 text-right bg-transparent border border-transparent rounded-lg px-1.5 py-0.5 hover:border-stone-200 focus:border-gray-400 focus:outline-none focus:bg-white transition-all" value={tx.quantity} onChange={(e) => updateTransaction(index, 'quantity', e.target.value)} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <input type="number" step="any" className="w-24 text-sm text-gray-600 text-right bg-transparent border border-transparent rounded-lg px-1.5 py-0.5 hover:border-stone-200 focus:border-gray-400 focus:outline-none focus:bg-white transition-all" value={tx.price_per_share} onChange={(e) => updateTransaction(index, 'price_per_share', e.target.value)} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <input type="number" step="any" className="w-24 text-sm font-semibold text-gray-900 text-right bg-transparent border border-transparent rounded-lg px-1.5 py-0.5 hover:border-stone-200 focus:border-gray-400 focus:outline-none focus:bg-white transition-all" value={tx.total_amount} onChange={(e) => updateTransaction(index, 'total_amount', e.target.value)} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <input
                          type="date"
                          className={`text-sm text-right bg-transparent border rounded-lg px-1.5 py-0.5 focus:outline-none focus:border-gray-400 transition-all ${
                            !tx.transaction_date
                              ? 'border-amber-200 bg-amber-50 text-amber-700'
                              : 'border-transparent hover:border-stone-200 text-gray-600'
                          }`}
                          value={tx.transaction_date ?? ''}
                          onChange={(e) => updateTransaction(index, 'transaction_date', e.target.value)}
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => removeTransaction(index)} className="text-[10px] text-gray-300 hover:text-red-400 transition-colors font-medium">Remove</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center gap-4">
            <button onClick={resetToUpload} className="text-sm text-gray-400 hover:text-gray-900 transition-colors">
              Upload another
            </button>
            {transactions.length > 0 && (
              <button
                onClick={handleConfirm}
                className="text-sm font-medium text-white bg-gray-900 px-5 py-2.5 rounded-xl hover:bg-black transition-colors shadow-sm"
              >
                Confirm {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Upload step ─────────────────────────────────────────────────────────────
  return (
    <div
      className={`flex h-[calc(100vh-48px)] bg-canvas transition-all duration-500 ${
        mounted ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Left panel — instructions */}
      <div className="w-2/5 relative flex flex-col justify-center px-12 py-16 overflow-hidden border-r border-stone-200/70 bg-white">
        {/* Dot grid background */}
        <div className="absolute inset-0 bg-dot-grid opacity-[0.35] pointer-events-none" />

        <div className="relative z-10 animate-fade-up">
          <Link href="/dashboard" className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-900 transition-colors mb-10">
            ← Back
          </Link>

          <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center mb-5 shadow-sm">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          </div>

          <h1 className="text-xl font-semibold text-gray-900 mb-3 tracking-tight">Add position</h1>
          <p className="text-sm text-gray-500 leading-relaxed mb-10">
            Upload a photo or PDF of your trade confirmation. We&apos;ll extract the details automatically — you can review and edit before saving.
          </p>

          <div className="space-y-2.5">
            {[
              { icon: '🖼️', text: 'Photo of your brokerage confirmation' },
              { icon: '📄', text: 'PDF trade receipt' },
              { icon: '📸', text: 'Screenshot of order summary' },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-2.5">
                <span className="text-sm">{item.icon}</span>
                <span className="text-xs text-gray-500">{item.text}</span>
              </div>
            ))}
          </div>

          <p className="text-xs text-gray-300 mt-8 font-mono">Max 10MB · JPG, PNG, WebP, PDF</p>
        </div>
      </div>

      {/* Right panel — drop zone */}
      <div className="w-3/5 flex flex-col justify-center px-16 py-16">
        {error && (
          <div className="mb-6 text-xs text-red-500 border border-red-100 rounded-xl px-4 py-3 bg-red-50 animate-fade-in">
            {error}
          </div>
        )}

        <div
          className={`border-2 border-dashed rounded-2xl p-20 text-center cursor-pointer transition-all duration-200 animate-fade-up delay-100 ${
            dragOver
              ? 'border-gray-900 bg-white shadow-card-hover scale-[1.01]'
              : selectedFile
              ? 'border-emerald-300 bg-emerald-50/30 hover:border-emerald-400'
              : 'border-stone-200 bg-white hover:border-stone-400 hover:shadow-card'
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFile(file) }}
          />

          {selectedFile ? (
            <div className="animate-scale-in">
              <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-sm">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-gray-900 mb-0.5">{selectedFile.name}</p>
              <p className="text-xs text-gray-400">{(selectedFile.size / 1024).toFixed(0)} KB · Ready to analyze</p>
            </div>
          ) : (
            <div>
              <div className="w-10 h-10 bg-stone-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <svg className="w-5 h-5 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
              </div>
              <p className="text-sm text-gray-600 mb-1">
                Drop your file here or{' '}
                <span className="text-gray-900 font-medium underline underline-offset-2">browse</span>
              </p>
              <p className="text-xs text-gray-400">Supports JPG, PNG, WebP, PDF</p>
            </div>
          )}
        </div>

        {selectedFile && (
          <div className="flex items-center gap-4 mt-5 animate-fade-up">
            <button
              onClick={() => { setSelectedFile(null); setError(null) }}
              className="text-sm text-gray-400 hover:text-gray-900 transition-colors"
            >
              Clear
            </button>
            <button
              onClick={handleAnalyze}
              className="text-sm font-medium text-white bg-gray-900 px-5 py-2.5 rounded-xl hover:bg-black transition-colors shadow-sm"
            >
              Analyze with AI →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
