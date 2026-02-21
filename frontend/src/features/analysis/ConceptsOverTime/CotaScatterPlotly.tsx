/* eslint-disable @typescript-eslint/no-explicit-any */
import CircleIcon from "@mui/icons-material/Circle";
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  PopoverPosition,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { MRT_RowSelectionState } from "material-react-table";
import { Datum, ScatterData } from "plotly.js";
import { ReactNode, useEffect, useMemo, useState } from "react";
import Plot, { Figure } from "react-plotly.js";
import { COTAConcept } from "../../../api/openapi/models/COTAConcept.ts";
import { COTARead } from "../../../api/openapi/models/COTARead.ts";
import { COTASentence } from "../../../api/openapi/models/COTASentence.ts";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { CotaPlotToggleButton } from "./CotaPlotToggleButton.tsx";
import { CotaActions } from "./cotaSlice.ts";

interface CotaScatterPlotlyProps {
  cota: COTARead;
}

export function CotaScatterPlotly({ cota }: CotaScatterPlotlyProps) {
  // computed
  const { chartData, conceptId2Concept, sentenceId2CotaSentence } = useMemo(() => {
    // 1. compute chart data
    const chartData: Record<string, Partial<ScatterData>> = {};
    cota.concepts.forEach((concept) => {
      chartData[concept.id] = {
        x: [],
        y: [],
        ids: [],
        type: "scattergl",
        mode: "markers",
        name: concept.name,
        hoverinfo: "none",
        selectedpoints: [],
        marker: {
          color: concept.color,
          size: 10,
        },
        selected: {
          marker: { size: 20 },
        },
        visible: concept.visible,
      } as Partial<ScatterData>;
    });
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

    cota.search_space.forEach((cotaSentence) => {
      let trace;
      if (cotaSentence.concept_annotation) {
        trace = chartData[cotaSentence.concept_annotation];
      } else {
        trace = chartData["NO_CONCEPT"];
      }
      (trace.x as Datum[]).push(cotaSentence.x);
      (trace.y as Datum[]).push(cotaSentence.y);
      (trace.ids as string[]).push(`${cotaSentence.sdoc_id}-${cotaSentence.sentence_id}`);
    });

    // 3. compute conceptId2ConceptMap
    const conceptId2Concept: Record<string, COTAConcept> = cota.concepts.reduce(
      (acc, concept) => {
        acc[concept.id] = concept;
        return acc;
      },
      {} as Record<string, COTAConcept>,
    );
    conceptId2Concept["NO_CONCEPT"] = {
      id: "NO_CONCEPT",
      name: "Unassigned",
      color: "purple",
      description: "Unassigned",
      visible: true,
    };

    // 4. compute sentenceId2ConceptI
    const sentenceId2CotaSentence: Record<string, COTASentence> = cota.search_space.reduce(
      (acc, cotaSentence) => {
        acc[`${cotaSentence.sdoc_id}-${cotaSentence.sentence_id}`] = cotaSentence;
        return acc;
      },
      {} as Record<string, COTASentence>,
    );

    return {
      chartData,
      conceptId2Concept,
      sentenceId2CotaSentence,
    };
  }, [cota]);

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

  // selection
  const dispatch = useAppDispatch();
  const rowSelectionModel = useAppSelector((state) => state.cota.rowSelectionModel);

  // update figure when selection changes
  useEffect(() => {
    setFigure((oldFigure) => {
      const newFigureData = oldFigure.data.slice() as ScatterData[];

      // reset selection
      for (const trace of newFigureData) {
        trace.selectedpoints = [];
      }

      // update selection
      for (const [id, selected] of Object.entries(rowSelectionModel)) {
        if (selected) {
          const conceptId = sentenceId2CotaSentence[id].concept_annotation || "NO_CONCEPT";
          const conceptName = conceptId2Concept[conceptId].name;
          const trace = newFigureData.find((data) => data.name === conceptName);
          if (trace) {
            const index = trace.ids.indexOf(id);
            if (index >= 0) {
              trace.selectedpoints.push(index);
            }
          }
        }
      }

      // if row selection model is empty, reset the selection ui as well
      if (Object.keys(rowSelectionModel).length === 0) {
        return { ...oldFigure, data: newFigureData, layout: { ...oldFigure.layout, selections: [] } };
      } else {
        return { ...oldFigure, data: newFigureData };
      }
    });
  }, [rowSelectionModel, sentenceId2CotaSentence, conceptId2Concept]);

  // tooltip
  const [tooltipData, setTooltipData] = useState<TooltipData>({
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

  // render
  let content: ReactNode;
  if (cota.concepts.length === 0) {
    content = (
      <Typography>Please add a concept to start the analysis (or make at least one concept visible).</Typography>
    );
  } else {
    content = (
      <Plot
        data={figure.data}
        layout={figure.layout}
        frames={figure.frames || undefined}
        useResizeHandler={true}
        config={{ displayModeBar: true, toImageButtonOptions: { filename: `cota-scatter-plot-${cota.name}` } }}
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
            dispatch(CotaActions.onRowSelectionChange({}));
            return;
          }
          dispatch(
            CotaActions.onRowSelectionChange(
              event.points.reduce((acc: MRT_RowSelectionState, point: any) => {
                acc[point.id] = true;
                return acc;
              }, {} as MRT_RowSelectionState),
            ),
          );
        }}
      />
    );
  }

  return (
    <>
      <Card className="myFlexContainer h100">
        <CardHeader
          className="myFlexFitContentContainer"
          title={"Scatter Plot"}
          subheader={`Hover on a dot to see more information. Right-click dot to modify.`}
          action={<CotaPlotToggleButton />}
          sx={{ pb: 0 }}
        />
        <CardContent className="myFlexFillAllContainer">{content}</CardContent>
      </Card>
      <TestTooltip
        data={tooltipData}
        sentenceId2CotaSentence={sentenceId2CotaSentence}
        conceptId2Concept={conceptId2Concept}
      />
    </>
  );
}

interface TooltipData {
  id?: string;
  position?: PopoverPosition;
}

interface TestTooltipProps {
  data: TooltipData;
  sentenceId2CotaSentence: Record<string, COTASentence>;
  conceptId2Concept: Record<string, COTAConcept>;
}

function TestTooltip({ data, sentenceId2CotaSentence, conceptId2Concept }: TestTooltipProps) {
  if (data.id && data.position) {
    const cotaSentence = sentenceId2CotaSentence[data.id];
    const concept = conceptId2Concept[cotaSentence.concept_annotation || "NO_CONCEPT"];
    return (
      <Box
        maxWidth="sm"
        sx={{
          display: data.position ? "block" : "none",
          position: "absolute",
          top: data.position.top,
          left: data.position.left,
          zIndex: 9999,
        }}
      >
        <Card>
          <CardContent>
            <Stack direction="row" alignItems="top" marginBottom={1}>
              <CircleIcon fontSize="small" style={{ marginRight: "4px", color: concept.color }} />
              <Typography>{cotaSentence.text}</Typography>
            </Stack>

            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Concept</TableCell>
                  <TableCell>Similarity</TableCell>
                  <TableCell>Probability</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.values(conceptId2Concept)
                  .filter((concept) => concept.id !== "NO_CONCEPT")
                  .map((concept) => (
                    <TableRow key={concept.id} sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                      <TableCell component="th" scope="row" sx={{ color: concept.color }}>
                        {concept.name}
                      </TableCell>
                      <TableCell>{(cotaSentence.concept_similarities[concept.id] * 100.0).toFixed(2)}</TableCell>
                      <TableCell>{(cotaSentence.concept_probabilities[concept.id] * 100.0).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Box>
    );
  } else {
    return null;
  }
}
