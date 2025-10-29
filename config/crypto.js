// Top 10 cryptocurrencies
// Format: symbol/quote (e.g., BTC/EUR)
// If EUR pair not available on Kraken, will auto-fallback to USD
module.exports = [
  { symbol: 'BTC/EUR', fallback: 'BTC/USD' },
  { symbol: 'ETH/EUR', fallback: 'ETH/USD' },
  { symbol: 'USDT/EUR', fallback: 'USDT/USD' },
  { symbol: 'BNB/EUR', fallback: 'BNB/USD' },
  { symbol: 'SOL/EUR', fallback: 'SOL/USD' },
  { symbol: 'XRP/EUR', fallback: 'XRP/USD' },
  { symbol: 'USDC/EUR', fallback: 'USDC/USD' },
  { symbol: 'ADA/EUR', fallback: 'ADA/USD' },
  { symbol: 'DOGE/EUR', fallback: 'DOGE/USD' },
  { symbol: 'TRX/EUR', fallback: 'TRX/USD' }
];
