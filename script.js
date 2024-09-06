// Get chart container and create chart instance
const chartContainer = document.getElementById('chart');
const chart = LightweightCharts.createChart(chartContainer, {
    width: chartContainer.clientWidth,
    height: chartContainer.clientHeight,
    layout: {
        background: { color: '#1e222d' },
        textColor: '#d1d4dc',
    },
    grid: {
        vertLines: { visible: false },
        horzLines: { visible: false },
    },
    crosshair: {
        mode: LightweightCharts.CrosshairMode.Normal,
        vertLine: {
            width: 1,
            color: 'rgba(224, 227, 235, 0.1)',
            style: 0,
        },
        horzLine: {
            width: 1,
            color: 'rgba(224, 227, 235, 0.1)',
            style: 0,
        },
    },
    timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: '#2B2B43',
    },
    rightPriceScale: {
        borderColor: '#2B2B43',
        formatPrice: price => price.toFixed(5),
    },
});

const candleSeries = chart.addCandlestickSeries({
    upColor: '#0ecb81',
    downColor: '#f6465d',
    borderUpColor: '#0ecb81',
    borderDownColor: '#f6465d',
    wickUpColor: '#0ecb81',
    wickDownColor: '#f6465d',
    priceFormat: {
        type: 'price',
        precision: 5,
        minMove: 0.00001,
    },
});

// Helper functions to get and set cookies
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

function setCookie(name, value, days) {
    const d = new Date();
    d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = `expires=${d.toUTCString()}`;
    document.cookie = `${name}=${value}; ${expires}; path=/`;
}

// Get current settings from cookies
let currentSymbol = getCookie('symbol') || 'BTCUSDT';
let currentInterval = getCookie('interval') || '1m';
let currentTheme = getCookie('theme') || 'midnight';

// Set initial values for dropdowns
document.getElementById('timeframe-dropdown').value = currentInterval;
document.getElementById('theme-dropdown').value = currentTheme;

// Fetch candlestick data
async function fetchCandlestickData(symbol = 'BTCUSDT', interval = '1m') {
    const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=1000`);
    const data = await response.json();
    return data.map(d => ({
        time: d[0] / 1000 + 3600,
        open: parseFloat(d[1]),
        high: parseFloat(d[2]),
        low: parseFloat(d[3]),
        close: parseFloat(d[4])
    }));
}

// Update chart with new data and update the tab title
async function updateChart() {
    const data = await fetchCandlestickData(currentSymbol, currentInterval);
    candleSeries.setData(data);

    if (data.length > 0) {
        document.title = `${currentSymbol} ${data[data.length - 1].close.toFixed(5)}`;
    }
}

// Caching mechanism for top coins data
let cachedTopCoinsData = null;
let lastTopCoinsFetchTime = 0;
const CACHE_DURATION = 1000; // 1 second in milliseconds

// Fetch top coins data with caching
async function fetchTopCoins() {
    const currentTime = Date.now();
    
    if (cachedTopCoinsData && (currentTime - lastTopCoinsFetchTime < CACHE_DURATION)) {
        return cachedTopCoinsData;
    }

    try {
        const response = await fetch('https://api.binance.com/api/v3/ticker/24hr');
        const data = await response.json();
        
        const currentTime = Date.now();
        const oneDayInMs = 24 * 60 * 60 * 1000;
        const minVolume = 10000;

        const processedData = data
            .filter(coin => coin.symbol.endsWith('USDT') &&
                            parseFloat(coin.quoteVolume) > minVolume &&
                            parseFloat(coin.lastPrice) > 0 &&
                            (currentTime - coin.closeTime) < oneDayInMs)
            .sort((a, b) => parseFloat(b.priceChangePercent) - parseFloat(a.priceChangePercent));

        cachedTopCoinsData = processedData;
        lastTopCoinsFetchTime = currentTime;
        
        return processedData;
    } catch (error) {
        console.error('Error fetching data from Binance:', error);
        return cachedTopCoinsData || [];
    }
}

// Update coin list and synchronize the selected coin with the chart
async function updateCoinList() {
    const coinList = document.getElementById('coin-list');
    const coins = await fetchTopCoins();
    coinList.innerHTML = '';
    coins.forEach(coin => {
        const priceChange = parseFloat(coin.priceChangePercent);
        const changeClass = priceChange > 0 ? 'positive' : priceChange < 0 ? 'negative' : 'neutral';
        const [base, quote] = [coin.symbol.slice(0, -4), coin.symbol.slice(-4)];
        const item = document.createElement('div');
        item.className = 'coin-item';
        item.innerHTML = `
            <div class="pair">${base}<span>${quote}</span></div>
            <div class="coin-price">${parseFloat(coin.lastPrice).toFixed(5)}</div>
            <div class="coin-change ${changeClass}">${priceChange.toFixed(2)}%</div>
        `;
        item.addEventListener('click', () => {
            document.querySelectorAll('.coin-item').forEach(el => el.classList.remove('selected'));
            item.classList.add('selected');
            currentSymbol = coin.symbol;
            setCookie('symbol', currentSymbol, 7);
            updateChart();
        });
        coinList.appendChild(item);

        if (coin.symbol === currentSymbol) {
            item.classList.add('selected');
        }
    });
}

// Refresh chart with the latest data (single candle update)
function refreshChart() {
    fetchCandlestickData(currentSymbol, currentInterval).then(data => {
        candleSeries.update(data[data.length - 1]);
        if (data.length > 0) {
            document.title = `${currentSymbol} ${data[data.length - 1].close.toFixed(5)}`;
        }
    });
}

// Handle timeframe changes
document.getElementById('timeframe-dropdown').addEventListener('change', function () {
    currentInterval = this.value;
    setCookie('interval', currentInterval, 7);
    updateChart();
});

// Apply and persist theme changes
function applyTheme(theme) {
    document.body.className = `${theme}-theme`;
    document.getElementById('app').className = `${theme}-theme`;
    updateChartTheme(theme);
    setCookie('theme', theme, 7);
}

function updateChartTheme(theme) {
    const chartBackgroundColor = theme === 'daylight' ? '#ffffff' : '#1e222d';
    const chartTextColor = theme === 'daylight' ? '#000000' : '#d1d4dc';
    const gridColor = theme === 'daylight' ? '#e0e0e0' : '#2B2B43';
    const crosshairColor = theme === 'daylight' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(224, 227, 235, 0.1)';

    chart.applyOptions({
        layout: {
            background: { color: chartBackgroundColor },
            textColor: chartTextColor,
        },
        grid: {
            vertLines: { color: gridColor },
            horzLines: { color: gridColor },
        },
        crosshair: {
            mode: LightweightCharts.CrosshairMode.Normal,
            vertLine: {
                width: 1,
                color: crosshairColor,
                style: 0,
            },
            horzLine: {
                width: 1,
                color: crosshairColor,
                style: 0,
            },
        },
        timeScale: {
            borderColor: gridColor,
        },
        rightPriceScale: {
            borderColor: gridColor,
        }
    });
}

// Listen for theme dropdown changes
document.getElementById('theme-dropdown').addEventListener('change', function () {
    const selectedTheme = this.value.toLowerCase();
    applyTheme(selectedTheme);
});

// Initialize the app with persistent settings
async function initialize() {
    applyTheme(currentTheme);
    await updateCoinList();
    await updateChart();
    startLiveUpdates();
}

// Live updates in sync for coin list, chart, and tab title
function startLiveUpdates() {
    setInterval(async () => {
        await Promise.all([refreshChart(), updateCoinList()]);
    }, 1000); // Update everything every second
}

// Start the application
initialize();