// @ts-nocheck
import { hierarchy, linkVertical, select, tree } from "d3";
import React, { useEffect } from "react";
import { useAppSelector } from "../../../plugins/ReduxHooks";

const CodeTree = () => {
  const treeData = useAppSelector((state) => state.codeGraph.codesGraphSelection);
  console.log("tree data", treeData);
  const svgRef = React.useRef<SVGSVGElement>(null);
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const svgWidth = 300;
  const svgHeight = 100;

  useEffect(() => {
    const svg = select(svgRef.current);
    const root = hierarchy(treeData[0]);
    const treeLayout = tree().size([svgWidth, svgHeight]);
    treeLayout(root);

    console.log(root.descendants());
    console.log(root.links());

    const linkGenerator = linkVertical()
      .source((link) => link.source)
      .target((link) => link.target)
      .x((node) => node.x)
      .y((node) => node.y);

    // node
    svg
      .selectAll(".node")
      .data(root.descendants())
      .join("circle")
      .attr("class", "node")
      .attr("r", 4)
      .attr("fill", "black")
      .attr("cx", (node) => node.x)
      .attr("cy", (node) => node.y);

    // links
    svg
      .selectAll(".link")
      .data(root.links())
      .join("path")
      .attr("class", "link")
      .attr("d", linkGenerator)
      .attr("fill", "none")
      .attr("stroke", "black");

    // labels
    svg
      .selectAll(".label")
      .data(root.descendants())
      .join("text")
      .attr("class", "label")
      .text((node) => node.data.code.name)
      .attr("text-anchor", "middle")
      .attr("font-size", 12)
      .attr("x", (node) => node.x)
      .attr("y", (node) => node.y + 10);
  }, [treeData]);

  return (
    <div ref={wrapperRef}>
      <svg ref={svgRef}></svg>
    </div>
  );
};

export default CodeTree;
