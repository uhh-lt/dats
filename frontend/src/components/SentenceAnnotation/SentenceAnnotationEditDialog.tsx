import { ArrowRight } from "@mui/icons-material";
import SaveIcon from "@mui/icons-material/Save";
import { LoadingButton } from "@mui/lab";
import { Box, Button, ButtonProps, Dialog, DialogActions, DialogTitle, Stack, Typography } from "@mui/material";
import { MRT_RowSelectionState } from "material-react-table";
import { useState } from "react";
import SentenceAnnotationHooks from "../../api/SentenceAnnotationHooks.ts";
import { useOpenSnackbar } from "../../components/SnackbarDialog/useOpenSnackbar.ts";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks.ts";
import CodeRenderer from "../Code/CodeRenderer.tsx";
import CodeTable from "../Code/CodeTable.tsx";
import { CRUDDialogActions } from "../dialogSlice.ts";
import SentenceAnnotationRenderer from "./SentenceAnnotationRenderer.tsx";

export interface SentenceAnnotationEditDialogProps extends ButtonProps {
  projectId: number;
}

function SentenceAnnotationEditDialog({ projectId }: SentenceAnnotationEditDialogProps) {
  // local state
  const [rowSelectionModel, setRowSelectionModel] = useState<MRT_RowSelectionState>({});
  const selectedCodeId =
    Object.keys(rowSelectionModel).length === 1 ? parseInt(Object.keys(rowSelectionModel)[0]) : undefined;

  // global client state (redux)
  const open = useAppSelector((state) => state.dialog.isSentenceAnnotationEditDialogOpen);
  const annotationIds = useAppSelector((state) => state.dialog.sentenceAnnotationIds);
  const onEdit = useAppSelector((state) => state.dialog.spanAnnotationEditDialogOnEdit);
  const dispatch = useAppDispatch();

  // mutations
  const updateAnnotationBulkMutation = SentenceAnnotationHooks.useUpdateBulkSentenceAnno();

  // snackbar
  const openSnackbar = useOpenSnackbar();

  // actions
  const handleClose = () => {
    dispatch(CRUDDialogActions.closeSentenceAnnotationEditDialog());
    setRowSelectionModel({});
  };

  const handleUpdateAnnotations = () => {
    if (!selectedCodeId || annotationIds.length === 0) return;

    updateAnnotationBulkMutation.mutate(
      {
        requestBody: annotationIds.map((annotation) => ({
          sent_annotation_id: annotation,
          code_id: selectedCodeId,
        })),
      },
      {
        onSuccess: () => {
          handleClose();
          if (onEdit) onEdit();
          openSnackbar({
            text: `Updated annotation!`,
            severity: "success",
          });
        },
      },
    );
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Changing the code of {annotationIds.length} annotation{annotationIds.length > 1 && "s"}
      </DialogTitle>
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
        <Button onClick={handleClose}>Close</Button>
        <Box flexGrow={1} />
        <LoadingButton
          variant="contained"
          color="success"
          startIcon={<SaveIcon />}
          onClick={handleUpdateAnnotations}
          disabled={!selectedCodeId}
          loading={updateAnnotationBulkMutation.isPending}
          loadingPosition="start"
        >
          Update Annotation{annotationIds.length > 1 && "s"}
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}

export default SentenceAnnotationEditDialog;
