(function () {
  const sim = window.AGVSim();

  const telemetryStatusEl = document.getElementById("telemetryStatus");

  const charts = window.AGVChartsMin({
    telemetryCanvas: document.getElementById("telemetryChart"),
    batteryCanvas: document.getElementById("batteryChart"),
    feedEl: document.getElementById("feed"),
    telemetryStatusEl
  });

  const map = window.AGVMapMin(document.getElementById("warehouseViz"));

  const kpiEls = {
    active: document.getElementById("kpiActive"),
    activeHint: document.getElementById("kpiActiveHint"),
    throughput: document.getElementById("kpiThroughput"),
    throughputHint: document.getElementById("kpiThroughputHint"),
    battery: document.getElementById("kpiBattery"),
    batteryHint: document.getElementById("kpiBatteryHint")
  };

  let paused = false;

  const pauseBtn = document.getElementById("pauseBtn");
  pauseBtn.addEventListener("click", () => {
    paused = !paused;
    sim.setPaused(paused);
    pauseBtn.textContent = paused ? "Resume" : "Pause";
    charts.setTelemetryStatus(!paused);
  });

  document.getElementById("injectIncidentBtn").addEventListener("click", () => sim.injectIncident());
  document.getElementById("clearFeedBtn").addEventListener("click", () => (document.getElementById("feed").innerHTML = ""));

  const speedRange = document.getElementById("speedRange");
  const speedValue = document.getElementById("speedValue");
  speedRange.addEventListener("input", () => {
    const v = Number(speedRange.value);
    speedValue.textContent = `${v.toFixed(2)}x`;
    sim.setSpeedFactor(v);
  });

  function renderKPIs(snap) {
    const k = snap.kpis;
    kpiEls.active.textContent = `${k.active}/${snap.fleet.length}`;
    kpiEls.activeHint.textContent = `Fault: ${snap.fleet.filter(a => a.state === "FAULT").length} • Charging: ${snap.fleet.filter(a => a.state === "CHARGING").length}`;

    kpiEls.throughput.textContent = `${k.throughput}`;
    kpiEls.throughputHint.textContent = `Queue: ${(2 + Math.random() * 6).toFixed(0)} mins`;

    kpiEls.battery.textContent = `${k.avgBattery.toFixed(0)}%`;
    kpiEls.batteryHint.textContent = `Low (<20%): ${snap.fleet.filter(a => a.battery <= 20).length}`;
  }

  function loop() {
    const snap = sim.tick();

    renderKPIs(snap);
    map.update(snap);

    if (!paused) charts.update(snap);

    requestAnimationFrame(loop);
  }

  loop();
})();
