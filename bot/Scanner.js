const RSIStrategy = require('./strategies/RSIStrategy');

class Scanner {
  constructor(alpacaService, krakenService, strategy) {
    this.alpacaService = alpacaService;
    this.krakenService = krakenService;
    this.strategy = strategy || new RSIStrategy();

    console.log('🔍 Scanner initialized');
  }

  /**
   * Scan a single stock
   * @param {string} symbol - Stock symbol
   * @returns {Object|null} Signal data or null if error
   */
  async scanStock(symbol) {
    try {
      // Get historical data
      const historicalData = await this.alpacaService.getHistoricalData(symbol, 100);

      if (historicalData.length < 20) {
        return null; // Not enough data
      }

      // Get current price
      const currentPrice = await this.alpacaService.getCurrentPrice(symbol);

      if (!currentPrice) {
        return null;
      }

      // Analyze with RSI strategy
      const analysis = this.strategy.analyze(historicalData);

      return {
        symbol: symbol,
        exchange: 'Alpaca',
        type: 'stock',
        currentPrice: currentPrice,
        rsi: parseFloat(analysis.rsi),
        signal: analysis.signal,
        strength: analysis.strength,
        timestamp: new Date()
      };
    } catch (error) {
      console.error(`Error scanning ${symbol}:`, error.message);
      return null;
    }
  }

  /**
   * Scan a single crypto pair
   * @param {Object} cryptoConfig - Crypto config with symbol and fallback
   * @returns {Object|null} Signal data or null if error
   */
  async scanCrypto(cryptoConfig) {
    try {
      // Get available symbol (with fallback)
      const symbol = await this.krakenService.getAvailableSymbol(
        cryptoConfig.symbol,
        cryptoConfig.fallback
      );

      if (!symbol) {
        return null; // Symbol not available
      }

      // Get historical data
      const historicalData = await this.krakenService.getHistoricalData(symbol, 100);

      if (historicalData.length < 20) {
        return null; // Not enough data
      }

      // Get current price
      const currentPrice = await this.krakenService.getCurrentPrice(symbol);

      if (!currentPrice) {
        return null;
      }

      // Analyze with RSI strategy
      const analysis = this.strategy.analyze(historicalData);

      return {
        symbol: symbol,
        exchange: 'Kraken',
        type: 'crypto',
        currentPrice: currentPrice,
        rsi: parseFloat(analysis.rsi),
        signal: analysis.signal,
        strength: analysis.strength,
        timestamp: new Date()
      };
    } catch (error) {
      console.error(`Error scanning ${cryptoConfig.symbol}:`, error.message);
      return null;
    }
  }

  /**
   * Scan all stocks in parallel
   * @param {Array} stockSymbols - Array of stock symbols
   * @returns {Array} Array of signals
   */
  async scanStocks(stockSymbols) {
    console.log(`🔍 Scanning ${stockSymbols.length} stocks...`);

    const promises = stockSymbols.map(symbol => this.scanStock(symbol));
    const results = await Promise.allSettled(promises);

    // Filter out failed scans and null results
    const signals = results
      .filter(result => result.status === 'fulfilled' && result.value !== null)
      .map(result => result.value);

    console.log(`✅ Scanned ${signals.length}/${stockSymbols.length} stocks successfully`);

    return signals;
  }

  /**
   * Scan all crypto pairs in parallel
   * @param {Array} cryptoConfigs - Array of crypto configs
   * @returns {Array} Array of signals
   */
  async scanCryptos(cryptoConfigs) {
    console.log(`🔍 Scanning ${cryptoConfigs.length} crypto pairs...`);

    const promises = cryptoConfigs.map(config => this.scanCrypto(config));
    const results = await Promise.allSettled(promises);

    // Filter out failed scans and null results
    const signals = results
      .filter(result => result.status === 'fulfilled' && result.value !== null)
      .map(result => result.value);

    console.log(`✅ Scanned ${signals.length}/${cryptoConfigs.length} crypto pairs successfully`);

    return signals;
  }

  /**
   * Scan all assets (stocks + crypto)
   * @param {Array} stockSymbols - Array of stock symbols
   * @param {Array} cryptoConfigs - Array of crypto configs
   * @returns {Object} Object with all signals categorized
   */
  async scanAll(stockSymbols, cryptoConfigs) {
    console.log(`\n🚀 Starting full market scan (${stockSymbols.length + cryptoConfigs.length} assets)...`);

    const startTime = Date.now();

    // Scan stocks and crypto in parallel
    const [stockSignals, cryptoSignals] = await Promise.all([
      this.scanStocks(stockSymbols),
      this.scanCryptos(cryptoConfigs)
    ]);

    const allSignals = [...stockSignals, ...cryptoSignals];

    // Categorize signals
    const buySignals = allSignals.filter(s => s.signal === 'BUY');
    const sellSignals = allSignals.filter(s => s.signal === 'SELL');

    // Sort by strength
    const topBuySignals = buySignals.sort((a, b) => b.strength - a.strength);
    const topSellSignals = sellSignals.sort((a, b) => b.strength - a.strength);

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`✅ Scan complete in ${duration}s`);
    console.log(`   📊 Total signals: ${allSignals.length}`);
    console.log(`   📈 BUY signals: ${buySignals.length}`);
    console.log(`   📉 SELL signals: ${sellSignals.length}`);

    if (topBuySignals.length > 0) {
      console.log(`   🎯 Best BUY: ${topBuySignals[0].symbol} (RSI: ${topBuySignals[0].rsi}, Strength: ${topBuySignals[0].strength.toFixed(0)})`);
    }

    return {
      all: allSignals,
      buy: topBuySignals,
      sell: topSellSignals,
      stats: {
        total: allSignals.length,
        buyCount: buySignals.length,
        sellCount: sellSignals.length,
        duration: duration
      }
    };
  }

  /**
   * Find best trading opportunities
   * @param {Array} signals - Array of signals
   * @param {number} minStrength - Minimum signal strength
   * @param {number} limit - Max number of signals to return
   * @returns {Array} Top signals
   */
  findBestOpportunities(signals, minStrength = 30, limit = 5) {
    return signals
      .filter(s => s.strength >= minStrength && s.signal !== 'HOLD')
      .sort((a, b) => b.strength - a.strength)
      .slice(0, limit);
  }
}

module.exports = Scanner;
