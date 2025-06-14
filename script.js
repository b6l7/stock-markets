// Global variables
let stockChart = null;
let currentStockData = null;
let currentChartType = 'line';
let showMovingAverage = false;

// Sample stock data generator
function generateSampleData(symbol) {
    const data = [];
    const labels = [];
    const basePrice = Math.random() * 200 + 100;
    let currentPrice = basePrice;
    
    for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        labels.push(date.toLocaleDateString());
        
        const change = (Math.random() - 0.5) * 10;
        currentPrice += change;
        currentPrice = Math.max(currentPrice, basePrice * 0.7);
        currentPrice = Math.min(currentPrice, basePrice * 1.3);
        
        const high = currentPrice + Math.random() * 5;
        const low = currentPrice - Math.random() * 5;
        const volume = Math.floor(Math.random() * 1000000) + 100000;
        
        data.push({
            date: labels[labels.length - 1],
            open: currentPrice - (Math.random() - 0.5) * 2,
            high: high,
            low: Math.max(low, 1),
            close: currentPrice,
            volume: volume
        });
    }
    
    return { symbol, data, labels };
}

// Technical indicators calculations
function calculateSMA(data, period) {
    if (data.length < period) return data[data.length - 1]?.close || 0;
    const sum = data.slice(-period).reduce((sum, item) => sum + item.close, 0);
    return sum / period;
}

function calculateEMA(data, period) {
    if (data.length === 0) return 0;
    if (data.length < period) return data[data.length - 1].close;
    
    const multiplier = 2 / (period + 1);
    let ema = data[0].close;
    
    for (let i = 1; i < data.length; i++) {
        ema = (data[i].close * multiplier) + (ema * (1 - multiplier));
    }
    
    return ema;
}

function calculateRSI(data, period = 14) {
    if (data.length < period + 1) return 50;
    
    let gains = 0;
    let losses = 0;
    
    for (let i = data.length - period; i < data.length; i++) {
        const change = data[i].close - data[i - 1].close;
        if (change > 0) {
            gains += change;
        } else {
            losses -= change;
        }
    }
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    
    if (avgLoss === 0) return 100;
    
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
}

function calculateMACD(data) {
    if (data.length < 26) return { macd: 0, signal: 0, histogram: 0 };
    
    const ema12 = calculateEMA(data, 12);
    const ema26 = calculateEMA(data, 26);
    const macd = ema12 - ema26;
    
    return { macd: macd, signal: 0, histogram: macd };
}

// Linear regression for prediction
function linearRegression(data) {
    const n = data.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    
    data.forEach((point, index) => {
        sumX += index;
        sumY += point.close;
        sumXY += index * point.close;
        sumXX += index * index;
    });
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    const predictions = [];
    for (let i = 1; i <= 5; i++) {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + i);
        predictions.push({
            date: futureDate.toLocaleDateString(),
            price: slope * (n + i - 1) + intercept
        });
    }
    
    return predictions;
}

// Chart creation and management
function createChart(data, labels) {
    const ctx = document.getElementById('stockChart').getContext('2d');
    
    if (stockChart) {
        stockChart.destroy();
    }
    
    const datasets = [{
        label: `${data.symbol} Price`,
        data: data.data.map(item => item.close),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: currentChartType === 'line',
        tension: 0.4
    }];
    
    if (showMovingAverage) {
        const smaData = [];
        for (let i = 0; i < data.data.length; i++) {
            smaData.push(calculateSMA(data.data.slice(0, i + 1), Math.min(20, i + 1)));
        }
        
        datasets.push({
            label: 'SMA (20)',
            data: smaData,
            borderColor: '#ef4444',
            backgroundColor: 'transparent',
            fill: false,
            tension: 0.4
        });
    }
    
    stockChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: 'white'
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: $${context.parsed.y.toFixed(2)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Date',
                        color: 'white'
                    },
                    ticks: {
                        color: 'white'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                y: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Price ($)',
                        color: 'white'
                    },
                    ticks: {
                        color: 'white'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                }
            }
        }
    });
}

// Update stock information panel
function updateStockInfo(data) {
    const latestData = data.data[data.data.length - 1];
    const previousData = data.data[data.data.length - 2];
    
    document.getElementById('symbolValue').textContent = data.symbol;
    document.getElementById('currentPrice').textContent = `$${latestData.close.toFixed(2)}`;
    
    const change = latestData.close - previousData.close;
    const changePercent = (change / previousData.close) * 100;
    const changeElement = document.getElementById('dailyChange');
    changeElement.textContent = `${change > 0 ? '+' : ''}${change.toFixed(2)} (${changePercent.toFixed(2)}%)`;
    changeElement.className = `info-value ${change > 0 ? 'positive' : 'negative'}`;
    
    document.getElementById('volume').textContent = latestData.volume.toLocaleString();
    document.getElementById('highPrice').textContent = `$${latestData.high.toFixed(2)}`;
    document.getElementById('lowPrice').textContent = `$${latestData.low.toFixed(2)}`;
}

// Update technical indicators
function updateIndicators(data) {
    const rsi = calculateRSI(data.data);
    const macd = calculateMACD(data.data);
    const sma = calculateSMA(data.data, 20);
    const ema = calculateEMA(data.data, 12);
    
    document.getElementById('rsiValue').textContent = rsi.toFixed(2);
    document.getElementById('macdValue').textContent = macd.macd.toFixed(2);
    document.getElementById('smaValue').textContent = `$${sma.toFixed(2)}`;
    document.getElementById('emaValue').textContent = `$${ema.toFixed(2)}`;
}

// Error handling
function showError(message) {
    const errorContainer = document.getElementById('errorContainer');
    errorContainer.innerHTML = `<div class="error-message">${message}</div>`;
    setTimeout(() => {
        errorContainer.innerHTML = '';
    }, 5000);
}

// Validation
function validateStockSymbol(symbol) {
    if (!symbol || symbol.trim() === '') {
        throw new Error('Please enter a stock symbol');
    }
    if (symbol.length > 10) {
        throw new Error('Stock symbol is too long');
    }
    if (!/^[A-Za-z]+$/.test(symbol)) {
        throw new Error('Stock symbol should contain only letters');
    }
    return symbol.toUpperCase();
}

// Main functions
function searchStock() {
    try {
        const symbol = validateStockSymbol(document.getElementById('stockSymbol').value);
        
        document.getElementById('errorContainer').innerHTML = '<div class="loading">Loading stock data...</div>';
        
        setTimeout(() => {
            try {
                currentStockData = generateSampleData(symbol);
                createChart(currentStockData, currentStockData.labels);
                updateStockInfo(currentStockData);
                updateIndicators(currentStockData);
                document.getElementById('errorContainer').innerHTML = '';
            } catch (error) {
                showError('Failed to load stock data. Please try again.');
            }
        }, 1000);
        
    } catch (error) {
        showError(error.message);
    }
}

function loadSampleStock(symbol) {
    document.getElementById('stockSymbol').value = symbol;
    searchStock();
}

function changeChartType(type) {
    currentChartType = type;
    
    document.querySelectorAll('.control-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    if (currentStockData) {
        createChart(currentStockData, currentStockData.labels);
    }
}

function toggleMovingAverage() {
    showMovingAverage = !showMovingAverage;
    event.target.classList.toggle('active');
    
    if (currentStockData) {
        createChart(currentStockData, currentStockData.labels);
    }
}

function resetZoom() {
    if (stockChart) {
        stockChart.resetZoom();
    }
}

function generatePrediction() {
    if (!currentStockData) {
        showError('Please search for a stock first');
        return;
    }
    
    try {
        const predictions = linearRegression(currentStockData.data);
        const currentPrice = currentStockData.data[currentStockData.data.length - 1].close;
        const predictedPrice = predictions[4].price;
        const change = predictedPrice - currentPrice;
        const changePercent = (change / currentPrice) * 100;
        
        const predictionContent = document.getElementById('predictionContent');
        predictionContent.innerHTML = `
            <div class="prediction-result">
                <h3>5-Day Prediction</h3>
                <div style="font-size: 24px; margin: 10px 0;">
                    $${predictedPrice.toFixed(2)}
                </div>
                <div class="${change > 0 ? 'positive' : 'negative'}">
                    ${change > 0 ? '+' : ''}${change.toFixed(2)} (${changePercent.toFixed(2)}%)
                </div>
                <small style="opacity: 0.8; margin-top: 10px; display: block;">
                    Based on linear regression analysis
                </small>
            </div>
        `;
    } catch (error) {
        showError('Failed to generate prediction. Please try again.');
    }
}

// Keyboard shortcuts
document.getElementById('stockSymbol').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        searchStock();
    }
});

// Initialize with default stock
window.onload = function() {
    loadSampleStock('AAPL');
};