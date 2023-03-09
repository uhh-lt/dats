// @ts-nocheck
//import { hierarchy, tree, zoom, select } from "d3";
//import { useEffect, useRef, useState, React, Fragment } from "react";
//import React, { useEffect, useRef } from "react";
//import * as d3 from "d3";

//interface CodeTreeProps {
//  data: ICodeTree[];
//}

import React, { useEffect, useRef } from "react";
import * as d3 from "d3";

interface CodeTreeProps {
  data: ICodeTree[];
}

const ForceLayout = ({ data }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const simulationRef = useRef<d3.Simulation<ICodeTree[], undefined> | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);

    const width = +svg.attr("width");
    const height = +svg.attr("height");

    const links = [];
    data.forEach((arr) => {
      for (let i = 0; i < arr.length - 1; i++) {
        links.push({ source: arr[i].id, target: arr[i + 1].id });
      }
    });

    const simulation = d3
      .forceSimulation(data.flat().map((d) => Object.assign({}, d)))
      .force(
        "link",
        d3.forceLink(links).id((d) => d.id)
      )
      .force("charge", d3.forceManyBody().strength(-50))
      .force("center", d3.forceCenter(width / 2, height / 2));

    simulationRef.current = simulation;
    simulation &&
      simulation.on("tick", () => {
        svg
          .selectAll(".link")
          .attr("x1", (d) => d?.source?.x!)
          .attr("y1", (d) => d?.source?.y!)
          .attr("x2", (d) => d?.target?.x!)
          .attr("y2", (d) => d?.target?.y!);

        svg
          .selectAll(".node")
          .attr("cx", (d) => d?.x!)
          .attr("cy", (d) => d?.y!);
      });

    return () => {
      simulation.stop();
    };
  }, [data]);

  return (
    <svg ref={svgRef} width={500} height={500}>
      {data.map((arr) => arr.map((obj) => <circle key={obj.id} className="node" r={5} fill="red" />))}
      {data.flatMap((arr, i) =>
        arr
          .slice(0, arr.length - 1)
          .map((obj, j) => <line key={`${i}-${j}`} className="link" stroke="black" strokeWidth={1} />)
      )}
    </svg>
  );
};

{
  /*const ForceLayout = ({ data }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const simulationRef = useRef<d3.Simulation<ICodeTree[], undefined> | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);

    const width = +svg.attr("width");
    const height = +svg.attr("height");

    const nodes = data.map((arr) => arr.map((obj) => ({ id: obj.id, data: obj }))).flat();

    const links = [];
    data.forEach((arr) => {
      for (let i = 0; i < arr.length - 1; i++) {
        links.push({ source: arr[i].id, target: arr[i + 1].id });
      }
    });

    const simulation = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3.forceLink(links).id((d) => d.id)
      )
      .force("charge", d3.forceManyBody().strength(-50))
      .force("center", d3.forceCenter(width / 2, height / 2));

    simulationRef.current = simulation;

    const link = svg
      .selectAll(".link")
      .data(links)
      .join("line")
      .attr("class", "link")
      .attr("stroke", "black")
      .attr("stroke-width", "1");

    const node = svg
      .selectAll(".node")
      .data(nodes)
      .join("circle")
      .attr("class", "node")
      .attr("r", 5)
      .attr("fill", "red");

    const ticked = () => {
      link
        .attr("x1", (d) => d.source.x!)
        .attr("y1", (d) => d.source.y!)
        .attr("x2", (d) => d.target.x!)
        .attr("y2", (d) => d.target.y!);

      node.attr("cx", (d) => d.x!).attr("cy", (d) => d.y!);
    };

    simulation.on("tick", ticked);

    return () => {
      simulation.stop();
    };
  }, [data]);

  return <svg ref={svgRef} width={500} height={500} />;
}; */
}

export default ForceLayout;
