import SaveIcon from "@mui/icons-material/Save";
import { LoadingButton } from "@mui/lab";
import { Box, Button, Dialog, DialogActions, DialogTitle, Divider, Stack } from "@mui/material";
import { MRT_RowSelectionState } from "material-react-table";
import { memo, useCallback, useState } from "react";
import BboxAnnotationHooks from "../../api/BboxAnnotationHooks.ts";
import { useDialogMaximize } from "../../hooks/useDialogMaximize.ts";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks.ts";
import CodeRenderer from "../Code/CodeRenderer.tsx";
import CodeTable from "../Code/CodeTable.tsx";
import { CRUDDialogActions } from "../dialogSlice.ts";
import DATSDialogHeader from "../MUI/DATSDialogHeader.tsx";
import BBoxAnnotationRenderer from "./BBoxAnnotationRenderer.tsx";

export interface BBoxAnnotationEditDialogProps {
  projectId: number;
}

function BBoxAnnotationEditDialog({ projectId }: BBoxAnnotationEditDialogProps) {
  // local state
  const [rowSelectionModel, setRowSelectionModel] = useState<MRT_RowSelectionState>({});
  const selectedCodeId =
    Object.keys(rowSelectionModel).length === 1 ? parseInt(Object.keys(rowSelectionModel)[0]) : undefined;

  // global client state (redux)
  const open = useAppSelector((state) => state.dialog.isBBoxAnnotationEditDialogOpen);
  const annotationIds = useAppSelector((state) => state.dialog.bboxAnnotationIds);
  const onEdit = useAppSelector((state) => state.dialog.bboxAnnotationEditDialogOnEdit);

  // mutations
  const { mutate: updateAnnotationBulkMutation, isPending } = BboxAnnotationHooks.useUpdateBulkBBoxAnnotation();

  // actions
  const dispatch = useAppDispatch();
  const handleClose = useCallback(() => {
    dispatch(CRUDDialogActions.closeBBoxAnnotationEditDialog());
    setRowSelectionModel({});
  }, [dispatch]);

  const handleUpdateAnnotation = useCallback(() => {
    if (!selectedCodeId || annotationIds.length === 0) return;

    updateAnnotationBulkMutation(
      {
        requestBody: annotationIds.map((annotation) => ({
          bbox_annotation_id: annotation,
          code_id: selectedCodeId,
        })),
      },
      {
        onSuccess: () => {
          handleClose();
          if (onEdit) onEdit();
        },
      },
    );
  }, [selectedCodeId, annotationIds, updateAnnotationBulkMutation, handleClose, onEdit]);

  // maximize dialog
  const { isMaximized, toggleMaximize } = useDialogMaximize();

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth fullScreen={isMaximized}>
      <DATSDialogHeader
        title={`Changing the code of ${annotationIds.length} annotation${annotationIds.length > 1 && "s"}`}
        onClose={handleClose}
        isMaximized={isMaximized}
        onToggleMaximize={toggleMaximize}
      />
      <CodeTable
        projectId={projectId}
        rowSelectionModel={rowSelectionModel}
        onRowSelectionChange={setRowSelectionModel}
      />
      {annotationIds.length > 0 && (
        <>
          <Divider />
          <DialogTitle style={{ paddingBottom: 0 }}>Preview</DialogTitle>
          <Box px={3} mb={2}>
            Before:
            <BBoxAnnotationRenderer bboxAnnotation={annotationIds[0]} showCode showSpanText />
            After:
            {selectedCodeId ? (
              <Stack direction="row" alignItems="center">
                <CodeRenderer code={selectedCodeId} />
                {": "}
                <BBoxAnnotationRenderer bboxAnnotation={annotationIds[0]} showSpanText />
              </Stack>
            ) : (
              <>
                <br />
                Select a code to preview the change.
              </>
            )}
          </Box>
        </>
      )}
      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
        <LoadingButton
          variant="contained"
          color="success"
          startIcon={<SaveIcon />}
          fullWidth
          onClick={handleUpdateAnnotation}
          disabled={!selectedCodeId}
          loading={isPending}
          loadingPosition="start"
        >
          Update Annotation{annotationIds.length > 1 && "s"}
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}

export default memo(BBoxAnnotationEditDialog);
