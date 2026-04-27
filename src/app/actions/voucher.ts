'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { extractVoucher } from '@/lib/claude/voucher-extractor'
import { ExtractedTransaction, VoucherExtractionResult } from '@/types'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] as const
type AllowedType = (typeof ALLOWED_TYPES)[number]

function isAllowedType(type: string): type is AllowedType {
  return (ALLOWED_TYPES as readonly string[]).includes(type)
}

export async function processVoucher(
  formData: FormData
): Promise<{ fileImportId: string; extraction: VoucherExtractionResult }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const file = formData.get('file') as File | null
  if (!file) throw new Error('No file provided')

  if (!isAllowedType(file.type)) {
    throw new Error('File type not supported. Use JPG, PNG, WebP, or PDF.')
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('File too large. Maximum size is 10MB.')
  }

  const fileBuffer = Buffer.from(await file.arrayBuffer())
  const fileExt = file.name.split('.').pop() ?? 'jpg'
  const storagePath = `${user.id}/${Date.now()}.${fileExt}`

  const { error: storageError } = await supabase.storage
    .from('vouchers')
    .upload(storagePath, fileBuffer, { contentType: file.type })

  if (storageError) throw new Error(`Upload failed: ${storageError.message}`)

  const {
    data: { publicUrl },
  } = supabase.storage.from('vouchers').getPublicUrl(storagePath)

  const fileType = file.type === 'application/pdf' ? 'voucher_pdf' : 'voucher_image'

  const { data: fileImport, error: importError } = await supabase
    .from('file_imports')
    .insert({
      user_id: user.id,
      file_name: file.name,
      file_type: fileType,
      file_url: publicUrl,
      status: 'pending',
    })
    .select()
    .single()

  if (importError || !fileImport) throw new Error(`Failed to create import record: ${importError?.message}`)

  let extraction: VoucherExtractionResult
  try {
    extraction = await extractVoucher(fileBuffer, file.type as AllowedType)
  } catch (err) {
    await supabase
      .from('file_imports')
      .update({
        status: 'failed',
        error_message: String(err),
        processed_at: new Date().toISOString(),
      })
      .eq('id', fileImport.id)
    throw err
  }

  await supabase
    .from('file_imports')
    .update({
      extracted_data: extraction,
      status: 'pending',
      processed_at: new Date().toISOString(),
    })
    .eq('id', fileImport.id)

  return { fileImportId: fileImport.id, extraction }
}

export async function confirmVoucherTransactions(
  fileImportId: string,
  transactions: ExtractedTransaction[]
): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  let { data: portfolio } = await supabase
    .from('portfolios')
    .select('id')
    .eq('user_id', user.id)
    .single()

  // Auto-create portfolio if it doesn't exist (e.g. legacy accounts)
  if (!portfolio) {
    const { data: created, error: createError } = await supabase
      .from('portfolios')
      .insert({ user_id: user.id, name: 'My portfolio' })
      .select('id')
      .single()
    if (createError || !created) throw new Error('Failed to create portfolio')
    portfolio = created
  }

  const { data: fileImport } = await supabase
    .from('file_imports')
    .select('file_url')
    .eq('id', fileImportId)
    .single()

  for (const tx of transactions) {
    const { data: existing } = await supabase
      .from('positions')
      .select('id, quantity, avg_buy_price, total_invested')
      .eq('portfolio_id', portfolio.id)
      .eq('ticker', tx.ticker)
      .maybeSingle()

    let positionId: string

    if (existing) {
      const newQuantity = Number(existing.quantity) + tx.quantity
      const newTotalInvested = Number(existing.total_invested) + tx.total_amount
      const newAvgPrice = newTotalInvested / newQuantity

      const { data: updated } = await supabase
        .from('positions')
        .update({
          quantity: newQuantity,
          avg_buy_price: newAvgPrice,
          total_invested: newTotalInvested,
          ...(tx.company_name ? { company_name: tx.company_name } : {}),
          is_active: true,
        })
        .eq('id', existing.id)
        .select('id')
        .single()

      positionId = updated!.id
    } else {
      const { data: created } = await supabase
        .from('positions')
        .insert({
          portfolio_id: portfolio.id,
          user_id: user.id,
          ticker: tx.ticker,
          company_name: tx.company_name ?? null,
          asset_type: 'stock',
          market: 'US',
          quantity: tx.quantity,
          avg_buy_price: tx.price_per_share,
          total_invested: tx.total_amount,
        })
        .select('id')
        .single()

      positionId = created!.id
    }

    await supabase.from('transactions').insert({
      portfolio_id: portfolio.id,
      user_id: user.id,
      position_id: positionId,
      ticker: tx.ticker,
      transaction_type: tx.transaction_type,
      quantity: tx.quantity,
      price_per_share: tx.price_per_share,
      total_amount: tx.total_amount,
      transaction_date: tx.transaction_date,
      notes: tx.notes ?? null,
      source: 'voucher',
      source_file_url: fileImport?.file_url ?? null,
    })
  }

  await supabase
    .from('file_imports')
    .update({
      status: 'success',
      transactions_created: transactions.length,
    })
    .eq('id', fileImportId)

  revalidatePath('/dashboard')
}
