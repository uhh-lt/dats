import BorderColorIcon from "@mui/icons-material/BorderColor";
import CircleIcon from "@mui/icons-material/Circle";
import ClearIcon from "@mui/icons-material/Clear";
import DeleteIcon from "@mui/icons-material/Delete";
import InfoIcon from "@mui/icons-material/Info";
import { Button, ListItemIcon, ListItemText, Menu, MenuItem, Stack, Typography } from "@mui/material";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import IconButton from "@mui/material/IconButton";
import { padStart } from "lodash";
import {
  MRT_ColumnDef,
  MRT_RowSelectionState,
  MRT_RowVirtualizer,
  MRT_ShowHideColumnsButton,
  MRT_ToggleDensePaddingButton,
  MRT_ToggleGlobalFilterButton,
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import React, { useEffect, useMemo, useRef, useState } from "react";
import CotaHooks from "../../../api/CotaHooks.ts";
import { COTAConcept } from "../../../api/openapi/models/COTAConcept.ts";
import { COTARead } from "../../../api/openapi/models/COTARead.ts";
import { COTASentence } from "../../../api/openapi/models/COTASentence.ts";
import { COTASentenceID } from "../../../api/openapi/models/COTASentenceID.ts";
import { DateGroupBy } from "../../../api/openapi/models/DateGroupBy.ts";
import { useOpenSnackbar } from "../../../components/SnackbarDialog/useOpenSnackbar.ts";
import SdocRenderer from "../../../components/SourceDocument/SdocRenderer.tsx";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { dateToLocaleDate } from "../../../utils/DateUtils.ts";
import { CotaActions } from "./cotaSlice.ts";

interface CotaSentenceAnnotatorProps {
  cota: COTARead;
}

function CotaSentenceAnnotator2({ cota }: CotaSentenceAnnotatorProps) {
  // global client state (redux)
  const selectedConceptId = useAppSelector((state) => state.cota.selectedConceptId);
  const selectedDate = useAppSelector((state) => state.cota.selectedDate);

  // computed
  const selectedConcept = useMemo(() => {
    return cota.concepts.find((c) => c.id === selectedConceptId);
  }, [cota, selectedConceptId]);

  let title = "Similar sentences";
  if (selectedConcept) {
    title += ` for concept ${selectedConcept.name}`;
  }
  if (selectedDate) {
    title += ` on date ${selectedDate}`;
  }

  return (
    <Card className="myFlexContainer h100">
      <CardHeader
        className="myFlexFitContentContainer"
        action={
          <IconButton aria-label="info">
            <InfoIcon />
          </IconButton>
        }
        title={title}
        subheader="Annotate sentences to improve the timeline analysis"
        sx={{ pb: 0 }}
      />
      <CardContent className="myFlexFillAllContainer" style={{ ...(selectedConcept && { padding: 0 }) }}>
        {!selectedConcept ? (
          <>Select a concept from the concept list to see similar sentences</>
        ) : (
          <SimilarSentencesTable cota={cota} concept={selectedConcept} key={selectedConcept.id} />
        )}
      </CardContent>
    </Card>
  );
}

interface SimilarSentencesTableProps {
  cota: COTARead;
  concept: COTAConcept;
}

function SimilarSentencesTable({ cota, concept }: SimilarSentencesTableProps) {
  // local state
  const [rowSelectionModel, setRowSelectionModel] = useState<MRT_RowSelectionState>({});

  // global client state (redux)
  const provenanceSdocIdSentenceId = useAppSelector((state) => state.cota.provenanceSdocIdSentenceId);
  const selectedDate = useAppSelector((state) => state.cota.selectedDate);
  const dispatch = useAppDispatch();

  // snackbar
  const openSnackbar = useOpenSnackbar();

  // virtualization
  const rowVirtualizerInstanceRef = useRef<MRT_RowVirtualizer>(null);

  // compute search space
  const searchSpace = useMemo(() => {
    if (!selectedDate) return cota.search_space;

    const result: COTASentence[] = [];
    cota.search_space.forEach((cotaSentence) => {
      // prepare date
      const date = dateToLocaleDate(cotaSentence.date);
      let dateStr = "";
      switch (cota.timeline_settings.group_by) {
        case DateGroupBy.DAY:
          dateStr = date.getFullYear() + "-" + padStart(`${date.getMonth() + 1}`, 2, "0") + "-" + date.getDate();
          break;
        case DateGroupBy.MONTH:
          dateStr = date.getFullYear() + "-" + padStart(`${date.getMonth() + 1}`, 2, "0");
          break;
        case DateGroupBy.YEAR:
          dateStr = date.getFullYear().toString();
          break;
      }

      if (dateStr === selectedDate) {
        result.push(cotaSentence);
      }
    });
    return result;
  }, [cota, selectedDate]);

  const columns: MRT_ColumnDef<COTASentence>[] = useMemo(() => {
    const conceptDict = cota.concepts.reduce(
      (acc, concept) => {
        acc[concept.id] = concept;
        return acc;
      },
      {} as Record<string, COTAConcept>,
    );

    return [
      {
        id: "similarity",
        header: "Similarity",
        size: 145,
        Cell: ({ row }) => <>{(row.original.concept_similarities[concept.id] * 100.0).toFixed(2)}</>,
        accessorFn: (row) => row.concept_similarities[concept.id],
      },
      {
        id: "probability",
        header: "Probability",
        size: 155,
        Cell: ({ row }) => <>{(row.original.concept_probabilities[concept.id] * 100.0).toFixed(2)}</>,
        accessorFn: (row) => row.concept_probabilities[concept.id],
      },
      {
        id: "annotation",
        header: "Annotation",
        size: 155,
        accessorFn: (row) => (row.concept_annotation ? conceptDict[row.concept_annotation].name : ""),
        muiTableBodyCellProps({ row }) {
          return {
            sx: {
              ...(row.original.concept_annotation && {
                color: conceptDict[row.original.concept_annotation].color,
              }),
            },
          };
        },
      },
      {
        id: "sdoc",
        header: "Document",
        Cell: ({ row }) => <SdocRenderer sdoc={row.original.sdoc_id} link renderFilename />,
      },
      {
        id: "sentence",
        header: "Sentence",
        grow: 1,
        accessorFn: (row) => row.text,
      },
    ] as MRT_ColumnDef<COTASentence>[];
  }, [concept.id, cota.concepts]);

  // scroll
  useEffect(() => {
    provenanceSdocIdSentenceId &&
      requestIdleCallback(() => {
        const [sdocIdStr, sentenceIdStr] = provenanceSdocIdSentenceId.toString().split("-");
        const sdocId = parseInt(sdocIdStr);
        const sentenceId = parseInt(sentenceIdStr);
        const scrollToIndex = searchSpace.findIndex(
          (cotaSentence) => cotaSentence.sdoc_id === sdocId && cotaSentence.sentence_id === sentenceId,
        );
        try {
          if (scrollToIndex !== -1) {
            rowVirtualizerInstanceRef.current?.scrollToIndex?.(scrollToIndex);
          } else {
            rowVirtualizerInstanceRef.current?.scrollToIndex?.(0);
          }
        } catch (error) {
          console.error(error);
        }
      });
  }, [provenanceSdocIdSentenceId, searchSpace]);

  // actions
  const annotateCotaSentences = CotaHooks.useAnnotateCotaSentences();
  const handleAnnotateSentences = (sentences: COTASentenceID[], conceptId: string | null) => {
    annotateCotaSentences.mutate(
      {
        cotaId: cota.id,
        conceptId: conceptId,
        requestBody: sentences,
      },
      {
        onSuccess(data) {
          openSnackbar({
            text: `Updated CotA '${data.name}'`,
            severity: "success",
          });
          setRowSelectionModel({});
        },
      },
    );
  };

  const removeCotaSentences = CotaHooks.useRemoveCotaSentences();
  const handleRemoveSentences = (sentences: COTASentenceID[]) => {
    removeCotaSentences.mutate(
      {
        cotaId: cota.id,
        requestBody: sentences,
      },
      {
        onSuccess(data) {
          openSnackbar({
            text: `Updated CotA '${data.name}'`,
            severity: "success",
          });
          setRowSelectionModel({});
        },
      },
    );
  };

  // table
  const table = useMaterialReactTable<COTASentence>({
    data: searchSpace,
    columns: columns,
    getRowId: (row) => `${row.sdoc_id}-${row.sentence_id}`,
    // state
    state: {
      rowSelection: rowSelectionModel,
    },
    // initial state
    initialState: {
      sorting: [
        {
          id: "similarity",
          desc: true,
        },
      ],
      columnVisibility: {
        sdoc: false,
      },
    },
    // search query
    autoResetAll: false,
    manualFiltering: false, // turn on client-side filtering
    enableGlobalFilter: true,
    enableGlobalFilterModes: true, //enable the user to choose between multiple search filter modes
    // selection
    enableRowSelection: true,
    onRowSelectionChange: setRowSelectionModel,
    // virtualization
    enableRowVirtualization: true,
    rowVirtualizerInstanceRef: rowVirtualizerInstanceRef,
    rowVirtualizerOptions: { overscan: 4 },
    // filtering
    enableColumnFilters: false,
    // pagination
    enablePagination: false,
    // sorting
    manualSorting: false,
    // column resizing
    enableColumnResizing: true,
    columnResizeMode: "onEnd",
    // mui components
    muiTableBodyRowProps: ({ row }) => ({
      onClick: () => {
        dispatch(CotaActions.onSentenceAnnotatorRowClick(row.id));
      },
      sx: {
        backgroundColor: provenanceSdocIdSentenceId === row.id ? "lightgrey !important" : undefined,
      },
    }),
    muiTablePaperProps: {
      elevation: 8,
      style: { height: "100%", display: "flex", flexDirection: "column" },
    },
    muiTableContainerProps: {
      style: { flexGrow: 1 },
    },
    // toolbar
    positionToolbarAlertBanner: "head-overlay",
    renderTopToolbarCustomActions: () => (
      <SimilarSentencesToolbar
        concepts={cota.concepts}
        selectedRows={rowSelectionModel}
        onAnnotateSentences={handleAnnotateSentences}
        onRemoveSentences={handleRemoveSentences}
      />
    ),
    renderToolbarInternalActions: ({ table }) => (
      <Stack direction={"row"} spacing={1} alignItems="center">
        <MRT_ToggleGlobalFilterButton table={table} disabled={false} />
        <MRT_ShowHideColumnsButton table={table} />
        <MRT_ToggleDensePaddingButton table={table} />
      </Stack>
    ),
    renderBottomToolbarCustomActions: () => (
      <Stack direction={"row"} spacing={1} alignItems="center">
        <Typography>Found {searchSpace.length} sentences.</Typography>
      </Stack>
    ),
  });

  return <MaterialReactTable table={table} />;
}

interface SimilarSentencesToolbarProps {
  concepts: COTAConcept[];
  selectedRows: MRT_RowSelectionState;
  onAnnotateSentences: (sentences: COTASentenceID[], conceptId: string | null) => void;
  onRemoveSentences: (sentences: COTASentenceID[]) => void;
}

function SimilarSentencesToolbar({
  selectedRows,
  onAnnotateSentences,
  onRemoveSentences,
  concepts,
}: SimilarSentencesToolbarProps) {
  const numSelectedRows = Object.keys(selectedRows).length;

  // actions
  const handleAnnotateSentences = (conceptId: string | null) => {
    setAnchorEl(null);
    onAnnotateSentences(
      Object.keys(selectedRows).map((row) => {
        // row is a string in the format of `${row.sdocId}-${row.sentenceId}`
        const [sdocId, sentenceId] = row.toString().split("-");
        return {
          sentence_id: parseInt(sentenceId),
          sdoc_id: parseInt(sdocId),
        };
      }),
      conceptId,
    );
  };

  const handleRemoveSentences = () => {
    onRemoveSentences(
      Object.keys(selectedRows).map((row) => {
        // row is a string in the format of `${row.sdocId}-${row.sentenceId}`
        const [sdocId, sentenceId] = row.toString().split("-");
        return {
          sentence_id: parseInt(sentenceId),
          sdoc_id: parseInt(sdocId),
        };
      }),
    );
  };

  // annotation menu
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <Stack direction={"row"} spacing={1} alignItems="center">
      {numSelectedRows > 0 && (
        <Button startIcon={<BorderColorIcon />} size="small" onClick={handleClick}>
          Annotate ({numSelectedRows})
        </Button>
      )}
      <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
        <MenuItem onClick={() => handleAnnotateSentences(null)}>
          <ListItemIcon>
            <ClearIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Clear annotation</ListItemText>
        </MenuItem>
        {concepts.map((concept) => (
          <MenuItem onClick={() => handleAnnotateSentences(concept.id)}>
            <ListItemIcon>
              <CircleIcon fontSize="small" style={{ color: concept.color }} />
            </ListItemIcon>
            <ListItemText>{concept.name}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
      {numSelectedRows > 0 && (
        <Button startIcon={<DeleteIcon />} size="small" onClick={() => handleRemoveSentences()}>
          Remove ({numSelectedRows}) sentence{numSelectedRows > 0 ? "s" : null}
        </Button>
      )}
    </Stack>
  );
}

export default CotaSentenceAnnotator2;
