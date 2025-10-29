const Alpaca = require('@alpacahq/alpaca-trade-api');

class AlpacaService {
  constructor() {
    this.alpaca = new Alpaca({
      keyId: process.env.ALPACA_API_KEY,
      secretKey: process.env.ALPACA_SECRET_KEY,
      paper: process.env.ALPACA_PAPER === 'true',
      usePolygon: false
    });

    console.log(`📈 Alpaca initialized (${process.env.ALPACA_PAPER === 'true' ? 'PAPER' : 'LIVE'} trading)`);
  }

  /**
   * Test connection to Alpaca
   */
  async testConnection() {
    try {
      const account = await this.alpaca.getAccount();
      console.log(`✅ Alpaca connected - Account: ${account.account_number}`);
      return true;
    } catch (error) {
      console.error('❌ Alpaca connection failed:', error.message);
      return false;
    }
  }

  /**
   * Get account balance and info
   */
  async getBalance() {
    try {
      const account = await this.alpaca.getAccount();
      return {
        exchange: 'Alpaca',
        cash: parseFloat(account.cash),
        equity: parseFloat(account.equity),
        buyingPower: parseFloat(account.buying_power),
        portfolioValue: parseFloat(account.portfolio_value)
      };
    } catch (error) {
      console.error('Error getting Alpaca balance:', error.message);
      throw error;
    }
  }

  /**
   * Check if market is open
   */
  async isMarketOpen() {
    try {
      const clock = await this.alpaca.getClock();
      return clock.is_open;
    } catch (error) {
      console.error('Error checking market status:', error.message);
      return false;
    }
  }

  /**
   * Get current price for a stock
   */
  async getCurrentPrice(symbol) {
    try {
      const latestTrade = await this.alpaca.getLatestTrade(symbol);
      return parseFloat(latestTrade.Price);
    } catch (error) {
      console.error(`Error getting price for ${symbol}:`, error.message);
      return null;
    }
  }

  /**
   * Get historical bars for RSI calculation
   * @param {string} symbol - Stock symbol
   * @param {number} limit - Number of bars to fetch
   * @returns {Array} Array of {time, close} objects
   */
  async getHistoricalData(symbol, limit = 100) {
    try {
      const end = new Date();
      const start = new Date(end.getTime() - (limit * 24 * 60 * 60 * 1000)); // Go back limit days

      const bars = await this.alpaca.getBarsV2(symbol, {
        start: start.toISOString(),
        end: end.toISOString(),
        timeframe: '1Day',
        limit: limit
      });

      const data = [];
      for await (let bar of bars) {
        data.push({
          time: new Date(bar.Timestamp),
          close: parseFloat(bar.ClosePrice)
        });
      }

      return data;
    } catch (error) {
      console.error(`Error getting historical data for ${symbol}:`, error.message);
      return [];
    }
  }

  /**
   * Place a buy order
   * @param {string} symbol - Stock symbol
   * @param {number} quantity - Number of shares
   * @returns {Object} Order details
   */
  async buy(symbol, quantity) {
    try {
      const order = await this.alpaca.createOrder({
        symbol: symbol,
        qty: quantity,
        side: 'buy',
        type: 'market',
        time_in_force: 'day'
      });

      console.log(`✅ BUY ${quantity} ${symbol} @ market price`);
      return {
        id: order.id,
        symbol: symbol,
        quantity: quantity,
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
   * @param {string} symbol - Stock symbol
   * @param {number} quantity - Number of shares
   * @returns {Object} Order details
   */
  async sell(symbol, quantity) {
    try {
      const order = await this.alpaca.createOrder({
        symbol: symbol,
        qty: quantity,
        side: 'sell',
        type: 'market',
        time_in_force: 'day'
      });

      console.log(`✅ SELL ${quantity} ${symbol} @ market price`);
      return {
        id: order.id,
        symbol: symbol,
        quantity: quantity,
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
      const positions = await this.alpaca.getPositions();
      return positions.map(pos => ({
        symbol: pos.symbol,
        quantity: parseFloat(pos.qty),
        entryPrice: parseFloat(pos.avg_entry_price),
        currentPrice: parseFloat(pos.current_price),
        marketValue: parseFloat(pos.market_value),
        profitLoss: parseFloat(pos.unrealized_pl),
        profitLossPercent: parseFloat(pos.unrealized_plpc) * 100,
        exchange: 'Alpaca'
      }));
    } catch (error) {
      console.error('Error getting Alpaca positions:', error.message);
      return [];
    }
  }

  /**
   * Close a specific position
   */
  async closePosition(symbol) {
    try {
      await this.alpaca.closePosition(symbol);
      console.log(`✅ Closed position for ${symbol}`);
      return true;
    } catch (error) {
      console.error(`Error closing position ${symbol}:`, error.message);
      throw error;
    }
  }

  /**
   * Close all positions
   */
  async closeAllPositions() {
    try {
      await this.alpaca.closeAllPositions();
      console.log('✅ Closed all Alpaca positions');
      return true;
    } catch (error) {
      console.error('Error closing all positions:', error.message);
      throw error;
    }
  }

  /**
   * Get account info
   */
  async getAccountInfo() {
    try {
      const account = await this.alpaca.getAccount();
      return {
        accountNumber: account.account_number,
        status: account.status,
        cash: parseFloat(account.cash),
        portfolioValue: parseFloat(account.portfolio_value),
        buyingPower: parseFloat(account.buying_power),
        daytradeCount: parseInt(account.daytrade_count),
        patternDayTrader: account.pattern_day_trader
      };
    } catch (error) {
      console.error('Error getting account info:', error.message);
      throw error;
    }
  }
}

module.exports = AlpacaService;
