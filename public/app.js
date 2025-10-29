// API Base URL
const API_URL = 'http://localhost:3000/api';

// Update interval (5 seconds)
const UPDATE_INTERVAL = 5000;

let updateTimer = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  console.log('Dashboard initialized');
  loadApiKeys();
  updateStatus();
  startAutoUpdate();
});

// ==================== API KEY MANAGEMENT ====================

/**
 * Load API keys from localStorage
 */
function loadApiKeys() {
  const alpacaApiKey = localStorage.getItem('alpacaApiKey');
  const alpacaSecretKey = localStorage.getItem('alpacaSecretKey');
  const krakenApiKey = localStorage.getItem('krakenApiKey');
  const krakenSecretKey = localStorage.getItem('krakenSecretKey');

  if (alpacaApiKey) document.getElementById('alpacaApiKey').value = alpacaApiKey;
  if (alpacaSecretKey) document.getElementById('alpacaSecretKey').value = alpacaSecretKey;
  if (krakenApiKey) document.getElementById('krakenApiKey').value = krakenApiKey;
  if (krakenSecretKey) document.getElementById('krakenSecretKey').value = krakenSecretKey;

  console.log('API keys loaded from localStorage');
}

/**
 * Save API keys to localStorage
 */
function saveApiKeys() {
  const alpacaApiKey = document.getElementById('alpacaApiKey').value.trim();
  const alpacaSecretKey = document.getElementById('alpacaSecretKey').value.trim();
  const krakenApiKey = document.getElementById('krakenApiKey').value.trim();
  const krakenSecretKey = document.getElementById('krakenSecretKey').value.trim();

  if (!alpacaApiKey || !alpacaSecretKey) {
    showNotification('Please enter both Alpaca API key and secret key', 'warning');
    return;
  }

  if (!krakenApiKey || !krakenSecretKey) {
    showNotification('Please enter both Kraken API key and secret key', 'warning');
    return;
  }

  localStorage.setItem('alpacaApiKey', alpacaApiKey);
  localStorage.setItem('alpacaSecretKey', alpacaSecretKey);
  localStorage.setItem('krakenApiKey', krakenApiKey);
  localStorage.setItem('krakenSecretKey', krakenSecretKey);

  showNotification('API keys saved successfully!', 'success');
  console.log('API keys saved to localStorage');
}

/**
 * Clear all API keys
 */
function clearApiKeys() {
  if (!confirm('Are you sure you want to clear all API keys?')) {
    return;
  }

  localStorage.removeItem('alpacaApiKey');
  localStorage.removeItem('alpacaSecretKey');
  localStorage.removeItem('krakenApiKey');
  localStorage.removeItem('krakenSecretKey');

  document.getElementById('alpacaApiKey').value = '';
  document.getElementById('alpacaSecretKey').value = '';
  document.getElementById('krakenApiKey').value = '';
  document.getElementById('krakenSecretKey').value = '';

  document.getElementById('alpacaStatusText').textContent = '❌ Not Connected';
  document.getElementById('alpacaStatus').className = 'alert alert-secondary py-2';
  document.getElementById('krakenStatusText').textContent = '❌ Not Connected';
  document.getElementById('krakenStatus').className = 'alert alert-secondary py-2';

  showNotification('API keys cleared', 'info');
}

/**
 * Get API keys from form
 */
function getApiKeys() {
  return {
    alpaca: {
      apiKey: document.getElementById('alpacaApiKey').value.trim(),
      secretKey: document.getElementById('alpacaSecretKey').value.trim()
    },
    kraken: {
      apiKey: document.getElementById('krakenApiKey').value.trim(),
      secretKey: document.getElementById('krakenSecretKey').value.trim()
    }
  };
}

/**
 * Test Alpaca connection
 */
async function testAlpaca() {
  const keys = getApiKeys();

  if (!keys.alpaca.apiKey || !keys.alpaca.secretKey) {
    showNotification('Please enter Alpaca API credentials first', 'warning');
    return;
  }

  const statusText = document.getElementById('alpacaStatusText');
  const statusDiv = document.getElementById('alpacaStatus');

  statusText.textContent = '⏳ Testing...';
  statusDiv.className = 'alert alert-info py-2';

  try {
    const response = await fetch(`${API_URL}/test-alpaca`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKeys: keys })
    });

    const data = await response.json();

    if (data.success) {
      statusText.textContent = `✅ Connected - Balance: ${formatCurrency(data.balance)}`;
      statusDiv.className = 'alert alert-success py-2';
      showNotification('Alpaca connected successfully!', 'success');
    } else {
      statusText.textContent = `❌ Failed: ${data.message}`;
      statusDiv.className = 'alert alert-danger py-2';
      showNotification('Alpaca connection failed: ' + data.message, 'error');
    }
  } catch (error) {
    statusText.textContent = `❌ Error: ${error.message}`;
    statusDiv.className = 'alert alert-danger py-2';
    showNotification('Alpaca test failed: ' + error.message, 'error');
  }
}

/**
 * Test Kraken connection
 */
async function testKraken() {
  const keys = getApiKeys();

  if (!keys.kraken.apiKey || !keys.kraken.secretKey) {
    showNotification('Please enter Kraken API credentials first', 'warning');
    return;
  }

  const statusText = document.getElementById('krakenStatusText');
  const statusDiv = document.getElementById('krakenStatus');

  statusText.textContent = '⏳ Testing...';
  statusDiv.className = 'alert alert-info py-2';

  try {
    const response = await fetch(`${API_URL}/test-kraken`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKeys: keys })
    });

    const data = await response.json();

    if (data.success) {
      statusText.textContent = `✅ Connected - Balance: ${formatCurrency(data.balance)}`;
      statusDiv.className = 'alert alert-success py-2';
      showNotification('Kraken connected successfully!', 'success');
    } else {
      statusText.textContent = `❌ Failed: ${data.message}`;
      statusDiv.className = 'alert alert-danger py-2';
      showNotification('Kraken connection failed: ' + data.message, 'error');
    }
  } catch (error) {
    statusText.textContent = `❌ Error: ${error.message}`;
    statusDiv.className = 'alert alert-danger py-2';
    showNotification('Kraken test failed: ' + error.message, 'error');
  }
}

// ==================== BOT CONTROL ====================

// Start Bot
async function startBot() {
  try {
    const keys = getApiKeys();
    const response = await fetch(`${API_URL}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKeys: keys })
    });
    const data = await response.json();

    if (data.success) {
      showNotification('Bot started successfully!', 'success');
      updateButtonStates('running');
      startAutoUpdate();
    } else {
      showNotification(data.message, 'error');
    }
  } catch (error) {
    showNotification('Failed to start bot: ' + error.message, 'error');
  }
}

// Pause Bot
async function pauseBot() {
  try {
    const response = await fetch(`${API_URL}/pause`, { method: 'POST' });
    const data = await response.json();

    if (data.success) {
      showNotification('Bot paused', 'warning');
      updateButtonStates('paused');
    } else {
      showNotification(data.message, 'error');
    }
  } catch (error) {
    showNotification('Failed to pause bot: ' + error.message, 'error');
  }
}

// Stop Bot
async function stopBot() {
  try {
    const response = await fetch(`${API_URL}/stop`, { method: 'POST' });
    const data = await response.json();

    if (data.success) {
      showNotification('Bot stopped', 'info');
      updateButtonStates('stopped');
      stopAutoUpdate();
    } else {
      showNotification(data.message, 'error');
    }
  } catch (error) {
    showNotification('Failed to stop bot: ' + error.message, 'error');
  }
}

// Test Connections
async function testConnections() {
  try {
    showNotification('Testing connections...', 'info');
    const response = await fetch(`${API_URL}/test-connections`);
    const data = await response.json();

    if (data.both) {
      showNotification('✅ Both Alpaca and Kraken connected successfully!', 'success');
    } else {
      const msg = `Alpaca: ${data.alpaca ? '✅' : '❌'} | Kraken: ${data.kraken ? '✅' : '❌'}`;
      showNotification(msg, 'warning');
    }
  } catch (error) {
    showNotification('Connection test failed: ' + error.message, 'error');
  }
}

// Update Status
async function updateStatus() {
  try {
    const keys = getApiKeys();
    const response = await fetch(`${API_URL}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKeys: keys })
    });
    const data = await response.json();

    if (data.success) {
      // Update bot status
      const statusBadge = document.getElementById('botStatus');
      statusBadge.textContent = data.status.toUpperCase();
      statusBadge.className = 'badge ' + getStatusClass(data.status);

      // Update balance
      document.getElementById('totalBalance').textContent = formatCurrency(data.balance);

      // Update P&L
      const pnl = data.riskStats.dailyPnL || 0;
      const pnlPercent = data.riskStats.dailyPnLPercent || 0;
      const pnlElement = document.getElementById('todayPnL');
      pnlElement.textContent = (pnl >= 0 ? '+' : '') + formatCurrency(pnl);
      pnlElement.className = pnl >= 0 ? 'positive' : 'negative';
      document.getElementById('todayPnLPercent').textContent = `(${pnlPercent.toFixed(2)}%)`;

      // Update trades count
      document.getElementById('tradesCount').textContent = data.stats.tradesExecuted || 0;

      // Update positions
      updatePositionsTable(data.positions);

      // Update button states
      updateButtonStates(data.status);

      // Update last update time
      document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString();
    }
  } catch (error) {
    console.error('Failed to update status:', error);
  }

  // Also update balance
  updateBalance();
  updateTrades();
}

// Update Balance
async function updateBalance() {
  try {
    const keys = getApiKeys();
    const response = await fetch(`${API_URL}/balance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKeys: keys })
    });
    const data = await response.json();

    if (data.success) {
      document.getElementById('alpacaBalance').textContent = formatCurrency(data.alpaca.portfolioValue);
      document.getElementById('krakenBalance').textContent = formatCurrency(data.kraken.total);
    }
  } catch (error) {
    console.error('Failed to update balance:', error);
  }
}

// Update Positions Table
function updatePositionsTable(positions) {
  const tbody = document.getElementById('positionsTable');
  const count = document.getElementById('positionsCount');

  if (!positions || positions.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No open positions</td></tr>';
    count.textContent = '0';
    return;
  }

  count.textContent = positions.length;

  tbody.innerHTML = positions.map(pos => `
    <tr>
      <td><strong>${pos.symbol}</strong></td>
      <td><span class="badge bg-info">${pos.exchange}</span></td>
      <td>${pos.quantity.toFixed(6)}</td>
      <td>${formatCurrency(pos.entryPrice)}</td>
      <td>${formatCurrency(pos.currentPrice)}</td>
      <td class="${pos.profitLoss >= 0 ? 'profit-positive' : 'profit-negative'}">
        ${pos.profitLoss >= 0 ? '+' : ''}${formatCurrency(pos.profitLoss)}
      </td>
      <td class="${pos.profitLossPercent >= 0 ? 'profit-positive' : 'profit-negative'}">
        ${pos.profitLossPercent >= 0 ? '+' : ''}${pos.profitLossPercent.toFixed(2)}%
      </td>
      <td>
        <button class="btn btn-sm btn-danger" onclick="closePosition('${pos.symbol}')">Close</button>
      </td>
    </tr>
  `).join('');
}

// Update Trades Table
async function updateTrades() {
  try {
    const response = await fetch(`${API_URL}/trades?limit=10`);
    const data = await response.json();

    if (data.success && data.trades.length > 0) {
      const tbody = document.getElementById('tradesTable');
      tbody.innerHTML = data.trades.map(trade => `
        <tr>
          <td>${new Date(trade.timestamp).toLocaleTimeString()}</td>
          <td><strong>${trade.symbol}</strong></td>
          <td><span class="badge bg-info">${trade.exchange}</span></td>
          <td><span class="badge ${trade.type === 'buy' ? 'bg-success' : 'bg-danger'}">${trade.type.toUpperCase()}</span></td>
          <td>${trade.quantity}</td>
          <td>${formatCurrency(trade.price)}</td>
          <td>${formatCurrency(trade.total)}</td>
        </tr>
      `).join('');
    }
  } catch (error) {
    console.error('Failed to update trades:', error);
  }
}

// Close Position
async function closePosition(symbol) {
  if (!confirm(`Are you sure you want to close position ${symbol}?`)) {
    return;
  }

  try {
    const response = await fetch(`${API_URL}/positions/${encodeURIComponent(symbol)}/close`, {
      method: 'POST'
    });
    const data = await response.json();

    if (data.success) {
      showNotification(`Position ${symbol} closed successfully`, 'success');
      updateStatus();
    } else {
      showNotification(data.message, 'error');
    }
  } catch (error) {
    showNotification('Failed to close position: ' + error.message, 'error');
  }
}

// Update Button States
function updateButtonStates(status) {
  const startBtn = document.getElementById('startBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const stopBtn = document.getElementById('stopBtn');

  if (status === 'running') {
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    stopBtn.disabled = false;
  } else if (status === 'paused') {
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    stopBtn.disabled = false;
  } else {
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    stopBtn.disabled = true;
  }
}

// Get Status Badge Class
function getStatusClass(status) {
  switch (status) {
    case 'running':
      return 'bg-success';
    case 'paused':
      return 'bg-warning';
    case 'stopped':
      return 'bg-secondary';
    default:
      return 'bg-secondary';
  }
}

// Format Currency
function formatCurrency(value) {
  if (typeof value !== 'number') return '€0.00';
  return '€' + value.toFixed(2);
}

// Show Notification
function showNotification(message, type) {
  // Create alert element
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show`;
  alertDiv.style.position = 'fixed';
  alertDiv.style.top = '20px';
  alertDiv.style.right = '20px';
  alertDiv.style.zIndex = '9999';
  alertDiv.style.minWidth = '300px';
  alertDiv.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;

  document.body.appendChild(alertDiv);

  // Auto remove after 5 seconds
  setTimeout(() => {
    alertDiv.remove();
  }, 5000);
}

// Start Auto Update
function startAutoUpdate() {
  if (updateTimer) return;
  updateTimer = setInterval(updateStatus, UPDATE_INTERVAL);
  console.log('Auto-update started');
}

// Stop Auto Update
function stopAutoUpdate() {
  if (updateTimer) {
    clearInterval(updateTimer);
    updateTimer = null;
    console.log('Auto-update stopped');
  }
}

// Risk level slider
document.getElementById('riskLevel')?.addEventListener('input', (e) => {
  document.getElementById('riskValue').textContent = e.target.value;
});
