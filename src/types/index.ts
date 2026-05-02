// ============================================================
// Types globales del proyecto
// ============================================================

// --- Base ---
export type Market = "US"; // v2: 'BVL' | 'MX' | ...
export type AssetType = "stock" | "etf";
export type TransactionType = "buy" | "sell";

// --- Supabase DB types ---

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface Portfolio {
  id: string;
  user_id: string;
  name: string;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface Position {
  id: string;
  portfolio_id: string;
  user_id: string;
  ticker: string;
  company_name: string | null;
  asset_type: AssetType;
  market: Market;
  quantity: number;
  avg_buy_price: number;
  total_invested: number;
  total_fees: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  portfolio_id: string;
  user_id: string;
  position_id: string | null;
  ticker: string;
  transaction_type: TransactionType;
  quantity: number;
  price_per_share: number;
  total_amount: number;
  transaction_date: string;
  notes: string | null;
  source: "manual" | "voucher" | "excel";
  source_file_url: string | null;
  created_at: string;
}

export interface PriceCache {
  ticker: string;
  current_price: number;
  price_change: number | null;
  price_change_pct: number | null;
  previous_close: number | null;
  market_status: "open" | "closed" | "pre" | "post";
  fetched_at: string;
  source: "alpaca" | "finnhub";
}

export interface DailySummary {
  id: string;
  user_id: string;
  portfolio_id: string;
  summary_date: string;
  total_value_usd: number | null;
  total_change_usd: number | null;
  total_change_pct: number | null;
  summary_text: string;
  top_movers: TopMover[] | null;
  what_to_do: WhatToDo[] | null;
  was_sent: boolean;
  sent_at: string | null;
  created_at: string;
}

export interface Alert {
  id: string;
  user_id: string;
  portfolio_id: string;
  ticker: string;
  alert_type: "price_move" | "news" | "earnings";
  trigger_value: number | null;
  title: string;
  body: string;
  is_read: boolean;
  was_sent: boolean;
  sent_at: string | null;
  created_at: string;
}

export interface NotificationPreferences {
  user_id: string;
  daily_summary_enabled: boolean;
  daily_summary_time: string;
  price_alert_enabled: boolean;
  price_alert_threshold: number;
  news_alert_enabled: boolean;
  email_enabled: boolean;
  updated_at: string;
}

export interface FileImport {
  id: string;
  user_id: string;
  file_name: string;
  file_type: "voucher_image" | "voucher_pdf" | "excel";
  file_url: string;
  status: "pending" | "success" | "partial" | "failed";
  extracted_data: ExtractedTransaction[] | null;
  error_message: string | null;
  transactions_created: number;
  created_at: string;
  processed_at: string | null;
}

// --- Claude API output types ---

export interface ExtractedTransaction {
  ticker: string;
  ticker_confidence: number;
  company_name: string | null;
  transaction_type: TransactionType;
  quantity: number;
  quantity_confidence: number;
  price_per_share: number;
  price_confidence: number;
  total_amount: number;
  transaction_date: string;
  date_confidence: number;
  broker: string | null;
  clearance_fee: number | null;
  fee_confidence: number;
  notes: string | null;
  warnings: string[];
}

export interface VoucherExtractionResult {
  transactions: ExtractedTransaction[];
  extraction_notes: string;
  requires_review: boolean;
}

export interface ExtractedPosition {
  ticker: string;
  ticker_confidence: number;
  company_name: string | null;
  quantity: number;
  quantity_confidence: number;
  avg_buy_price: number;
  price_confidence: number;
  first_purchase_date: string | null;
  date_confidence: number;
  warnings: string[];
}

export interface ExcelParseResult {
  positions: ExtractedPosition[];
  columns_detected: Record<string, string>;
  rows_processed: number;
  rows_skipped: number;
  skipped_reasons: string[];
  requires_review: boolean;
}

export interface TopMover {
  ticker: string;
  change_pct: number;
  change_usd_portfolio: number;
  reason: string;
  sentiment: "positive" | "negative" | "neutral";
}

export interface WhatToDoOption {
  label: string;
  rationale: string;
}

export interface WhatToDo {
  ticker: string;
  options: WhatToDoOption[];
}

export interface DailySummaryResult {
  summary_text: string;
  top_movers: TopMover[];
  what_to_do: WhatToDo[];
}

export interface AlertResult {
  title: string;
  body: string;
  alert_type: "price_move" | "news" | "earnings";
  severity: "low" | "medium" | "high";
}

// --- Dashboard types (computed en runtime, no en DB) ---

export interface PositionWithPrice extends Position {
  current_price: number;
  price_change: number | null;
  price_change_pct: number | null;
  unrealized_gain: number;
  unrealized_gain_pct: number;
  current_value: number;
  weight_pct: number;
}

export interface PortfolioSummary {
  total_value_usd: number;
  total_invested_usd: number;
  total_change_usd: number;
  total_change_pct: number;
  unrealized_gain: number;
  unrealized_gain_pct: number;
}
