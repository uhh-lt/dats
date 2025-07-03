import { Card, CardContent, CircularProgress, Typography } from "@mui/material";
import { memo, useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Tooltip as ChartTooltip,
  Pie,
  PieChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import PerspectivesHooks from "../../../api/PerspectivesHooks.ts";
import CardContainer from "../../../components/MUI/CardContainer.tsx";
import { useAppSelector } from "../../../plugins/ReduxHooks.ts";

interface Data {
  clusterId: number;
  clusterName: string;
  count: number;
}

const renderCustomizedLabel = (data: { value: string; percent: number }) => {
  return `${data.value} (${(data.percent * 100).toFixed(0)}%)`;
};

interface ClusterDistributionPlotProps {
  aspectId: number;
  height: number;
  showPieChart: boolean;
}

function ClusterDistributionPlot({ aspectId, height, showPieChart }: ClusterDistributionPlotProps) {
  // global client state
  const colorScheme = useAppSelector((state) => state.perspectives.colorScheme);

  // global server state
  const vis = PerspectivesHooks.useGetDocVisualization(aspectId);

  // computed
  const chartData = useMemo(() => {
    const counts: Record<number, Data> = {};
    if (!vis.data) return [];

    vis.data.topics.forEach((cluster) => {
      counts[cluster.id] = {
        clusterId: cluster.id,
        clusterName: cluster.name,
        count: 0,
      };
    });
    console.log("Cluster counts:", counts);
    vis.data.docs.forEach((doc) => {
      if (!counts[doc.topic_id]) {
        console.warn(`Cluster ID ${doc.topic_id} not found in counts array.`);
        return;
      }
      counts[doc.topic_id].count += 1;
    });
    return Object.values(counts);
  }, [vis.data]);

  return (
    <Card variant="outlined" sx={{ bgcolor: "grey.300", borderColor: "grey.500" }}>
      {vis.isSuccess && chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={height} style={{ backgroundColor: "white" }}>
          {showPieChart ? (
            <PieChart className={`cluster-frequency-chart-${aspectId}`}>
              <ChartTooltip />
              <Pie
                data={chartData}
                dataKey={(obj) => obj.count}
                nameKey={(obj) => obj.topicName}
                cx="50%"
                cy="50%"
                fill="#8884d8"
                label={renderCustomizedLabel}
              >
                {chartData.map((topicFrequency, index) => (
                  <Cell
                    key={`topiccell-${topicFrequency.clusterId}`}
                    fill={colorScheme[index % colorScheme.length]}
                    stroke={undefined}
                    strokeWidth={2}
                    style={{ cursor: "pointer" }}
                  />
                ))}
              </Pie>
            </PieChart>
          ) : (
            <BarChart data={chartData} className={`cluster-frequency-chart-${aspectId}`}>
              <XAxis dataKey="clusterName" height={0} />
              <YAxis dataKey={(data) => data.count} interval={"preserveEnd"} domain={[0.5, "auto"]} allowDataOverflow />
              <CartesianGrid stroke="#eee" />
              <ChartTooltip />
              <Bar dataKey={(data) => data.count} fill="black">
                {chartData.map((topicFrequency, index) => (
                  <Cell
                    key={`clustercell-${topicFrequency.clusterId}`}
                    fill={colorScheme[index % colorScheme.length]}
                    stroke={undefined}
                    strokeWidth={2}
                    style={{ cursor: "pointer" }}
                  />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      ) : (
        <CardContainer sx={{ height, display: "flex", justifyContent: "center", alignItems: "center" }}>
          {vis.isSuccess && chartData === undefined ? (
            <>No plot available!</>
          ) : vis.isLoading || vis.isFetching ? (
            <CircularProgress />
          ) : vis.isError ? (
            <>An Error occurred: {vis.error.message}</>
          ) : null}
        </CardContainer>
      )}
      <CardContent sx={{ padding: 0.5, pb: "4px !important" }}>
        <Typography variant="body2" sx={{ color: "text.secondary", textAlign: "center" }}>
          Distribution of documents across clusters
        </Typography>
      </CardContent>
    </Card>
  );
}

export default memo(ClusterDistributionPlot);
