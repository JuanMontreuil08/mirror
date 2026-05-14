import { VoucherExtractionResult } from '@/types'

// xAI API — OpenAI-compatible endpoint
const XAI_API_URL = 'https://api.x.ai/v1/chat/completions'
const MODEL = 'grok-4.20-0309-non-reasoning' // update if xAI uses a date-suffixed ID e.g. grok-4-0420

const SYSTEM_PROMPT = `You are a specialist in extracting data from stock purchase receipts and brokerage confirmations.

Your only task is to read the provided document and extract the transaction data as JSON. Nothing else.

STRICT RULES:
- Return ONLY the JSON. No introductory text, no explanations, no markdown code blocks.
- If a field is not present in the document, use null. Never invent data.
- The ticker must be in standard US format (e.g. NVDA, QQQ, KO, META). If you see a full company name, convert it to the correct ticker.
- Dates must be in ISO 8601 format: YYYY-MM-DD.
- Prices always in USD as a decimal number without currency symbol.
- The "confidence" field per item ranges from 0 to 1: use 1.0 if the data is explicit and clear, 0.7 if you infer it with high certainty, 0.4 if it is an estimate, 0 if you cannot determine it.

RESPONSE FORMAT:
{
  "transactions": [
    {
      "ticker": "NVDA",
      "ticker_confidence": 0.95,
      "company_name": "NVIDIA Corporation",
      "transaction_type": "buy",
      "quantity": 5,
      "quantity_confidence": 1.0,
      "price_per_share": 118.42,
      "price_confidence": 1.0,
      "total_amount": 592.10,
      "transaction_date": "2024-11-15",
      "date_confidence": 1.0,
      "broker": "Interactive Brokers",
      "clearance_fee": 0.15,
      "fee_confidence": 1.0,
      "notes": null,
      "warnings": []
    }
  ],
  "extraction_notes": "2 transactions detected in the receipt.",
  "requires_review": false
}

"clearance_fee": The broker clearance/settlement fee in USD. Typically appears between the quantity and the average price fields on the receipt. Use null if not present, not 0.
"fee_confidence": Confidence for the clearance_fee field (0–1). Use 1.0 if explicit, 0.7 if inferred, 0 if absent.

"warnings" field: List of strings describing any ambiguity found. Examples:
- "Price per share not explicit — calculated by dividing total by quantity."
- "Date appeared in DD/MM/YY format, interpreted as November 15, 2024."
- "Ticker not in document — inferred from company name 'Apple Inc.'."

"requires_review": true if any field has confidence < 0.7 or if there are significant warnings.

If the document is not a stock purchase receipt, return:
{
  "transactions": [],
  "extraction_notes": "The document does not appear to be a stock purchase receipt.",
  "requires_review": true
}`

type SupportedMediaType = 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf'

export async function extractVoucher(
  fileBuffer: Buffer,
  mediaType: SupportedMediaType
): Promise<VoucherExtractionResult> {
  const apiKey = process.env.XAI_API_KEY
  if (!apiKey) throw new Error('XAI_API_KEY is not set')

  const base64Data = fileBuffer.toString('base64')
  const dataUri = `data:${mediaType};base64,${base64Data}`

  const body = {
    model: MODEL,
    max_tokens: 1500,
    messages: [
      {
        role: 'system',
        content: SYSTEM_PROMPT,
      },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: dataUri },
          },
          {
            type: 'text',
            text: 'Extract the transaction data from this stock purchase receipt.',
          },
        ],
      },
    ],
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30_000)

  let response: Response
  try {
    response = await fetch(XAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      throw new Error('Extraction timed out after 30 seconds.')
    }
    throw err
  } finally {
    clearTimeout(timeout)
  }

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`xAI API error ${response.status}: ${err}`)
  }

  const data = await response.json()
  const raw: string = data.choices?.[0]?.message?.content ?? ''

  try {
    return JSON.parse(raw) as VoucherExtractionResult
  } catch {
    const match = raw.match(/\{[\s\S]*\}/)
    if (match) return JSON.parse(match[0]) as VoucherExtractionResult
    throw new Error('Model did not return valid JSON')
  }
}
