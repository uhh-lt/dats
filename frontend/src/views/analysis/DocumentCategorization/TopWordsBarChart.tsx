import { UseQueryResult } from "@tanstack/react-query";
import * as d3 from "d3";
import { useEffect, useRef, useState } from "react";
import { TopWordsTopic } from "../../../api/openapi/models/TopWordsTopic.ts";

type TopWordsResponseType = Record<string, TopWordsTopic>;

const TopWordsBarChart: React.FC<{
  topicNum: number;
  dataHook: UseQueryResult<TopWordsResponseType, Error>;
}> = ({ topicNum: topicNum, dataHook }) => {
  const data = dataHook.data as TopWordsResponseType;
  const [isResponseEmpty, setIsResponseEmpty] = useState(true);

  useEffect(() => {
    if (Object.keys(data).length === 0) {
      setIsResponseEmpty(true);
    } else {
      setIsResponseEmpty(false);
    }
  }, [data]);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const [width, setWidth] = useState<number>(window.innerWidth);

  const barHeight = 25;

  const marginTop = window.innerHeight * 0.05;
  const marginRight = window.innerWidth * 0.1;
  const marginBottom = window.innerHeight * 0.05;
  const marginLeft = window.innerWidth * 0.1;
  const fontSize = "1vw";
  const tickFontSize = "0.9vw";

  const formatScore = d3.format(".5f");

  let currentMaxScore = 0;

  let maxScore = 0;
  let amountTopics = 0;

  let height = window.innerHeight * 0.7;

  let y = d3
    .scaleBand()
    .domain([])
    .rangeRound([marginTop, height - marginBottom])
    .padding(0.1);

  if (!isResponseEmpty) {
    for (const entry of Object.values(data)) {
      entry.topic_words.forEach((value) => {
        if (value.score > maxScore) {
          maxScore = value.score;
        }
      });
    }

    data[topicNum].topic_words.forEach((word) => {
      if (word.score > currentMaxScore) {
        currentMaxScore = word.score;
      }
    });

    amountTopics = Object.keys(data).length;

    height = Math.ceil((amountTopics + 0.1) * barHeight) + marginTop + marginBottom;

    y = d3
      .scaleBand()
      .domain(d3.sort(Object.values(data[topicNum].topic_words), (d) => -d.score).map((d) => d.word))
      .rangeRound([marginTop, height - marginBottom])
      .padding(0.1);
  }

  const x = d3
    .scaleLinear()
    .domain([0, currentMaxScore])
    .range([marginLeft, width - marginRight]);

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

  // D3 render
  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    svg
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height])
      .attr("style", "max-width: 100%; height: auto;");

    if (!isResponseEmpty) {
      // Setup bars
      svg
        .append("g")
        .attr("fill", "steelblue")
        .selectAll()
        .data(data[topicNum].topic_words)
        .join("rect")
        .attr("x", x(0))
        .attr("y", (d) => y(d.word) ?? 0)
        .attr("width", (d) => x(d.score) * 0.995 - x(0))
        .attr("height", y.bandwidth());

      // Text inside bars
      svg
        .append("g")
        .attr("fill", "white")
        .attr("text-anchor", "end")
        .selectAll()
        .data(data[topicNum].topic_words)
        .join("text")
        .attr("x", (d) => x(d.score) * 0.995)
        .attr("y", (d) => (y(d.word) ?? 0) + y.bandwidth() / 2)
        .style("font-size", fontSize)
        .attr("dy", "0.35em")
        .attr("dx", -4)
        .text((d) => formatScore(d.score))
        .call((text) =>
          text
            .filter((d) => x(d.score) - x(0) < 20)
            .attr("dx", +4)
            .attr("fill", "black")
            .attr("text-anchor", "start"),
        );
    } else {
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

    // Set title
    svg
      .append("g")
      .append("text")
      .attr("x", width / 2)
      .attr("y", marginTop * 0.7)
      .attr("text-anchor", "middle")
      .style("font-size", fontSize)
      .text("Top Words for the Topic: " + topicNum);

    // Set x-axis label
    svg
      .append("g")
      .append("text")
      .attr("x", width / 2)
      .attr("y", height - marginBottom * 0.2)
      .attr("text-anchor", "middle")
      .style("font-size", fontSize)
      .text("Score");

    // Setup border
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

    // Setup axes
    svg
      .append("g")
      .attr("transform", `translate(0,${height - marginBottom})`)
      .call(d3.axisBottom(x).ticks(width / 200))
      .call((g) => g.select(".domain").remove())
      .style("font-size", tickFontSize);

    svg
      .append("g")
      .attr("transform", `translate(${marginLeft},0)`)
      .call(d3.axisLeft(y).tickSizeOuter(0))
      .style("font-size", fontSize);
  }, [
    topicNum,
    data,
    formatScore,
    height,
    marginBottom,
    marginLeft,
    marginRight,
    marginTop,
    width,
    x,
    y,
    isResponseEmpty,
  ]);

  return (
    <div>
      {dataHook.isLoading && <div>Loading...</div>}
      {dataHook.isSuccess ? <svg ref={svgRef}></svg> : <div></div>}
    </div>
  );
};

export default TopWordsBarChart;
