(function () {
  const rand = (min, max) => min + Math.random() * (max - min);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  window.AGVSim = function createSim() {
    const fleet = Array.from({ length: 14 }).map((_, i) => {
      const type = i % 3 === 0 ? "FORK" : i % 3 === 1 ? "TUGGER" : "CART";
      return {
        id: `AGV-${String(i + 1).padStart(2, "0")}`,
        type,
        battery: rand(35, 98),
        speed: rand(0.4, 1.8),
        latencyMs: rand(20, 90),
        state: "ACTIVE",
        zone: ["Dock", "Sort", "Storage", "Pick", "Pack"][i % 5],
        x: rand(100, 900),
        y: rand(80, 520),
        heading: rand(0, Math.PI * 2),
        task: { from: "Dock", to: "Storage", etaSec: rand(20, 140), progress: rand(0.1, 0.9) }
      };
    });

    const congestionCells = Array.from({ length: 12 * 7 }).map((_, idx) => ({ idx, value: rand(0, 1) }));
    const incidentLog = [];
    const feed = [];

    let paused = false;
    let speedFactor = 1;
    let lastTick = Date.now();

    function pushFeed(level, title, details) {
      feed.unshift({ ts: Date.now(), level, title, details });
      if (feed.length > 30) feed.pop();
    }

    pushFeed("good", "System", "Telemetry channel online.");
    pushFeed("warn", "Maintenance", "AGV-03 scheduled for wheel inspection (prototype).");

    function kpis() {
      const active = fleet.filter(a => a.state === "ACTIVE").length;
      const avgBattery = fleet.reduce((s, a) => s + a.battery, 0) / fleet.length;
      const avgLatency = fleet.reduce((s, a) => s + a.latencyMs, 0) / fleet.length;
      const congestion = congestionCells.reduce((s, c) => s + c.value, 0) / congestionCells.length;
      const throughput = Math.round(220 + Math.sin(Date.now() / 9000) * 35 + rand(-10, 12));
      const uptime = clamp(99.2 + Math.sin(Date.now() / 24000) * 0.25, 98.7, 99.8);
      return { active, avgBattery, avgLatency, congestion, throughput, uptime };
    }

    function injectIncident() {
      const victim = fleet[Math.floor(Math.random() * fleet.length)];
      const incident = {
        id: `INC-${Math.floor(rand(1000, 9999))}`,
        ts: Date.now(),
        agvId: victim.id,
        type: "JAM",
        msg: "Chokepoint jam detected",
        at: { x: victim.x, y: victim.y }
      };
      incidentLog.push(incident);
      pushFeed("bad", "Incident", `${victim.id} jam at zone: ${victim.zone}.`);

      victim.latencyMs = clamp(victim.latencyMs + rand(60, 140), 30, 260);
      victim.speed = clamp(victim.speed * 0.35, 0.1, 0.7);
      victim.state = "FAULT";

      setTimeout(() => {
        victim.state = "ACTIVE";
        victim.speed = rand(0.6, 1.8);
        pushFeed("good", "Recovered", `${victim.id} recovered from jam.`);
      }, 5500);
    }

    function tick() {
      const t = Date.now();
      const dt = paused ? 0 : (t - lastTick) / 1000;
      lastTick = t;

      if (!paused) {
        congestionCells.forEach(c => (c.value = clamp(c.value + rand(-0.06, 0.06), 0, 1)));

        fleet.forEach(a => {
          a.battery = clamp(a.battery - dt * rand(0.03, 0.09) * speedFactor, 0, 100);

          if (a.battery < 15 && a.state !== "CHARGING") {
            a.state = "CHARGING";
            pushFeed("warn", "Battery", `${a.id} heading to charge.`);
          }
          if (a.state === "CHARGING") {
            a.speed = clamp(a.speed * 0.4, 0.05, 0.5);
            a.battery = clamp(a.battery + dt * rand(0.25, 0.45) * speedFactor, 0, 100);
            if (a.battery > 85) {
              a.state = "ACTIVE";
              a.speed = rand(0.6, 1.7);
              pushFeed("good", "Battery", `${a.id} charged and back online.`);
            }
          }

          a.latencyMs = clamp(a.latencyMs + rand(-8, 10), 10, 240);

          if (a.state === "ACTIVE") {
            a.heading += rand(-0.25, 0.25) * dt * speedFactor;
            const v = a.speed * 85 * dt * speedFactor;
            a.x += Math.cos(a.heading) * v;
            a.y += Math.sin(a.heading) * v;

            if (a.x < 70 || a.x > 930) a.heading = Math.PI - a.heading;
            if (a.y < 60 || a.y > 540) a.heading = -a.heading;
            a.x = clamp(a.x, 70, 930);
            a.y = clamp(a.y, 60, 540);

            a.task.progress = clamp(a.task.progress + dt * rand(0.03, 0.08) * speedFactor, 0, 1);
            if (a.task.progress >= 1) {
              const zones = ["Dock", "Sort", "Storage", "Pick", "Pack"];
              a.task = { from: a.zone, to: zones[Math.floor(Math.random() * zones.length)], etaSec: rand(35, 160), progress: 0 };
              a.zone = a.task.to;
              if (Math.random() < 0.12) pushFeed("warn", "Fault", `${a.id}: NAV-201 • Path blocked`);
            }
          }
        });

        if (Math.random() < 0.06) pushFeed("good", "Ops", "Dock queue cleared faster than expected (prototype).");
      }

      return snapshot();
    }

    function snapshot() {
      const k = kpis();
      const pareto = [
        { label: "NAV-201", value: Math.round(18 + rand(-4, 6)) },
        { label: "BAT-301", value: Math.round(14 + rand(-3, 5)) },
        { label: "CTRL-404", value: Math.round(9 + rand(-2, 4)) },
        { label: "SENS-101", value: Math.round(7 + rand(-2, 3)) },
        { label: "MAP-110", value: Math.round(4 + rand(-1, 2)) }
      ].sort((a, b) => b.value - a.value);

      return {
        ts: Date.now(),
        fleet: fleet.map(a => ({ ...a })),
        kpis: k,
        congestionCells: congestionCells.map(c => ({ ...c })),
        incidentLog: incidentLog.slice(-20),
        feed: feed.slice(0, 30),
        pareto
      };
    }

    return {
      tick,
      snapshot,
      setPaused(v) { paused = v; },
      setSpeedFactor(v) { speedFactor = v; },
      injectIncident
    };
  };
})();
