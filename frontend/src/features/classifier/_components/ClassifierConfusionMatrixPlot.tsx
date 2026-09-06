/* eslint-disable @typescript-eslint/no-explicit-any */
import { CodeHooks } from "@api/hooks/CodeHooks";
import { TagHooks } from "@api/hooks/TagHooks";
import { ClassifierEvaluationRead } from "@models/ClassifierEvaluationRead";
import { ClassifierModel } from "@models/ClassifierModel";
import {
  Box,
  Card,
  CardContent,
  PopoverPosition,
  Portal,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { Data, Layout } from "plotly.js";
import { useMemo, useState } from "react";
import Plot from "react-plotly.js";

/** Class id used for the "O" (no-label) class in the confusion matrix. */
const O_CLASS_ID = 0;
const O_CLASS_NAME = "O (no label)";

type Normalization = "counts" | "normalized";

interface ClassifierConfusionMatrixPlotProps {
  evaluation: ClassifierEvaluationRead;
  classifierModel: ClassifierModel;
}

interface TooltipData {
  goldName?: string;
  predictedName?: string;
  count?: number;
  rowSum?: number;
  position?: PopoverPosition;
}

/**
 * Renders the confusion matrix of a classifier evaluation as a heatmap.
 * Rows are the gold classes, columns the predicted classes. The "O" (no-label)
 * class is included. Returns null for older evaluations without matrix data.
 */
export function ClassifierConfusionMatrixPlot({ evaluation, classifierModel }: ClassifierConfusionMatrixPlotProps) {
  const [normalization, setNormalization] = useState<Normalization>("counts");
  const [tooltipData, setTooltipData] = useState<TooltipData>({ position: undefined });

  const matrix = evaluation.confusion_matrix;
  const classIds = evaluation.confusion_matrix_class_ids;

  // resolve class names (tags for document classifiers, codes otherwise)
  const projectTags = TagHooks.useGetAllTags();
  const projectCodes = CodeHooks.useGetAllCodesMap();
  const classNames = useMemo(() => {
    if (!classIds) return [];
    if (classifierModel === ClassifierModel.DOCUMENT) {
      const tagsMap = Object.fromEntries((projectTags.data ?? []).map((tag) => [tag.id, tag]));
      return classIds.map((id) => (id === O_CLASS_ID ? O_CLASS_NAME : tagsMap[id]?.name || `Tag ${id}`));
    }
    const codesMap = projectCodes.data ?? {};
    return classIds.map((id) => (id === O_CLASS_ID ? O_CLASS_NAME : codesMap[id]?.name || `Code ${id}`));
  }, [classIds, classifierModel, projectTags.data, projectCodes.data]);

  const { z, text, rowSums } = useMemo(() => {
    if (!matrix) return { z: [], text: [], rowSums: [] };
    const rowSums = matrix.map((row) => row.reduce((sum, value) => sum + value, 0));
    const z =
      normalization === "normalized"
        ? matrix.map((row, rowIndex) => row.map((value) => (rowSums[rowIndex] > 0 ? value / rowSums[rowIndex] : 0)))
        : matrix;
    const text = matrix.map((row, rowIndex) =>
      row.map((value) =>
        normalization === "normalized"
          ? rowSums[rowIndex] > 0
            ? `${((value / rowSums[rowIndex]) * 100).toFixed(1)}%`
            : "-"
          : String(value),
      ),
    );
    return { z, text, rowSums };
  }, [matrix, normalization]);

  if (!matrix || matrix.length === 0 || !classIds || classIds.length === 0) {
    return null;
  }

  // plotly.js types `text` too narrowly for heatmaps (2-D arrays are valid),
  // so build the trace untyped and cast once.
  const heatmapTrace = {
    type: "heatmap",
    z,
    x: classNames,
    y: classNames,
    text,
    texttemplate: "%{text}",
    // disable the built-in plotly tooltip; a custom MUI tooltip is rendered instead
    hoverinfo: "none",
    colorscale: "Blues",
    reversescale: false,
    showscale: true,
  } as unknown as Data;
  const data: Data[] = [heatmapTrace];

  const layout: Partial<Layout> = {
    height: Math.max(320, classNames.length * 48 + 160),
    margin: { l: 140, r: 20, t: 20, b: 100 },
    xaxis: {
      title: { text: "Predicted" },
      tickangle: -45,
      side: "bottom",
      automargin: true,
    },
    // reverse the y axis so the diagonal runs top-left to bottom-right
    yaxis: {
      title: { text: "Gold" },
      autorange: "reversed",
      automargin: true,
    },
  };

  const handleHover = (event: any) => {
    if (!event.points || event.points.length === 0) return;
    const point = event.points[0];
    setTooltipData({
      goldName: point.y,
      predictedName: point.x,
      count: matrix[point.pointIndex[0]][point.pointIndex[1]],
      rowSum: rowSums[point.pointIndex[0]],
      position: { top: event.event.y - 4, left: event.event.x + 4 },
    });
  };

  const handleUnhover = () => {
    setTooltipData({ position: undefined });
  };

  return (
    <Box width="100%" mt={2}>
      <Stack direction="row" spacing={2} alignItems="center" mb={1}>
        <Typography fontWeight="bold" color="textSecondary">
          Confusion Matrix
        </Typography>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={normalization}
          onChange={(_, value: Normalization | null) => {
            if (value !== null) setNormalization(value);
          }}
        >
          <ToggleButton value="counts">Counts</ToggleButton>
          <ToggleButton value="normalized">Row-normalized</ToggleButton>
        </ToggleButtonGroup>
      </Stack>
      <Plot
        data={data}
        layout={layout}
        config={{ displayModeBar: false, responsive: true }}
        style={{ width: "100%" }}
        onHover={handleHover}
        onUnhover={handleUnhover}
      />
      <ConfusionMatrixTooltip data={tooltipData} />
    </Box>
  );
}

function ConfusionMatrixTooltip({ data }: { data: TooltipData }) {
  if (!data.position || data.count === undefined || data.rowSum === undefined) {
    return null;
  }
  const percentage = data.rowSum > 0 ? (data.count / data.rowSum) * 100 : 0;
  // Render into document.body via a Portal: the plot can live inside transformed
  // ancestors (e.g. virtualized table rows), which would break position: fixed.
  // The plotly hover event provides viewport-relative coordinates (clientX/Y).
  return (
    <Portal>
      <Box
        sx={{
          position: "fixed",
          top: data.position.top,
          left: data.position.left,
          zIndex: 9999,
          pointerEvents: "none",
        }}
      >
        <Card elevation={8}>
          <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
            <Typography variant="body2">
              <b>Gold:</b> {data.goldName}
            </Typography>
            <Typography variant="body2">
              <b>Predicted:</b> {data.predictedName}
            </Typography>
            <Typography variant="body2">
              <b>Count:</b> {data.count} ({percentage.toFixed(1)}% of gold)
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </Portal>
  );
}
