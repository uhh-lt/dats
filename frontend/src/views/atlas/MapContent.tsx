/* eslint-disable @typescript-eslint/no-explicit-any */
import SearchIcon from "@mui/icons-material/Search";
import { Box, InputAdornment, TextField } from "@mui/material";
import { Datum, ScatterData } from "plotly.js";
import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Plot, { Figure } from "react-plotly.js";
import { TMVisualization } from "../../api/openapi/models/TMVisualization.ts";
import TopicModellingHooks from "../../api/TopicModellingHooks.ts";
import ExportSdocsButton from "../../components/Export/ExportSdocsButton.tsx";
import ReduxFilterDialog from "../../components/FilterDialog/ReduxFilterDialog.tsx";
import DATSToolbar from "../../components/MUI/DATSToolbar.tsx";
import { selectSelectedDocumentIds } from "../../components/tableSlice.ts";
import TagMenuButton from "../../components/Tag/TagMenu/TagMenuButton.tsx";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks.ts";
import { RootState } from "../../store/store.ts";
import SearchOptionsMenu from "../search/DocumentSearch/SearchOptionsMenu.tsx";
import { SearchActions } from "../search/DocumentSearch/searchSlice.ts";
import { AtlasActions } from "./atlasSlice.ts";
import MapTooltip, { MapTooltipData } from "./MapTooltip.tsx";

const filterStateSelector = (state: RootState) => state.atlas;
const filterName = "root";

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
  // selection
  const selectedDocumentIds = useAppSelector((state) => selectSelectedDocumentIds(state.search));

  // global client state
  const dispatch = useAppDispatch();

  // filter dialog
  const toolbarRef = useRef<HTMLDivElement>(null);

  // search bar
  const [searchQuery, setSearchQuery] = useState("");
  const handleSearchQueryChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };
  // const debouncedSearchQuery = useDebounce(searchQuery, 500);

  // chart data
  const { chartData, labels } = useMemo(() => {
    const chartData: Record<string, Partial<ScatterData>> = {};
    const labels: { x: number; y: number; text: string }[] = [];

    const sdocId2Pos: Record<string, { x: number; y: number }> = vis.docs.reduce(
      (acc, doc) => {
        acc[doc.sdoc_id] = { x: doc.x, y: doc.y };
        return acc;
      },
      {} as Record<string, { x: number; y: number }>,
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
          color: topic.color,
          size: 10,
        },
        selected: {
          marker: { size: 20 },
        },
        visible: true,
      } as Partial<ScatterData>;

      labels.push({
        text: topic.name,
        x: sdocId2Pos[topic.top_docs![0]].x,
        y: sdocId2Pos[topic.top_docs![0]].y,
      });
    });

    // fill the coordinates
    vis.docs.forEach((doc) => {
      const trace = chartData[doc.topic_id];
      (trace.x as Datum[]).push(doc.x);
      (trace.y as Datum[]).push(doc.y);
      (trace.ids as string[]).push(`${doc.sdoc_id}`);
    });

    return { chartData, labels };
  }, [vis]);

  // plot state
  const [figure, setFigure] = useState<Figure>({
    data: Object.values(chartData),
    layout: {
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
      annotations: labels.map((label) => ({
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
    },
    frames: null,
  });

  // update figure when chartData changes
  useEffect(() => {
    setFigure((oldFigure) => {
      return { ...oldFigure, data: Object.values(chartData) };
    });
  }, [chartData]);

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
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <DATSToolbar variant="dense" ref={toolbarRef}>
        <ReduxFilterDialog
          anchorEl={toolbarRef.current}
          buttonProps={{ size: "small" }}
          filterName={filterName}
          filterStateSelector={filterStateSelector}
          filterActions={SearchActions}
          transformOrigin={{ horizontal: "left", vertical: "top" }}
          anchorOrigin={{ horizontal: "left", vertical: "bottom" }}
        />
        {selectedDocumentIds.length > 0 && (
          <>
            <TagMenuButton
              selectedSdocIds={selectedDocumentIds}
              popoverOrigin={{ horizontal: "center", vertical: "bottom" }}
            />
          </>
        )}
        <Box sx={{ flexGrow: 1 }} />
        <TextField
          type="text"
          value={searchQuery}
          onChange={handleSearchQueryChange}
          placeholder="Search documents ..."
          variant="outlined"
          size="small"
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            },
          }}
        />
        <SearchOptionsMenu />
        <ExportSdocsButton sdocIds={selectedDocumentIds} />
      </DATSToolbar>
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
              dispatch(AtlasActions.onRowSelectionChange([]));
              return;
            }
            dispatch(
              AtlasActions.onRowSelectionChange(
                event.points.reduce((acc: number[], point: any) => {
                  acc.push(point.id);
                  return acc;
                }, [] as number[]),
              ),
            );
          }}
        />
      </Box>
      <MapTooltip data={tooltipData} />
    </Box>
  );
}
export default MapContent;
