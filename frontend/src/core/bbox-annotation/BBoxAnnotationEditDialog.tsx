import { DATSDialogHeader } from "@components/DATSDialogHeader";
import { CodeRenderer, CodeTable } from "@core/code";
import { useDialogMaximize } from "@hooks/useDialogMaximize";
import { ArrowRight } from "@mui/icons-material";
import SaveIcon from "@mui/icons-material/Save";
import { Button, Dialog, DialogActions, Stack, Typography } from "@mui/material";
import { useDialogBus } from "@store/global/dialogBusHooks";
import { MRT_RowSelectionState } from "material-react-table";
import { useCallback, useState } from "react";
import { BboxAnnotationHooks } from "./api/bboxAnnotationHooks";
import { BBoxAnnotationRenderer } from "./BBoxAnnotationRenderer";

interface BBoxAnnotationEditDialogProps {
  projectId: number;
}

export function BBoxAnnotationEditDialog({ projectId }: BBoxAnnotationEditDialogProps) {
  // local state
  const [rowSelectionModel, setRowSelectionModel] = useState<MRT_RowSelectionState>({});
  const selectedCodeId =
    Object.keys(rowSelectionModel).length === 1 ? parseInt(Object.keys(rowSelectionModel)[0]) : undefined;

  // dialog state
  const { isOpen, data: dialogData, close: closeDialog, onSuccess } = useDialogBus("bboxAnnotationEdit");

  // mutations
  const { mutate: updateAnnotationBulkMutation, isPending } = BboxAnnotationHooks.useUpdateBulkBBoxAnnotation();

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

  // maximize
  const { isMaximized, toggleMaximize } = useDialogMaximize();

  return (
    <Dialog open={isOpen} onClose={handleClose} maxWidth="md" fullWidth fullScreen={isMaximized}>
      {dialogData && (
        <>
          <DATSDialogHeader
            title={`Changing the code of ${dialogData.annotationIds.length} annotation${dialogData.annotationIds.length > 1 ? "s" : ""}`}
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
            <Stack direction="row" spacing={1} alignItems="center" p={2}>
              <Typography variant="h6">Preview</Typography>
              <BBoxAnnotationRenderer bboxAnnotation={dialogData.annotationIds[0]} showCode showText />
              <ArrowRight />
              {selectedCodeId ? (
                <Stack direction="row" alignItems="center">
                  <CodeRenderer code={selectedCodeId} />
                  {": "}
                  <BBoxAnnotationRenderer bboxAnnotation={dialogData.annotationIds[0]} showText />
                </Stack>
              ) : (
                <span>Select a code to preview the change.</span>
              )}
            </Stack>
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
              Update Annotation{dialogData.annotationIds.length > 1 ? "s" : ""}
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}
