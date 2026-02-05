(function () {
  const { Chart } = window;

  Chart.register(window.ChartZoom);
  Chart.register(window['chartjs-plugin-annotation']);
  Chart.register(window.ChartDataLabels);

  window.AGVChartsMin = function createCharts(opts) {
    const telemetryData = {
      datasets: [
        { label: "Speed (m/s)", data: [], tension: 0.25, pointRadius: 0, borderWidth: 2, yAxisID: "ySpeed" },
        { label: "Latency (ms)", data: [], tension: 0.25, pointRadius: 0, borderWidth: 2, yAxisID: "yLat" }
      ]
    };

    const telemetryChart = new Chart(opts.telemetryCanvas, {
      type: "line",
      data: telemetryData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { labels: { color: "rgba(233,239,255,.85)" } },
          zoom: { zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: "x" }, pan: { enabled: true, mode: "x" } },
          annotation: { annotations: {} },
          datalabels: { display: false }
        },
        scales: {
          x: { type: "linear", ticks: { display: false }, grid: { color: "rgba(36,51,95,.45)" } },
          ySpeed: { position: "left", ticks: { color: "rgba(233,239,255,.6)" }, grid: { color: "rgba(36,51,95,.30)" } },
          yLat: { position: "right", ticks: { color: "rgba(233,239,255,.6)" }, grid: { display: false } }
        }
      }
    });

    opts.telemetryCanvas.addEventListener("dblclick", () => telemetryChart.resetZoom());

    const batteryChart = new Chart(opts.batteryCanvas, {
      type: "bar",
      data: { labels: ["0-20", "21-40", "41-60", "61-80", "81-100"], datasets: [{ label: "AGVs", data: [0,0,0,0,0], borderWidth: 1 }] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: "rgba(233,239,255,.85)" } },
          datalabels: { anchor: "end", align: "top", color: "rgba(233,239,255,.85)", formatter: (v) => (v ? v : "") }
        },
        scales: {
          x: { ticks: { color: "rgba(233,239,255,.6)" }, grid: { display: false } },
          y: { ticks: { color: "rgba(233,239,255,.6)" }, grid: { color: "rgba(36,51,95,.30)" } }
        }
      }
    });

    function setTelemetryStatus(live) {
      opts.telemetryStatusEl.textContent = live ? "LIVE" : "PAUSED";
      opts.telemetryStatusEl.style.borderColor = live ? "rgba(0,208,255,.35)" : "rgba(255,204,0,.35)";
      opts.telemetryStatusEl.style.background = live ? "rgba(0,208,255,.10)" : "rgba(255,204,0,.10)";
    }

    function updateFeed(items) {
      opts.feedEl.innerHTML = items.map(it => {
        const time = new Date(it.ts).toLocaleTimeString();
        return `
          <div class="feedItem">
            <div class="badge ${it.level}">${it.level.toUpperCase()}</div>
            <div>
              <div style="font-weight:900">${it.title} <span style="color:rgba(233,239,255,.55); font-weight:600">• ${time}</span></div>
              <div style="color:rgba(233,239,255,.75); margin-top:2px">${it.details}</div>
            </div>
          </div>
        `;
      }).join("");
    }

    function update(snapshot) {
      const t = snapshot.ts;
      const speedAvg = snapshot.fleet.reduce((s, a) => s + a.speed, 0) / snapshot.fleet.length;
      const latAvg = snapshot.fleet.reduce((s, a) => s + a.latencyMs, 0) / snapshot.fleet.length;

      telemetryData.datasets[0].data.push({ x: t, y: speedAvg });
      telemetryData.datasets[1].data.push({ x: t, y: latAvg });
      telemetryData.datasets.forEach(ds => { if (ds.data.length > 70) ds.data.shift(); });

      const anns = {};
      snapshot.incidentLog.slice(-4).forEach((inc, idx) => {
        anns["inc-" + idx] = { type: "line", xMin: inc.ts, xMax: inc.ts, borderWidth: 2, borderDash: [6,4], label: { display: true, content: `INC • ${inc.agvId}`, position: "start" } };
      });
      telemetryChart.options.plugins.annotation.annotations = anns;
      telemetryChart.update("none");

      const bins = [0,0,0,0,0];
      snapshot.fleet.forEach(a => {
        const b = a.battery;
        if (b <= 20) bins[0]++; else if (b <= 40) bins[1]++; else if (b <= 60) bins[2]++; else if (b <= 80) bins[3]++; else bins[4]++;
      });
      batteryChart.data.datasets[0].data = bins;
      batteryChart.update("none");

      updateFeed(snapshot.feed);
    }

    return { update, setTelemetryStatus };
  };
})();
