'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { processVoucher, confirmVoucherTransactions } from '@/app/actions/voucher'
import { ExtractedTransaction, VoucherExtractionResult } from '@/types'

type Step = 'upload' | 'processing' | 'review' | 'confirming'

const CIRCLES = [
  { left: '8%',  top: '12%', size: 120 },
  { left: '63%', top: '7%',  size: 58  },
  { left: '78%', top: '50%', size: 150 },
  { left: '20%', top: '60%', size: 85  },
  { left: '52%', top: '74%', size: 68  },
  { left: '34%', top: '34%', size: 38  },
  { left: '4%',  top: '80%', size: 100 },
  { left: '84%', top: '24%', size: 50  },
  { left: '46%', top: '91%', size: 32  },
  { left: '70%', top: '85%', size: 44  },
]

function ScatterBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {CIRCLES.map((c, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-black"
          style={{
            left: c.left,
            top: c.top,
            width: c.size,
            height: c.size,
            opacity: 0.04 + (i % 3) * 0.012,
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}
    </div>
  )
}

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
      <div className="flex items-center justify-center h-[calc(100vh-48px)]">
        <div className="text-center">
          <div className="w-5 h-5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-gray-400">
            {step === 'processing' ? 'Analyzing your file...' : 'Saving transactions...'}
          </p>
        </div>
      </div>
    )
  }

  // ── Review step ─────────────────────────────────────────────────────────────
  if (step === 'review' && extraction) {
    return (
      <div className={`px-8 py-8 max-w-4xl mx-auto transition-all duration-400 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}`}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <button onClick={resetToUpload} className="text-xs text-gray-400 hover:text-gray-900 transition-colors mb-2 block">← Back</button>
            <h1 className="text-sm font-medium text-gray-900">Review extracted data</h1>
            {extraction.extraction_notes && (
              <p className="text-xs text-gray-400 mt-0.5">{extraction.extraction_notes}</p>
            )}
          </div>
        </div>

        {extraction.requires_review && (
          <div className="mb-4 text-xs text-amber-600 border border-amber-200 rounded-lg px-3 py-2 bg-amber-50">
            Some fields have low confidence — please review before confirming.
          </div>
        )}

        {error && (
          <div className="mb-4 text-xs text-red-500 border border-red-100 rounded-lg px-3 py-2">{error}</div>
        )}

        {transactions.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">No transactions found.</p>
        ) : (
          <div className="border border-gray-100 rounded-xl overflow-hidden mb-6">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
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
                      className={`text-[10px] font-medium text-gray-400 uppercase tracking-widest px-4 py-3 text-${h.align}`}
                    >
                      {h.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx, index) => (
                  <tr key={index} className="border-b border-gray-50 last:border-0 align-middle">
                    <td className="px-4 py-3">
                      <input
                        className="w-20 text-sm font-medium text-gray-900 border border-transparent rounded px-1 py-0.5 hover:border-gray-200 focus:border-gray-400 focus:outline-none uppercase"
                        value={tx.ticker}
                        onChange={(e) => updateTransaction(index, 'ticker', e.target.value.toUpperCase())}
                      />
                      {tx.warnings.length > 0 && (
                        <div className="text-[10px] text-amber-500 px-1 mt-0.5">{tx.warnings[0]}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={tx.transaction_type}
                        onChange={(e) => updateTransaction(index, 'transaction_type', e.target.value)}
                        className={`text-xs rounded px-2 py-1 border-0 focus:outline-none cursor-pointer ${
                          tx.transaction_type === 'buy' ? 'text-green-700 bg-green-50' : 'text-red-600 bg-red-50'
                        }`}
                      >
                        <option value="buy">buy</option>
                        <option value="sell">sell</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <input type="number" step="any" className="w-24 text-sm text-gray-600 text-right border border-transparent rounded px-1 py-0.5 hover:border-gray-200 focus:border-gray-400 focus:outline-none" value={tx.quantity} onChange={(e) => updateTransaction(index, 'quantity', e.target.value)} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <input type="number" step="any" className="w-24 text-sm text-gray-600 text-right border border-transparent rounded px-1 py-0.5 hover:border-gray-200 focus:border-gray-400 focus:outline-none" value={tx.price_per_share} onChange={(e) => updateTransaction(index, 'price_per_share', e.target.value)} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <input type="number" step="any" className="w-24 text-sm font-medium text-gray-900 text-right border border-transparent rounded px-1 py-0.5 hover:border-gray-200 focus:border-gray-400 focus:outline-none" value={tx.total_amount} onChange={(e) => updateTransaction(index, 'total_amount', e.target.value)} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <input
                        type="date"
                        className={`text-sm text-right border rounded px-1 py-0.5 focus:outline-none focus:border-gray-400 ${
                          !tx.transaction_date ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-transparent hover:border-gray-200 text-gray-600'
                        }`}
                        value={tx.transaction_date ?? ''}
                        onChange={(e) => updateTransaction(index, 'transaction_date', e.target.value)}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => removeTransaction(index)} className="text-[10px] text-gray-300 hover:text-red-400 transition-colors">Remove</button>
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
              className="text-sm font-medium text-white bg-black px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              Confirm {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
            </button>
          )}
        </div>
      </div>
    )
  }

  // ── Upload step ─────────────────────────────────────────────────────────────
  return (
    <div
      className={`flex h-[calc(100vh-48px)] transition-all duration-500 ${
        mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      }`}
    >
      {/* Left 40% — instructions + scatter */}
      <div className="w-2/5 relative bg-gray-50 flex flex-col justify-center px-12 py-16 overflow-hidden border-r border-gray-100">
        <ScatterBackground />
        <div className="relative z-10">
          <Link href="/dashboard" className="text-xs text-gray-400 hover:text-gray-900 transition-colors mb-10 block">
            ← Back
          </Link>
          <h1 className="text-xl font-medium text-gray-900 mb-3">Add position</h1>
          <p className="text-sm text-gray-500 leading-relaxed mb-10">
            Upload a photo or PDF of your trade confirmation. We&apos;ll extract the details automatically — you can review and edit before saving.
          </p>
          <div className="space-y-2">
            {['Photo of your brokerage confirmation', 'PDF trade receipt', 'Screenshot of order summary'].map((item) => (
              <div key={item} className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-gray-300 flex-shrink-0" />
                <span className="text-xs text-gray-400">{item}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-300 mt-8">Max 10MB · JPG, PNG, WebP, PDF</p>
        </div>
      </div>

      {/* Right 60% — upload form */}
      <div className="w-3/5 flex flex-col justify-center px-16 py-16 bg-white">
        {error && (
          <div className="mb-6 text-xs text-red-500 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <div
          className={`border border-dashed rounded-xl p-20 text-center cursor-pointer transition-colors mb-6 ${
            dragOver ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:border-gray-400'
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
            <div>
              <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center mx-auto mb-3">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
              <p className="text-xs text-gray-400 mt-1">{(selectedFile.size / 1024).toFixed(0)} KB</p>
            </div>
          ) : (
            <div>
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>
              <p className="text-sm text-gray-600">
                Drop your file here or <span className="text-gray-900 underline underline-offset-2">browse</span>
              </p>
            </div>
          )}
        </div>

        {selectedFile && (
          <div className="flex items-center gap-4">
            <button
              onClick={() => { setSelectedFile(null); setError(null) }}
              className="text-sm text-gray-400 hover:text-gray-900 transition-colors"
            >
              Clear
            </button>
            <button
              onClick={handleAnalyze}
              className="text-sm font-medium text-white bg-black px-5 py-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              Analyze
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
