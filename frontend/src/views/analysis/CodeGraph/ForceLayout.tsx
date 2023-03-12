// @ts-nocheck comment
import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import ICodeTree from "../../annotation/CodeExplorer/ICodeTree";
import { zoom } from "d3-zoom";
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

const ForceLayout = ({ data }: CodeTreeProps) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const simulationRef = useRef<d3.Simulation<Node, Link> | null>(null);

  const width = 1000;
  const height = 1000;

  const graphWidth = width / data.length;
  const graphHeight = height / data.length;

  const nodes: Node[] = data
    .map((arr, index) =>
      arr.map((obj) => ({
        id: obj.id,
        data: obj,
        x: index * graphWidth + Math.random() * graphWidth,
        y: index * graphHeight + Math.random() * graphHeight,
      }))
    )
    .flat();

  const links: Link[] = [];
  data.forEach((arr) => {
    for (let i = 0; i < arr?.length - 1; i++) {
      links.push({ source: arr[i].id, target: arr[i + 1].id });
    }
  });

  const simulation = d3
    .forceSimulation(nodes)
    .force(
      "link",
      d3.forceLink(links).id((d) => d.id)
    )
    .force("charge", d3.forceManyBody().strength(-1000))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("radial", d3.forceRadial(50, width / 2, height / 2))
    .force("collide", d3.forceCollide().radius(10));

  simulationRef.current = simulation;

  const nodesElements = nodes.map((node) => (
    <>
      <circle key={`circle-${node.id}`} r={5} fill={node.data.color} cx={node.x} cy={node.y} />
      <text key={`text-${node.id}`} x={node.x + 8} y={node.y + 4} fill="black">
        {node.data.name}
      </text>
    </>
  ));

  const linksElements = links.map((link, index) => (
    <line
      key={index}
      x1={link.source.x}
      y1={link.source.y}
      x2={link.target.x}
      y2={link.target.y}
      stroke="black"
      strokeWidth="1"
    />
  ));

  useEffect(() => {
    const ticked = () => {
      svgRef.current &&
        svgRef.current.querySelectorAll(".node").forEach((node, index) => {
          const { x, y } = simulationRef.current!.nodes()[index];
          node.setAttribute("cx", x.toString());
          node.setAttribute("cy", y.toString());
        });

      svgRef.current &&
        svgRef.current.querySelectorAll(".link").forEach((link, index) => {
          const { source, target } = simulationRef.current!.force("link")!.links()[index];
          link.setAttribute("x1", source.x.toString());
          link.setAttribute("y1", source.y.toString());
          link.setAttribute("x2", target.x.toString());
          link.setAttribute("y2", target.y.toString());
        });
    };

    simulation.on("tick", ticked);

    return () => {
      simulation.stop();
    };
  }, [data, nodes, links]);

  const [transform, setTransform] = useState(d3.zoomIdentity);
  useEffect(() => {
    const zoom = d3
      .zoom()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        setTransform(event.transform);
      });

    d3.select(svgRef.current).call(zoom).on("dblclick.zoom", null);
  }, []);

  return (
    <div>
      <svg ref={svgRef} width={width} height={height} transform={transform} style={{ overflow: "auto" }}>
        {data.map((arr, index) => (
          <g key={index} transform={`translate(${index * graphWidth}, ${index * graphHeight})`}>
            <g>{nodesElements.slice(index * arr.length, (index + 1) * arr.length)}</g>
            <g>{linksElements.slice(index * (arr.length - 1), index * (arr.length - 1) + arr.length - 1)}</g>
          </g>
        ))}
      </svg>
    </div>
  );
};

export default ForceLayout;
