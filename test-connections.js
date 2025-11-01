require('dotenv').config();
const AlpacaService = require('./services/alpacaService');
const KrakenService = require('./services/krakenService');

console.log('\n' + '='.repeat(60));
console.log('🔌 TESTING API CONNECTIONS');
console.log('='.repeat(60) + '\n');

async function testConnections() {
  let allPassed = true;
  const enableAlpaca = process.env.ENABLE_ALPACA === 'true';
  const enableKraken = process.env.ENABLE_KRAKEN === 'true';

  console.log(`Configuration:`);
  console.log(`  Alpaca: ${enableAlpaca ? '✅ ENABLED' : '⚠️  DISABLED'}`);
  console.log(`  Kraken: ${enableKraken ? '✅ ENABLED' : '⚠️  DISABLED'}\n`);

  if (!enableAlpaca && !enableKraken) {
    console.log('❌ No exchanges enabled. Please set ENABLE_ALPACA=true or ENABLE_KRAKEN=true in .env\n');
    allPassed = false;
  }

  // Test Alpaca (only if enabled)
  if (enableAlpaca) {
    console.log('📈 Testing Alpaca Connection...');
    console.log('-'.repeat(60));

    if (!process.env.ALPACA_API_KEY || !process.env.ALPACA_SECRET_KEY) {
      console.log('❌ Alpaca API keys not found in .env file');
      console.log('   Please add ALPACA_API_KEY and ALPACA_SECRET_KEY\n');
      allPassed = false;
    } else {
    try {
      const alpaca = new AlpacaService();
      const alpacaOk = await alpaca.testConnection();

      if (alpacaOk) {
        // Get account info
        const account = await alpaca.getAccountInfo();
        const balance = await alpaca.getBalance();

        console.log('✅ Alpaca connection successful!');
        console.log(`   Account: ${account.accountNumber}`);
        console.log(`   Status: ${account.status}`);
        console.log(`   Cash: €${balance.cash.toFixed(2)}`);
        console.log(`   Portfolio Value: €${balance.portfolioValue.toFixed(2)}`);
        console.log(`   Buying Power: €${balance.buyingPower.toFixed(2)}`);
        console.log(`   Mode: ${process.env.ALPACA_PAPER === 'true' ? 'PAPER TRADING' : 'LIVE TRADING'}`);

        // Check if market is open
        const marketOpen = await alpaca.isMarketOpen();
        console.log(`   Market Status: ${marketOpen ? 'OPEN 🟢' : 'CLOSED 🔴'}`);

        console.log();
      } else {
        console.log('❌ Alpaca connection failed\n');
        allPassed = false;
      }
    } catch (error) {
      console.log('❌ Alpaca error:', error.message);
      console.log('   Please check your API keys and permissions\n');
      allPassed = false;
    }
    }
  } else {
    console.log('📈 Alpaca: DISABLED (skipping test)\n');
  }

  // Test Kraken (only if enabled)
  if (enableKraken) {
    console.log('🔷 Testing Kraken Connection...');
    console.log('-'.repeat(60));

    if (!process.env.KRAKEN_API_KEY || !process.env.KRAKEN_SECRET_KEY) {
      console.log('❌ Kraken API keys not found in .env file');
      console.log('   Please add KRAKEN_API_KEY and KRAKEN_SECRET_KEY\n');
      allPassed = false;
    } else {
    try {
      const kraken = new KrakenService();
      const krakenOk = await kraken.testConnection();

      if (krakenOk) {
        // Get balance
        const balance = await kraken.getBalance();

        console.log('✅ Kraken connection successful!');
        console.log(`   Total Balance: €${balance.total.toFixed(2)}`);
        console.log(`   Exchange: ${balance.exchange}`);

        // Test symbol availability
        console.log('\n   Testing crypto pair availability:');
        const testSymbol = await kraken.getAvailableSymbol('BTC/EUR', 'BTC/USD');
        if (testSymbol) {
          console.log(`   ✅ ${testSymbol} is available`);

          // Try to get price
          const price = await kraken.getCurrentPrice(testSymbol);
          if (price) {
            console.log(`   💰 Current ${testSymbol} price: €${price.toFixed(2)}`);
          }
        }

        console.log();
      } else {
        console.log('❌ Kraken connection failed\n');
        allPassed = false;
      }
    } catch (error) {
      console.log('❌ Kraken error:', error.message);
      console.log('   Please check your API keys and permissions\n');
      allPassed = false;
    }
    }
  } else {
    console.log('🔷 Kraken: DISABLED (skipping test)\n');
  }

  // Summary
  console.log('='.repeat(60));
  if (allPassed) {
    console.log('✅ ALL ENABLED CONNECTIONS SUCCESSFUL!');
    console.log('🚀 You can now start the bot with: npm start');
    if (enableAlpaca && !enableKraken) {
      console.log('📈 Bot will trade stocks on Alpaca only');
    } else if (!enableAlpaca && enableKraken) {
      console.log('🔷 Bot will trade crypto on Kraken only');
    } else if (enableAlpaca && enableKraken) {
      console.log('📊 Bot will trade stocks on Alpaca AND crypto on Kraken');
    }
  } else {
    console.log('❌ SOME CONNECTIONS FAILED');
    console.log('⚠️  Please fix the issues above before starting the bot');
    console.log('\nQuick fixes:');
    console.log('1. Copy .env.example to .env');
    console.log('2. Add your API keys to .env');
    console.log('3. For Alpaca: Sign up at https://alpaca.markets (free paper trading)');
    console.log('4. For Kraken: Get API keys at https://www.kraken.com → Settings → API');
    console.log('   Required permissions: Query Funds, Query Orders, Create Orders');
  }
  console.log('='.repeat(60) + '\n');

  process.exit(allPassed ? 0 : 1);
}

testConnections();
