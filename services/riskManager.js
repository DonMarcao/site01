class RiskManager {
  constructor(config) {
    this.config = {
      capitalInicial: parseFloat(config.capitalInicial) || 5000,
      lucroMaximoDiario: parseFloat(config.lucroMaximoDiario) || 500,
      perdaMaximaDiaria: parseFloat(config.perdaMaximaDiaria) || 200,
      agressividade: parseInt(config.agressividade) || 70,
      maxPosicoes: parseInt(config.maxPosicoes) || 5,
      maxPosicoesStocks: parseInt(config.maxPosicoesStocks) || 3,
      maxPosicoesCrypto: parseInt(config.maxPosicoesCrypto) || 3,
      stopLossPercent: parseFloat(config.stopLossPercent) || 2,
      takeProfitPercent: parseFloat(config.takeProfitPercent) || 4
    };

    this.dailyStats = {
      startBalance: 0,
      currentPnL: 0,
      tradesCount: 0,
      startDate: new Date().toDateString()
    };

    console.log('⚖️  Risk Manager initialized');
    console.log(`   Capital: €${this.config.capitalInicial}`);
    console.log(`   Max Daily Profit: €${this.config.lucroMaximoDiario}`);
    console.log(`   Max Daily Loss: €${this.config.perdaMaximaDiaria}`);
    console.log(`   Risk Level: ${this.config.agressividade}%`);
  }

  /**
   * Reset daily stats (should be called at start of each day)
   */
  resetDailyStats(startBalance) {
    const today = new Date().toDateString();

    // Only reset if it's a new day
    if (this.dailyStats.startDate !== today) {
      this.dailyStats = {
        startBalance: startBalance,
        currentPnL: 0,
        tradesCount: 0,
        startDate: today
      };
      console.log(`📅 Daily stats reset for ${today}`);
    }
  }

  /**
   * Update daily P&L
   */
  updateDailyPnL(currentBalance) {
    this.dailyStats.currentPnL = currentBalance - this.dailyStats.startBalance;
  }

  /**
   * Check if we've hit daily profit limit
   */
  hasHitDailyProfitLimit() {
    return this.dailyStats.currentPnL >= this.config.lucroMaximoDiario;
  }

  /**
   * Check if we've hit daily loss limit
   */
  hasHitDailyLossLimit() {
    return this.dailyStats.currentPnL <= -this.config.perdaMaximaDiaria;
  }

  /**
   * Check if trading should stop (hit limits)
   */
  shouldStopTrading() {
    if (this.hasHitDailyProfitLimit()) {
      console.log(`🎯 Daily profit limit reached: €${this.dailyStats.currentPnL.toFixed(2)}`);
      return true;
    }

    if (this.hasHitDailyLossLimit()) {
      console.log(`🛑 Daily loss limit reached: €${this.dailyStats.currentPnL.toFixed(2)}`);
      return true;
    }

    return false;
  }

  /**
   * Circuit breaker - stop if losing more than 5% in one day
   */
  checkCircuitBreaker(currentBalance) {
    const lossPercent = ((currentBalance - this.dailyStats.startBalance) / this.dailyStats.startBalance) * 100;

    if (lossPercent <= -5) {
      console.log(`🚨 CIRCUIT BREAKER ACTIVATED - Loss: ${lossPercent.toFixed(2)}%`);
      return true;
    }

    return false;
  }

  /**
   * Check if we can open more positions
   */
  canOpenPosition(currentPositions, exchange) {
    const totalPositions = currentPositions.length;
    const stockPositions = currentPositions.filter(p => p.exchange === 'Alpaca').length;
    const cryptoPositions = currentPositions.filter(p => p.exchange === 'Kraken').length;

    // Check total limit
    if (totalPositions >= this.config.maxPosicoes) {
      console.log(`⚠️  Max total positions reached (${totalPositions}/${this.config.maxPosicoes})`);
      return false;
    }

    // Check exchange-specific limits
    if (exchange === 'Alpaca' && stockPositions >= this.config.maxPosicoesStocks) {
      console.log(`⚠️  Max stock positions reached (${stockPositions}/${this.config.maxPosicoesStocks})`);
      return false;
    }

    if (exchange === 'Kraken' && cryptoPositions >= this.config.maxPosicoesCrypto) {
      console.log(`⚠️  Max crypto positions reached (${cryptoPositions}/${this.config.maxPosicoesCrypto})`);
      return false;
    }

    return true;
  }

  /**
   * Calculate position size based on risk level
   * @param {number} accountBalance - Current account balance
   * @param {number} price - Current asset price
   * @returns {number} Quantity to buy
   */
  calculatePositionSize(accountBalance, price) {
    // Base position size: 2% of capital per trade
    const baseRiskPercent = 2;

    // Adjust based on aggressiveness (50-100% scale)
    const adjustedRiskPercent = baseRiskPercent * (this.config.agressividade / 100);

    // Calculate position value
    const positionValue = accountBalance * (adjustedRiskPercent / 100);

    // Calculate quantity
    const quantity = Math.floor(positionValue / price);

    return quantity > 0 ? quantity : 1; // Minimum 1 unit
  }

  /**
   * Calculate position size for crypto (uses fractions)
   */
  calculateCryptoPositionSize(accountBalance, price) {
    const baseRiskPercent = 2;
    const adjustedRiskPercent = baseRiskPercent * (this.config.agressividade / 100);
    const positionValue = accountBalance * (adjustedRiskPercent / 100);
    const quantity = positionValue / price;

    return Math.max(quantity, 0.001); // Minimum 0.001 crypto
  }

  /**
   * Check if position should be closed (stop-loss or take-profit)
   */
  shouldClosePosition(position) {
    const profitPercent = position.profitLossPercent;

    if (profitPercent <= -this.config.stopLossPercent) {
      console.log(`🛑 Stop-loss triggered for ${position.symbol}: ${profitPercent.toFixed(2)}%`);
      return true;
    }

    if (profitPercent >= this.config.takeProfitPercent) {
      console.log(`🎯 Take-profit triggered for ${position.symbol}: ${profitPercent.toFixed(2)}%`);
      return true;
    }

    return false;
  }

  /**
   * Validate a trade before execution
   */
  validateTrade(tradeType, symbol, quantity, price, currentPositions, accountBalance) {
    // Check if we can open new position (for buy orders)
    if (tradeType === 'buy') {
      const exchange = symbol.includes('/') ? 'Kraken' : 'Alpaca';

      if (!this.canOpenPosition(currentPositions, exchange)) {
        return { valid: false, reason: 'Position limit reached' };
      }
    }

    // Check if we have enough balance
    const requiredAmount = quantity * price;
    if (tradeType === 'buy' && requiredAmount > accountBalance * 0.95) {
      return { valid: false, reason: 'Insufficient balance' };
    }

    // Check daily limits
    if (this.shouldStopTrading()) {
      return { valid: false, reason: 'Daily limits reached' };
    }

    return { valid: true };
  }

  /**
   * Get current risk statistics
   */
  getRiskStats() {
    return {
      dailyPnL: this.dailyStats.currentPnL,
      dailyPnLPercent: (this.dailyStats.currentPnL / this.dailyStats.startBalance) * 100,
      tradesCount: this.dailyStats.tradesCount,
      profitLimitRemaining: this.config.lucroMaximoDiario - this.dailyStats.currentPnL,
      lossLimitRemaining: this.config.perdaMaximaDiaria + this.dailyStats.currentPnL,
      canTrade: !this.shouldStopTrading()
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    console.log('✅ Risk Manager config updated');
  }
}

module.exports = RiskManager;
