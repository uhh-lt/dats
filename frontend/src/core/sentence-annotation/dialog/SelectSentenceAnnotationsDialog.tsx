import { Button, ButtonProps, CircularProgress, Dialog, Tooltip } from "@mui/material";
import { MRT_RowSelectionState, MRT_SortingState, MRT_VisibilityState } from "material-react-table";
import { memo, useCallback, useState } from "react";
import { MetadataHooks } from "../../../api/MetadataHooks.ts";
import { ProjectMetadataRead } from "../../../api/openapi/models/ProjectMetadataRead.ts";
import { SentAnnoColumns } from "../../../api/openapi/models/SentAnnoColumns.ts";
import { SentenceAnnotationRow } from "../../../api/openapi/models/SentenceAnnotationRow.ts";
import { FilterTableToolbarProps } from "../../../components/FilterTable/FilterTableToolbarProps.ts";
import { DATSDialogHeader } from "../../../components/MUI/DATSDialogHeader.tsx";
import { useDialog } from "../../../hooks/useDialog.ts";
import { useDialogMaximize } from "../../../hooks/useDialogMaximize.ts";
import { getIconComponent, Icon } from "../../../utils/icons/iconUtils.tsx";
import { SentenceAnnotationTable } from "../table/SentenceAnnotationTable.tsx";
const filterName = "selectSentenceAnnotationDialog";

interface SelectSentenceAnnotationsDialogProps {
  title: string;
  projectId: number;
  onConfirmSelection: (annotationIds: number[]) => void;
  buttonProps?: Omit<ButtonProps, "onClick">;
}

export const SelectSentenceAnnotationsDialog = memo(
  ({ projectId, buttonProps, ...props }: SelectSentenceAnnotationsDialogProps) => {
    // local state
    const dialog = useDialog();

    // global server state
    const metadata = MetadataHooks.useGetProjectMetadataList();

    // maximize
    const { isMaximized, toggleMaximize } = useDialogMaximize();

    return (
      <>
        <Tooltip title="Add sentence annotations" placement="right" arrow>
          <Button onClick={dialog.open} {...buttonProps}>
            {getIconComponent(Icon.SENTENCE_ANNOTATION)}
          </Button>
        </Tooltip>
        <Dialog onClose={dialog.close} open={dialog.isOpen} maxWidth="lg" fullWidth fullScreen={isMaximized}>
          {metadata.isSuccess ? (
            <>
              <DATSDialogHeader
                title="Select sentence annotations"
                onClose={dialog.close}
                isMaximized={isMaximized}
                onToggleMaximize={toggleMaximize}
              />
              <SelectSentenceAnnotationsDialogContent
                onClose={dialog.close}
                projectId={projectId}
                metadata={metadata.data}
                {...props}
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
  },
);

interface SelectSentenceAnnotationsDialogContentProps extends SelectSentenceAnnotationsDialogProps {
  onClose: () => void;
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
