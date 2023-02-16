// @ts-nocheck
import { hierarchy, linkVertical, select, tree } from "d3";
import React, { useEffect } from "react";

const CodeTree = ({ treeData }) => {
  // const treeData = useAppSelector((state) => state.codeGraph.codesGraphSelection);
  const svgRef = React.useRef<SVGSVGElement>(null);
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const svgWidth = 600;
  const svgHeight = 500;
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
      .attr("r", 25)
      .attr("stroke", "black")
      .attr("fill", "black")
      .attr("cx", (node) => node.x)
      .attr("cy", (node) => node.y - 10);

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
    /*   svg
      .selectAll(".circle")
      .data(root.descendants())
      .join("text")
      .attr("class", "circle")
      .text((node) => node.code.name)
      .attr("text-anchor", "middle")
      .attr("font-size", 8)
      .style("fill", "white")
      .attr("x", (node) => node.x)
      .attr("y", (node) => node.y - 10); */
  }, [treeData]);

  return (
    <div ref={wrapperRef} style={{ width: "100%", height: "100%" }}>
      <svg ref={svgRef} style={{ width: "100%", height: "100%" }}></svg>
    </div>
  );
};

export default CodeTree;
