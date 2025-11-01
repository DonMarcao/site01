require('dotenv').config();
const axios = require('axios');

async function testAlpacaDirect() {
  console.log('Testing Alpaca API directly...\n');

  const apiKey = process.env.ALPACA_API_KEY;
  const secretKey = process.env.ALPACA_SECRET_KEY;
  const baseUrl = 'https://paper-api.alpaca.markets';

  console.log(`API Key: ${apiKey}`);
  console.log(`Secret Key: ${secretKey.substring(0, 10)}...`);
  console.log(`Base URL: ${baseUrl}\n`);

  try {
    const response = await axios.get(`${baseUrl}/v2/account`, {
      headers: {
        'APCA-API-KEY-ID': apiKey,
        'APCA-API-SECRET-KEY': secretKey
      }
    });

    console.log('✅ SUCCESS! Account data:');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('❌ ERROR:');
    console.error('Status:', error.response?.status);
    console.error('Status Text:', error.response?.statusText);
    console.error('Data:', error.response?.data);
    console.error('\nFull error:', error.message);
  }
}

testAlpacaDirect();
