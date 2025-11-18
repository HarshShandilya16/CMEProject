// frontend/src/data/marketConstants.ts

// Define the structure for Index keys
export type IndexKey = 'NIFTY' | 'BANKNIFTY' | 'FINNIFTY';

// Mapping of Index -> Constituent Stocks (35 Total Unique Stocks)
export const MARKET_INDICES: Record<IndexKey, string[]> = {
  'NIFTY': [
    'NIFTY', // The Index itself
    // Top 20 NIFTY stocks across all sectors
    'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK',
    'BHARTIARTL', 'ITC', 'SBIN', 'LT', 'HINDUNILVR',
    'KOTAKBANK', 'AXISBANK', 'MARUTI', 'TATAMOTORS', 'M&M',
    'SUNPHARMA', 'TITAN', 'WIPRO', 'HCLTECH', 'POWERGRID'
  ],
  'BANKNIFTY': [
    'BANKNIFTY', // The Index itself
    // Top 10 Banking & Finance stocks
    'HDFCBANK', 'ICICIBANK', 'SBIN', 'AXISBANK', 
    'KOTAKBANK', 'INDUSINDBK', 'BAJFINANCE', 'BAJAJFINSV',
    'BANDHANBNK', 'IDFCFIRSTB'
  ],
  'FINNIFTY': [
    'FINNIFTY', // The Index itself
    // Top 8 Financial Services stocks
    'BAJFINANCE', 'BAJAJFINSV', 'HDFCBANK', 'ICICIBANK', 
    'KOTAKBANK', 'SBILIFE', 'HDFCLIFE', 'BAJAJFINSV'
  ]
};

// Get all unique stocks (excluding indices themselves)
export const ALL_STOCKS = Array.from(
  new Set(
    Object.values(MARKET_INDICES)
      .flat()
      .filter(symbol => !['NIFTY', 'BANKNIFTY', 'FINNIFTY'].includes(symbol))
  )
).sort();

// Get all indices
export const ALL_INDICES: IndexKey[] = ['NIFTY', 'BANKNIFTY', 'FINNIFTY'];

// Get stocks for a specific index
export function getStocksForIndex(index: IndexKey): string[] {
  return MARKET_INDICES[index].filter(symbol => symbol !== index);
}

// Check if a symbol is an index
export function isIndex(symbol: string): symbol is IndexKey {
  return ALL_INDICES.includes(symbol as IndexKey);
}

// Get the parent index(es) for a stock
export function getIndicesForStock(stock: string): IndexKey[] {
  return ALL_INDICES.filter(index => 
    MARKET_INDICES[index].includes(stock)
  );
}

// Comprehensive Sector categorization (35 stocks across 10 sectors)
export const SECTOR_MAP: Record<string, string[]> = {
  'Banks & Finance': [
    'HDFCBANK', 'ICICIBANK', 'SBIN', 'AXISBANK', 
    'KOTAKBANK', 'INDUSINDBK', 'BAJFINANCE', 'BAJAJFINSV',
    'BANDHANBNK', 'IDFCFIRSTB'
  ],
  'IT & Technology': [
    'TCS', 'INFY', 'HCLTECH', 'WIPRO', 'TECHM'
  ],
  'Oil, Gas & Power': [
    'RELIANCE', 'BPCL', 'POWERGRID', 'NTPC'
  ],
  'FMCG & Consumer': [
    'ITC', 'HINDUNILVR', 'NESTLEIND', 'BRITANNIA'
  ],
  'Automobile': [
    'MARUTI', 'M&M', 'TATAMOTORS'
  ],
  'Metals & Mining': [
    'TATASTEEL', 'HINDALCO', 'JSWSTEEL'
  ],
  'Pharma & Healthcare': [
    'SUNPHARMA', 'DRREDDY'
  ],
  'Infrastructure & Cement': [
    'LT', 'ULTRACEMCO'
  ],
  'Telecom & Retail': [
    'BHARTIARTL', 'TITAN'
  ],
  'Insurance & Financial Services': [
    'SBILIFE', 'HDFCLIFE'
  ]
};

// Get sector for a stock
export function getSectorForStock(stock: string): string | null {
  for (const [sector, stocks] of Object.entries(SECTOR_MAP)) {
    if (stocks.includes(stock)) {
      return sector;
    }
  }
  return null;
}

// Get all stocks in a sector
export function getStocksInSector(sector: string): string[] {
  return SECTOR_MAP[sector] || [];
}

// Get index constituents count
export function getIndexConstituentsCount(index: IndexKey): number {
  return MARKET_INDICES[index].length - 1; // Exclude the index itself
}

// Display helper - Get formatted index name
export function getIndexDisplayName(index: IndexKey): string {
  const names: Record<IndexKey, string> = {
    'NIFTY': 'NIFTY 50',
    'BANKNIFTY': 'BANK NIFTY',
    'FINNIFTY': 'FINNIFTY'
  };
  return names[index];
}

// Helper to get total unique stock count
export function getTotalStockCount(): number {
  return ALL_STOCKS.length;
}

// Helper to check if backend should track this symbol
export function shouldTrackSymbol(symbol: string): boolean {
  return ALL_INDICES.includes(symbol as IndexKey) || ALL_STOCKS.includes(symbol);
}

// Get stock display metadata
export function getStockMetadata(symbol: string): {
  sector: string | null;
  indices: IndexKey[];
  displayName: string;
} {
  return {
    sector: getSectorForStock(symbol),
    indices: getIndicesForStock(symbol),
    displayName: symbol
  };
}