import { ArrowRight } from "@mui/icons-material";
import SaveIcon from "@mui/icons-material/Save";
import { LoadingButton } from "@mui/lab";
import { ButtonProps, Dialog, DialogActions, Stack, Typography } from "@mui/material";
import { MRT_RowSelectionState } from "material-react-table";
import { memo, useCallback, useState } from "react";
import SpanAnnotationHooks from "../../api/SpanAnnotationHooks.ts";
import { useDialogMaximize } from "../../hooks/useDialogMaximize.ts";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks.ts";
import CodeRenderer from "../Code/CodeRenderer.tsx";
import CodeTable from "../Code/CodeTable.tsx";
import { CRUDDialogActions } from "../dialogSlice.ts";
import DATSDialogHeader from "../MUI/DATSDialogHeader.tsx";
import SpanAnnotationRenderer from "./SpanAnnotationRenderer.tsx";

export interface SpanAnnotationEditDialogProps extends ButtonProps {
  projectId: number;
}

function SpanAnnotationEditDialog({ projectId }: SpanAnnotationEditDialogProps) {
  // local state
  const [rowSelectionModel, setRowSelectionModel] = useState<MRT_RowSelectionState>({});
  const selectedCodeId =
    Object.keys(rowSelectionModel).length === 1 ? parseInt(Object.keys(rowSelectionModel)[0]) : undefined;

  // global client state (redux)
  const open = useAppSelector((state) => state.dialog.isSpanAnnotationEditDialogOpen);
  const annotationIds = useAppSelector((state) => state.dialog.spanAnnotationIds);
  const onEdit = useAppSelector((state) => state.dialog.spanAnnotationEditDialogOnEdit);

  // mutations
  const { mutate: updateAnnotationBulkMutation, isPending } = SpanAnnotationHooks.useUpdateBulkSpan();

  // actions
  const dispatch = useAppDispatch();
  const handleClose = useCallback(() => {
    dispatch(CRUDDialogActions.closeSpanAnnotationEditDialog());
    setRowSelectionModel({});
  }, [dispatch]);

  const handleUpdateAnnotations = useCallback(() => {
    if (!selectedCodeId || annotationIds.length === 0) return;

    updateAnnotationBulkMutation(
      {
        requestBody: annotationIds.map((annotation) => ({
          span_annotation_id: annotation,
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
  }, [annotationIds, handleClose, onEdit, selectedCodeId, updateAnnotationBulkMutation]);

  // maximize
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
        enableMultiRowSelection={false}
      />
      {annotationIds.length > 0 && (
        <>
          <Stack direction={"row"} spacing={1} alignItems="center" p={2}>
            <Typography variant="h6">Preview</Typography>
            <SpanAnnotationRenderer spanAnnotation={annotationIds[0]} showCode showSpanText />
            <ArrowRight />
            {selectedCodeId ? (
              <Stack direction="row" alignItems="center">
                <CodeRenderer code={selectedCodeId} />
                {": "}
                <SpanAnnotationRenderer spanAnnotation={annotationIds[0]} showSpanText />
              </Stack>
            ) : (
              <span>Select a code to preview the change.</span>
            )}
          </Stack>
        </>
      )}

      <DialogActions>
        <LoadingButton
          variant="contained"
          color="success"
          startIcon={<SaveIcon />}
          onClick={handleUpdateAnnotations}
          disabled={!selectedCodeId}
          loading={isPending}
          loadingPosition="start"
          fullWidth
        >
          Update Annotation{annotationIds.length > 1 && "s"}
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}

export default memo(SpanAnnotationEditDialog);
