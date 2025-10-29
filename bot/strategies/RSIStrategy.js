const { RSI } = require('technicalindicators');

class RSIStrategy {
  constructor(config = {}) {
    this.period = config.rsiPeriod || 14;
    this.oversold = config.rsiOversold || 30;
    this.overbought = config.rsiOverbought || 70;

    console.log(`📊 RSI Strategy initialized (Period: ${this.period}, Oversold: ${this.oversold}, Overbought: ${this.overbought})`);
  }

  /**
   * Calculate RSI from historical data
   * @param {Array} historicalData - Array of {time, close} objects
   * @returns {number|null} Current RSI value
   */
  calculateRSI(historicalData) {
    if (!historicalData || historicalData.length < this.period + 1) {
      return null;
    }

    // Extract close prices
    const closePrices = historicalData.map(data => data.close);

    // Calculate RSI using technicalindicators library
    const rsiValues = RSI.calculate({
      values: closePrices,
      period: this.period
    });

    // Return the most recent RSI value
    return rsiValues.length > 0 ? rsiValues[rsiValues.length - 1] : null;
  }

  /**
   * Generate trading signal based on RSI
   * @param {number} rsi - Current RSI value
   * @returns {Object} Signal with type and strength
   */
  generateSignal(rsi) {
    if (rsi === null || rsi === undefined) {
      return { type: 'HOLD', strength: 0, rsi: null };
    }

    // BUY signal when RSI is oversold
    if (rsi < this.oversold) {
      const strength = ((this.oversold - rsi) / this.oversold) * 100;
      return {
        type: 'BUY',
        strength: Math.min(strength, 100), // Cap at 100
        rsi: rsi.toFixed(2)
      };
    }

    // SELL signal when RSI is overbought
    if (rsi > this.overbought) {
      const strength = ((rsi - this.overbought) / (100 - this.overbought)) * 100;
      return {
        type: 'SELL',
        strength: Math.min(strength, 100), // Cap at 100
        rsi: rsi.toFixed(2)
      };
    }

    // HOLD when RSI is neutral
    return {
      type: 'HOLD',
      strength: 0,
      rsi: rsi.toFixed(2)
    };
  }

  /**
   * Analyze an asset and generate signal
   * @param {Array} historicalData - Historical price data
   * @returns {Object} Complete analysis with signal
   */
  analyze(historicalData) {
    const rsi = this.calculateRSI(historicalData);
    const signal = this.generateSignal(rsi);

    return {
      rsi: signal.rsi,
      signal: signal.type,
      strength: signal.strength
    };
  }

  /**
   * Check if signal is strong enough to act on
   * @param {Object} signal - Signal object
   * @param {number} minStrength - Minimum strength required (0-100)
   * @returns {boolean}
   */
  isSignalStrong(signal, minStrength = 30) {
    return signal.type !== 'HOLD' && signal.strength >= minStrength;
  }

  /**
   * Sort signals by strength (best first)
   * @param {Array} signals - Array of signal objects
   * @returns {Array} Sorted signals
   */
  sortByStrength(signals) {
    return signals
      .filter(s => s.signal.type !== 'HOLD')
      .sort((a, b) => b.signal.strength - a.signal.strength);
  }
}

module.exports = RSIStrategy;
