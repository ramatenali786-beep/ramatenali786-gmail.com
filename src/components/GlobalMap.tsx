import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

export function GlobalMap() {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const width = 800;
    const height = 400;
    const svg = d3.select(svgRef.current)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('width', '100%')
      .attr('height', 'auto');

    svg.selectAll('*').remove();

    const projection = d3.geoNaturalEarth1()
      .scale(150)
      .translate([width / 2, height / 2]);

    const path = d3.geoPath().projection(projection);

    // Load world map data
    d3.json('https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson').then((data: any) => {
      // Draw countries
      svg.append('g')
        .selectAll('path')
        .data(data.features)
        .enter()
        .append('path')
        .attr('d', path)
        .attr('fill', '#1a1a1a')
        .attr('stroke', '#ffffff10')
        .attr('stroke-width', 0.5);

      // Add simulated connection arcs
      const links = [
        { type: 'LineString', coordinates: [[-74, 40], [139, 35]] }, // NY to Tokyo
        { type: 'LineString', coordinates: [[2, 48], [77, 28]] },   // Paris to Delhi
        { type: 'LineString', coordinates: [[-122, 37], [-43, -22]] }, // SF to Rio
        { type: 'LineString', coordinates: [[18, -33], [115, -31]] }, // Cape Town to Perth
      ];

      const linkGroup = svg.append('g');

      links.forEach((link, i) => {
        const d = path(link as any);
        if (!d) return;

        const pathNode = linkGroup.append('path')
          .attr('d', d)
          .attr('fill', 'none')
          .attr('stroke', '#C5A059')
          .attr('stroke-width', 1)
          .attr('stroke-dasharray', '1000 1000')
          .attr('stroke-dashoffset', 1000)
          .attr('opacity', 0.6);

        pathNode.transition()
          .duration(3000)
          .delay(i * 1000)
          .ease(d3.easeLinear)
          .attr('stroke-dashoffset', 0)
          .on('end', function repeat() {
            d3.select(this)
              .attr('stroke-dashoffset', 1000)
              .transition()
              .duration(3000)
              .ease(d3.easeLinear)
              .attr('stroke-dashoffset', 0)
              .on('end', repeat);
          });

        // Add pulsing dots at endpoints
        link.coordinates.forEach(coords => {
          const [x, y] = projection(coords as [number, number]) || [0, 0];
          linkGroup.append('circle')
            .attr('cx', x)
            .attr('cy', y)
            .attr('r', 2)
            .attr('fill', '#C5A059')
            .append('animate')
            .attr('attributeName', 'r')
            .attr('values', '2;6;2')
            .attr('dur', '2s')
            .attr('repeatCount', 'indefinite');
        });
      });
    });
  }, []);

  return (
    <div className="w-full bg-surface rounded-3xl border border-white/5 p-6 overflow-hidden shadow-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h4 className="font-serif font-bold text-lg">Global Connections</h4>
          <p className="text-[10px] font-bold text-gold uppercase tracking-widest">Real-time Translation Network</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-gold animate-pulse" />
          <span className="text-[10px] text-text-dim font-bold uppercase">Active Nodes: 1,242</span>
        </div>
      </div>
      <svg ref={svgRef} className="w-full h-auto opacity-80" />
    </div>
  );
}
