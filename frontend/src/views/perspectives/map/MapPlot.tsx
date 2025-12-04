/* eslint-disable @typescript-eslint/no-explicit-any */
import { Box } from "@mui/material";
import { Annotations, Color, Datum, ScatterData } from "plotly.js";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"; // Added useRef
import Plot, { Figure } from "react-plotly.js";
import { PerspectivesDoc } from "../../../api/openapi/models/PerspectivesDoc.ts";
import { PerspectivesVisualization } from "../../../api/openapi/models/PerspectivesVisualization.ts";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { PerspectivesActions } from "../perspectivesSlice.ts";
import MapTooltip, { MapTooltipData } from "./MapTooltip.tsx";

interface MapPlotProps {
  vis: PerspectivesVisualization;
}

function MapPlot({ vis }: MapPlotProps) {
  // global client state
  const dispatch = useAppDispatch();
  const selectedSdocIds = useAppSelector((state) => state.perspectives.selectedSdocIds);
  const selectedSdocIdsIndex = useAppSelector((state) => state.perspectives.selectedSdocIdsIndex);
  const pointSize = useAppSelector((state) => state.perspectives.pointSize);
  const showLabels = useAppSelector((state) => state.perspectives.showLabels);
  const colorScheme = useAppSelector((state) => state.perspectives.colorScheme);
  const showTicks = useAppSelector((state) => state.perspectives.showTicks);
  const showGrid = useAppSelector((state) => state.perspectives.showGrid);
  // highlighting
  const selectedClusterId = useAppSelector((state) => state.perspectives.highlightedClusterId);
  const highlightReviewedDocs = useAppSelector((state) => state.perspectives.highlightReviewedDocs);

  // chart data
  const { chartData, labels } = useMemo(() => {
    const chartData: Record<string, Partial<ScatterData>> = {};
    const labels: Partial<Annotations>[] = [];

    const sdocId2Doc = vis.docs.reduce(
      (acc, doc) => {
        acc[doc.sdoc_id] = doc;
        return acc;
      },
      {} as Record<number, PerspectivesDoc>,
    );

    const clusterid2clusterindex: Record<number, number> = {};
    vis.clusters.forEach((cluster, index) => {
      clusterid2clusterindex[cluster.id] = index;
    });

    // prepare the legend & labels
    vis.clusters.forEach((cluster) => {
      chartData[cluster.id] = {
        x: [],
        y: [],
        ids: [],
        type: "scattergl",
        mode: "markers",
        name: cluster.name,
        hoverinfo: "none",
        selectedpoints: [],
        marker: {
          size: [],
          line: {
            color: "black",
            width: [],
          },
          color: [],
          opacity: 1,
        },
        selected: {
          marker: {
            size: pointSize * 1.5,
          },
        },
        visible: true,
      } as Partial<ScatterData>;

      if (!cluster.is_outlier) {
        labels.push({
          text: cluster.name,
          x: cluster.x,
          y: cluster.y,
          xref: "x",
          yref: "y",
          showarrow: false,
          font: {
            size: 16,
            color: "white",
            weight: 1000,
            shadow: "0px 0px 6px black, -1px 0 DimGray, 0 1px DimGray, 1px 0 DimGray, 0 -1px DimGray",
            family: "Roboto",
          },
          visible: true,
        });
      }
    });

    // fill the coordinates
    const selectedSdocId = selectedSdocIds[selectedSdocIdsIndex];
    vis.docs.forEach((doc) => {
      if (doc.sdoc_id == selectedSdocId) return;
      const trace = chartData[doc.cluster_id];
      const clusterIndex = clusterid2clusterindex[doc.cluster_id];
      (trace.x as Datum[]).push(doc.x);
      (trace.y as Datum[]).push(doc.y);
      (trace.ids as string[]).push(`${doc.sdoc_id}`);
      // no border
      (trace.marker!.line!.width! as number[]).push(0);
      // size & color
      if (doc.is_outlier) {
        (trace.marker!.size as number[]).push(4);
        (trace.marker!.color as Color[]).push("lightgrey");
      } else if (!doc.in_searchresult) {
        (trace.marker!.size as number[]).push(4);
        (trace.marker!.color as Color[]).push("lightgrey");
      } else if (highlightReviewedDocs && !doc.is_accepted) {
        (trace.marker!.size as number[]).push(4);
        (trace.marker!.color as Color[]).push("lightgrey");
      } else if (selectedClusterId && selectedClusterId !== doc.cluster_id) {
        (trace.marker!.size as number[]).push(4);
        (trace.marker!.color as Color[]).push("lightgrey");
      } else {
        (trace.marker!.size as number[]).push(pointSize);
        (trace.marker!.color as Color[]).push(
          colorScheme[clusterIndex % colorScheme.length] + (doc.is_accepted ? "ff" : "80"),
        );
      }
    });

    // special treatment for the selected document
    const doc = sdocId2Doc[selectedSdocId];
    if (doc) {
      const trace = chartData[doc.cluster_id];
      const clusterIndex = clusterid2clusterindex[doc.cluster_id];
      (trace.x as Datum[]).push(doc.x);
      (trace.y as Datum[]).push(doc.y);
      (trace.ids as string[]).push(`${doc.sdoc_id}`);
      // border for the selected document
      (trace.marker!.line!.width! as number[]).push(2);
      // size & color
      if (doc.is_outlier) {
        (trace.marker!.size as number[]).push(4);
        (trace.marker!.color as Color[]).push("lightgrey");
      } else if (!doc.in_searchresult) {
        (trace.marker!.size as number[]).push(4);
        (trace.marker!.color as Color[]).push("lightgrey");
      } else if (highlightReviewedDocs && !doc.is_accepted) {
        (trace.marker!.size as number[]).push(4);
        (trace.marker!.color as Color[]).push("lightgrey");
      } else if (selectedClusterId && selectedClusterId !== doc.cluster_id) {
        (trace.marker!.size as number[]).push(4);
        (trace.marker!.color as Color[]).push("lightgrey");
      } else {
        (trace.marker!.size as number[]).push(pointSize);
        (trace.marker!.color as Color[]).push(
          colorScheme[clusterIndex % colorScheme.length] + (doc.is_accepted ? "ff" : "80"),
        );
      }
    }

    return { chartData, labels };
  }, [
    colorScheme,
    highlightReviewedDocs,
    pointSize,
    selectedSdocIds,
    selectedSdocIdsIndex,
    selectedClusterId,
    vis.docs,
    vis.clusters,
  ]);

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
      xaxis: { zeroline: false, showticklabels: showTicks, showgrid: showGrid },
      yaxis: { zeroline: false, showticklabels: showTicks, showgrid: showGrid },
      showlegend: false,
      annotations: showLabels ? labels : undefined,
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
          annotations: showLabels ? labels : undefined,
          xaxis: { ...oldFigure.layout.xaxis, showticklabels: showTicks, showgrid: showGrid },
          yaxis: { ...oldFigure.layout.yaxis, showticklabels: showTicks, showgrid: showGrid },
        },
      };
    });
  }, [showLabels, chartData, colorScheme, showTicks, showGrid, labels]);

  // tooltip
  const [tooltipData, setTooltipData] = useState<MapTooltipData>({
    id: undefined,
    position: undefined,
  });
  const handleHover = useCallback((event: any) => {
    setTooltipData((oldData) => {
      if (oldData.id === event.points[0].id) {
        return oldData; // No change
      }

      const newData = { ...oldData };
      if (!newData.position) {
        newData.position = { top: event.event.y - 40, left: event.event.x + 40 };
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

  // PANNING FEATURE
  // Ref for the plot container
  const plotContainerRef = useRef<HTMLDivElement>(null);

  // State for custom panning
  const panStartCoordsForEventRef = useRef<{ x: number; y: number } | null>(null);
  const panInitialRangesRef = useRef<{ xaxis: [number, number]; yaxis: [number, number] } | null>(null);

  // panning event handlers
  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      // Use panStartCoordsForEventRef.current for up-to-date drag start coordinates
      if (!panStartCoordsForEventRef.current || !panInitialRangesRef.current || !plotContainerRef.current) return;

      const plotRect = plotContainerRef.current.getBoundingClientRect();
      if (plotRect.width === 0 || plotRect.height === 0) return;

      const dx = event.clientX - panStartCoordsForEventRef.current.x;
      const dy = event.clientY - panStartCoordsForEventRef.current.y;

      const { xaxis: initialXRange, yaxis: initialYRange } = panInitialRangesRef.current;

      const xRangeSpan = initialXRange[1] - initialXRange[0];
      const yRangeSpan = initialYRange[1] - initialYRange[0];

      const dataPerPixelX = xRangeSpan / plotRect.width;
      const dataPerPixelY = yRangeSpan / plotRect.height;

      const newXMin = initialXRange[0] - dx * dataPerPixelX;
      const newXMax = initialXRange[1] - dx * dataPerPixelX;
      const newYMin = initialYRange[0] + dy * dataPerPixelY; // Screen Y is inverted relative to typical data Y
      const newYMax = initialYRange[1] + dy * dataPerPixelY;

      setFigure((prevFigure) => ({
        ...prevFigure,
        layout: {
          ...prevFigure.layout,
          xaxis: {
            ...prevFigure.layout.xaxis,
            range: [newXMin, newXMax],
            autorange: false,
          },
          yaxis: {
            ...prevFigure.layout.yaxis,
            range: [newYMin, newYMax],
            autorange: false,
          },
        },
      }));
    },
    [setFigure], // setFigure is stable, panStartCoordsForEventRef is read directly
  );

  const handleMouseUp = useCallback(() => {
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp); // Self-removal is fine with stable handleMouseUp
    panStartCoordsForEventRef.current = null; // Clear the ref
  }, [handleMouseMove]); // handleMouseMove is now stable, setPanStartCoords is stable

  const handleMouseDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (event.button === 2 && plotContainerRef.current) {
        event.preventDefault();
        const newPanStart = { x: event.clientX, y: event.clientY };
        panStartCoordsForEventRef.current = newPanStart; // Set ref immediately for event handlers

        const currentXAxis = figure.layout.xaxis;
        const currentYAxis = figure.layout.yaxis;
        if (currentXAxis && currentYAxis && currentXAxis.range && currentYAxis.range) {
          panInitialRangesRef.current = {
            xaxis: [...currentXAxis.range] as [number, number],
            yaxis: [...currentYAxis.range] as [number, number],
          };
        } else {
          panInitialRangesRef.current = null;
        }
        // Add event listeners directly
        // console.log("Mouse Down - Adding Listeners");
        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
      }
    },
    // Dependencies: figure.layout parts, stable handlers, and setPanStartCoords (stable)
    [figure.layout.xaxis, figure.layout.yaxis, handleMouseMove, handleMouseUp],
  );

  return (
    <Box
      sx={{ flexGrow: 1, overflow: "hidden" }}
      ref={plotContainerRef}
      onMouseDown={handleMouseDown}
      onContextMenu={(e) => {
        // Prevent context menu if right click is initiating pan or during pan
        if (e.button === 2) {
          e.preventDefault();
        }
      }}
    >
      <Plot
        data={figure.data}
        layout={figure.layout}
        frames={figure.frames || undefined}
        useResizeHandler={true}
        config={{
          displayModeBar: true,
          responsive: true,
          displaylogo: false,
          scrollZoom: true,
          toImageButtonOptions: { filename: "perspectives-map" },
          modeBarButtonsToRemove: ["pan2d", "zoomIn2d", "zoomOut2d", "zoom2d"],
        }}
        style={{ width: "100%", height: "100%" }}
        onHover={handleHover}
        onUnhover={handleUnhover}
        onDeselect={() => {
          setFigure((oldFigure) => {
            return {
              ...oldFigure,
              layout: {
                ...oldFigure.layout,
                selections: [],
              },
            };
          });
          dispatch(PerspectivesActions.onResetSelection());
        }}
        onSelected={(event) => {
          if (event) {
            dispatch(
              PerspectivesActions.onSelectionChange(
                event.points.reduce((acc: number[], point: any) => {
                  acc.push(point.id);
                  return acc;
                }, [] as number[]),
              ),
            );
          }
        }}
      />
      <MapTooltip data={tooltipData} />
    </Box>
  );
}
export default memo(MapPlot);
