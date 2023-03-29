// @ts-nocheck comment
import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import ICodeTree from "../../annotation/CodeExplorer/ICodeTree";

interface Node extends d3.SimulationNodeDatum {
  id: number;
  x: number;
  y: number;
}

interface ForceDirectedGraphProps {
  data: {
    nodes: ICodeTree[];
    links: { source: number; target: number }[];
  };
}

interface NodePosition {
  id: number;
  x: number;
  y: number;
}

interface LinkPosition {
  source: number;
  target: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const ForceLayout = ({ data }: ForceDirectedGraphProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const [nodePositions, setNodePositions] = useState<NodePosition[]>([]);
  const [linkPositions, setLinkPositions] = useState<LinkPosition[]>([]);

  useEffect(() => {
    if (data && data.nodes && data.links) {
      const nodes = data.nodes.map((node) => ({
        ...node,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
      }));
      const links = data.links.map((link) => ({ ...link }));

      const svg = d3.select(svgRef.current as SVGSVGElement);
      const g = d3.select(gRef.current);

      const svgNode = svg.node() as SVGSVGElement;
      const width = svgNode.getBoundingClientRect().width;
      const height = svgNode.getBoundingClientRect().height;

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

      simulation.on("tick", () => {
        // Update the position of the nodes and links here
        setNodePositions(
          nodes.map((node) => ({
            id: node.id,
            x: node.x,
            y: node.y,
          }))
        );
        setLinkPositions(
          links.map((link) => ({
            source: (link.source as unknown as Node).id,
            target: (link.target as unknown as Node).id,
            x1: (link.source as unknown as Node).x,
            y1: (link.source as unknown as Node).y,
            x2: (link.target as unknown as Node).x,
            y2: (link.target as unknown as Node).y,
          }))
        );
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
      <g ref={gRef}>
        {linkPositions.map((link) => (
          <line
            key={`${link.source}-${link.target}`}
            stroke="#aaa"
            strokeWidth={1}
            x1={link.x1}
            y1={link.y1}
            x2={link.x2}
            y2={link.y2}
          />
        ))}
        {nodePositions.map((node) => (
          <>
            <circle
              key={node.id}
              r={10}
              fill={data.nodes.find((n) => n.id === node.id).color}
              cx={node.x}
              cy={node.y}
            />
            <text x={node.x} y={node.y} fontSize="10px" textAnchor="middle" dy=".35em">
              {data.nodes.find((n) => n.id === node.id).name}
            </text>
          </>
        ))}
      </g>
    </svg>
  );
};

export default ForceLayout;
