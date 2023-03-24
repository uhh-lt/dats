// @ts-nocheck comment
import React, { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import ICodeTree from "../../annotation/CodeExplorer/ICodeTree";
import { ArrayId } from "./CodeGraph";

interface CodeTreeProps {
  data: ICodeTree[];
}

interface Link {
  source: string;
  target: string;
}

interface NodeData {
  id: ArrayId[];
  name: string;
  color: string;
}

interface Node extends d3.SimulationNodeDatum {
  data: NodeData;
  x: number;
  y: number;
}

const ForceLayout = ({ data }) => {
  const svgRef = useRef();
  const gRef = useRef();
  const zoomRef = useRef(1);

  useEffect(() => {
    if (data && data.nodes && data.links) {
      const nodes = data.nodes.map((node) => ({ ...node }));
      const links = data.links.map((link) => ({ ...link }));

      const svg = d3.select(svgRef.current);
      const g = d3.select(gRef.current);

      const width = svg.node().getBoundingClientRect().width;
      const height = svg.node().getBoundingClientRect().height;

      const margin = 50; // Set the margin to 50 pixels
      const viewBoxWidth = width + 2 * margin;
      const viewBoxHeight = height + 2 * margin;

      // Set the viewBox attribute with the margin
      svg.attr("viewBox", `-${margin} -${margin} ${viewBoxWidth} ${viewBoxHeight}`);

      const simulation = d3
        .forceSimulation(nodes)
        .force(
          "link",
          d3.forceLink(links).id((d) => d.id)
        )
        .force("charge", d3.forceManyBody().strength(-400))
        // Adjust the force center to take the margin into account
        .force("center", d3.forceCenter(width / 2 + margin, height / 2 + margin));

      const link = g
        .selectAll("line")
        .data(links)
        .enter()
        .append("line")
        .attr("stroke", "#aaa")
        .attr("stroke-width", 1);

      const node = g
        .selectAll("circle")
        .data(nodes)
        .enter()
        .append("circle")
        .attr("r", 5)
        .attr("fill", (d) => d.color);

      // ...

      simulation.on("tick", () => {
        link
          .attr("x1", (d) => d.source.x)
          .attr("y1", (d) => d.source.y)
          .attr("x2", (d) => d.target.x)
          .attr("y2", (d) => d.target.y);

        node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
      });

      // Add the zoom behavior to the SVG element and attach it to the g element
      const zoomBehavior = d3.zoom().on("zoom", () => {
        const transform = d3.zoomTransform(svg.node());
        g.attr("transform", transform);
      });
      svg.call(zoomBehavior);
    }
  }, [data]);

  return (
    <svg ref={svgRef}>
      <g ref={gRef}></g>
    </svg>
  );
};

export default ForceLayout;
