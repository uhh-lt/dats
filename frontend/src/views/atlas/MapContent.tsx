/* eslint-disable @typescript-eslint/no-explicit-any */
import SearchIcon from "@mui/icons-material/Search";
import { Box, InputAdornment, TextField } from "@mui/material";
import { ScatterData } from "plotly.js";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import Plot, { Figure } from "react-plotly.js";
import ExportSdocsButton from "../../components/Export/ExportSdocsButton.tsx";
import ReduxFilterDialog from "../../components/FilterDialog/ReduxFilterDialog.tsx";
import DATSToolbar from "../../components/MUI/DATSToolbar.tsx";
import { selectSelectedDocumentIds } from "../../components/tableSlice.ts";
import TagMenuButton from "../../components/Tag/TagMenu/TagMenuButton.tsx";
import { useAppSelector } from "../../plugins/ReduxHooks.ts";
import { RootState } from "../../store/store.ts";
import SearchOptionsMenu from "../search/DocumentSearch/SearchOptionsMenu.tsx";
import { SearchActions } from "../search/DocumentSearch/searchSlice.ts";
import MapTooltip, { MapTooltipData } from "./MapTooltip.tsx";

const filterStateSelector = (state: RootState) => state.search;
const filterName = "root";

const name = "tims-super-map";

function MapContent() {
  // This component is a placeholder for the map content.
  // You can add your map rendering logic here.

  // selection
  const selectedDocumentIds = useAppSelector((state) => selectSelectedDocumentIds(state.search));

  // filter dialog
  const toolbarRef = useRef<HTMLDivElement>(null);

  // search bar
  const [searchQuery, setSearchQuery] = useState("");
  const handleSearchQueryChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };
  // const debouncedSearchQuery = useDebounce(searchQuery, 500);

  // chart data
  const chartData: Record<string, Partial<ScatterData>> = useMemo(() => {
    const chartData: Record<string, Partial<ScatterData>> = {};
    chartData["NO_CONCEPT"] = {
      x: [],
      y: [],
      ids: [],
      type: "scatter",
      mode: "markers",
      name: "Unassigned",
      hoverinfo: "none",
      selectedpoints: [],
      opacity: 0.5,
      marker: {
        color: "purple",
        size: 10,
      },
      selected: {
        marker: { size: 20 },
      },
    } as Partial<ScatterData>;
    return chartData;
  }, []);

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
  const handleHover = (event: any) => {
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
  };
  const handleUnhover = () => {
    setTooltipData({ id: undefined, position: undefined });
  };

  // plotly ref
  const plotContainerRef = useRef<HTMLDivElement>(null); // Ref for the container div
  const plotRef = useRef<Plot>(null); // Ref for the Plotly component (optional but good practice)

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
      <Box ref={plotContainerRef} sx={{ flexGrow: 1, overflow: "hidden" }}>
        <Plot
          ref={plotRef}
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
              // dispatch(CotaActions.onRowSelectionChange({}));
              return;
            }
            // dispatch(
            //   CotaActions.onRowSelectionChange(
            //     event.points.reduce((acc: MRT_RowSelectionState, point: any) => {
            //       acc[point.id] = true;
            //       return acc;
            //     }, {} as MRT_RowSelectionState),
            //   ),
            // );
          }}
        />
      </Box>
      <MapTooltip data={tooltipData} />
    </Box>
  );
}
export default MapContent;
