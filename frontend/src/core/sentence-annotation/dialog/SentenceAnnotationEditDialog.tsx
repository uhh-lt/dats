import { ArrowRight } from "@mui/icons-material";
import SaveIcon from "@mui/icons-material/Save";
import { LoadingButton } from "@mui/lab";
import { ButtonProps, Dialog, DialogActions, Stack, Typography } from "@mui/material";
import { MRT_RowSelectionState } from "material-react-table";
import { useCallback, useState } from "react";
import { SentenceAnnotationHooks } from "../../../api/SentenceAnnotationHooks.ts";
import { DATSDialogHeader } from "../../../components/MUI/DATSDialogHeader.tsx";
import { useDialogMaximize } from "../../../hooks/useDialogMaximize.ts";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { CRUDDialogActions } from "../../../store/dialogSlice.ts";
import { CodeRenderer } from "../../code/renderer/CodeRenderer.tsx";
import { CodeTable } from "../../code/table/CodeTable.tsx";
import { SentenceAnnotationRenderer } from "../renderer/SentenceAnnotationRenderer.tsx";

export interface SentenceAnnotationEditDialogProps extends ButtonProps {
  projectId: number;
}

export function SentenceAnnotationEditDialog({ projectId }: SentenceAnnotationEditDialogProps) {
  // local state
  const [rowSelectionModel, setRowSelectionModel] = useState<MRT_RowSelectionState>({});
  const selectedCodeId =
    Object.keys(rowSelectionModel).length === 1 ? parseInt(Object.keys(rowSelectionModel)[0]) : undefined;

  // global client state (redux)
  const open = useAppSelector((state) => state.dialog.isSentenceAnnotationEditDialogOpen);
  const annotationIds = useAppSelector((state) => state.dialog.sentenceAnnotationIds);
  const onEdit = useAppSelector((state) => state.dialog.sentenceAnnotationEditDialogOnEdit);

  // mutations
  const { mutate: updateAnnotationBulkMutation, isPending } = SentenceAnnotationHooks.useUpdateBulkSentenceAnno();

  // actions
  const dispatch = useAppDispatch();
  const handleClose = useCallback(() => {
    dispatch(CRUDDialogActions.closeSentenceAnnotationEditDialog());
    setRowSelectionModel({});
  }, [dispatch]);

  const handleUpdateAnnotations = useCallback(() => {
    if (!selectedCodeId) return;

    updateAnnotationBulkMutation(
      {
        requestBody: annotationIds.map((annotation) => ({
          sent_annotation_id: annotation,
          code_id: selectedCodeId,
        })),
      },
      {
        onSuccess: () => {
          handleClose();
          onEdit?.();
        },
      },
    );
  }, [selectedCodeId, annotationIds, updateAnnotationBulkMutation, onEdit, handleClose]);

  // maximize
  const { isMaximized, toggleMaximize } = useDialogMaximize();

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth fullScreen={isMaximized}>
      <DATSDialogHeader
        title={`Changing the code of ${annotationIds.length} sentence annotation${annotationIds.length > 1 && "s"}`}
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
            <SentenceAnnotationRenderer sentenceAnnotation={annotationIds[0]} showCode showSpanText />
            <ArrowRight />
            {selectedCodeId ? (
              <Stack direction="row" alignItems="center">
                <CodeRenderer code={selectedCodeId} />
                {": "}
                <SentenceAnnotationRenderer sentenceAnnotation={annotationIds[0]} showSpanText />
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
