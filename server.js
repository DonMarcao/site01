require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Services
const AlpacaService = require('./services/alpacaService');
const KrakenService = require('./services/krakenService');
const RiskManager = require('./services/riskManager');

// Bot
const TradingBot = require('./bot/TradingBot');

// Config
const stockSymbols = require('./config/stocks');
const cryptoConfigs = require('./config/crypto');

// Initialize Express
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Initialize SQLite database
const db = new sqlite3.Database('./database.db', (err) => {
  if (err) {
    console.error('❌ Database connection error:', err.message);
  } else {
    console.log('✅ Connected to SQLite database');
    initializeDatabase();
  }
});

// Initialize database tables
function initializeDatabase() {
  db.run(`
    CREATE TABLE IF NOT EXISTS trades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL,
      exchange TEXT NOT NULL,
      type TEXT NOT NULL,
      quantity REAL NOT NULL,
      price REAL NOT NULL,
      total REAL NOT NULL,
      rsi REAL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS positions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL,
      exchange TEXT NOT NULL,
      quantity REAL NOT NULL,
      entry_price REAL NOT NULL,
      current_price REAL,
      profit_loss REAL,
      status TEXT DEFAULT 'open',
      opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      closed_at DATETIME
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS signals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL,
      exchange TEXT NOT NULL,
      rsi REAL NOT NULL,
      signal TEXT NOT NULL,
      strength REAL NOT NULL,
      price REAL NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  console.log('✅ Database tables initialized');
}

// Initialize services
const alpacaService = new AlpacaService();
const krakenService = new KrakenService();

const riskManager = new RiskManager({
  capitalInicial: process.env.CAPITAL_INICIAL,
  lucroMaximoDiario: process.env.LUCRO_MAXIMO_DIARIO,
  perdaMaximaDiaria: process.env.PERDA_MAXIMA_DIARIA,
  agressividade: process.env.AGRESSIVIDADE,
  maxPosicoes: process.env.MAX_POSICOES_TOTAL,
  maxPosicoesStocks: process.env.MAX_POSICOES_STOCKS,
  maxPosicoesCrypto: process.env.MAX_POSICOES_CRYPTO,
  stopLossPercent: process.env.STOP_LOSS_PERCENT,
  takeProfitPercent: process.env.TAKE_PROFIT_PERCENT
});

const botConfig = {
  scanInterval: parseInt(process.env.SCAN_INTERVAL) || 60000,
  rsiPeriod: process.env.RSI_PERIOD,
  rsiOversold: process.env.RSI_OVERSOLD,
  rsiOverbought: process.env.RSI_OVERBOUGHT
};

const tradingBot = new TradingBot(alpacaService, krakenService, riskManager, botConfig);

// ==================== HELPER FUNCTIONS ====================

/**
 * Create service instances with API keys from request
 */
function createServices(apiKeys) {
  let alpaca = alpacaService;
  let kraken = krakenService;

  // If API keys are provided, create new service instances
  if (apiKeys && apiKeys.alpaca && apiKeys.alpaca.apiKey && apiKeys.alpaca.secretKey) {
    alpaca = new AlpacaService(apiKeys.alpaca.apiKey, apiKeys.alpaca.secretKey);
  }

  if (apiKeys && apiKeys.kraken && apiKeys.kraken.apiKey && apiKeys.kraken.secretKey) {
    kraken = new KrakenService(apiKeys.kraken.apiKey, apiKeys.kraken.secretKey);
  }

  return { alpaca, kraken };
}

// ==================== API ENDPOINTS ====================

/**
 * GET / - Serve dashboard
 */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/**
 * POST /api/test-alpaca - Test Alpaca connection with provided keys
 */
app.post('/api/test-alpaca', async (req, res) => {
  try {
    const { apiKeys } = req.body;

    if (!apiKeys || !apiKeys.alpaca || !apiKeys.alpaca.apiKey || !apiKeys.alpaca.secretKey) {
      return res.status(400).json({
        success: false,
        message: 'Alpaca API keys are required'
      });
    }

    // Create temporary service instance with provided keys
    const testService = new AlpacaService(apiKeys.alpaca.apiKey, apiKeys.alpaca.secretKey);

    if (!testService.isInitialized()) {
      return res.status(400).json({
        success: false,
        message: 'Failed to initialize Alpaca service with provided keys'
      });
    }

    // Test connection
    const connected = await testService.testConnection();

    if (connected) {
      // Get balance to show in UI
      const balance = await testService.getBalance();
      res.json({
        success: true,
        balance: balance.portfolioValue,
        message: 'Alpaca connected successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to connect to Alpaca - check your API keys'
      });
    }
  } catch (error) {
    console.error('Alpaca test error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to test Alpaca connection'
    });
  }
});

/**
 * POST /api/test-kraken - Test Kraken connection with provided keys
 */
app.post('/api/test-kraken', async (req, res) => {
  try {
    const { apiKeys } = req.body;

    if (!apiKeys || !apiKeys.kraken || !apiKeys.kraken.apiKey || !apiKeys.kraken.secretKey) {
      return res.status(400).json({
        success: false,
        message: 'Kraken API keys are required'
      });
    }

    // Create temporary service instance with provided keys
    const testService = new KrakenService(apiKeys.kraken.apiKey, apiKeys.kraken.secretKey);

    if (!testService.isInitialized()) {
      return res.status(400).json({
        success: false,
        message: 'Failed to initialize Kraken service with provided keys'
      });
    }

    // Test connection
    const connected = await testService.testConnection();

    if (connected) {
      // Get balance to show in UI
      const balance = await testService.getBalance();
      res.json({
        success: true,
        balance: balance.total,
        message: 'Kraken connected successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to connect to Kraken - check your API keys'
      });
    }
  } catch (error) {
    console.error('Kraken test error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to test Kraken connection'
    });
  }
});

/**
 * POST /api/start - Start the bot
 */
app.post('/api/start', async (req, res) => {
  try {
    const started = await tradingBot.start(stockSymbols, cryptoConfigs);
    if (started) {
      res.json({ success: true, message: 'Bot started successfully' });
    } else {
      res.status(400).json({ success: false, message: 'Bot already running or failed to start' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/pause - Pause the bot
 */
app.post('/api/pause', (req, res) => {
  const paused = tradingBot.pause();
  if (paused) {
    res.json({ success: true, message: 'Bot paused' });
  } else {
    res.status(400).json({ success: false, message: 'Bot is not running' });
  }
});

/**
 * POST /api/stop - Stop the bot
 */
app.post('/api/stop', (req, res) => {
  tradingBot.stop();
  res.json({ success: true, message: 'Bot stopped' });
});

/**
 * POST /api/status - Get bot status
 */
app.post('/api/status', async (req, res) => {
  try {
    const status = tradingBot.getStatus();
    const balance = await tradingBot.getTotalBalance();
    const positions = await tradingBot.getAllPositions();

    res.json({
      success: true,
      status: status.status,
      balance: balance,
      positions: positions,
      stats: status.stats,
      riskStats: status.riskStats
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/balance - Get balances from both exchanges
 */
app.post('/api/balance', async (req, res) => {
  try {
    const { apiKeys } = req.body;
    const services = createServices(apiKeys);

    const alpacaBalance = await services.alpaca.getBalance();
    const krakenBalance = await services.kraken.getBalance();

    res.json({
      success: true,
      alpaca: alpacaBalance,
      kraken: krakenBalance,
      total: alpacaBalance.portfolioValue + krakenBalance.total
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/positions - Get all open positions
 */
app.get('/api/positions', async (req, res) => {
  try {
    const positions = await tradingBot.getAllPositions();
    res.json({ success: true, positions: positions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/positions/:symbol/close - Close specific position
 */
app.post('/api/positions/:symbol/close', async (req, res) => {
  try {
    const symbol = req.params.symbol;
    const positions = await tradingBot.getAllPositions();
    const position = positions.find(p => p.symbol === symbol);

    if (!position) {
      return res.status(404).json({ success: false, message: 'Position not found' });
    }

    await tradingBot.closePosition(position);
    res.json({ success: true, message: `Position ${symbol} closed` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/trades - Get trade history
 */
app.get('/api/trades', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;

  db.all(
    'SELECT * FROM trades ORDER BY timestamp DESC LIMIT ?',
    [limit],
    (err, rows) => {
      if (err) {
        res.status(500).json({ success: false, message: err.message });
      } else {
        res.json({ success: true, trades: rows });
      }
    }
  );
});

/**
 * POST /api/config - Update bot configuration
 */
app.post('/api/config', (req, res) => {
  try {
    const newConfig = req.body;
    riskManager.updateConfig(newConfig);

    res.json({ success: true, message: 'Configuration updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/test-connections - Test API connections
 */
app.get('/api/test-connections', async (req, res) => {
  try {
    const alpacaOk = await alpacaService.testConnection();
    const krakenOk = await krakenService.testConnection();

    res.json({
      success: true,
      alpaca: alpacaOk,
      kraken: krakenOk,
      both: alpacaOk && krakenOk
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/signals - Get recent signals
 */
app.get('/api/signals', (req, res) => {
  const limit = parseInt(req.query.limit) || 20;

  db.all(
    'SELECT * FROM signals ORDER BY timestamp DESC LIMIT ?',
    [limit],
    (err, rows) => {
      if (err) {
        res.status(500).json({ success: false, message: err.message });
      } else {
        res.json({ success: true, signals: rows });
      }
    }
  );
});

// ==================== START SERVER ====================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log('🤖 AUTOMATED TRADING BOT');
  console.log('='.repeat(60));
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}`);
  console.log(`📈 Monitoring: ${stockSymbols.length} stocks + ${cryptoConfigs.length} crypto`);
  console.log('='.repeat(60) + '\n');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  tradingBot.stop();
  db.close(() => {
    console.log('✅ Database connection closed');
    process.exit(0);
  });
});
