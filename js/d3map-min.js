(function () {
  const d3 = window.d3;

  window.AGVMapMin = function createMap(el) {
    const w = el.clientWidth;
    const h = el.clientHeight;

    const svg = d3.select(el).append("svg")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("viewBox", `0 0 ${w} ${h}`);

    const g = svg.append("g").attr("transform", "translate(10,10)");

    g.append("rect")
      .attr("x", 0).attr("y", 0)
      .attr("width", w - 20).attr("height", h - 20)
      .attr("rx", 16)
      .attr("fill", "rgba(255,255,255,0.02)")
      .attr("stroke", "rgba(36,51,95,0.9)");

    const zones = [
      { id: "Dock", x: 40, y: 40, w: 160, h: 80 },
      { id: "Storage", x: 240, y: 40, w: 260, h: 140 },
      { id: "Pick", x: 240, y: 210, w: 260, h: 90 },
      { id: "Pack", x: 40, y: 150, w: 160, h: 150 }
    ];

    g.selectAll("rect.zone")
      .data(zones)
      .enter()
      .append("rect")
      .attr("x", d => d.x).attr("y", d => d.y)
      .attr("width", d => d.w).attr("height", d => d.h)
      .attr("rx", 14)
      .attr("fill", "rgba(124,92,255,0.05)")
      .attr("stroke", "rgba(124,92,255,0.22)");

    g.selectAll("text.zone")
      .data(zones)
      .enter()
      .append("text")
      .attr("x", d => d.x + 10).attr("y", d => d.y + 18)
      .attr("fill", "rgba(233,239,255,0.7)")
      .attr("font-size", 11)
      .attr("font-weight", 900)
      .text(d => d.id);

    function update(snapshot) {
      const join = g.selectAll("g.agv").data(snapshot.fleet, d => d.id);

      const enter = join.enter().append("g").attr("class", "agv");

      enter.append("circle")
        .attr("r", 8)
        .attr("fill", "rgba(233,239,255,0.12)")
        .attr("stroke", "rgba(233,239,255,0.35)")
        .attr("stroke-width", 2);

      enter.append("circle")
        .attr("r", 4)
        .attr("fill", "rgba(0,208,255,0.85)");

      join.merge(enter)
        .transition().duration(220)
        .attr("transform", d => `translate(${d.x/3},${d.y/3})`)
        .selection()
        .select("circle:nth-child(2)")
        .attr("fill", d => d.state === "FAULT"
          ? "rgba(255,77,109,0.9)"
          : d.state === "CHARGING"
            ? "rgba(255,204,0,0.9)"
            : "rgba(0,208,255,0.85)"
        );

      join.exit().remove();
    }

    return { update };
  };
})();
