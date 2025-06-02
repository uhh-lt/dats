import { Card, CardContent, CircularProgress, Typography } from "@mui/material";
import { memo, useMemo } from "react";
import { ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from "recharts";
import { TMDoc } from "../../api/openapi/models/TMDoc.ts";
import TopicModellingHooks from "../../api/TopicModellingHooks.ts";
import { useAppSelector } from "../../plugins/ReduxHooks.ts";

interface DocumentTopicScatterPlotProps {
  aspectId: number;
  height: number;
}

function DocumentTopicScatterPlot({ aspectId, height }: DocumentTopicScatterPlotProps) {
  // global client state
  const colorScheme = useAppSelector((state) => state.atlas.colorScheme);

  // global server state
  const vis = TopicModellingHooks.useGetDocVisualization(aspectId);

  // computed
  const chartData = useMemo(() => {
    if (!vis.data) return undefined;

    const data: Record<number, TMDoc[]> = {};
    vis.data.topics.forEach((topic) => {
      data[topic.id] = [];
    });
    vis.data.docs.forEach((doc) => {
      data[doc.topic_id].push(doc);
    });
    return data;
  }, [vis.data]);

  return (
    <Card variant="outlined" sx={{ bgcolor: "grey.300" }}>
      {vis.isSuccess && chartData !== undefined ? (
        <ResponsiveContainer width="100%" height={height} style={{ backgroundColor: "white" }}>
          <ScatterChart>
            <XAxis dataKey="x" type="number" name="X" hide />
            <YAxis dataKey="y" type="number" name="Y" hide />
            <Tooltip />
            {Object.entries(chartData).map(([topicId, docs], index) => (
              <Scatter
                key={topicId}
                name={`Topic ${topicId}`}
                data={docs}
                fill={colorScheme[index % colorScheme.length]}
              />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      ) : vis.isSuccess && chartData === undefined ? (
        <>No plot available!</>
      ) : vis.isLoading || vis.isFetching ? (
        <CircularProgress />
      ) : vis.isError ? (
        <>An Error occurred: {vis.error.message}</>
      ) : null}
      <CardContent sx={{ padding: 0.5, pb: "4px !important" }}>
        <Typography variant="body2" sx={{ color: "text.secondary", textAlign: "center" }}>
          This map is cool!
        </Typography>
      </CardContent>
    </Card>
  );
}

export default memo(DocumentTopicScatterPlot);
