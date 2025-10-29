require('dotenv').config();
const AlpacaService = require('./services/alpacaService');
const KrakenService = require('./services/krakenService');

console.log('\n' + '='.repeat(60));
console.log('🔌 TESTING API CONNECTIONS');
console.log('='.repeat(60) + '\n');

async function testConnections() {
  let allPassed = true;

  // Test Alpaca
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

  // Test Kraken
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

  // Summary
  console.log('='.repeat(60));
  if (allPassed) {
    console.log('✅ ALL CONNECTIONS SUCCESSFUL!');
    console.log('🚀 You can now start the bot with: npm start');
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
