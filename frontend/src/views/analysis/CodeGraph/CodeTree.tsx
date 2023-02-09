import { tree, select, hierarchy, linkHorizontal } from "d3";
import React from "react";

const treeData = {
  name: "Eve",
  children: [
    {
      name: "Cain",
    },
    {
      name: "Seth",
      children: [
        {
          name: "Enos",
        },
        {
          name: "Noam",
        },
      ],
    },
    {
      name: "Abel",
    },
    {
      name: "Awan",
      children: [
        {
          name: "Enoch",
        },
      ],
    },
    {
      name: "Azura",
    },
  ],
};

type HierarchyNode = {
  name: string;
  children?: HierarchyNode[];
};

const CodeTree = () => {
  const svgRef = React.useRef<SVGSVGElement>(null);
  const width = document.body.clientWidth;
  const height = 100 || document.body.clientHeight;
  const treeLayout = tree().size([width, height]);

  React.useEffect(() => {
    const svg = select(svgRef.current);
    svg.selectAll("*").remove();
    svg.attr("width", width).attr("height", height);

    const root = hierarchy<HierarchyNode>(treeData);
    const paths = treeLayout(root).links();
    const pathGenerator = linkHorizontal()
      .x((d) => d.y)
      .y((d) => d.x);

    svg
      .selectAll("path")
      .data(paths)
      .enter()
      .append("path")
      .attr("stroke", "black")
      .attr("d", pathGenerator)
      .attr("stroke-width", 2);

    svg
      .selectAll("text")
      .data(root.descendants())
      .enter()
      .append("text")
      .attr("color", "black")
      .attr("font-size", "0.75rem")
      .attr("x", (d) => d.y)
      .attr("y", (d) => d.x)
      .text(({ data }) => data.name);
  }, []);
  return <svg ref={svgRef} />;
};

export default CodeTree;
