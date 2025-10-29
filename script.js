    const apiKey = "F8WV885YVBUK4FIE";
    let charts = [];

    document.addEventListener("DOMContentLoaded", () => {
      document.getElementById("trackBtn").addEventListener("click", getStock);
    });

    async function getStock() {
      const symbolInput = document.getElementById("symbol");
      const symbol = symbolInput.value.trim().toUpperCase();
      const stockCard = document.getElementById("stock-card");
      const chartSection = document.getElementById("chart-section");

      if (!symbol) {
        stockCard.innerHTML = `<h2>⚠️ Please enter a stock symbol.</h2>`;
        stockCard.classList.remove("hidden");
        return;
      }

      stockCard.innerHTML = `<div class="loading">🔄 Fetching data for <b>${symbol}</b>...</div>`;
      stockCard.classList.remove("hidden");
      chartSection.classList.add("hidden");

      try {
        let url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${symbol}&apikey=${apiKey}`;
        let response = await fetch(url);
        let data = await response.json();

        let timeSeries = data["Time Series (Daily)"];
        if (!timeSeries) {
          url = `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${symbol}&interval=5min&apikey=${apiKey}`;
          response = await fetch(url);
          data = await response.json();
          timeSeries = data["Time Series (5min)"];
        }
        if (data["Note"]) {
          stockCard.innerHTML = `<h2>⏳ API limit reached. Please wait a minute.</h2>`;
          return;
        }
        if (data["Error Message"] || !timeSeries) {
          stockCard.innerHTML = `<h2>❌ No data found for "${symbol}".</h2>`;
          return;
        }
        
        const dates = Object.keys(timeSeries).slice(0, 30).reverse();
        const closePrices = dates.map(d => parseFloat(timeSeries[d]["4. close"]));
        const highs = dates.map(d => parseFloat(timeSeries[d]["2. high"]));
        const lows = dates.map(d => parseFloat(timeSeries[d]["3. low"]));
        const volumes = dates.map(d =>
          parseFloat(timeSeries[d]["6. volume"] || timeSeries[d]["5. volume"] || 0)
        );

        const latest = timeSeries[dates[dates.length - 1]];
        const open = latest["1. open"];
        const high = latest["2. high"];
        const low = latest["3. low"];
        const close = latest["4. close"];

        
        stockCard.innerHTML = `
          <div class="stock-header">
            <h2>${symbol}</h2>
          </div>
          <div class="stock-info-container">
            <div class="info-block"><span>💰</span><strong>Current Price</strong><p>$${close}</p></div>
            <div class="info-block"><span>📈</span><strong>High</strong><p>$${high}</p></div>
            <div class="info-block"><span>📉</span><strong>Low</strong><p>$${low}</p></div>
            <div class="info-block"><span>🕓</span><strong>Open</strong><p>$${open}</p></div>
          </div>
        `;

        stockCard.classList.remove("hidden");
        chartSection.classList.remove("hidden");

        stockCard.scrollIntoView({ behavior: "smooth", block: "start" });

        buildCharts(dates, closePrices, highs, lows, volumes);

      } catch (error) {
        console.error(error);
        stockCard.innerHTML = `<h2>⚠️ Failed to fetch data. Try again later.</h2>`;
      }
    }

    function buildCharts(dates, closePrices, highs, lows, volumes) {
      charts.forEach(c => c.destroy());
      charts = [];

      const ctxList = ["chart1", "chart2", "chart3", "chart4", "chart5"]
        .map(id => document.getElementById(id).getContext("2d"));

      const gradient = ctxList[0].createLinearGradient(0, 0, 0, 400);
      gradient.addColorStop(0, "rgba(0,255,153,0.6)");
      gradient.addColorStop(1, "rgba(0,119,255,0.1)");

      const returns = closePrices.map((p, i) =>
        i === 0 ? 0 : ((p - closePrices[i - 1]) / closePrices[i - 1]) * 100
      );
      const ma5 = closePrices.map((_, i, arr) =>
        i >= 4 ? arr.slice(i - 4, i + 1).reduce((a, b) => a + b) / 5 : null
      );
      const ma10 = closePrices.map((_, i, arr) =>
        i >= 9 ? arr.slice(i - 9, i + 1).reduce((a, b) => a + b) / 10 : null
      );

      const baseOptions = title => ({
        responsive: true,
        plugins: {
          legend: { labels: { color: "#fff" } },
          title: { display: true, text: title, color: "#00ffcc" }
        },
        scales: {
          x: { ticks: { color: "#ccc" }, grid: { color: "rgba(255,255,255,0.05)" } },
          y: { ticks: { color: "#ccc" }, grid: { color: "rgba(255,255,255,0.05)" } }
        }
      });

      charts.push(new Chart(ctxList[0], {
        type: "line",
        data: {
          labels: dates,
          datasets: [{
            label: "Price Trend",
            data: closePrices,
            borderColor: "#00ffcc",
            backgroundColor: gradient,
            tension: 0.4,
            fill: true
          }]
        },
        options: baseOptions("30-Day Price Trend")
      }));

      charts.push(new Chart(ctxList[1], {
        type: "bar",
        data: { labels: dates, datasets: [{ label: "Trading Volume", data: volumes, backgroundColor: "rgba(255,200,50,0.6)" }] },
        options: baseOptions("Daily Trading Volume")
      }));

      charts.push(new Chart(ctxList[2], {
        type: "line",
        data: { labels: dates, datasets: [
          { label: "High", data: highs, borderColor: "#00ff66" },
          { label: "Low", data: lows, borderColor: "#ff6666" }
        ] },
        options: baseOptions("High vs Low")
      }));

      charts.push(new Chart(ctxList[3], {
        type: "line",
        data: { labels: dates, datasets: [
          { label: "MA5", data: ma5, borderColor: "#0077ff" },
          { label: "MA10", data: ma10, borderColor: "#00ffaa" }
        ] },
        options: baseOptions("Moving Averages (5 & 10 Days)")
      }));

      charts.push(new Chart(ctxList[4], {
        type: "bar",
        data: { labels: dates, datasets: [{
          label: "Daily Returns (%)",
          data: returns,
          backgroundColor: returns.map(r => r >= 0 ? "rgba(0,255,100,0.7)" : "rgba(255,50,50,0.7)")
        }] },
        options: baseOptions("Daily % Change")
      }));
    }
