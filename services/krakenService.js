const ccxt = require('ccxt');

class KrakenService {
  constructor() {
    this.exchange = new ccxt.kraken({
      apiKey: process.env.KRAKEN_API_KEY,
      secret: process.env.KRAKEN_SECRET_KEY,
      enableRateLimit: true
    });

    console.log('🔷 Kraken initialized via CCXT');
  }

  /**
   * Test connection to Kraken
   */
  async testConnection() {
    try {
      const balance = await this.exchange.fetchBalance();
      console.log('✅ Kraken connected successfully');
      return true;
    } catch (error) {
      console.error('❌ Kraken connection failed:', error.message);
      return false;
    }
  }

  /**
   * Get account balance
   */
  async getBalance() {
    try {
      const balance = await this.exchange.fetchBalance();

      // Calculate total in EUR
      let totalEUR = 0;
      if (balance.total.EUR) totalEUR += balance.total.EUR;
      if (balance.total.USD) totalEUR += balance.total.USD * 0.92; // Rough conversion

      return {
        exchange: 'Kraken',
        total: totalEUR,
        free: balance.free,
        used: balance.used
      };
    } catch (error) {
      console.error('Error getting Kraken balance:', error.message);
      throw error;
    }
  }

  /**
   * Check if a symbol is available (with fallback support)
   * @param {string} primarySymbol - Primary symbol to try (e.g., BTC/EUR)
   * @param {string} fallbackSymbol - Fallback symbol (e.g., BTC/USD)
   * @returns {string} The available symbol
   */
  async getAvailableSymbol(primarySymbol, fallbackSymbol) {
    try {
      await this.exchange.loadMarkets();

      if (this.exchange.markets[primarySymbol]) {
        return primarySymbol;
      } else if (fallbackSymbol && this.exchange.markets[fallbackSymbol]) {
        console.log(`⚠️  ${primarySymbol} not available, using ${fallbackSymbol}`);
        return fallbackSymbol;
      } else {
        console.log(`⚠️  Neither ${primarySymbol} nor ${fallbackSymbol} available on Kraken`);
        return null;
      }
    } catch (error) {
      console.error(`Error checking symbol availability:`, error.message);
      return null;
    }
  }

  /**
   * Get current price for a crypto pair
   */
  async getCurrentPrice(symbol) {
    try {
      const ticker = await this.exchange.fetchTicker(symbol);
      return ticker.last;
    } catch (error) {
      console.error(`Error getting price for ${symbol}:`, error.message);
      return null;
    }
  }

  /**
   * Get historical data for RSI calculation
   * @param {string} symbol - Trading pair (e.g., BTC/EUR)
   * @param {number} limit - Number of candles to fetch
   * @returns {Array} Array of {time, close} objects
   */
  async getHistoricalData(symbol, limit = 100) {
    try {
      // Fetch OHLCV data (1 day timeframe)
      const ohlcv = await this.exchange.fetchOHLCV(symbol, '1d', undefined, limit);

      return ohlcv.map(candle => ({
        time: new Date(candle[0]),
        close: candle[4] // Close price
      }));
    } catch (error) {
      console.error(`Error getting historical data for ${symbol}:`, error.message);
      return [];
    }
  }

  /**
   * Place a buy order
   * @param {string} symbol - Trading pair
   * @param {number} amount - Amount to buy (in base currency)
   * @returns {Object} Order details
   */
  async buy(symbol, amount) {
    try {
      const order = await this.exchange.createMarketBuyOrder(symbol, amount);

      console.log(`✅ BUY ${amount} ${symbol} @ market price`);
      return {
        id: order.id,
        symbol: symbol,
        amount: amount,
        side: 'buy',
        type: 'market',
        status: order.status
      };
    } catch (error) {
      console.error(`Error buying ${symbol}:`, error.message);
      throw error;
    }
  }

  /**
   * Place a sell order
   * @param {string} symbol - Trading pair
   * @param {number} amount - Amount to sell (in base currency)
   * @returns {Object} Order details
   */
  async sell(symbol, amount) {
    try {
      const order = await this.exchange.createMarketSellOrder(symbol, amount);

      console.log(`✅ SELL ${amount} ${symbol} @ market price`);
      return {
        id: order.id,
        symbol: symbol,
        amount: amount,
        side: 'sell',
        type: 'market',
        status: order.status
      };
    } catch (error) {
      console.error(`Error selling ${symbol}:`, error.message);
      throw error;
    }
  }

  /**
   * Get all open positions
   */
  async getPositions() {
    try {
      const balance = await this.exchange.fetchBalance();
      const positions = [];

      // Get all non-zero balances
      for (const [currency, amount] of Object.entries(balance.total)) {
        if (amount > 0 && currency !== 'EUR' && currency !== 'USD') {
          // Try to get current price
          const symbol = `${currency}/EUR`;
          let currentPrice = null;
          let marketValue = 0;

          try {
            currentPrice = await this.getCurrentPrice(symbol);
            marketValue = currentPrice * amount;
          } catch (error) {
            // If EUR pair doesn't exist, try USD
            try {
              const usdSymbol = `${currency}/USD`;
              currentPrice = await this.getCurrentPrice(usdSymbol);
              marketValue = currentPrice * amount * 0.92; // Rough EUR conversion
            } catch (e) {
              console.log(`Could not get price for ${currency}`);
            }
          }

          positions.push({
            symbol: symbol,
            quantity: amount,
            currentPrice: currentPrice,
            marketValue: marketValue,
            profitLoss: 0, // Would need to track entry price
            profitLossPercent: 0,
            exchange: 'Kraken'
          });
        }
      }

      return positions;
    } catch (error) {
      console.error('Error getting Kraken positions:', error.message);
      return [];
    }
  }

  /**
   * Close a specific position (sell all of a currency)
   */
  async closePosition(symbol) {
    try {
      const balance = await this.exchange.fetchBalance();
      const [base, quote] = symbol.split('/');

      const amount = balance.free[base];
      if (amount && amount > 0) {
        await this.sell(symbol, amount);
        console.log(`✅ Closed position for ${symbol}`);
        return true;
      } else {
        console.log(`No balance to close for ${symbol}`);
        return false;
      }
    } catch (error) {
      console.error(`Error closing position ${symbol}:`, error.message);
      throw error;
    }
  }

  /**
   * Get minimum order size for a symbol
   */
  async getMinOrderSize(symbol) {
    try {
      await this.exchange.loadMarkets();
      const market = this.exchange.market(symbol);
      return market.limits.amount.min || 0.001;
    } catch (error) {
      console.error(`Error getting min order size for ${symbol}:`, error.message);
      return 0.001; // Default fallback
    }
  }
}

module.exports = KrakenService;
