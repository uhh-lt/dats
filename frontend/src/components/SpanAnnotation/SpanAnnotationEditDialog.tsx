import SaveIcon from "@mui/icons-material/Save";
import { LoadingButton } from "@mui/lab";
import { Box, Button, ButtonProps, Dialog, DialogActions, DialogTitle, Divider, Stack } from "@mui/material";
import { MRT_RowSelectionState } from "material-react-table";
import { useState } from "react";
import SpanAnnotationHooks from "../../api/SpanAnnotationHooks.ts";
import { useOpenSnackbar } from "../../components/SnackbarDialog/useOpenSnackbar.ts";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks.ts";
import CodeRenderer from "../Code/CodeRenderer.tsx";
import CodeTable from "../Code/CodeTable.tsx";
import { CRUDDialogActions } from "../dialogSlice.ts";
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
  const dispatch = useAppDispatch();

  // mutations
  const updateAnnotationBulkMutation = SpanAnnotationHooks.useUpdateBulkSpan();

  // snackbar
  const openSnackbar = useOpenSnackbar();

  // actions
  const handleClose = () => {
    dispatch(CRUDDialogActions.closeSpanAnnotationEditDialog());
    setRowSelectionModel({});
  };

  const handleUpdateAnnotations = () => {
    if (!selectedCodeId || annotationIds.length === 0) return;

    updateAnnotationBulkMutation.mutate(
      {
        requestBody: annotationIds.map((annotation) => ({
          span_annotation_id: annotation,
          code_id: selectedCodeId,
        })),
      },
      {
        onSuccess: () => {
          handleClose();
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
      />
      {annotationIds.length > 0 && (
        <>
          <Divider />
          <DialogTitle style={{ paddingBottom: 0 }}>Preview</DialogTitle>
          <Box px={3} mb={2}>
            Before:
            <SpanAnnotationRenderer spanAnnotation={annotationIds[0]} showCode showSpanText />
            After:
            {selectedCodeId ? (
              <Stack direction="row" alignItems="center">
                <CodeRenderer code={selectedCodeId} />
                {": "}
                <SpanAnnotationRenderer spanAnnotation={annotationIds[0]} showSpanText />
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
          onClick={handleUpdateAnnotations}
          disabled={!selectedCodeId}
          loading={updateAnnotationBulkMutation.isPending}
          loadingPosition="start"
        >
          Update Annotation
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}

export default SpanAnnotationEditDialog;
