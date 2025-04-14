import { UseQueryResult } from "@tanstack/react-query";
import * as d3 from "d3";
import { useEffect, useRef, useState } from "react";

interface BaseChartProps {
  dataHook: UseQueryResult<Record<string, unknown>[], Error>;
  renderChart: (
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    dimensions: {
      width: number;
      height: number;
      marginTop: number;
      marginRight: number;
      marginBottom: number;
      marginLeft: number;
    },
    data: Record<string, unknown>[],
  ) => void;
}

const BaseChart: React.FC<BaseChartProps> = ({ dataHook, renderChart }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [width, setWidth] = useState<number>(window.innerWidth);

  const height = window.innerHeight * 0.7;
  const marginTop = window.innerHeight * 0.05;
  const marginRight = window.innerWidth * 0.1;
  const marginBottom = window.innerHeight * 0.1;
  const marginLeft = window.innerWidth * 0.1;

  useEffect(() => {
    dataHook.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!dataHook.isSuccess || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    // clear svg
    svg.selectAll("*").remove();

    renderChart(
      svg,
      { width, height, marginTop, marginRight, marginBottom, marginLeft },
      dataHook.data as Record<string, unknown>[],
    );
  }, [dataHook.data, dataHook.isSuccess, height, marginBottom, marginLeft, marginRight, marginTop, renderChart, width]);

  return (
    <div>
      {dataHook.isLoading && <div>Loading...</div>}
      {dataHook.isSuccess && <svg ref={svgRef}></svg>}
    </div>
  );
};

export default BaseChart;
