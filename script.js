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
        formatPrice: price => price.toFixed(5), // Increase precision to 5 decimal places
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
        precision: 5, // Increase precision to 5 decimal places
        minMove: 0.00001, // Set the minimum price movement
    },
});

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

let currentSymbol = getCookie('symbol') || 'BTCUSDT';
let currentInterval = getCookie('interval') || '1m';

// Set the initial title
document.title = `${currentSymbol} - Loading...`;

document.getElementById('timeframe-dropdown').value = currentInterval; // Set the dropdown to the current interval

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

async function updateChart() {
    const coin = currentSymbol;
    const interval = currentInterval;
    const data = await fetchCandlestickData(coin, interval);
    candleSeries.setData(data);

    const visibleRange = {
        from: data[data.length - 100].time,
        to: data[data.length - 1].time
    };
    chart.timeScale().setVisibleRange(visibleRange);

    // Update the tab title with the current symbol and last price
    if (data.length > 0) {
        document.title = `${coin} ${data[data.length - 1].close.toFixed(5)}`;
    }

    // Highlight the current symbol in the coin list
    document.querySelectorAll('.coin-item').forEach(el => el.classList.remove('selected'));
    const selectedCoin = [...document.querySelectorAll('.coin-item')].find(el => el.textContent.includes(currentSymbol));
    if (selectedCoin) {
        selectedCoin.classList.add('selected');
    }
}

async function fetchTopCoins() {
    return fetch('https://api.binance.com/api/v3/ticker/24hr')
        .then(response => response.json())
        .then(data => {
            const currentTime = Date.now();
            const oneDayInMs = 24 * 60 * 60 * 1000;
            const minVolume = 10000;

            return data
                .filter(coin => coin.symbol.endsWith('USDT') &&
                                 parseFloat(coin.quoteVolume) > minVolume &&
                                 parseFloat(coin.lastPrice) > 0 &&
                                 (currentTime - coin.closeTime) < oneDayInMs)
                .sort((a, b) => parseFloat(b.priceChangePercent) - parseFloat(a.priceChangePercent));
        });
}

async function updateCoinList() {
    const coinList = document.getElementById('coin-list');
    const coins = await fetchTopCoins();
    coinList.innerHTML = ''; // Clear the coin list container
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

        // Highlight the current symbol
        if (coin.symbol === currentSymbol) {
            item.classList.add('selected');
        }
    });
}

function refreshChart() {
    fetchCandlestickData(currentSymbol, currentInterval).then(data => {
        candleSeries.update(data[data.length - 1]);
        
        // Update the tab title with the current symbol and last price
        if (data.length > 0) {
            document.title = `${currentSymbol} ${data[data.length - 1].close.toFixed(5)}`;
        }
    });
}

document.getElementById('timeframe-dropdown').addEventListener('change', function () {
    currentInterval = this.value;
    setCookie('interval', currentInterval, 7);
    updateChart();
});

function startLiveUpdates() {
    setInterval(updateCoinList, 1000);
    setInterval(refreshChart, 1000);
}

// Initialize the app
async function initialize() {
    await updateCoinList();
    await updateChart();
    startLiveUpdates();
}

initialize();
