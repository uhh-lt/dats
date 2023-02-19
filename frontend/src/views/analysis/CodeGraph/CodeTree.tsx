// @ts-nocheck
import { hierarchy, tree, zoom, zoomIdentity, select } from "d3";
import { useEffect, useRef, useState, React, Fragment } from "react";

const CodeTree = ({ treeData }: any) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const [root, setRoot] = useState<any>(null);

  useEffect(() => {
    const svg = select(svgRef.current);
    const g = select(gRef.current);
    const width = svg.node().clientWidth;
    const height = svg.node().clientHeight;

    const zoomBehavior = zoom().on("zoom", (event) => {
      g.attr("transform", event.transform);
      g.selectAll("circle").attr("r", (20 / event.transform.k).toFixed(2));
      g.selectAll("text").style("font-size", (8 / event.transform.k).toFixed(2));
    });

    svg.call(zoomBehavior);

    const hierarchyData = hierarchy(treeData[0]);
    const treeLayout = tree()
      .size([width - 100, height])
      .separation((a, b) => (a.parent == b.parent ? 2 : 1));

    treeLayout(hierarchyData);
    setRoot(hierarchyData);

    // Add zoom event listener to expand nodes on zoom
    svg.on("wheel.zoom", null); // Remove the default zoom behavior
    svg.call(
      zoom().on("zoom", (event) => {
        g.attr("transform", event.transform);
        g.selectAll("g").attr("transform", (d) => `translate(${d.x},${d.y})scale(${event.transform.k})`);
      })
    );

    // Set the initial position of the nodes
    hierarchyData.descendants().forEach((d) => {
      d.y = d.depth * 100; // Change this value to adjust the distance between levels
    });

    // Redraw the tree with the new layout
    treeLayout(hierarchyData);
    setRoot(hierarchyData);
  }, [treeData]);

  const handleCircleClick = (node) => {
    if (node.children) {
      node._children = node.children;
      node.children = null;
    } else {
      node.children = node._children;
      node._children = null;
    }
    setRoot(root);
  };

  return (
    <svg ref={svgRef} style={{ width: "100%", height: "100%", overflow: "auto", marginTop: "30px" }}>
      <g ref={gRef}>
        {root &&
          tree()
            .size([svgRef.current.clientWidth - 100, svgRef.current.clientHeight])(root)
            .descendants()
            .map((d) => (
              <g key={d.data.name} transform={`translate(${d.x},${d.y})`} style={{ cursor: "pointer" }}>
                <circle
                  r={23}
                  fill={d?.data.code.color}
                  stroke="black"
                  strokeWidth={1}
                  onClick={() => handleCircleClick(d)}
                />
                <text fontSize={"7px"} color="black" textAnchor="middle" dominantBaseline="central">
                  {d.data.code.name}
                </text>
                {d.children &&
                  d.children.map((child) => (
                    <Fragment key={child.data.code.name}>
                      <line
                        x1={0}
                        y1={0}
                        x2={child.x - d.x}
                        y2={child.y - d.y}
                        stroke="black"
                        strokeWidth={1}
                        fill="none"
                      />
                      <g transform={`translate(${child.x - d.x},${child.y - d.y})`} style={{ cursor: "pointer" }}>
                        <circle
                          r={20}
                          fill="white"
                          stroke="black"
                          strokeWidth={1}
                          onClick={() => handleCircleClick(child)}
                        />
                        <text fontSize={"0.5rem"} color="black" textAnchor="middle" dominantBaseline="central">
                          {child.data.code.name}
                        </text>
                      </g>
                    </Fragment>
                  ))}
              </g>
            ))}
      </g>
    </svg>
  );
};

export default CodeTree;
