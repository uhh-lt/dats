import { BboxAnnotationHooks } from "@api/hooks/BboxAnnotationHooks";
import { DATSDialogHeader } from "@components/DATSDialogHeader";
import { CodeRenderer, CodeTable } from "@core/code";
import { useDialogMaximize } from "@hooks/useDialogMaximize";
import SaveIcon from "@mui/icons-material/Save";
import { Box, Button, Dialog, DialogActions, DialogTitle, Divider, Stack } from "@mui/material";
import { useDialog } from "@store/global/dialogBusSlice";
import { MRT_RowSelectionState } from "material-react-table";
import { memo, useCallback, useState } from "react";
import { BBoxAnnotationRenderer } from "./BBoxAnnotationRenderer";

export interface BBoxAnnotationEditDialogProps {
  projectId: number;
}

export const BBoxAnnotationEditDialog = memo(({ projectId }: BBoxAnnotationEditDialogProps) => {
  // local state
  const [rowSelectionModel, setRowSelectionModel] = useState<MRT_RowSelectionState>({});
  const selectedCodeId =
    Object.keys(rowSelectionModel).length === 1 ? parseInt(Object.keys(rowSelectionModel)[0]) : undefined;

  // global client state (redux)
  const { isOpen: open, data: dialogData, close: closeDialog, onSuccess } = useDialog("bboxAnnotationEdit");

  // mutations
  const { mutate: updateAnnotationBulkMutation, isPending } = BboxAnnotationHooks.useUpdateBulkBBoxAnnotation();

  // actions
  const handleClose = useCallback(() => {
    closeDialog();
    setRowSelectionModel({});
  }, [closeDialog]);

  const handleUpdateAnnotation = useCallback(() => {
    if (!selectedCodeId || !dialogData || dialogData.annotationIds.length === 0) return;

    updateAnnotationBulkMutation(
      {
        requestBody: dialogData.annotationIds.map((annotation) => ({
          bbox_annotation_id: annotation,
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
  }, [selectedCodeId, dialogData, updateAnnotationBulkMutation, handleClose, onSuccess]);

  // maximize dialog
  const { isMaximized, toggleMaximize } = useDialogMaximize();

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth fullScreen={isMaximized}>
      {dialogData && (
        <>
          <DATSDialogHeader
            title={`Changing the code of ${dialogData.annotationIds.length} annotation${
              dialogData.annotationIds.length > 1 && "s"
            }`}
            onClose={handleClose}
            isMaximized={isMaximized}
            onToggleMaximize={toggleMaximize}
          />
          <CodeTable
            projectId={projectId}
            rowSelectionModel={rowSelectionModel}
            onRowSelectionChange={setRowSelectionModel}
          />
          {dialogData.annotationIds.length > 0 && (
            <>
              <Divider />
              <DialogTitle style={{ paddingBottom: 0 }}>Preview</DialogTitle>
              <Box px={3} mb={2}>
                Before:
                <BBoxAnnotationRenderer bboxAnnotation={dialogData.annotationIds[0]} showCode showSpanText />
                After:
                {selectedCodeId ? (
                  <Stack direction="row" alignItems="center">
                    <CodeRenderer code={selectedCodeId} />
                    {": "}
                    <BBoxAnnotationRenderer bboxAnnotation={dialogData.annotationIds[0]} showSpanText />
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
            <Button
              variant="contained"
              color="success"
              startIcon={<SaveIcon />}
              fullWidth
              onClick={handleUpdateAnnotation}
              disabled={!selectedCodeId}
              loading={isPending}
              loadingPosition="start"
            >
              Update Annotation{dialogData.annotationIds.length > 1 && "s"}
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
});
