'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { processVoucher, confirmVoucherTransactions, getPendingEmailImports } from '@/app/actions/voucher'
import { ExtractedTransaction, VoucherExtractionResult } from '@/types'

type Step = 'upload' | 'processing' | 'review' | 'confirming'

// Extends ExtractedTransaction with internal tracking fields (stripped before saving)
type MergedTransaction = ExtractedTransaction & {
  _fileImportId: string
  _fileName: string
  _source?: 'email' | 'upload'
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_FILES = 20
const MAX_SIZE = 10 * 1024 * 1024

export default function UploadPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>('upload')
  const [dragOver, setDragOver] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [skipNote, setSkipNote] = useState<string | null>(null)
  const [processingIndex, setProcessingIndex] = useState(0)
  const [processingFileName, setProcessingFileName] = useState('')
  const [mergedTransactions, setMergedTransactions] = useState<MergedTransaction[]>([])
  const [failedFiles, setFailedFiles] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [requiresReview, setRequiresReview] = useState(false)
  const [hasEmailPending, setHasEmailPending] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 20)
    return () => clearTimeout(t)
  }, [])

  // Load any pending email-detected transactions on mount
  useEffect(() => {
    getPendingEmailImports().then((pending) => {
      if (pending.length === 0) return

      const results: MergedTransaction[] = []
      let anyRequiresReview = false

      for (const imp of pending) {
        const extraction = imp.extracted_data as VoucherExtractionResult
        if (extraction.requires_review) anyRequiresReview = true
        for (const tx of extraction.transactions) {
          results.push({
            ...tx,
            _fileImportId: imp.id,
            _fileName: imp.file_name ?? 'Gmail',
            _source: 'email',
          })
        }
      }

      if (results.length > 0) {
        setMergedTransactions(results)
        setRequiresReview(anyRequiresReview)
        setHasEmailPending(true)
        setStep('review')
      }
    })
  }, [])

  function handleFiles(incoming: File[]) {
    let skipped = 0
    const valid: File[] = []

    for (const file of incoming) {
      if (!ALLOWED_TYPES.includes(file.type)) { skipped++; continue }
      if (file.size > MAX_SIZE) { skipped++; continue }
      valid.push(file)
    }

    setSelectedFiles((prev) => {
      const existing = new Set(prev.map((f) => `${f.name}:${f.size}`))
      let dupes = 0
      const fresh = valid.filter((f) => {
        const key = `${f.name}:${f.size}`
        if (existing.has(key)) { dupes++; return false }
        return true
      })

      const combined = [...prev, ...fresh].slice(0, MAX_FILES)
      const capped = prev.length + fresh.length > MAX_FILES
        ? prev.length + fresh.length - MAX_FILES
        : 0

      const notes: string[] = []
      if (skipped > 0) notes.push(`${skipped} file${skipped > 1 ? 's' : ''} skipped (unsupported type or >10MB)`)
      if (dupes > 0) notes.push(`${dupes} duplicate${dupes > 1 ? 's' : ''} skipped`)
      if (capped > 0) notes.push(`limited to ${MAX_FILES} files per batch`)
      if (notes.length > 0) setSkipNote(notes.join(' · '))

      return combined
    })
    setError(null)
  }

  function removeFile(index: number) {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    handleFiles(Array.from(e.dataTransfer.files))
  }

  async function handleAnalyze() {
    if (selectedFiles.length === 0) return
    const files = selectedFiles
    setStep('processing')
    setFailedFiles([])
    setError(null)

    const results: MergedTransaction[] = []
    const failed: string[] = []
    let anyRequiresReview = false

    for (let i = 0; i < files.length; i++) {
      setProcessingIndex(i + 1)
      setProcessingFileName(files[i].name)

      const formData = new FormData()
      formData.append('file', files[i])

      try {
        const result = await processVoucher(formData)
        if (result.extraction.requires_review) anyRequiresReview = true
        for (const tx of result.extraction.transactions) {
          results.push({ ...tx, _fileImportId: result.fileImportId, _fileName: files[i].name })
        }
      } catch {
        failed.push(files[i].name)
      }
    }

    setMergedTransactions(results)
    setFailedFiles(failed)
    setRequiresReview(anyRequiresReview)
    setStep('review')
  }

  async function handleConfirm() {
    if (mergedTransactions.length === 0) return
    setStep('confirming')
    setError(null)

    // Group transactions by fileImportId
    const groups = new Map<string, ExtractedTransaction[]>()
    for (const tx of mergedTransactions) {
      const { _fileImportId, _fileName, _source, ...clean } = tx
      if (!groups.has(_fileImportId)) groups.set(_fileImportId, [])
      groups.get(_fileImportId)!.push(clean)
    }

    try {
      for (const [fileImportId, txs] of Array.from(groups.entries())) {
        await confirmVoucherTransactions(fileImportId, txs)
      }
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setStep('review')
    }
  }

  function removeTransaction(index: number) {
    setMergedTransactions((prev) => prev.filter((_, i) => i !== index))
  }

  function updateTransaction(index: number, field: keyof ExtractedTransaction, value: string) {
    setMergedTransactions((prev) =>
      prev.map((tx, i) => {
        if (i !== index) return tx
        if (field === 'quantity' || field === 'price_per_share' || field === 'total_amount') {
          return { ...tx, [field]: parseFloat(value) || 0 }
        }
        return { ...tx, [field]: value }
      })
    )
  }

  const isMultiFile = selectedFiles.length > 1

  // ── Processing ───────────────────────────────────────────────────────────────
  if (step === 'processing') {
    const total = selectedFiles.length
    const pct = total > 0 ? Math.round(((processingIndex - 1) / total) * 100) : 0

    return (
      <div className="flex items-center justify-center h-[calc(100vh-48px)]" style={{ backgroundColor: 'var(--color-bg)' }}>
        <div className="text-center max-w-xs w-full">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-6" style={{ borderColor: 'var(--color-cta)', borderTopColor: 'transparent' }} />

          {total > 1 ? (
            <>
              <p className="font-ui text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                Analyzing file {processingIndex} of {total}
              </p>
              <p className="font-data text-xs truncate mb-5" style={{ color: 'var(--color-text-faint)' }}>{processingFileName}</p>
              {/* Progress bar */}
              <div className="w-full rounded-full overflow-hidden" style={{ height: 3, backgroundColor: 'var(--color-border-sub)' }}>
                <div
                  className="h-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: 'var(--color-cta)' }}
                />
              </div>
            </>
          ) : (
            <>
              <p className="font-ui text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Analyzing your file…</p>
              <p className="font-data text-xs mt-0.5 truncate max-w-[200px] mx-auto" style={{ color: 'var(--color-text-faint)' }}>{processingFileName}</p>
            </>
          )}
        </div>
      </div>
    )
  }

  // ── Confirming ───────────────────────────────────────────────────────────────
  if (step === 'confirming') {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-48px)]" style={{ backgroundColor: 'var(--color-bg)' }}>
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{ borderColor: 'var(--color-cta)', borderTopColor: 'transparent' }} />
          <p className="font-ui text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Saving transactions…</p>
        </div>
      </div>
    )
  }

  // ── Review step ──────────────────────────────────────────────────────────────
  if (step === 'review') {
    const totalTx = mergedTransactions.length

    return (
      <div className={`min-h-[calc(100vh-48px)] transition-all duration-500 ${mounted ? 'opacity-100' : 'opacity-0'}`} style={{ backgroundColor: 'var(--color-bg)' }}>
        <div className="px-8 py-8 max-w-6xl mx-auto animate-fade-up">
          <div className="mb-6">
            <button
              onClick={() => { setStep('upload'); setMergedTransactions([]); setFailedFiles([]); setHasEmailPending(false) }}
              className="font-ui text-xs mb-2 block transition-colors"
              style={{ color: 'var(--color-text-faint)' }}
            >
              ← Back
            </button>
            <h1 className="font-ui text-base font-medium tracking-tight" style={{ color: 'var(--color-text)' }}>
              Review extracted data
            </h1>
            {isMultiFile && totalTx > 0 && (
              <p className="font-ui text-xs mt-0.5" style={{ color: 'var(--color-text-faint)' }}>
                {totalTx} transaction{totalTx !== 1 ? 's' : ''} across {selectedFiles.length - failedFiles.length} file{selectedFiles.length - failedFiles.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* Email-detected banner */}
          {hasEmailPending && totalTx > 0 && (
            <div className="mb-5 font-ui text-xs rounded-[12px] px-4 py-3 flex items-start gap-2" style={{ color: 'var(--color-text)', backgroundColor: 'rgba(0,0,0,0.04)', border: '1px solid var(--color-border-sub)' }}>
              <span className="mt-0.5 flex-shrink-0">✉</span>
              <span>
                <span className="font-medium">Detected from Gmail.</span>{' '}
                Review the extracted data below and confirm to add to your portfolio.
              </span>
            </div>
          )}

          {/* Warnings */}
          {requiresReview && totalTx > 0 && (
            <div className="mb-5 font-ui text-xs rounded-[12px] px-4 py-3 flex items-start gap-2" style={{ color: 'var(--color-warn)', backgroundColor: 'var(--color-warn-bg)', border: '1px solid var(--color-warn-bg)' }}>
              <span className="mt-0.5 flex-shrink-0">⚠</span>
              <span>Some fields have low confidence — please review before confirming.</span>
            </div>
          )}

          {failedFiles.length > 0 && (
            <div className="mb-5 font-ui text-xs rounded-[12px] px-4 py-3" style={{ color: 'var(--color-loss)', backgroundColor: 'var(--color-loss-bg)' }}>
              {failedFiles.length} file{failedFiles.length > 1 ? 's' : ''} could not be read:{' '}
              <span className="opacity-80">{failedFiles.join(', ')}</span>
            </div>
          )}

          {error && (
            <div className="mb-5 font-ui text-xs rounded-[12px] px-4 py-3" style={{ color: 'var(--color-loss)', backgroundColor: 'var(--color-loss-bg)' }}>{error}</div>
          )}

          {totalTx === 0 && failedFiles.length === 0 && (
            <p className="font-ui text-sm text-center py-12" style={{ color: 'var(--color-text-muted)' }}>No transactions found.</p>
          )}

          {totalTx > 0 && (
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
                  {mergedTransactions.map((tx, index) => (
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
                        {isMultiFile && (
                          <div className="font-data text-[10px] px-1.5 mt-0.5 truncate max-w-[120px]" style={{ color: 'var(--color-text-faint)' }} title={tx._fileName}>
                            {tx._fileName}
                          </div>
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
                        <input type="number" step="any" className="w-20 font-data text-sm text-right bg-transparent border border-transparent rounded-[6px] px-1.5 py-0.5 outline-none transition-all" style={{ color: 'var(--color-text-muted)' }} value={tx.quantity} onChange={(e) => updateTransaction(index, 'quantity', e.target.value)} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <input type="number" step="any" className="w-20 font-data text-sm text-right bg-transparent border border-transparent rounded-[6px] px-1.5 py-0.5 outline-none transition-all" style={{ color: 'var(--color-text-muted)' }} value={tx.price_per_share} onChange={(e) => updateTransaction(index, 'price_per_share', e.target.value)} />
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
            <button
              onClick={() => { setStep('upload'); setMergedTransactions([]); setFailedFiles([]); setHasEmailPending(false) }}
              className="font-ui text-sm transition-colors"
              style={{ color: 'var(--color-text-faint)' }}
            >
              Cancel
            </button>

            {totalTx > 0 && (
              <button
                onClick={handleConfirm}
                className="font-ui text-sm font-medium px-5 py-2.5 rounded-[12px] transition-colors"
                style={{ backgroundColor: 'var(--color-cta)', color: '#FFFFFF' }}
              >
                Confirm {totalTx} transaction{totalTx !== 1 ? 's' : ''}
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Upload step ──────────────────────────────────────────────────────────────
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

          <h1 className="font-ui text-xl font-medium mb-3 tracking-tight" style={{ color: 'var(--color-text)' }}>Add positions</h1>
          <p className="font-ui text-sm leading-relaxed mb-10" style={{ color: 'var(--color-text-muted)' }}>
            Upload photos of your trade confirmations. Select multiple at once — we&apos;ll analyze them all and show you one table to review before saving.
          </p>

          <div className="space-y-2.5">
            {[
              { icon: '🖼️', text: 'Photo of your brokerage confirmation' },
              { icon: '📸', text: 'Screenshot of order summary' },
              { icon: '🗂️', text: 'Select multiple at once' },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-2.5">
                <span className="text-sm">{item.icon}</span>
                <span className="font-ui text-xs" style={{ color: 'var(--color-text-muted)' }}>{item.text}</span>
              </div>
            ))}
          </div>

          <p className="font-data text-xs mt-8" style={{ color: 'var(--color-text-faint)' }}>Max 10MB · JPG, PNG, WebP · Up to 20 files</p>
        </div>
      </div>

      {/* Right panel — drop zone + queue */}
      <div className="w-3/5 flex flex-col justify-center px-16 py-16">
        {(error || skipNote) && (
          <div className="mb-4 space-y-2 animate-fade-in">
            {error && (
              <div className="font-ui text-xs rounded-[12px] px-4 py-3" style={{ color: 'var(--color-loss)', backgroundColor: 'var(--color-loss-bg)' }}>
                {error}
              </div>
            )}
            {skipNote && (
              <div className="font-ui text-xs rounded-[12px] px-4 py-3" style={{ color: 'var(--color-text-muted)', backgroundColor: 'rgba(0,0,0,0.04)' }}>
                {skipNote}
              </div>
            )}
          </div>
        )}

        {/* Drop zone */}
        <div
          className="border-dashed rounded-[20px] p-12 text-center cursor-pointer transition-all duration-200 animate-fade-up delay-100"
          style={{
            border: dragOver
              ? `2px dashed var(--color-cta)`
              : selectedFiles.length > 0
              ? `2px dashed var(--color-gain)`
              : `2px dashed var(--color-border-sub)`,
            backgroundColor: dragOver
              ? 'rgba(0,0,0,0.06)'
              : selectedFiles.length > 0
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
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={(e) => { if (e.target.files) handleFiles(Array.from(e.target.files)); e.target.value = '' }}
          />

          {selectedFiles.length > 0 ? (
            <div className="animate-scale-in">
              <div className="w-10 h-10 rounded-[12px] flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: 'var(--color-gain)' }}>
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="font-ui text-sm font-medium mb-0.5" style={{ color: 'var(--color-text)' }}>
                {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} ready
              </p>
              <p className="font-data text-xs" style={{ color: 'var(--color-text-muted)' }}>Click to add more</p>
            </div>
          ) : (
            <div>
              <div className="w-10 h-10 rounded-[12px] flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: 'var(--color-bg)' }}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--color-text-faint)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
              </div>
              <p className="font-ui text-sm mb-1" style={{ color: 'var(--color-text-muted)' }}>
                Drop files here or{' '}
                <span className="font-medium underline underline-offset-2" style={{ color: 'var(--color-text)' }}>browse</span>
              </p>
              <p className="font-data text-xs" style={{ color: 'var(--color-text-faint)' }}>JPG, PNG, WebP · Select multiple</p>
            </div>
          )}
        </div>

        {/* File queue list */}
        {selectedFiles.length > 0 && (
          <div className="mt-4 space-y-1.5 animate-fade-up">
            {selectedFiles.map((file, i) => (
              <div
                key={`${file.name}:${file.size}:${i}`}
                className="flex items-center justify-between px-3 py-2 rounded-[10px]"
                style={{ backgroundColor: 'rgba(0,0,0,0.03)', border: '1px solid var(--color-border-sub)' }}
              >
                <span className="font-data text-xs truncate max-w-[260px]" style={{ color: 'var(--color-text-muted)' }}>{file.name}</span>
                <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                  <span className="font-data text-[10px]" style={{ color: 'var(--color-text-faint)' }}>{(file.size / 1024).toFixed(0)} KB</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeFile(i) }}
                    className="font-ui text-[10px] transition-colors"
                    style={{ color: 'var(--color-text-faint)' }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Action buttons */}
        {selectedFiles.length > 0 && (
          <div className="flex items-center gap-4 mt-5 animate-fade-up">
            <button
              onClick={() => { setSelectedFiles([]); setError(null); setSkipNote(null) }}
              className="font-ui text-sm transition-colors"
              style={{ color: 'var(--color-text-faint)' }}
            >
              Clear all
            </button>
            <button
              onClick={handleAnalyze}
              className="font-ui text-sm font-medium px-5 py-2.5 rounded-[12px] transition-colors"
              style={{ backgroundColor: 'var(--color-cta)', color: '#FFFFFF' }}
            >
              {selectedFiles.length > 1
                ? `Analyze ${selectedFiles.length} files with AI →`
                : 'Analyze with AI →'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
