const Scanner = require('./Scanner');
const RSIStrategy = require('./strategies/RSIStrategy');

class TradingBot {
  constructor(alpacaService, krakenService, riskManager, config) {
    this.alpacaService = alpacaService;
    this.krakenService = krakenService;
    this.riskManager = riskManager;
    this.config = config;

    this.strategy = new RSIStrategy({
      rsiPeriod: parseInt(config.rsiPeriod) || 14,
      rsiOversold: parseInt(config.rsiOversold) || 30,
      rsiOverbought: parseInt(config.rsiOverbought) || 70
    });

    this.scanner = new Scanner(alpacaService, krakenService, this.strategy);

    this.status = 'stopped'; // stopped, running, paused
    this.scanInterval = null;
    this.stats = {
      tradesExecuted: 0,
      lastScanTime: null,
      lastSignals: [],
      errors: 0
    };

    console.log('🤖 Trading Bot initialized');
  }

  /**
   * Start the bot
   */
  async start(stockSymbols, cryptoConfigs) {
    if (this.status === 'running') {
      console.log('⚠️  Bot already running');
      return false;
    }

    console.log('\n🚀 Starting Trading Bot...');

    // Test connections
    const alpacaOk = await this.alpacaService.testConnection();
    const krakenOk = await this.krakenService.testConnection();

    if (!alpacaOk || !krakenOk) {
      console.error('❌ Failed to connect to exchanges. Please check API keys.');
      return false;
    }

    // Initialize daily stats
    const balance = await this.getTotalBalance();
    this.riskManager.resetDailyStats(balance);

    this.status = 'running';
    this.stockSymbols = stockSymbols;
    this.cryptoConfigs = cryptoConfigs;

    console.log('✅ Bot started successfully');
    console.log(`📊 Monitoring ${stockSymbols.length} stocks + ${cryptoConfigs.length} crypto pairs`);
    console.log(`⏰ Scan interval: ${this.config.scanInterval / 1000}s\n`);

    // Run first scan immediately
    await this.runScanCycle();

    // Start scanning loop
    this.scanInterval = setInterval(() => {
      this.runScanCycle();
    }, this.config.scanInterval);

    return true;
  }

  /**
   * Pause the bot
   */
  pause() {
    if (this.status !== 'running') {
      return false;
    }

    this.status = 'paused';
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }

    console.log('⏸️  Bot paused');
    return true;
  }

  /**
   * Stop the bot
   */
  stop() {
    this.status = 'stopped';
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }

    console.log('🛑 Bot stopped');
    return true;
  }

  /**
   * Run a complete scan cycle
   */
  async runScanCycle() {
    if (this.status !== 'running') {
      return;
    }

    try {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`⏰ ${new Date().toLocaleString()}`);

      // Check if market is open for stocks
      const marketOpen = await this.alpacaService.isMarketOpen();
      if (!marketOpen) {
        console.log('⚠️  US Stock market is closed. Crypto trading continues...');
      }

      // Get current balance and positions
      const balance = await this.getTotalBalance();
      const positions = await this.getAllPositions();

      // Update daily P&L
      this.riskManager.updateDailyPnL(balance);

      // Check risk limits
      if (this.riskManager.shouldStopTrading()) {
        console.log('🛑 Daily limits reached. Stopping bot...');
        this.stop();
        return;
      }

      // Check circuit breaker
      if (this.riskManager.checkCircuitBreaker(balance)) {
        console.log('🚨 CIRCUIT BREAKER ACTIVATED. Closing all positions...');
        await this.closeAllPositions();
        this.stop();
        return;
      }

      // Display current status
      const riskStats = this.riskManager.getRiskStats();
      console.log(`💰 Balance: €${balance.toFixed(2)} | P&L: ${riskStats.dailyPnL >= 0 ? '+' : ''}€${riskStats.dailyPnL.toFixed(2)} (${riskStats.dailyPnLPercent.toFixed(2)}%)`);
      console.log(`📊 Open Positions: ${positions.length}/${this.riskManager.config.maxPosicoes}`);

      // Check and close positions with stop-loss or take-profit
      await this.checkPositions(positions);

      // Scan all assets
      const scanResults = await this.scanner.scanAll(
        this.stockSymbols,
        this.cryptoConfigs
      );

      this.stats.lastScanTime = new Date();
      this.stats.lastSignals = scanResults.all;

      // Find best opportunities
      const opportunities = this.scanner.findBestOpportunities(
        scanResults.buy,
        50, // Minimum strength
        5   // Top 5
      );

      // Execute trades
      if (opportunities.length > 0) {
        await this.executeTrades(opportunities, positions, balance);
      } else {
        console.log('📊 No strong signals detected');
      }

      console.log(`${'='.repeat(60)}\n`);

    } catch (error) {
      console.error('❌ Error in scan cycle:', error.message);
      this.stats.errors++;
    }
  }

  /**
   * Check existing positions for stop-loss or take-profit
   */
  async checkPositions(positions) {
    for (const position of positions) {
      if (this.riskManager.shouldClosePosition(position)) {
        try {
          await this.closePosition(position);
        } catch (error) {
          console.error(`Error closing position ${position.symbol}:`, error.message);
        }
      }
    }
  }

  /**
   * Execute trades based on opportunities
   */
  async executeTrades(opportunities, currentPositions, balance) {
    console.log(`\n💡 Found ${opportunities.length} trading opportunities:`);

    for (const opp of opportunities.slice(0, 3)) { // Limit to top 3
      console.log(`   ${opp.symbol} - RSI: ${opp.rsi} - Strength: ${opp.strength.toFixed(0)}`);

      // Check if we can open position
      if (!this.riskManager.canOpenPosition(currentPositions, opp.exchange)) {
        console.log(`   ⚠️  Position limit reached, skipping ${opp.symbol}`);
        continue;
      }

      // Check if we already have a position in this asset
      const hasPosition = currentPositions.some(p => p.symbol === opp.symbol);
      if (hasPosition) {
        console.log(`   ⚠️  Already have position in ${opp.symbol}, skipping`);
        continue;
      }

      // Execute trade
      try {
        if (opp.exchange === 'Alpaca') {
          // Check if market is open
          const marketOpen = await this.alpacaService.isMarketOpen();
          if (!marketOpen) {
            console.log(`   ⚠️  Market closed, skipping ${opp.symbol}`);
            continue;
          }

          await this.executeBuyStock(opp, balance);
        } else if (opp.exchange === 'Kraken') {
          await this.executeBuyCrypto(opp, balance);
        }

        this.stats.tradesExecuted++;
        currentPositions.push({ symbol: opp.symbol, exchange: opp.exchange }); // Add to tracking

      } catch (error) {
        console.error(`   ❌ Failed to execute trade for ${opp.symbol}:`, error.message);
      }
    }
  }

  /**
   * Execute buy order for stock
   */
  async executeBuyStock(signal, balance) {
    const alpacaBalance = await this.alpacaService.getBalance();
    const quantity = this.riskManager.calculatePositionSize(alpacaBalance.cash, signal.currentPrice);

    if (quantity < 1) {
      console.log(`   ⚠️  Position too small for ${signal.symbol}`);
      return;
    }

    const order = await this.alpacaService.buy(signal.symbol, quantity);
    console.log(`   ✅ BOUGHT ${quantity} ${signal.symbol} @ €${signal.currentPrice.toFixed(2)}`);

    return order;
  }

  /**
   * Execute buy order for crypto
   */
  async executeBuyCrypto(signal, balance) {
    const krakenBalance = await this.krakenService.getBalance();
    const quantity = this.riskManager.calculateCryptoPositionSize(krakenBalance.total, signal.currentPrice);

    const minOrder = await this.krakenService.getMinOrderSize(signal.symbol);
    if (quantity < minOrder) {
      console.log(`   ⚠️  Position too small for ${signal.symbol}`);
      return;
    }

    const order = await this.krakenService.buy(signal.symbol, quantity);
    console.log(`   ✅ BOUGHT ${quantity.toFixed(6)} ${signal.symbol} @ €${signal.currentPrice.toFixed(2)}`);

    return order;
  }

  /**
   * Close a position
   */
  async closePosition(position) {
    if (position.exchange === 'Alpaca') {
      await this.alpacaService.closePosition(position.symbol);
    } else if (position.exchange === 'Kraken') {
      await this.krakenService.closePosition(position.symbol);
    }

    console.log(`✅ Closed ${position.symbol} - P&L: ${position.profitLoss >= 0 ? '+' : ''}€${position.profitLoss.toFixed(2)}`);
  }

  /**
   * Close all positions
   */
  async closeAllPositions() {
    await this.alpacaService.closeAllPositions();
    const krakenPositions = await this.krakenService.getPositions();
    for (const pos of krakenPositions) {
      await this.krakenService.closePosition(pos.symbol);
    }
  }

  /**
   * Get total balance across both exchanges
   */
  async getTotalBalance() {
    const alpacaBalance = await this.alpacaService.getBalance();
    const krakenBalance = await this.krakenService.getBalance();

    return alpacaBalance.portfolioValue + krakenBalance.total;
  }

  /**
   * Get all positions from both exchanges
   */
  async getAllPositions() {
    const alpacaPositions = await this.alpacaService.getPositions();
    const krakenPositions = await this.krakenService.getPositions();

    return [...alpacaPositions, ...krakenPositions];
  }

  /**
   * Get bot status
   */
  getStatus() {
    return {
      status: this.status,
      stats: this.stats,
      riskStats: this.riskManager.getRiskStats()
    };
  }
}

module.exports = TradingBot;
