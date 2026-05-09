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
      <div className="flex items-center justify-center h-[calc(100vh-48px)] animate-fade-in" style={{ backgroundColor: 'var(--color-bg)' }}>
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{ borderColor: 'var(--color-cta)', borderTopColor: 'transparent' }} />
          <p className="font-ui text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
            {step === 'processing' ? 'Analyzing your file…' : 'Saving transactions…'}
          </p>
          <p className="font-ui text-xs mt-1" style={{ color: 'var(--color-text-faint)' }}>This may take a few seconds</p>
        </div>
      </div>
    )
  }

  // ── Review step ─────────────────────────────────────────────────────────────
  if (step === 'review' && extraction) {
    return (
      <div className={`min-h-[calc(100vh-48px)] transition-all duration-500 ${mounted ? 'opacity-100' : 'opacity-0'}`} style={{ backgroundColor: 'var(--color-bg)' }}>
        <div className="px-8 py-8 max-w-4xl mx-auto animate-fade-up">
          <div className="flex items-center justify-between mb-6">
            <div>
              <button
                onClick={resetToUpload}
                className="font-ui text-xs mb-2 block transition-colors"
                style={{ color: 'var(--color-text-faint)' }}
              >
                ← Back
              </button>
              <h1 className="font-ui text-base font-medium tracking-tight" style={{ color: 'var(--color-text)' }}>Review extracted data</h1>
              {extraction.extraction_notes && (
                <p className="font-ui text-xs mt-0.5" style={{ color: 'var(--color-text-faint)' }}>{extraction.extraction_notes}</p>
              )}
            </div>
          </div>

          {extraction.requires_review && (
            <div className="mb-5 font-ui text-xs rounded-[12px] px-4 py-3 flex items-start gap-2" style={{ color: 'var(--color-warn)', backgroundColor: 'var(--color-warn-bg)', border: '1px solid var(--color-warn-bg)' }}>
              <span className="mt-0.5 flex-shrink-0">⚠</span>
              <span>Some fields have low confidence — please review before confirming.</span>
            </div>
          )}

          {error && (
            <div className="mb-5 font-ui text-xs rounded-[12px] px-4 py-3" style={{ color: 'var(--color-loss)', backgroundColor: 'var(--color-loss-bg)' }}>{error}</div>
          )}

          {transactions.length === 0 ? (
            <p className="font-ui text-sm text-center py-12" style={{ color: 'var(--color-text-muted)' }}>No transactions found.</p>
          ) : (
            <div className="glass-card rounded-[20px] overflow-hidden mb-6">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border-sub)' }}>
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
                        className={`font-data text-[10px] uppercase tracking-[0.1em] px-4 py-3 text-${h.align}`}
                        style={{ color: 'var(--color-text-faint)', backgroundColor: 'rgba(0,0,0,0.015)' }}
                      >
                        {h.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx, index) => (
                    <tr key={index} className="align-middle transition-colors" style={{ borderBottom: '1px solid var(--color-border-sub)' }}>
                      <td className="px-4 py-3">
                        <input
                          className="w-20 font-data text-sm bg-transparent border border-transparent rounded-[6px] px-1.5 py-0.5 uppercase outline-none transition-all"
                          style={{ color: 'var(--color-text)' }}
                          value={tx.ticker}
                          onChange={(e) => updateTransaction(index, 'ticker', e.target.value.toUpperCase())}
                        />
                        {tx.warnings.length > 0 && (
                          <div className="font-data text-[10px] px-1.5 mt-0.5" style={{ color: 'var(--color-warn)' }}>{tx.warnings[0]}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={tx.transaction_type}
                          onChange={(e) => updateTransaction(index, 'transaction_type', e.target.value)}
                          className="font-ui text-xs rounded-[6px] px-2.5 py-1 border-0 outline-none cursor-pointer font-medium"
                          style={{
                            color: tx.transaction_type === 'buy' ? 'var(--color-gain)' : 'var(--color-loss)',
                            backgroundColor: tx.transaction_type === 'buy' ? 'var(--color-gain-bg)' : 'var(--color-loss-bg)',
                          }}
                        >
                          <option value="buy">buy</option>
                          <option value="sell">sell</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <input type="number" step="any" className="w-24 font-data text-sm text-right bg-transparent border border-transparent rounded-[6px] px-1.5 py-0.5 outline-none transition-all" style={{ color: 'var(--color-text-muted)' }} value={tx.quantity} onChange={(e) => updateTransaction(index, 'quantity', e.target.value)} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <input type="number" step="any" className="w-24 font-data text-sm text-right bg-transparent border border-transparent rounded-[6px] px-1.5 py-0.5 outline-none transition-all" style={{ color: 'var(--color-text-muted)' }} value={tx.price_per_share} onChange={(e) => updateTransaction(index, 'price_per_share', e.target.value)} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <input type="number" step="any" className="w-24 font-data text-sm font-medium text-right bg-transparent border border-transparent rounded-[6px] px-1.5 py-0.5 outline-none transition-all" style={{ color: 'var(--color-text)' }} value={tx.total_amount} onChange={(e) => updateTransaction(index, 'total_amount', e.target.value)} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <input
                          type="date"
                          className="font-data text-sm text-right bg-transparent border rounded-[6px] px-1.5 py-0.5 outline-none transition-all"
                          style={!tx.transaction_date ? { borderColor: 'var(--color-warn)', color: 'var(--color-warn)', backgroundColor: 'var(--color-warn-bg)' } : { borderColor: 'transparent', color: 'var(--color-text-muted)' }}
                          value={tx.transaction_date ?? ''}
                          onChange={(e) => updateTransaction(index, 'transaction_date', e.target.value)}
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => removeTransaction(index)} className="font-ui text-[10px] transition-colors" style={{ color: 'var(--color-text-faint)' }}>Remove</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center gap-4">
            <button onClick={resetToUpload} className="font-ui text-sm transition-colors" style={{ color: 'var(--color-text-faint)' }}>
              Upload another
            </button>
            {transactions.length > 0 && (
              <button
                onClick={handleConfirm}
                className="font-ui text-sm font-medium px-5 py-2.5 rounded-[12px] transition-colors"
                style={{ backgroundColor: 'var(--color-cta)', color: '#FFFFFF' }}
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
      className={`flex h-[calc(100vh-48px)] transition-all duration-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      {/* Left panel — instructions */}
      <div
        className="w-2/5 relative flex flex-col justify-center px-12 py-16 overflow-hidden"
        style={{
          borderRight: '1px solid rgba(0,0,0,0.07)',
          backgroundColor: 'rgba(0,0,0,0.03)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        {/* Dot grid background */}
        <div className="absolute inset-0 bg-dot-grid opacity-[0.35] pointer-events-none" />

        <div className="relative z-10 animate-fade-up">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 font-ui text-xs mb-10 transition-colors"
            style={{ color: 'var(--color-text-faint)' }}
          >
            ← Back
          </Link>

          <div
            className="w-10 h-10 rounded-[12px] flex items-center justify-center mb-5"
            style={{ backgroundColor: 'var(--color-cta)' }}
          >
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          </div>

          <h1 className="font-ui text-xl font-medium mb-3 tracking-tight" style={{ color: 'var(--color-text)' }}>Add position</h1>
          <p className="font-ui text-sm leading-relaxed mb-10" style={{ color: 'var(--color-text-muted)' }}>
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
                <span className="font-ui text-xs" style={{ color: 'var(--color-text-muted)' }}>{item.text}</span>
              </div>
            ))}
          </div>

          <p className="font-data text-xs mt-8" style={{ color: 'var(--color-text-faint)' }}>Max 10MB · JPG, PNG, WebP, PDF</p>
        </div>
      </div>

      {/* Right panel — drop zone */}
      <div className="w-3/5 flex flex-col justify-center px-16 py-16">
        {error && (
          <div className="mb-6 font-ui text-xs rounded-[12px] px-4 py-3 animate-fade-in" style={{ color: 'var(--color-loss)', backgroundColor: 'var(--color-loss-bg)' }}>
            {error}
          </div>
        )}

        <div
          className="border-dashed rounded-[20px] p-20 text-center cursor-pointer transition-all duration-200 animate-fade-up delay-100"
          style={{
            border: dragOver
              ? `2px dashed var(--color-cta)`
              : selectedFile
              ? `2px dashed var(--color-gain)`
              : `2px dashed var(--color-border-sub)`,
            backgroundColor: dragOver
              ? 'rgba(0,0,0,0.06)'
              : selectedFile
              ? 'var(--color-gain-bg)'
              : 'rgba(0,0,0,0.02)',
            transform: dragOver ? 'scale(1.01)' : 'scale(1)',
          }}
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
              <div className="w-10 h-10 rounded-[12px] flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: 'var(--color-gain)' }}>
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="font-ui text-sm font-medium mb-0.5" style={{ color: 'var(--color-text)' }}>{selectedFile.name}</p>
              <p className="font-data text-xs" style={{ color: 'var(--color-text-muted)' }}>{(selectedFile.size / 1024).toFixed(0)} KB · Ready to analyze</p>
            </div>
          ) : (
            <div>
              <div className="w-10 h-10 rounded-[12px] flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: 'var(--color-bg)' }}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--color-text-faint)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
              </div>
              <p className="font-ui text-sm mb-1" style={{ color: 'var(--color-text-muted)' }}>
                Drop your file here or{' '}
                <span className="font-medium underline underline-offset-2" style={{ color: 'var(--color-text)' }}>browse</span>
              </p>
              <p className="font-data text-xs" style={{ color: 'var(--color-text-faint)' }}>Supports JPG, PNG, WebP, PDF</p>
            </div>
          )}
        </div>

        {selectedFile && (
          <div className="flex items-center gap-4 mt-5 animate-fade-up">
            <button
              onClick={() => { setSelectedFile(null); setError(null) }}
              className="font-ui text-sm transition-colors"
              style={{ color: 'var(--color-text-faint)' }}
            >
              Clear
            </button>
            <button
              onClick={handleAnalyze}
              className="font-ui text-sm font-medium px-5 py-2.5 rounded-[12px] transition-colors"
              style={{ backgroundColor: 'var(--color-cta)', color: '#FFFFFF' }}
            >
              Analyze with AI →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
