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
}

function ClassifierDataPlot({ data, classifierModel }: ClassifierDataPlotProps) {
  if (data.length === 0) {
    return (
      <Typography color="textSecondary" style={{ fontStyle: "italic" }}>
        No data to display
      </Typography>
    );
  }

  if (classifierModel === ClassifierModel.DOCUMENT) {
    return <TagClassifierDataPlot data={data} />;
  } else {
    return <CodeClassifierDataPlot data={data} />;
  }
}

function TagClassifierDataPlot({ data }: { data: ClassifierData[] }) {
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

  return <ClassifierDataPlotContent data={classifierData} />;
}

function CodeClassifierDataPlot({ data }: { data: ClassifierData[] }) {
  const projectCodeMap = CodeHooks.useGetAllCodesMap();

  const classifierData = useMemo(() => {
    if (!projectCodeMap.data) return [];

    return data.map((datum) => ({
      ...datum,
      name: projectCodeMap.data[datum.class_id]?.name || `Code ${datum.class_id}`,
      color: projectCodeMap.data[datum.class_id]?.color || "#82ca9d",
    }));
  }, [data, projectCodeMap.data]);

  return <ClassifierDataPlotContent data={classifierData} />;
}

function ClassifierDataPlotContent({ data }: { data: ClassifierDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
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
