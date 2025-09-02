import { Typography } from "@mui/material";
import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import CodeHooks from "../../../api/CodeHooks.ts";
import { ClassifierData } from "../../../api/openapi/models/ClassifierData.ts";
import { ClassifierModel } from "../../../api/openapi/models/ClassifierModel.ts";
import { TagRead } from "../../../api/openapi/models/TagRead.ts";
import TagHooks from "../../../api/TagHooks.ts";

interface ClassifierDatum extends ClassifierData {
  name: string;
  color: string;
}

interface ClassifierDataPlotProps {
  data: ClassifierData[];
  classifierModel: ClassifierModel;
  minHeight?: string | number | undefined;
}

function ClassifierDataPlot({ data, classifierModel, minHeight }: ClassifierDataPlotProps) {
  if (data.length === 0) {
    return (
      <Typography color="textSecondary" style={{ fontStyle: "italic" }}>
        No data to display
      </Typography>
    );
  }

  if (classifierModel === ClassifierModel.DOCUMENT) {
    return <TagClassifierDataPlot data={data} minHeight={minHeight} />;
  } else {
    return <CodeClassifierDataPlot data={data} minHeight={minHeight} />;
  }
}

function TagClassifierDataPlot({
  data,
  minHeight,
}: {
  data: ClassifierData[];
  minHeight?: string | number | undefined;
}) {
  const projectTags = TagHooks.useGetAllTags();

  const classifierData = useMemo(() => {
    if (!projectTags.data) return [];
    const projectTagsMap: Record<number, TagRead> = Object.fromEntries(projectTags.data.map((tag) => [tag.id, tag]));

    return data.map((datum) => ({
      ...datum,
      name: projectTagsMap[datum.class_id]?.name || `Tag ${datum.class_id}`,
      color: projectTagsMap[datum.class_id]?.color || "#8884d8",
    }));
  }, [data, projectTags.data]);

  return <ClassifierDataPlotContent data={classifierData} minHeight={minHeight} />;
}

function CodeClassifierDataPlot({
  data,
  minHeight,
}: {
  data: ClassifierData[];
  minHeight?: string | number | undefined;
}) {
  const projectCodeMap = CodeHooks.useGetAllCodesMap();

  const classifierData = useMemo(() => {
    if (!projectCodeMap.data) return [];

    return data
      .sort((a, b) => a.class_id - b.class_id)
      .map((datum) => ({
        ...datum,
        name: projectCodeMap.data[datum.class_id]?.name || `Code ${datum.class_id}`,
        color: projectCodeMap.data[datum.class_id]?.color || "#82ca9d",
      }));
  }, [data, projectCodeMap.data]);

  return <ClassifierDataPlotContent data={classifierData} minHeight={minHeight} />;
}

function ClassifierDataPlotContent({
  data,
  minHeight,
}: {
  data: ClassifierDatum[];
  minHeight?: string | number | undefined;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%" minHeight={minHeight}>
      <BarChart data={data}>
        <XAxis dataKey="name" />
        <YAxis dataKey="num_examples" />
        <CartesianGrid stroke="#eee" />
        <Tooltip />
        <Bar dataKey="num_examples">
          {data.map((datum) => (
            <Cell key={`cell-${datum.class_id}`} fill={datum.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export default ClassifierDataPlot;
