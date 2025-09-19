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
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import React, { useMemo, useRef } from "react";
import CotaHooks from "../../../api/CotaHooks.ts";
import { COTAConcept } from "../../../api/openapi/models/COTAConcept.ts";
import { COTARead } from "../../../api/openapi/models/COTARead.ts";
import { COTASentenceID } from "../../../api/openapi/models/COTASentenceID.ts";
import { DateGroupBy } from "../../../api/openapi/models/DateGroupBy.ts";
import SdocRenderer from "../../../components/SourceDocument/SdocRenderer.tsx";
import { useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { dateToLocaleDate } from "../../../utils/DateUtils.ts";
import { useReduxConnector } from "../../../utils/useReduxConnector.ts";
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
    title += ` for "${selectedConcept.name}"`;
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
      <CardContent className="myFlexFillAllContainer" style={{ padding: 0 }}>
        <SimilarSentencesTable cota={cota} concept={selectedConcept} />
      </CardContent>
    </Card>
  );
}

interface COTASentenceRow {
  sentenceId: number;
  sdocId: number;
  similarity: number;
  probability: number;
  annotation: string | null;
  sentence: string;
}

interface SimilarSentencesTableProps {
  cota: COTARead;
  concept: COTAConcept | null | undefined;
}

function SimilarSentencesTable({ cota, concept }: SimilarSentencesTableProps) {
  // global client state (redux)
  const [rowSelectionModel, setRowSelectionModel] = useReduxConnector(
    (state) => state.cota.rowSelectionModel,
    CotaActions.onRowSelectionChange,
  );
  const selectedDate = useAppSelector((state) => state.cota.selectedDate);

  // virtualization
  const rowVirtualizerInstanceRef = useRef<MRT_RowVirtualizer>(null);

  // compute search space
  const searchSpace = useMemo(() => {
    if (!concept?.id) {
      return [];
    }

    if (!selectedDate) {
      return cota.search_space.map(
        (cotaSentence) =>
          ({
            sentenceId: cotaSentence.sentence_id,
            sdocId: cotaSentence.sdoc_id,
            similarity: cotaSentence.concept_similarities[concept.id],
            probability: cotaSentence.concept_probabilities[concept.id],
            annotation: cotaSentence.concept_annotation,
            sentence: cotaSentence.text,
          }) as COTASentenceRow,
      );
    }

    const result: COTASentenceRow[] = [];
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
        result.push({
          sentenceId: cotaSentence.sentence_id,
          sdocId: cotaSentence.sdoc_id,
          similarity: cotaSentence.concept_similarities[concept.id],
          probability: cotaSentence.concept_probabilities[concept.id],
          annotation: cotaSentence.concept_annotation,
          sentence: cotaSentence.text,
        } as COTASentenceRow);
      }
    });
    return result;
  }, [cota, concept?.id, selectedDate]);

  const columns: MRT_ColumnDef<COTASentenceRow>[] = useMemo(() => {
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
        Cell: ({ row }) => <>{(row.original.similarity * 100.0).toFixed(2)}</>,
        accessorFn: (row) => row.similarity,
      },
      {
        id: "probability",
        header: "Probability",
        size: 155,
        Cell: ({ row }) => <>{(row.original.probability * 100.0).toFixed(2)}</>,
        accessorFn: (row) => row.probability,
      },
      {
        id: "annotation",
        header: "Annotation",
        size: 155,
        accessorFn: (row) => (row.annotation ? conceptDict[row.annotation].name : ""),
        muiTableBodyCellProps({ row }) {
          return {
            sx: {
              ...(row.original.annotation && {
                color: conceptDict[row.original.annotation].color,
              }),
            },
          };
        },
      },
      {
        id: "sdoc",
        header: "Document",
        Cell: ({ row }) => <SdocRenderer sdoc={row.original.sdocId} link renderName />,
      },
      {
        id: "sentence",
        header: "Sentence",
        accessorFn: (row) => row.sentence,
      },
    ] as MRT_ColumnDef<COTASentenceRow>[];
  }, [cota.concepts]);

  // scroll
  // useEffect(() => {
  //   provenanceSdocIdSentenceId &&
  //     requestIdleCallback(() => {
  //       const [sdocIdStr, sentenceIdStr] = provenanceSdocIdSentenceId.toString().split("-");
  //       const sdocId = parseInt(sdocIdStr);
  //       const sentenceId = parseInt(sentenceIdStr);
  //       const scrollToIndex = searchSpace.findIndex(
  //         (cotaSentence) => cotaSentence.sdocId === sdocId && cotaSentence.sentenceId === sentenceId,
  //       );
  //       try {
  //         if (scrollToIndex !== -1) {
  //           rowVirtualizerInstanceRef.current?.scrollToIndex?.(scrollToIndex);
  //         } else {
  //           rowVirtualizerInstanceRef.current?.scrollToIndex?.(0);
  //         }
  //       } catch (error) {
  //         console.error(error);
  //       }
  //     });
  // }, [provenanceSdocIdSentenceId, searchSpace]);

  // actions
  const annotateCotaSentences = CotaHooks.useAnnotateCotaSentences();
  const handleAnnotateSentences = (sentences: COTASentenceID[], conceptId: string | null) => {
    annotateCotaSentences.mutate({
      cotaId: cota.id,
      conceptId: conceptId,
      requestBody: sentences,
    });
  };

  const removeCotaSentences = CotaHooks.useRemoveCotaSentences();
  const handleRemoveSentences = (sentences: COTASentenceID[]) => {
    removeCotaSentences.mutate(
      {
        cotaId: cota.id,
        requestBody: sentences,
      },
      {
        onSuccess() {
          setRowSelectionModel({});
        },
      },
    );
  };

  // table
  const table = useMaterialReactTable<COTASentenceRow>({
    data: searchSpace,
    columns: columns,
    getRowId: (row) => `${row.sdocId}-${row.sentenceId}`,
    // state
    state: {
      rowSelection: rowSelectionModel,
      showGlobalFilter: true,
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
    muiTablePaperProps: {
      style: { height: "100%", display: "flex", flexDirection: "column" },
    },
    muiTableContainerProps: {
      style: { flexGrow: 1 },
    },
    // disable footer
    enableBottomToolbar: false,
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
        <MRT_ShowHideColumnsButton table={table} />
        <MRT_ToggleDensePaddingButton table={table} />
      </Stack>
    ),
    renderEmptyRowsFallback: () => (
      <Typography pt={4} align="center" color="textDisabled" fontStyle="italic">
        No sentences to display. Select a concept from the Concept List.
      </Typography>
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
          <MenuItem onClick={() => handleAnnotateSentences(concept.id)} key={concept.id}>
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
