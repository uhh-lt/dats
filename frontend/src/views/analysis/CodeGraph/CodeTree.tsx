import { tree, select, hierarchy, linkHorizontal, indexes } from "d3";
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

const svgWidth = 500;
const svgHeight = 500;

const CodeTree = () => {
  const svgRef = React.useRef<SVGSVGElement>(null);

  const [descendants, paths, pathGenerator] = React.useMemo(() => {
    const treeLayout = tree().size([svgWidth, svgHeight]);

    // const svg = select(svgRef.current);
    // svg.selectAll("*").remove();
    // svg.attr("width", width).attr("height", height);

    const root = hierarchy<HierarchyNode>(treeData);
    const paths = treeLayout(root).links();
    const pathGenerator = linkHorizontal()
      .x((d) => d.y)
      .y((d) => d.x);

    return [root.descendants(), paths, pathGenerator];
  }, []);

  return (
    <>
      <svg ref={svgRef} height={svgHeight} width={svgWidth}>
        {paths.map((d, index) => (
          <path key={index} stroke="black" d={pathGenerator(d)} strokeWidth="2" />
        ))}
        {descendants.map((d) => (
          <text key={d.data.name} x={d.y} y={d.x} fontSize={"0.75rem"} color="black">
            {d.data.name}
          </text>
        ))}
      </svg>
    </>
  );
};

export default CodeTree;
