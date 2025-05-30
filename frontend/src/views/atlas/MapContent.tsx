/* eslint-disable @typescript-eslint/no-explicit-any */
import { Box } from "@mui/material";
import { Annotations, Datum, ScatterData } from "plotly.js";
import { useCallback, useEffect, useMemo, useState } from "react";
import Plot, { Figure } from "react-plotly.js";
import { TMDoc } from "../../api/openapi/models/TMDoc.ts";
import { TMVisualization } from "../../api/openapi/models/TMVisualization.ts";
import TopicModellingHooks from "../../api/TopicModellingHooks.ts";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks.ts";
import { AtlasActions } from "./atlasSlice.ts";
import MapTooltip, { MapTooltipData } from "./MapTooltip.tsx";
interface MapContentProps {
  aspectId: number;
  projectId: number;
}

function MapContent({ aspectId, projectId }: MapContentProps) {
  console.log("projectId", projectId);

  // global server state
  const vis = TopicModellingHooks.useGetDocVisualization(aspectId);

  if (!vis.data) {
    return null;
  }
  return <MapContent2 vis={vis.data} />;
}

function MapContent2({ vis }: { vis: TMVisualization }) {
  // global client state
  const dispatch = useAppDispatch();
  const selectedSdocIds = useAppSelector((state) => state.atlas.selectedSdocIds);
  const selectedSdocIdsIndex = useAppSelector((state) => state.atlas.selectedSdocIdsIndex);
  const pointSize = useAppSelector((state) => state.atlas.pointSize);
  const showLabels = useAppSelector((state) => state.atlas.showLabels);
  const colorScheme = useAppSelector((state) => state.atlas.colorScheme);

  // chart data
  const { chartData, labels } = useMemo(() => {
    const chartData: Record<string, Partial<ScatterData>> = {};
    const labels: { x: number; y: number; text: string }[] = [];

    const sdocId2Doc = vis.docs.reduce(
      (acc, doc) => {
        acc[doc.sdoc_id] = doc;
        return acc;
      },
      {} as Record<number, TMDoc>,
    );

    // prepare the legend & labels
    vis.topics.forEach((topic) => {
      chartData[topic.id] = {
        x: [],
        y: [],
        ids: [],
        type: "scattergl",
        mode: "markers",
        name: topic.name,
        hoverinfo: "none",
        selectedpoints: [],
        marker: {
          size: pointSize,
          line: {
            color: "black",
            width: [],
          },
        },
        selected: {
          marker: {
            size: pointSize * 1.5,
          },
        },
        visible: true,
      } as Partial<ScatterData>;

      labels.push({
        text: topic.name,
        x: topic.x,
        y: topic.y,
      });
    });

    // fill the coordinates
    const selectedSdocId = selectedSdocIds[selectedSdocIdsIndex];
    vis.docs.forEach((doc) => {
      if (doc.sdoc_id == selectedSdocId) return;
      const trace = chartData[doc.topic_id];
      (trace.x as Datum[]).push(doc.x);
      (trace.y as Datum[]).push(doc.y);
      (trace.ids as string[]).push(`${doc.sdoc_id}`);
      (trace.marker!.line!.width! as number[]).push(0);
    });

    // special treatment for the selected document
    const doc = sdocId2Doc[selectedSdocId];
    if (doc) {
      const trace = chartData[doc.topic_id];
      (trace.x as Datum[]).push(doc.x);
      (trace.y as Datum[]).push(doc.y);
      (trace.ids as string[]).push(`${doc.sdoc_id}`);
      (trace.marker!.line!.width! as number[]).push(2);
    }

    return { chartData, labels };
  }, [pointSize, selectedSdocIds, selectedSdocIdsIndex, vis.docs, vis.topics]);

  // labelss
  const labelAnnotations: Partial<Annotations>[] | undefined = useMemo(
    () =>
      labels.map((label) => ({
        text: label.text,
        x: label.x,
        y: label.y,
        xref: "x",
        yref: "y",
        showarrow: false,
        font: { size: 14, color: "#666" },
        // bgcolor: "#f9f9f9",
        // bordercolor: "#ccc",
        visible: true,
      })),
    [labels],
  );

  // plot state
  const [figure, setFigure] = useState<Figure>({
    data: Object.values(chartData),
    layout: {
      colorway: colorScheme,
      dragmode: "select",
      autosize: true,
      margin: {
        l: 32,
        r: 32,
        b: 32,
        t: 32,
        pad: 4,
      },
      xaxis: { zeroline: false },
      yaxis: { zeroline: false },
      showlegend: false,
      annotations: showLabels ? labelAnnotations : undefined,
    },
    frames: null,
  });

  // update figure when chartData changes
  useEffect(() => {
    setFigure((oldFigure) => {
      return {
        ...oldFigure,
        data: Object.values(chartData),
        layout: {
          ...oldFigure.layout,
          colorway: colorScheme,
          annotations: showLabels ? labelAnnotations : undefined,
        },
      };
    });
  }, [labelAnnotations, showLabels, chartData, colorScheme]);

  // tooltip
  const [tooltipData, setTooltipData] = useState<MapTooltipData>({
    id: undefined,
    position: undefined,
  });
  const handleHover = useCallback((event: any) => {
    setTooltipData((oldData) => {
      const newData = { ...oldData };
      if (!newData.position) {
        newData.position = { top: event.event.y - 4, left: event.event.x + 4 };
      }
      if (event.points.length > 0) {
        newData.id = event.points[0].id;
      }

      return newData;
    });
  }, []);
  const handleUnhover = useCallback(() => {
    setTooltipData({ id: undefined, position: undefined });
  }, []);

  return (
    <Box sx={{ flexGrow: 1, overflow: "hidden" }}>
      <Plot
        data={figure.data}
        layout={figure.layout}
        frames={figure.frames || undefined}
        useResizeHandler={true}
        config={{
          displayModeBar: true,
          responsive: true,
          displaylogo: false,
          toImageButtonOptions: { filename: `atlas-map-${name}` },
        }}
        style={{ width: "100%", height: "100%" }}
        onHover={handleHover}
        onUnhover={handleUnhover}
        onSelected={(event) => {
          if (!event) {
            setFigure((oldFigure) => {
              return {
                ...oldFigure,
                layout: {
                  ...oldFigure.layout,
                  selections: [],
                },
              };
            });
            dispatch(AtlasActions.onSelectionChange([]));
            return;
          }
          dispatch(
            AtlasActions.onSelectionChange(
              event.points.reduce((acc: number[], point: any) => {
                acc.push(point.id);
                return acc;
              }, [] as number[]),
            ),
          );
        }}
      />
      <MapTooltip data={tooltipData} />
    </Box>
  );
}
export default MapContent;
