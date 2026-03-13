import { MetadataHooks } from "@api/hooks/MetadataHooks";
import { CodeRead } from "@api/models/CodeRead";
import { IDOperator } from "@api/models/IDOperator";
import { LogicalOperator } from "@api/models/LogicalOperator";
import { ProjectMetadataRead } from "@api/models/ProjectMetadataRead";
import { SentAnnoColumns } from "@api/models/SentAnnoColumns";
import { SentenceAnnotationRow } from "@api/models/SentenceAnnotationRow";
import { DATSDialogHeader } from "@components/DATSDialogHeader";
import { FilterTableToolbarProps } from "@core/filter";
import { SEATFilterActions, SentenceAnnotationTable } from "@core/sentence-annotation";
import { useDialog } from "@hooks/useDialog";
import { useDialogMaximize } from "@hooks/useDialogMaximize";
import { Button, CircularProgress, Dialog, ListItemIcon, Menu, MenuItem } from "@mui/material";
import ListItemText from "@mui/material/ListItemText";
import { useAppDispatch } from "@store/storeHooks";
import { getIconComponent, Icon } from "@utils/icons/iconUtils";
import { MRT_RowSelectionState, MRT_SortingState, MRT_VisibilityState } from "material-react-table";
import { useCallback, useState } from "react";

const filterNameSentAnno = "selectExampleSentenceAnnotationDialog";
const filterNameSpanAnno = "selectExampleSpanAnnotationDialog";

interface ExampleSelectionProps {
  projectId: number;
  codes: CodeRead[];
  onConfirmSelection: (codeId: number, annotationIds: number[]) => void;
  method: TaskType;
}

export function ExampleSelection({ projectId, codes, onConfirmSelection, method }: ExampleSelectionProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  }, []);

  const handleClose = useCallback((event: React.MouseEvent<HTMLLIElement>) => {
    event.stopPropagation();
    setAnchorEl(null);
  }, []);

  // dialog
  const dispatch = useAppDispatch();
  const metadata = MetadataHooks.useGetProjectMetadataList();
  const dialog = useDialog();
  const [selectedCodeId, setSelectedCodeId] = useState<number | null>(null);
  const handleOpenDialog = useCallback(
    (codeId: number) => {
      setAnchorEl(null);
      dialog.open();
      setSelectedCodeId(codeId);
      if (method === TaskType.SENTENCE_ANNOTATION) {
        dispatch(
          SEATFilterActions.setFilter({
            filterName: filterNameSentAnno,
            filter: {
              id: crypto.randomUUID(),
              logic_operator: LogicalOperator.AND,
              items: [
                {
                  id: crypto.randomUUID(),
                  column: SentAnnoColumns.SENT_ANNO_CODE_ID,
                  operator: IDOperator.ID_EQUALS,
                  value: codeId,
                },
              ],
            },
          }),
        );
      } else if (method === TaskType.ANNOTATION) {
        dispatch(
          SATFilterActions.setFilter({
            filterName: filterNameSpanAnno,
            filter: {
              id: crypto.randomUUID(),
              logic_operator: LogicalOperator.AND,
              items: [
                {
                  id: crypto.randomUUID(),
                  column: SpanColumns.SP_CODE_ID,
                  operator: IDOperator.ID_EQUALS,
                  value: codeId,
                },
              ],
            },
          }),
        );
      }
    },
    [dispatch, method, dialog],
  );

  const { isMaximized, toggleMaximize } = useDialogMaximize();

  const handleConfirmExampleSelection = useCallback(
    (annotationIds: number[]) => {
      if (selectedCodeId !== null) {
        onConfirmSelection(selectedCodeId, annotationIds);
      }
    },
    [onConfirmSelection, selectedCodeId],
  );

  return (
    <>
      <Button onClick={handleClick}>Select examples</Button>
      <Menu
        anchorEl={anchorEl}
        anchorOrigin={{
          horizontal: "left",
          vertical: "top",
        }}
        transformOrigin={{
          horizontal: "left",
          vertical: "bottom",
        }}
        open={open}
        onClose={handleClose}
      >
        {codes.map((code) => (
          <MenuItem key={code.id} onClick={() => handleOpenDialog(code.id)}>
            <ListItemIcon>{getIconComponent(Icon.CODE, { style: { color: code.color } })}</ListItemIcon>
            <ListItemText>{code.name}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
      <Dialog onClose={dialog.close} open={dialog.isOpen} maxWidth="lg" fullWidth fullScreen={isMaximized}>
        {metadata.isSuccess ? (
          <>
            <DATSDialogHeader
              title={
                method === TaskType.SENTENCE_ANNOTATION
                  ? "Select sentence annotation examples"
                  : method === TaskType.ANNOTATION
                    ? "Select span annotation examples"
                    : "Select examples"
              }
              onClose={dialog.close}
              isMaximized={isMaximized}
              onToggleMaximize={toggleMaximize}
            />
            {method === TaskType.SENTENCE_ANNOTATION ? (
              <SelectSentenceAnnotationsDialogContent
                onClose={dialog.close}
                projectId={projectId}
                metadata={metadata.data}
                onConfirmSelection={handleConfirmExampleSelection}
              />
            ) : method === TaskType.ANNOTATION ? (
              <SelectSpanAnnotationsDialogContent
                onClose={dialog.close}
                projectId={projectId}
                metadata={metadata.data}
                onConfirmSelection={handleConfirmExampleSelection}
              />
            ) : (
              <div>Unsupported task type for example selection.</div>
            )}
          </>
        ) : metadata.isLoading ? (
          <CircularProgress />
        ) : (
          <div>An error occured</div>
        )}
      </Dialog>
    </>
  );
}

interface SelectSpanAnnotationsDialogContentProps {
  onClose: () => void;
  projectId: number;
  onConfirmSelection: (annotationIds: number[]) => void;
  metadata: ProjectMetadataRead[];
}

function SelectSpanAnnotationsDialogContent({
  metadata,
  projectId,
  onConfirmSelection,
  onClose,
}: SelectSpanAnnotationsDialogContentProps) {
  const [fetchSize, setFetchSize] = useState(20);
  const [rowSelectionModel, setRowSelectionModel] = useState<MRT_RowSelectionState>({});
  const [sortingModel, setSortingModel] = useState<MRT_SortingState>([]);
  const [visibilityModel, setVisibilityModel] = useState<MRT_VisibilityState>(() =>
    // init visibility (disable metadata)
    metadata.reduce(
      (acc, curr) => {
        return {
          ...acc,
          [curr.id]: false,
        };
      },
      {
        [SpanColumns.SP_MEMO_CONTENT]: false,
        [SpanColumns.SP_TAG_ID_LIST]: false,
      },
    ),
  );

  // actions
  const handleClose = useCallback(() => {
    onClose();
    setRowSelectionModel({});
  }, [onClose]);

  const handleConfirmSelection = useCallback(() => {
    const selectedAnnotationIds = Object.keys(rowSelectionModel).map((id) => parseInt(id));
    onConfirmSelection(selectedAnnotationIds);
    handleClose();
  }, [handleClose, onConfirmSelection, rowSelectionModel]);

  // rendering
  const renderBottomToolbar = useCallback(
    (props: FilterTableToolbarProps<SpanAnnotationRow>) => (
      <Button onClick={handleConfirmSelection} disabled={props.selectedData.length === 0}>
        Select {props.selectedData.length > 0 ? props.selectedData.length : null} Annotation
        {props.selectedData.length > 1 ? "s" : ""}
      </Button>
    ),
    [handleConfirmSelection],
  );

  return (
    <SpanAnnotationTable
      projectId={projectId}
      filterName={filterNameSpanAnno}
      rowSelectionModel={rowSelectionModel}
      onRowSelectionChange={setRowSelectionModel}
      sortingModel={sortingModel}
      onSortingChange={setSortingModel}
      columnVisibilityModel={visibilityModel}
      onColumnVisibilityChange={setVisibilityModel}
      fetchSize={fetchSize}
      onFetchSizeChange={setFetchSize}
      renderBottomToolbar={renderBottomToolbar}
    />
  );
}

interface SelectSentenceAnnotationsDialogContentProps {
  onClose: () => void;
  projectId: number;
  onConfirmSelection: (annotationIds: number[]) => void;
  metadata: ProjectMetadataRead[];
}

function SelectSentenceAnnotationsDialogContent({
  metadata,
  projectId,
  onConfirmSelection,
  onClose,
}: SelectSentenceAnnotationsDialogContentProps) {
  const [fetchSize, setFetchSize] = useState(20);
  const [rowSelectionModel, setRowSelectionModel] = useState<MRT_RowSelectionState>({});
  const [sortingModel, setSortingModel] = useState<MRT_SortingState>([]);
  const [visibilityModel, setVisibilityModel] = useState<MRT_VisibilityState>(() =>
    // init visibility (disable metadata)
    metadata.reduce(
      (acc, curr) => {
        return {
          ...acc,
          [curr.id]: false,
        };
      },
      {
        [SentAnnoColumns.SENT_ANNO_MEMO_CONTENT]: false,
        [SentAnnoColumns.SENT_ANNO_TAG_ID_LIST]: false,
      },
    ),
  );

  // actions
  const handleClose = useCallback(() => {
    onClose();
    setRowSelectionModel({});
  }, [onClose]);

  const handleConfirmSelection = useCallback(() => {
    const selectedAnnotationIds = Object.keys(rowSelectionModel).map((id) => parseInt(id));
    onConfirmSelection(selectedAnnotationIds);
    handleClose();
  }, [handleClose, onConfirmSelection, rowSelectionModel]);

  // rendering
  const renderBottomToolbar = useCallback(
    (props: FilterTableToolbarProps<SentenceAnnotationRow>) => (
      <Button onClick={handleConfirmSelection} disabled={props.selectedData.length === 0}>
        Select {props.selectedData.length > 0 ? props.selectedData.length : null} Annotation
        {props.selectedData.length > 1 ? "s" : ""}
      </Button>
    ),
    [handleConfirmSelection],
  );

  return (
    <SentenceAnnotationTable
      projectId={projectId}
      filterName={filterNameSentAnno}
      rowSelectionModel={rowSelectionModel}
      onRowSelectionChange={setRowSelectionModel}
      sortingModel={sortingModel}
      onSortingChange={setSortingModel}
      columnVisibilityModel={visibilityModel}
      onColumnVisibilityChange={setVisibilityModel}
      fetchSize={fetchSize}
      onFetchSizeChange={setFetchSize}
      renderBottomToolbar={renderBottomToolbar}
    />
  );
}
