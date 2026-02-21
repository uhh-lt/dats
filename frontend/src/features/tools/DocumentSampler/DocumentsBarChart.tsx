import { CardProps } from "@mui/material";
import { memo, useCallback } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { ChartDataPoint } from "./ChartDataPoint.ts";
import { DataCard } from "./DataCard.tsx";

interface DocumentsBarChartProps {
  cardProps?: CardProps;
  onChartRefresh: () => void;
}

export const DocumentsBarChart = memo(({ cardProps, onChartRefresh }: DocumentsBarChartProps) => {
  const isFixedSamplingStrategy = useAppSelector((state) => state.documentSampler.isFixedSamplingStrategy);

  // Memoize chart rendering function
  const renderChart = useCallback(
    (chartData: ChartDataPoint[]) => (
      <ResponsiveContainer>
        <BarChart data={chartData}>
          <XAxis dataKey={(chartDatum: ChartDataPoint) => chartDatum.tags.map((tag) => tag.name).join(", ")} />
          <YAxis />
          <CartesianGrid stroke="#eee" />
          <Tooltip />
          <Legend />
          <Bar dataKey={(chartDatum: ChartDataPoint) => chartDatum.count} fill="#8884d8" name="Documents" />
          <Bar
            dataKey={(chartDatum: ChartDataPoint) =>
              isFixedSamplingStrategy ? chartDatum.fixedSampleCount : chartDatum.relativeSampleCount
            }
            fill="#ff84d8"
            name={isFixedSamplingStrategy ? "Fixed sampled documents" : "Relative sampled documents"}
          />
        </BarChart>
      </ResponsiveContainer>
    ),
    [isFixedSamplingStrategy],
  );

  return (
    <DataCard
      title="Document chart"
      description="Number of documents per group combination"
      onDataRefresh={onChartRefresh}
      cardProps={cardProps}
      renderData={renderChart}
    />
  );
});
