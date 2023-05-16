import * as d3 from "d3";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { CodeRead } from "../../../api/openapi";

export interface GraphData {
  nodes: CodeRead[];
  links: LinkData[];
}

export interface LinkData {
  source: number;
  target: number;
}

interface MyNode extends d3.SimulationNodeDatum {
  code: CodeRead;
}

interface MyLink extends d3.SimulationLinkDatum<MyNode> {}

interface ForceDirectedGraphProps {
  data: GraphData;
  width: number;
  height: number;
}

const ForceLayout = ({ data, width, height }: ForceDirectedGraphProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);

  // this is the data that we will render
  const [renderNodes, setRenderNodes] = useState<MyNode[]>([]);
  const [renderLinks, setRenderLinks] = useState<MyLink[]>([]);

  // data used by the simulation
  const nodes = useRef<MyNode[]>(
    data.nodes.map((node) => {
      return { code: node, index: node.id };
    })
  );
  const links = useRef<MyLink[]>(
    data.links.map((link) => {
      return { ...link };
    })
  );

  // create simulation (once)
  const simulation = useMemo(() => {
    // see here for example configs: https://reactfordataviz.com/articles/force-directed-graphs-with-react-and-d3v7/
    const simulation = d3
      .forceSimulation<MyNode, MyLink>(nodes.current)
      .force(
        "link",
        d3.forceLink<MyNode, MyLink>(links.current).id((d) => d.code.id)
      )
      .force("charge", d3.forceManyBody().strength(-400))
      // Adjust the force center to take the margin into account
      .force("center", d3.forceCenter(width / 2, height / 2));

    // update the links and nodes on simulation ticks
    simulation.on("tick", () => {
      setRenderNodes([...nodes.current]);
      setRenderLinks([...links.current]);
    });

    return simulation;
  }, [width, height]);

  // create & attach zoom behaviour (once)
  useEffect(() => {
    // get svg and g elements
    const svg = d3.select(svgRef.current!);
    const g = d3.select(gRef.current!);

    // create zoom behaviour
    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.1, 10]);

    // update the transform on zoom events
    zoomBehavior.on("zoom", (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
      g.attr("transform", event.transform.toString()); // this is not the react way
    });
    svg.call(zoomBehavior);
  }, []);

  // create drag behaviour (once)
  const dragBehaviour = useMemo(() => {
    return d3
      .drag<SVGCircleElement, MyNode>()
      .on("start", function (event: d3.D3DragEvent<SVGCircleElement, MyNode, unknown>) {
        const index = parseInt(d3.select(this).node()!.dataset.index || "0");
        simulation.alphaTarget(0.3).restart();
        nodes.current[index].fx = event.x;
        nodes.current[index].fy = event.y;
      })
      .on("drag", function (event: d3.D3DragEvent<SVGCircleElement, MyNode, unknown>) {
        const index = parseInt(d3.select(this).node()!.dataset.index || "0");
        nodes.current[index].fx = event.x;
        nodes.current[index].fy = event.y;
      })
      .on("end", function (event: d3.D3DragEvent<SVGCircleElement, MyNode, unknown>) {
        const index = parseInt(d3.select(this).node()!.dataset.index || "0");
        simulation.alphaTarget(0);
        nodes.current[index].fx = null;
        nodes.current[index].fy = null;
      });
  }, [simulation]);

  // attach a drag behaviour to the nodes (on every re-render)
  useEffect(() => {
    const g = d3.select(gRef.current!);
    g.selectAll<SVGCircleElement, MyNode>("circle").call(dragBehaviour);
  }, [dragBehaviour, renderNodes]);

  return (
    <svg ref={svgRef} width={width} height={height}>
      <g ref={gRef}>
        {renderLinks.map((link) => (
          <line
            key={`${(link.source as MyNode).code.id}-${(link.target as MyNode).code.id}`}
            stroke="#aaa"
            strokeWidth={1}
            x1={(link.source as MyNode).x}
            y1={(link.source as MyNode).y}
            x2={(link.target as MyNode).x}
            y2={(link.target as MyNode).y}
          />
        ))}
        {renderNodes.map((node, index) => (
          <React.Fragment key={node.code.id}>
            <circle r={10} fill={node.code.color} cx={node.x} cy={node.y} data-index={index} />
            {/* <text x={node.x} y={node.y} fontSize="10px" textAnchor="middle" dy=".35em">
              {node.code.name}
            </text> */}
          </React.Fragment>
        ))}
      </g>
    </svg>
  );
};

export default ForceLayout;
