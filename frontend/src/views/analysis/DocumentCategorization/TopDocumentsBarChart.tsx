import { UseQueryResult } from "@tanstack/react-query";
import * as d3 from "d3";
import { useEffect, useRef, useState } from "react";

const TopDocumentsBarChart: React.FC<{
  chartName: string;
  topicNum: number;
  dataHook: UseQueryResult<Record<string, unknown>[], Error>;
}> = ({ topicNum, dataHook }) => {
  let data = dataHook.data as Record<string, number>[];
  let amountDocuments = data.length;
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [width, setWidth] = useState<number>(window.innerWidth);
  const maxAmountDocs = 20;

  const [isResponseEmpty, setIsResponseEmpty] = useState(true);

  if (amountDocuments > maxAmountDocs) {
    data = data.slice(0, maxAmountDocs);
    amountDocuments = maxAmountDocs;
  }

  useEffect(() => {
    if (Object.keys(data).length === 0) {
      setIsResponseEmpty(true);
    } else {
      setIsResponseEmpty(false);
    }
  }, [data]);

  // Declare the chart dimensions and margins.
  const height = window.innerHeight * 0.7;
  const marginTop = window.innerHeight * 0.05;
  const marginRight = window.innerWidth * 0.1;
  const marginBottom = window.innerHeight * 0.15;
  const marginLeft = window.innerWidth * 0.1;
  const fontSize = "1vw";
  const tickFontSize = "0.9vw";

  // Declare the x (horizontal position) scale.
  const x = d3
    .scaleBand()
    .domain(data.map((d) => d.doc_name.toString())) // descending frequency
    .range([marginLeft, width - marginRight])
    .padding(0.1);

  // Declare the y (vertical position) scale.
  const y = d3
    .scaleLinear()
    .domain([0, d3.max(data, (d) => d.probability) ?? 0])
    .range([height - marginBottom, marginTop]);

  const colorScale = d3
    .scaleLinear<string>()
    .domain([0, amountDocuments / 2, amountDocuments - 1]) // Multiple stops
    .range(["rgb(199, 202, 50)", "rgb(56, 110, 130)", "rgb(69, 21, 91)"]) // Interpolates between these colors
    .interpolate(d3.interpolateRgb); // Smooth RGB interpolation

  // Window resize effect
  useEffect(() => {
    const handleResize = () => {
      setWidth(window.innerWidth);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    const svg = d3.select(svgRef.current);

    // clear previous content
    svg.selectAll("*").remove();

    // setup tooltip element
    const tooltip = d3
      .select("body")
      .append("div")
      .style("position", "absolute")
      .style("background", "#f9f9f9")
      .style("border", "1px solid #d3d3d3")
      .style("padding", "5px")
      .style("border-radius", "5px")
      .style("pointer-events", "none")
      .style("visibility", "hidden")
      .style("font-size", "16px")
      .style("color", "black");

    // select the svg to add content
    svg
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height])
      .attr("style", "max-width: 100%; height: auto;");

    // setup bars
    svg
      .append("g")
      .selectAll()
      .data(data)
      .join("rect")
      .attr("fill", (d) => colorScale(d.probability * 10))
      .attr("x", (d) => x(d.doc_name.toString()) ?? 0)
      .attr("y", (d) => y(d.probability))
      .attr("height", (d) => y(0) - y(d.probability))
      .attr("width", x.bandwidth())
      .on("mouseover", (_, d) => {
        tooltip.style("visibility", "visible").text(d.probability);
      })
      .on("mousemove", (event) => {
        tooltip.style("top", `${event.pageY - 10}px`).style("left", `${event.pageX + 10}px`);
      })
      .on("mouseout", () => {
        tooltip.style("visibility", "hidden");
      });

    // set title and place on top
    svg
      .append("g")
      .append("text")
      .attr("x", width / 2)
      .attr("y", marginTop * 0.7)
      .attr("text-anchor", "middle")
      .style("font-size", fontSize)
      .text(`Top ${amountDocuments} Documents Ordered by Probability for Topic ${topicNum}`);

    // set x-axis label
    svg
      .append("g")
      .append("text")
      .attr("x", width / 2)
      .attr("y", height - marginBottom * 0.2)
      .attr("text-anchor", "middle")
      .style("font-size", fontSize)
      .text("Document Names sorted by probability");

    // set y-axis label
    svg
      .append("g")
      .append("text")
      .attr("transform", `rotate(-90)`)
      .attr("x", -(height / 2))
      .attr("y", marginLeft * 0.7)
      .attr("text-anchor", "middle")
      .style("font-size", fontSize)
      .text("Probability");

    // setup border
    svg
      .append("g")
      .append("rect")
      .attr("x", marginLeft)
      .attr("y", marginTop)
      .attr("width", width - marginLeft - marginRight)
      .attr("height", height - marginTop - marginBottom)
      .attr("fill", "none")
      .attr("stroke", "black")
      .attr("stroke-width", 2);

    // setup x-axis
    svg
      .append("g")
      .attr("transform", `translate(0,${height - marginBottom})`)
      .call(d3.axisBottom(x).tickSizeOuter(0))
      .style("font-size", tickFontSize)
      .selectAll("text")
      .style("text-anchor", "end")
      .attr("dy", ".75em")
      .attr("transform", "rotate(-15)");

    // setup y-axis
    svg
      .append("g")
      .attr("transform", `translate(${marginLeft},0)`)
      .call(d3.axisLeft(y).tickFormat((y) => y.toString()))
      .call((g) => g.select(".domain").remove())
      .style("font-size", fontSize);

    if (isResponseEmpty) {
      svg
        .append("text")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .attr("alignment-baseline", "middle")
        .style("font-size", "24px")
        .style("fill", "gray")
        .text("No Data Available");
    }

    return () => {
      tooltip.remove();
    };
  }, [
    amountDocuments,
    colorScale,
    data,
    height,
    isResponseEmpty,
    marginBottom,
    marginLeft,
    marginRight,
    marginTop,
    topicNum,
    width,
    x,
    y,
  ]);

  return (
    <div>
      {dataHook.isLoading && <div>Loading...</div>}
      {dataHook.isSuccess ? <svg ref={svgRef}></svg> : <div></div>}
    </div>
  );
};

export default TopDocumentsBarChart;
