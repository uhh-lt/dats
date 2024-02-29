import SaveIcon from "@mui/icons-material/Save";
import { LoadingButton } from "@mui/lab";
import { Box, Button, ButtonProps, Dialog, DialogActions, DialogTitle, Divider, Stack } from "@mui/material";
import { useState } from "react";
import SpanAnnotationHooks from "../../../api/SpanAnnotationHooks.ts";
import { CodeRead } from "../../../api/openapi/models/CodeRead.ts";
import CodeRenderer from "../../../components/DataGrid/CodeRenderer.tsx";
import SpanAnnotationRenderer from "../../../components/DataGrid/SpanAnnotationRenderer.tsx";
import CodeSelector from "../../../components/Selectors/CodeSelector.tsx";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import SnackbarAPI from "../../Snackbar/SnackbarAPI.ts";
import { CRUDDialogActions } from "../dialogSlice.ts";

export interface SpanAnnotationEditDialogProps extends ButtonProps {
  projectId: number;
}

function SpanAnnotationEditDialog({ projectId }: SpanAnnotationEditDialogProps) {
  // local state
  const [selectedCode, setSelectedCode] = useState<CodeRead | undefined>(undefined);

  // global client state (redux)
  const open = useAppSelector((state) => state.dialog.isSpanAnnotationEditDialogOpen);
  const annotationIds = useAppSelector((state) => state.dialog.spanAnnotationIds);
  const dispatch = useAppDispatch();

  // mutations
  const updateAnnotationMutation = SpanAnnotationHooks.useUpdateSpan();

  const handleClose = () => {
    setSelectedCode(undefined);
    dispatch(CRUDDialogActions.closeSpanAnnotationEditDialog());
  };

  const handleUpdateAnnotations = () => {
    if (!selectedCode || annotationIds.length === 0) return;

    // TODO: We need bulk update for annotations
    annotationIds.forEach((annotation) => {
      updateAnnotationMutation.mutate(
        {
          spanAnnotationId: annotation,
          requestBody: {
            code_id: selectedCode.id,
          },
        },
        {
          onSuccess: () => {
            handleClose();
            SnackbarAPI.openSnackbar({
              text: `Updated annotation!`,
              severity: "success",
            });
          },
        },
      );
    });
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Changing the code of {annotationIds.length} annotation{annotationIds.length > 1 && "s"}
      </DialogTitle>
      <CodeSelector
        projectId={projectId}
        setSelectedCodes={(codes) => setSelectedCode(codes.length > 0 ? codes[0] : undefined)}
        allowMultiselect={false}
        height="400px"
      />
      {annotationIds.length > 0 && (
        <>
          <Divider />
          <DialogTitle style={{ paddingBottom: 0 }}>Preview</DialogTitle>
          <Box px={3} mb={2}>
            Before:
            <SpanAnnotationRenderer spanAnnotation={annotationIds[0]} />
            After:
            {selectedCode ? (
              <Stack direction="row" alignItems="center">
                <CodeRenderer code={selectedCode} />
                {": "}
                <SpanAnnotationRenderer spanAnnotation={annotationIds[0]} showCode={false} />
              </Stack>
            ) : (
              <>Select a code to preview the change.</>
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
          disabled={!selectedCode}
          loading={updateAnnotationMutation.isPending}
          loadingPosition="start"
        >
          Update Annotation
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}

export default SpanAnnotationEditDialog;
