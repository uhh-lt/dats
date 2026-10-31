import { DATSDialogHeader } from "@components/DATSDialogHeader";
import { getIconComponent, Icon } from "@components/icons";
import { CodeHooks } from "@core/code";
import { FilterTableToolbarProps } from "@core/filter";
import { ProjectMetadataHooks } from "@core/project-metadata";
import { SEATFilterActions, SentenceAnnotationReduxFilterTable } from "@core/sentence-annotation";
import { SATFilterActions, SpanAnnotationReduxFilterTable } from "@core/span-annotation";
import { useDialog } from "@hooks/useDialog";
import { useDialogMaximize } from "@hooks/useDialogMaximize";
import { IDListRecursiveOperator } from "@models/IDListRecursiveOperator";
import { LogicalOperator } from "@models/LogicalOperator";
import { ProjectMetadataRead } from "@models/ProjectMetadataRead";
import { SentAnnoColumns } from "@models/SentAnnoColumns";
import { SentenceAnnotationRow } from "@models/SentenceAnnotationRow";
import { SpanAnnotationRow } from "@models/SpanAnnotationRow";
import { SpanColumns } from "@models/SpanColumns";
import { PromptCode } from "@models/PromptCode";
import { PromptExampleKind } from "@models/PromptExampleKind";
import { Button, CircularProgress, Dialog, ListItemIcon, Menu, MenuItem, Tooltip } from "@mui/material";
import ListItemText from "@mui/material/ListItemText";
import { useAppDispatch } from "@store/storeHooks";
import { MRT_RowSelectionState, MRT_SortingState, MRT_VisibilityState } from "material-react-table";
import { useCallback, useMemo, useState } from "react";
import { closeOnEscape } from "@utils/dialogUtils";

const filterNameSentAnno = "selectExampleSentenceAnnotationDialog";
const filterNameSpanAnno = "selectExampleSpanAnnotationDialog";

interface ExampleSelectionProps {
  projectId: number;
  kind: PromptExampleKind;
  // the codes selected for the prompt: examples show annotations of these codes
  codes: PromptCode[];
  onConfirmSelection: (annotationIds: number[]) => void;
}

/** Selects span or sentence annotations of one of the selected codes that become few-shot examples. */
export function ExampleSelection({ projectId, kind, codes, onConfirmSelection }: ExampleSelectionProps) {
  // global server state: the colors of the codes
  const projectCodes = CodeHooks.useGetEnabledCodes();
  const colors = useMemo(
    () => new Map((projectCodes.data ?? []).map((code) => [code.id, code.color])),
    [projectCodes.data],
  );

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
  const metadata = ProjectMetadataHooks.useGetAllProjectMetadata();
  const dialog = useDialog();
  const handleOpenDialog = useCallback(
    (codeId: number) => {
      setAnchorEl(null);
      dialog.open();
      if (kind === PromptExampleKind.SENTENCE) {
        dispatch(
          SEATFilterActions.onChangeFilter({
            filterName: filterNameSentAnno,
            filter: {
              id: crypto.randomUUID(),
              logic_operator: LogicalOperator.AND,
              items: [
                {
                  id: crypto.randomUUID(),
                  column: SentAnnoColumns.SENT_ANNO_CODE_ID_LIST_RECURSIVE,
                  operator: IDListRecursiveOperator.IDLR_CONTAINS,
                  value: codeId,
                },
              ],
            },
          }),
        );
      } else {
        dispatch(
          SATFilterActions.onChangeFilter({
            filterName: filterNameSpanAnno,
            filter: {
              id: crypto.randomUUID(),
              logic_operator: LogicalOperator.AND,
              items: [
                {
                  id: crypto.randomUUID(),
                  column: SpanColumns.SP_CODE_ID_LIST_RECURSIVE,
                  operator: IDListRecursiveOperator.IDLR_CONTAINS,
                  value: codeId,
                },
              ],
            },
          }),
        );
      }
    },
    [dispatch, kind, dialog],
  );

  const { isMaximized, toggleMaximize } = useDialogMaximize();

  return (
    <>
      <Tooltip title={codes.length === 0 ? "Select codes first" : "Add annotations of a selected code as examples"}>
        <span style={{ flexShrink: 0 }}>
          <Button size="small" onClick={handleClick} disabled={codes.length === 0} sx={{ whiteSpace: "nowrap" }}>
            Add examples
          </Button>
        </span>
      </Tooltip>
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
          <MenuItem key={code.code_id} onClick={() => handleOpenDialog(code.code_id)}>
            <ListItemIcon>{getIconComponent(Icon.CODE, { style: { color: colors.get(code.code_id) } })}</ListItemIcon>
            <ListItemText>{code.name}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
      <Dialog
        onClose={closeOnEscape(dialog.close)}
        open={dialog.isOpen}
        maxWidth="lg"
        fullWidth
        fullScreen={isMaximized}
      >
        {metadata.isSuccess ? (
          <>
            <DATSDialogHeader
              title={
                kind === PromptExampleKind.SENTENCE
                  ? "Select sentence annotation examples"
                  : "Select span annotation examples"
              }
              onClose={dialog.close}
              isMaximized={isMaximized}
              onToggleMaximize={toggleMaximize}
            />
            {kind === PromptExampleKind.SENTENCE ? (
              <SelectSentenceAnnotationsDialogContent
                onClose={dialog.close}
                projectId={projectId}
                metadata={metadata.data}
                onConfirmSelection={onConfirmSelection}
              />
            ) : (
              <SelectSpanAnnotationsDialogContent
                onClose={dialog.close}
                projectId={projectId}
                metadata={metadata.data}
                onConfirmSelection={onConfirmSelection}
              />
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
        [SpanColumns.SP_TAG_ID_LIST_RECURSIVE]: false,
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
    <SpanAnnotationReduxFilterTable
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
        [SentAnnoColumns.SENT_ANNO_TAG_ID_LIST_RECURSIVE]: false,
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
    <SentenceAnnotationReduxFilterTable
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
