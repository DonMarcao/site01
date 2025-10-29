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

// ==================== API ENDPOINTS ====================

/**
 * GET / - Serve dashboard
 */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
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
 * GET /api/status - Get bot status
 */
app.get('/api/status', async (req, res) => {
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
 * GET /api/balance - Get balances from both exchanges
 */
app.get('/api/balance', async (req, res) => {
  try {
    const alpacaBalance = await alpacaService.getBalance();
    const krakenBalance = await krakenService.getBalance();

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
