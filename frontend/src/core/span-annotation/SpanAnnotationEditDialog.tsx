import { SpanAnnotationHooks } from "@api/hooks/SpanAnnotationHooks";
import { DATSDialogHeader } from "@components/DATSDialogHeader";
import { CodeRenderer, CodeTable } from "@core/code";
import { useDialogMaximize } from "@hooks/useDialogMaximize";
import { ArrowRight } from "@mui/icons-material";
import SaveIcon from "@mui/icons-material/Save";
import { Button, ButtonProps, Dialog, DialogActions, Stack, Typography } from "@mui/material";
import { useDialog } from "@store/global/dialogBusSlice";
import { MRT_RowSelectionState } from "material-react-table";
import { memo, useCallback, useState } from "react";
import { SpanAnnotationRenderer } from "./SpanAnnotationRenderer";

export interface SpanAnnotationEditDialogProps extends ButtonProps {
  projectId: number;
}

export const SpanAnnotationEditDialog = memo(({ projectId }: SpanAnnotationEditDialogProps) => {
  // local state
  const [rowSelectionModel, setRowSelectionModel] = useState<MRT_RowSelectionState>({});
  const selectedCodeId =
    Object.keys(rowSelectionModel).length === 1 ? parseInt(Object.keys(rowSelectionModel)[0]) : undefined;

  // global client state (redux)
  const { isOpen: open, data: dialogData, close: closeDialog, onSuccess } = useDialog("spanAnnotationEdit");

  // mutations
  const { mutate: updateAnnotationBulkMutation, isPending } = SpanAnnotationHooks.useUpdateBulkSpan();

  // actions
  const handleClose = useCallback(() => {
    closeDialog();
    setRowSelectionModel({});
  }, [closeDialog]);

  const handleUpdateAnnotations = useCallback(() => {
    if (!selectedCodeId || !dialogData || dialogData.annotationIds.length === 0) return;

    updateAnnotationBulkMutation(
      {
        requestBody: dialogData.annotationIds.map((annotation) => ({
          span_annotation_id: annotation,
          code_id: selectedCodeId,
        })),
      },
      {
        onSuccess: () => {
          handleClose();
          onSuccess();
        },
      },
    );
  }, [dialogData, handleClose, onSuccess, selectedCodeId, updateAnnotationBulkMutation]);

  // maximize
  const { isMaximized, toggleMaximize } = useDialogMaximize();

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth fullScreen={isMaximized}>
      {dialogData && (
        <>
          <DATSDialogHeader
            title={`Changing the code of ${dialogData.annotationIds.length} annotation${dialogData.annotationIds.length > 1 && "s"}`}
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
          {dialogData.annotationIds.length > 0 && (
            <>
              <Stack direction={"row"} spacing={1} alignItems="center" p={2}>
                <Typography variant="h6">Preview</Typography>
                <SpanAnnotationRenderer spanAnnotation={dialogData.annotationIds[0]} showCode showSpanText />
                <ArrowRight />
                {selectedCodeId ? (
                  <Stack direction="row" alignItems="center">
                    <CodeRenderer code={selectedCodeId} />
                    {": "}
                    <SpanAnnotationRenderer spanAnnotation={dialogData.annotationIds[0]} showSpanText />
                  </Stack>
                ) : (
                  <span>Select a code to preview the change.</span>
                )}
              </Stack>
            </>
          )}

          <DialogActions>
            <Button
              variant="contained"
              color="success"
              startIcon={<SaveIcon />}
              onClick={handleUpdateAnnotations}
              disabled={!selectedCodeId}
              loading={isPending}
              loadingPosition="start"
              fullWidth
            >
              Update Annotation{dialogData.annotationIds.length > 1 && "s"}
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
});
