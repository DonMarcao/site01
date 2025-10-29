# 🤖 Automated Trading Bot

A fully automated trading bot that trades stocks (via Alpaca) and cryptocurrencies (via Kraken) using RSI (Relative Strength Index) signals.

## ⚠️ IMPORTANT DISCLAIMER

**This bot is for EDUCATIONAL PURPOSES ONLY. Trading involves significant risk of loss. Always start with paper trading (virtual money) before using real funds. Never invest more than you can afford to lose.**

## 🎯 Features

- **Dual Exchange Support**: Trades stocks on Alpaca and crypto on Kraken
- **RSI Strategy**: Automated buy/sell signals based on RSI indicators
- **Risk Management**:
  - Daily profit/loss limits
  - Stop-loss (2%) and take-profit (4%) per position
  - Maximum position limits
  - Circuit breaker for large losses
- **Real-time Dashboard**: Web interface to monitor and control the bot
- **Automated Scanning**: Scans 100 stocks + 10 crypto pairs every minute
- **Market Hours Aware**: Respects US stock market hours
- **SQLite Database**: Tracks all trades, positions, and signals

## 📊 What It Monitors

### Stocks (Top 100 S&P 500)
AAPL, MSFT, GOOGL, AMZN, NVDA, META, TSLA, and 93 more...

### Cryptocurrencies (Top 10)
BTC/EUR, ETH/EUR, USDT/EUR, BNB/EUR, SOL/EUR, XRP/EUR, USDC/EUR, ADA/EUR, DOGE/EUR, TRX/EUR

## 🚀 Quick Start

### 1. Prerequisites

- Node.js 16+ installed
- Alpaca account (free paper trading at https://alpaca.markets)
- Kraken account (https://www.kraken.com)

### 2. Installation

```bash
# Clone or download this repository
cd trading-bot

# Install dependencies
npm install
```

### 3. Configuration

**Option A: Configure via Web UI (Recommended)**

1. Start the server first:
   ```bash
   npm start
   ```

2. Open browser at http://localhost:3000

3. Enter your API keys in the "API Configuration" section at the top

4. Click "Test Alpaca" and "Test Kraken" to verify connections

5. Click "Save All Keys" - keys are stored in browser localStorage

**Option B: Configure via .env file**

```bash
# Copy environment template
cp .env.example .env

# Edit .env and add your API keys
nano .env
```

**Get API Keys:**

**Alpaca (Stocks)**:
1. Sign up at https://alpaca.markets
2. Go to Dashboard → API Keys (Paper Trading)
3. Generate new API key
4. Copy Key ID and Secret Key

**Kraken (Crypto)**:
1. Log in to https://www.kraken.com
2. Go to Settings → API
3. Create new API key with permissions:
   - Query Funds
   - Query Open Orders and Trades
   - Create & Modify Orders
4. Copy API Key and Private Key

### 4. Start the Bot

```bash
# Start the server
npm start
```

### 5. Open Dashboard

Open your browser and go to:
```
http://localhost:3000
```

You should see the trading dashboard with:
1. **API Configuration section** - Enter and test your API keys
2. **Test buttons** - Verify Alpaca and Kraken connections separately
3. **START BOT button** - Launch automated trading after connections verified

## 📱 Dashboard Overview

The dashboard shows:

- **API Configuration**: Enter and test Alpaca/Kraken API keys (saves to browser)
- **Settings**: Capital, risk level, daily limits
- **Control Buttons**: Start, Pause, Stop, Test Connections
- **Current Status**: Total balance, P&L, active positions
- **Open Positions**: Real-time position tracking with P&L
- **Recent Trades**: Trade history

## 🎮 How to Use

### First Time Setup

1. **Enter API Keys**
   - Open http://localhost:3000 in your browser
   - Enter Alpaca API key and secret (paper trading)
   - Enter Kraken API key and secret
   - Click "Save All Keys"

2. **Test Connections**
   - Click "Test Alpaca" button - should show ✅ Connected + balance
   - Click "Test Kraken" button - should show ✅ Connected + balance
   - If ❌ Failed: Check your API keys are correct

3. **Start Bot**
   - Click "START BOT"
   - Watch the dashboard for activity
   - Monitor positions and trades

4. **Paper Trading Mode** (Recommended)
   - Alpaca paper trading uses virtual money
   - Perfect for testing without risk
   - Make sure you're using paper trading keys!

### During Operation

- **Monitor Positions**: Check open positions regularly
- **Manual Close**: Click "Close" button to manually exit a position
- **Pause**: Temporarily pause scanning (keeps positions open)
- **Stop**: Stop the bot completely

### Daily Limits

The bot automatically stops when:
- Daily profit reaches €500 (or your limit)
- Daily loss reaches €200 (or your limit)
- Circuit breaker: Loss exceeds 5% in one day

## ⚙️ Configuration

Edit `.env` to customize:

```bash
# Capital Settings
CAPITAL_INICIAL=5000          # Starting capital
LUCRO_MAXIMO_DIARIO=500      # Stop at this profit
PERDA_MAXIMA_DIARIA=200      # Stop at this loss

# Risk Settings
AGRESSIVIDADE=70             # 50-100 (higher = bigger positions)
MAX_POSICOES_TOTAL=5         # Max total open positions
MAX_POSICOES_STOCKS=3        # Max stock positions
MAX_POSICOES_CRYPTO=3        # Max crypto positions

# Exit Strategy
STOP_LOSS_PERCENT=2          # Exit at -2% loss per position
TAKE_PROFIT_PERCENT=4        # Exit at +4% profit per position

# RSI Strategy
RSI_PERIOD=14                # RSI calculation period
RSI_OVERSOLD=30              # Buy signal threshold
RSI_OVERBOUGHT=70            # Sell signal threshold

# Scanning
SCAN_INTERVAL=60000          # Scan every 60 seconds
```

## 🔒 Security & Safety

### Risk Management Features

1. **Position Sizing**: Max 2% of capital per trade
2. **Stop Loss**: Automatic exit at -2% per position
3. **Take Profit**: Automatic exit at +4% per position
4. **Daily Limits**: Stops trading when limits reached
5. **Circuit Breaker**: Emergency stop at -5% daily loss
6. **Position Limits**: Maximum number of concurrent positions

### Best Practices

- ✅ Start with paper trading (virtual money)
- ✅ Test thoroughly before using real money
- ✅ Start with small amounts
- ✅ Monitor regularly
- ✅ Keep API keys secure
- ❌ Never share your `.env` file
- ❌ Never commit API keys to Git
- ❌ Don't leave bot unattended for days

## 📊 How It Works

### Trading Logic

1. **Every Minute**:
   - Scans all 110 assets (100 stocks + 10 crypto)
   - Calculates RSI for each asset
   - Finds strongest buy signals

2. **Buy Signal** (RSI < 30):
   - Check if we can open more positions
   - Calculate position size (2% of capital)
   - Execute market buy order
   - Set stop-loss and take-profit

3. **Sell Signal** (RSI > 70):
   - Or stop-loss triggered (-2%)
   - Or take-profit reached (+4%)
   - Execute market sell order
   - Record profit/loss

4. **Risk Checks**:
   - Check daily P&L after each trade
   - Stop if limits reached
   - Activate circuit breaker if needed

### RSI Strategy

**RSI (Relative Strength Index)**:
- Measures momentum (0-100 scale)
- **Below 30**: Oversold → BUY signal
- **Above 70**: Overbought → SELL signal
- **30-70**: Neutral → HOLD

The bot sorts signals by strength and executes the strongest ones first.

## 🗂️ Project Structure

```
trading-bot/
├── server.js              # Express server + API endpoints
├── config/
│   ├── stocks.js          # Top 100 stocks
│   └── crypto.js          # Top 10 crypto pairs
├── services/
│   ├── alpacaService.js   # Alpaca API integration
│   ├── krakenService.js   # Kraken API integration
│   └── riskManager.js     # Risk management logic
├── bot/
│   ├── TradingBot.js      # Main bot logic
│   ├── Scanner.js         # Asset scanning
│   └── strategies/
│       └── RSIStrategy.js # RSI calculations
├── public/
│   ├── index.html         # Dashboard UI
│   ├── app.js             # Frontend JavaScript
│   └── style.css          # Styling
├── database.db            # SQLite database (created automatically)
├── .env                   # Your configuration (create from .env.example)
├── .env.example           # Configuration template
├── test-connections.js    # Test script
├── package.json
└── README.md
```

## 🔧 Troubleshooting

### Bot won't start

1. Check API keys in `.env`
2. Run `npm test` to verify connections
3. Check console for error messages
4. Verify internet connection

### No trades being executed

- Check if market is open (US stocks trade 9:30-16:00 EST)
- Check if daily limits already reached
- Verify RSI signals are strong enough (>50 strength)
- Check if max positions reached

### Connection errors

- Verify API keys are correct
- Check API permissions on exchange
- Ensure you're not hitting rate limits
- Try restarting the bot

### Positions not showing

- Refresh the dashboard
- Check exchange accounts directly
- Verify the bot has necessary permissions

## 📈 Performance Tips

### For Better Results

1. **Test Strategy**: Run in paper trading for at least a week
2. **Adjust RSI Thresholds**: Try different oversold/overbought levels
3. **Fine-tune Risk**: Adjust stop-loss/take-profit percentages
4. **Monitor Markets**: Some market conditions are better than others
5. **Keep Logs**: Review trades to understand patterns

### Optimization

- **Lower Aggressiveness**: Smaller positions = less risk
- **Stricter Limits**: Lower daily loss limit
- **Fewer Positions**: Reduce max concurrent positions
- **Longer Scan Interval**: Less frequent trading

## 🆘 Support

### Resources

- Alpaca Docs: https://alpaca.markets/docs
- Kraken API: https://docs.kraken.com
- RSI Explained: https://www.investopedia.com/terms/r/rsi.asp

### Common Issues

**"ECONNREFUSED"**: Server not running → Start with `npm start`
**"Invalid API key"**: Wrong credentials → Check `.env` file
**"Market closed"**: Outside trading hours → Wait for market open
**"Insufficient balance"**: Not enough funds → Check account balance

## 📝 Notes

- **Paper Trading**: Alpaca offers free paper trading (virtual money)
- **Market Hours**: US stocks only trade 9:30 AM - 4:00 PM EST
- **Crypto 24/7**: Cryptocurrency markets never close
- **Rate Limits**: Exchanges have API rate limits (bot respects them)
- **Fees**: Real trading involves fees (check your exchange)

## 📜 License

This project is provided as-is for educational purposes. Use at your own risk.

## 🙏 Credits

Built with:
- [@alpacahq/alpaca-trade-api](https://github.com/alpacahq/alpaca-trade-api-js)
- [CCXT](https://github.com/ccxt/ccxt)
- [technicalindicators](https://github.com/anandanand84/technicalindicators)
- [Express](https://expressjs.com/)
- [Bootstrap](https://getbootstrap.com/)

---

**Remember: Start with paper trading. Never risk money you can't afford to lose. Trading is risky!**

🚀 Happy (safe) trading!
