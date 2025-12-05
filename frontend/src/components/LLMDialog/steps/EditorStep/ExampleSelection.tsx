import { Button, CircularProgress, Dialog, ListItemIcon, Menu, MenuItem } from "@mui/material";
import ListItemText from "@mui/material/ListItemText";
import { MRT_RowSelectionState, MRT_SortingState, MRT_VisibilityState } from "material-react-table";
import { useCallback, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import MetadataHooks from "../../../../api/MetadataHooks.ts";
import { CodeRead } from "../../../../api/openapi/models/CodeRead.ts";
import { IDOperator } from "../../../../api/openapi/models/IDOperator.ts";
import { LogicalOperator } from "../../../../api/openapi/models/LogicalOperator.ts";
import { ProjectMetadataRead } from "../../../../api/openapi/models/ProjectMetadataRead.ts";
import { SentAnnoColumns } from "../../../../api/openapi/models/SentAnnoColumns.ts";
import { SentenceAnnotationRow } from "../../../../api/openapi/models/SentenceAnnotationRow.ts";
import { useDialog } from "../../../../hooks/useDialog.ts";
import { useDialogMaximize } from "../../../../hooks/useDialogMaximize.ts";
import { useAppDispatch } from "../../../../plugins/ReduxHooks.ts";
import { getIconComponent, Icon } from "../../../../utils/icons/iconUtils.tsx";
import { FilterTableToolbarProps } from "../../../FilterTable/FilterTableToolbarProps.ts";
import DATSDialogHeader from "../../../MUI/DATSDialogHeader.tsx";
import SentenceAnnotationTable from "../../../SentenceAnnotation/SentenceAnnotationTable/SentenceAnnotationTable.tsx";
import { SEATFilterActions } from "../../../SentenceAnnotation/SentenceAnnotationTable/seatFilterSlice.ts";

const filterName = "selectExampleSentenceAnnotationDialog";

interface ExampleSelectionProps {
  projectId: number;
  codes: CodeRead[];
  onConfirmSelection: (codeId: number, annotationIds: number[]) => void;
}

function ExampleSelection({ projectId, codes, onConfirmSelection }: ExampleSelectionProps) {
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
      dispatch(
        SEATFilterActions.setFilter({
          filterName,
          filter: {
            id: uuidv4(),
            logic_operator: LogicalOperator.AND,
            items: [
              {
                id: uuidv4(),
                column: SentAnnoColumns.SENT_ANNO_CODE_ID,
                operator: IDOperator.ID_EQUALS,
                value: codeId,
              },
            ],
          },
        }),
      );
    },
    [dispatch, dialog],
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
              title="Select sentence annotation examples"
              onClose={dialog.close}
              isMaximized={isMaximized}
              onToggleMaximize={toggleMaximize}
            />
            <SelectSentenceAnnotationsDialogContent
              onClose={dialog.close}
              projectId={projectId}
              metadata={metadata.data}
              onConfirmSelection={handleConfirmExampleSelection}
            />
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
      filterName={filterName}
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

export default ExampleSelection;
