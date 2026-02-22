import { Card, CardContent, CircularProgress, Typography } from "@mui/material";
import { memo, useMemo } from "react";
import { ResponsiveContainer, Scatter, ScatterChart, XAxis, YAxis, ZAxis } from "recharts";
import { PerspectivesDoc } from "../../../api/openapi/models/PerspectivesDoc.ts";
import { PerspectivesHooks } from "../../../api/PerspectivesHooks.ts";
import { CardContainer } from "../../../components/MUI/CardContainer.tsx";
import { useAppSelector } from "../../../plugins/ReduxHooks.ts";

interface DocumentClusterScatterPlotProps {
  aspectId: number;
  height: number;
}

export const DocumentClusterScatterPlot = memo(({ aspectId, height }: DocumentClusterScatterPlotProps) => {
  // global client state
  const colorScheme = useAppSelector((state) => state.perspectives.colorScheme);

  // global server state
  const vis = PerspectivesHooks.useGetDocVisualization(aspectId);

  // computed
  const chartData = useMemo(() => {
    if (!vis.data || vis.data.clusters.length === 0 || vis.data.docs.length === 0) return undefined;

    const data: Record<number, PerspectivesDoc[]> = {};
    vis.data.clusters.forEach((cluster) => {
      data[cluster.id] = [];
    });
    vis.data.docs.forEach((doc) => {
      data[doc.cluster_id].push(doc);
    });
    return data;
  }, [vis.data]);

  return (
    <Card variant="outlined" sx={{ bgcolor: "grey.300", borderColor: "grey.500" }}>
      {vis.isSuccess && chartData ? (
        <ResponsiveContainer width="100%" height={height} style={{ backgroundColor: "white" }}>
          <ScatterChart>
            <XAxis dataKey="x" type="number" name="X" hide />
            <YAxis dataKey="y" type="number" name="Y" hide />
            <ZAxis range={[10]} />
            {Object.entries(chartData).map(([clusterId, docs], index) => (
              <Scatter
                key={clusterId}
                name={`Cluster ${clusterId}`}
                data={docs}
                fill={colorScheme[index % colorScheme.length]}
              />
            ))}
          </ScatterChart>
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
          Map of all documents colored by their cluster
        </Typography>
      </CardContent>
    </Card>
  );
});
