# Alpaca API Integration Setup

## Current Status

✅ **Implementation Complete**: The Alpaca API integration has been fully implemented and is ready to use.

❌ **API Keys Issue**: The provided API keys are returning a 403 "Access denied" error from Alpaca's servers.

## What Has Been Implemented

1. **Alpaca Service** (`services/alpacaService.js`)
   - Full integration with Alpaca's trading API
   - Support for paper and live trading
   - Account management, positions, orders, and market data

2. **Flexible Exchange Configuration** (``.env`)
   - `ENABLE_ALPACA=true/false` - Enable or disable Alpaca trading
   - `ENABLE_KRAKEN=true/false` - Enable or disable Kraken trading
   - Can run with:
     - Alpaca only
     - Kraken only
     - Both exchanges simultaneously

3. **Updated Trading Bot** (`bot/TradingBot.js`)
   - Automatically handles enabled/disabled exchanges
   - Gracefully skips disabled exchanges
   - Properly aggregates balances and positions from enabled exchanges

4. **Connection Testing** (`npm test`)
   - Tests only enabled exchanges
   - Provides clear feedback on configuration
   - Detailed error reporting

## Troubleshooting the 403 Error

The 403 "Access denied" error typically means:

1. **Invalid API Keys**: The keys may not be valid or were entered incorrectly
2. **Expired Keys**: The keys may have expired or been revoked
3. **Account Issues**: The Alpaca account may be suspended or require verification
4. **Wrong Account Type**: Paper trading keys being used with live endpoint or vice versa

## Getting Valid Alpaca API Keys

### Option 1: Create a New Paper Trading Account (Recommended for Testing)

1. Go to https://alpaca.markets
2. Click "Sign Up" and create a free account
3. Choose "Paper Trading" (free, uses fake money for testing)
4. Once logged in, go to "Paper Trading" section
5. Navigate to "Your API Keys" or "API Keys" in settings
6. Generate new API keys
7. Copy both the **API Key ID** and **Secret Key**

### Option 2: Verify Existing Keys

1. Log into your Alpaca account at https://app.alpaca.markets
2. Go to "Paper Trading" section
3. Check "API Keys" in the settings
4. Verify the keys match what you're using
5. If needed, regenerate new keys

### Option 3: Check Account Status

1. Log into https://app.alpaca.markets
2. Check if your account requires email verification
3. Check if there are any account restrictions or suspensions
4. Verify your account has paper trading enabled

## Updating Your API Keys

Once you have valid API keys, update the `.env` file:

\`\`\`bash
# Edit .env file
ALPACA_API_KEY=your_new_key_here
ALPACA_SECRET_KEY=your_new_secret_here
ALPACA_PAPER=true

# Test the connection
npm test
\`\`\`

## Running the Bot

### Alpaca Only
\`\`\`bash
# In .env
ENABLE_ALPACA=true
ENABLE_KRAKEN=false

npm start
\`\`\`

### Kraken Only
\`\`\`bash
# In .env
ENABLE_ALPACA=false
ENABLE_KRAKEN=true

npm start
\`\`\`

### Both Exchanges
\`\`\`bash
# In .env
ENABLE_ALPACA=true
ENABLE_KRAKEN=true

npm start
\`\`\`

## API Key Permissions Required

When generating Alpaca API keys, ensure these permissions are enabled:
- ✅ Account (read)
- ✅ Orders (read and write)
- ✅ Positions (read)
- ✅ Market Data (read)

## Next Steps

1. **Get valid API keys** from Alpaca following the instructions above
2. **Update the `.env` file** with your new keys
3. **Run `npm test`** to verify the connection
4. **Start the bot** with `npm start` when tests pass

## Support

If you continue to experience issues:
- Check Alpaca's status page: https://status.alpaca.markets
- Contact Alpaca support: https://alpaca.markets/support
- Review their API documentation: https://alpaca.markets/docs/api-references/trading-api/
