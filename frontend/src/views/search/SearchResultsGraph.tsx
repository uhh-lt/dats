import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { Simulation, SimulationLinkDatum, SimulationNodeDatum } from "d3";
import { Button } from "@mui/material";
import SearchHooks from "../../api/SearchHooks";
import { useParams } from "react-router-dom";
import { SpanEntity, SpanEntityFrequency } from "../../api/openapi";
import useComputeGraph from "./useComputeGraph";

export interface EntityData {
  id: string;
  text: string;
  type: string;
  frequency: number;
}

export interface LinkData {
  from: string;
  to: string;
  frequency: number;
}

interface MyNode extends SimulationNodeDatum {
  id: string;
  text: string;
  type: string;
  frequency: number;
}

interface MyLink extends SimulationLinkDatum<MyNode> {
  value: number;
}

interface SearchResultsGraphProps {
  sdocIds: number[];
  nodeStrength?: number;
  linkStrength?: number;
}

function SearchResultsGraph({ sdocIds, nodeStrength, linkStrength }: SearchResultsGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const linkRef = useRef<SVGSVGElement>(null);
  const nodeRef = useRef<SVGSVGElement>(null);

  const { nodeResult: nodeData, linkResult: linkData } = useComputeGraph();

  // const [nodeData, setNodeData] = useState<EntityData[]>([
  //   { id: "10", text: "Tim", type: "PER", frequency: 5 },
  //   { id: "15", text: "Bobby", type: "PER", frequency: 4 },
  //   { id: "22", text: "Fynn", type: "PER", frequency: 3 },
  //   { id: "33", text: "Florian", type: "PER", frequency: 2 },
  //   { id: "46", text: "Deutschland", type: "LOC", frequency: 4 },
  // ]);
  // const [linkData, setLinkData] = useState<LinkData[]>([
  //   { from: "10", to: "15", frequency: 3 },
  //   { from: "22", to: "33", frequency: 1 },
  // ]);

  const [renderNodes, setRenderNodes] = useState<MyNode[]>([]);
  const [renderLinks, setRenderLinks] = useState<MyLink[]>([]);

  const simulation = useMemo<d3.Simulation<MyNode, MyLink>>(() => {
    // specify how to update the data
    const ticked = () => {
      const node = d3.select(nodeRef.current).selectAll<SVGCircleElement, MyNode>("circle");
      const link = d3.select(linkRef.current).selectAll<SVGLineElement, MyLink>("line");
      link
        .attr("x1", (d) => (d.source as MyNode).x || 0)
        .attr("y1", (d) => (d.source as MyNode).y || 0)
        .attr("x2", (d) => (d.target as MyNode).x || 0)
        .attr("y2", (d) => (d.target as MyNode).y || 0);

      node.attr("cx", (d) => d.x || 0).attr("cy", (d) => d.y || 0);
      // setRenderNodes([...simulation.nodes()]);
      // setRenderLinks([...simulation.links()]);
      // console.log("test");
    };

    const end = () => {
      // console.log("END!!!");
      // setRenderNodes([...simulation.nodes()]);
      // const node = d3.select(nodeRef.current).selectAll<SVGCircleElement, MyNode>("circle");
      // const link = d3.select(linkRef.current).selectAll<SVGLineElement, MyLink>("line");
      // link
      //   .attr("x1", (d) => (d.source as MyNode).x || 0)
      //   .attr("y1", (d) => (d.source as MyNode).y || 0)
      //   .attr("x2", (d) => (d.target as MyNode).x || 0)
      //   .attr("y2", (d) => (d.target as MyNode).y || 0);
      //
      // node.attr("cx", (d) => d.x || 0).attr("cy", (d) => d.y || 0);
    };

    // init the simulation
    return d3
      .forceSimulation<MyNode, MyLink>()
      .force("center", d3.forceCenter())
      .force("charge", d3.forceManyBody())
      .on("tick", ticked)
      .on("end", end);
  }, []);

  useEffect(() => {
    // create mutable nodes & links
    const nodes: MyNode[] = nodeData.map((n) => ({ ...n }));
    const links: MyLink[] = linkData.map((l) => ({
      source: l.from,
      target: l.to,
      value: l.frequency,
    }));
    // console.log(linkData);

    // select nodes & links
    const node = d3.select(nodeRef.current).selectAll<SVGCircleElement, MyNode>("circle");
    const link = d3.select(linkRef.current).selectAll<SVGLineElement, MyLink>("line");

    // add & remove nodes
    node
      .data(nodes, (datum) => datum.id)
      .join(
        (enter) => enter.append("circle").attr("r", (d) => d.frequency),
        (update) => update.attr("r", (d) => d.frequency),
        (exit) => exit.remove()
      );

    // add & remove links
    link
      .data(links, (datum) => {
        return `${(datum.source as MyNode).id || datum.source}-${(datum.target as MyNode).id || datum.target}`;
      })
      .join(
        (enter) => enter.append("line").style("stroke-width", (d) => 0.1 + 5 * (d.value - 1)),
        (update) => update.style("stroke-width", (d) => 0.1 + 5 * (d.value - 1)),
        (exit) => exit.remove()
      );

    // update simulation with new data
    simulation.nodes(nodes);
    simulation.force(
      "link",
      d3.forceLink<MyNode, MyLink>(links).id((d) => d.id)
    );
    simulation.alpha(1).restart().tick();
  }, [simulation, linkData, nodeData]);

  const handleAddNode = () => {
    // setNodeData([
    //   ...nodeData,
    //   {
    //     id: "1336",
    //     type: "LOC",
    //     frequency: 5,
    //     text: "Tim ist toll",
    //   },
    // ]);
  };
  // console.log("hahaha");

  const handleRemoveNode = () => {
    // setNodeData(nodeData.slice(0, nodeData.length - 1));
  };

  return (
    <div>
      <svg
        ref={svgRef}
        width="500"
        height="500"
        viewBox="-250, -250, 500, 500"
        style={{ maxWidth: "100%", height: "auto" }}
      >
        <g ref={linkRef} stroke="#999" strokeOpacity="0.7" strokeLinecap="round" />
        <g ref={nodeRef} stroke="#333" strokeOpacity="1" strokeWidth="1.5" />
        {/*<g ref={nodeRef} stroke="#333" strokeOpacity="1" strokeWidth="1.5">*/}
        {/*  {renderNodes.map((node) => (*/}
        {/*    <circle key={node.id} cx={node.x} cy={node.y} r={node.frequency * 5} />*/}
        {/*  ))}*/}
        {/*</g>*/}
      </svg>
      {/*<Button onClick={() => handleAddNode()}>Add Node!</Button>*/}
      {/*<Button onClick={() => handleRemoveNode()}>Remove Node!</Button>*/}
    </div>
  );
}

export default SearchResultsGraph;
