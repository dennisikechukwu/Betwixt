// Base types from Polymarket API
export interface PolymarketMarket {
  id: string;
  question: string;
  slug: string;
  outcomes: string; // Stringified JSON array
  outcomePrices: string; // Stringified JSON array
  volume: string;
  volume24hr: string;
  liquidity: string;
  startDate: string;
  endDate: string;
  image?: string;
  enableOrderBook: boolean;
  active: boolean;
  closed: boolean;
}

export interface PolymarketEvent {
  id: string;
  title: string;
  slug: string;
  markets: PolymarketMarket[];
  startDate: string;
  endDate: string;
  volume: string;
  volume24hr: string;
  liquidity: string;
  active: boolean;
  closed: boolean;
  series?: {
    name: string;
    slug: string;
  };
  tags?: Array<{
    id: string;
    label: string;
    slug: string;
  }>;
}

// Our processed/UI types
export interface OutcomeWithPrice {
  outcome: string;
  price: string; // Formatted percentage (e.g., "65%")
  rawPrice: number; // 0-1 value for calculations
  tokenId?: string;
}

export interface ProcessedMarket extends Omit<PolymarketMarket, 'outcomes' | 'outcomePrices'> {
  outcomes: OutcomeWithPrice[];
  yesPrice?: number;
  noPrice?: number;
  tokenIds?: string[]; // Parsed CLOB token IDs for price history & order book
}

export interface ProcessedEvent extends Omit<PolymarketEvent, 'markets'> {
  markets: ProcessedMarket[];
}

// API Response types
export interface ApiResponse<T> {
  data: T[];
  meta?: {
    limit: number;
    offset: number;
    total: number;
  };
}

// Filter/Query types
export interface MarketFilters {
  active?: boolean;
  closed?: boolean;
  limit?: number;
  offset?: number;
  order?: 'volume_24hr' | 'volume' | 'liquidity' | 'start_date' | 'end_date';
  ascending?: boolean;
  tag_id?: string;
  slug?: string;
}

export interface PriceHistoryPoint {
  t: number; // timestamp
  p: number; // price
}

export interface MarketDetails extends ProcessedMarket {
  description?: string;
  resolutionSource?: string;
  resolutionCriteria?: string;
  tags?: Array<{ id: string; label: string; slug: string }>;
  priceHistory?: PriceHistoryPoint[];
  volume24hr: string;
  liquidity: string;
  startDate: string;
  endDate: string;
}

export interface OrderBookEntry {
  price: number;
  size: number;
}

export interface OrderBook {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
}
