import SaveIcon from "@mui/icons-material/Save";
import { LoadingButton } from "@mui/lab";
import { Box, Button, ButtonProps, Dialog, DialogActions, DialogTitle, Divider, Stack } from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import eventBus from "../../../EventBus";
import SpanAnnotationHooks from "../../../api/SpanAnnotationHooks";
import { CodeRead, SpanAnnotationReadResolved } from "../../../api/openapi";
import CodeRenderer from "../../../components/DataGrid/CodeRenderer";
import SpanAnnotationRenderer from "../../../components/DataGrid/SpanAnnotationRenderer";
import CodeSelector from "../../../components/Selectors/CodeSelector";
import SnackbarAPI from "../../Snackbar/SnackbarAPI";

export const openSpanAnnotationEditDialog = (spanAnnotationIds: number[]) => {
  eventBus.dispatch("open-edit-spanAnnotation", spanAnnotationIds);
};

export interface SpanAnnotationEditDialogProps extends ButtonProps {
  projectId: number;
}

function SpanAnnotationEditDialog({ projectId }: SpanAnnotationEditDialogProps) {
  // local state
  const [open, setOpen] = useState(false);
  const [selectedCode, setSelectedCode] = useState<CodeRead | undefined>(undefined);
  const [annotationIds, setAnnotationIds] = useState<number[]>([]);

  // listen to event
  // create a (memoized) function that stays the same across re-renders
  const onOpenEditAnnotation = useCallback((event: CustomEventInit<number[]>) => {
    if (!event.detail || event.detail.length === 0) return;

    setOpen(true);
    setAnnotationIds(event.detail);
    // setSelectedCode(event.detail[0].code);
  }, []);

  useEffect(() => {
    eventBus.on("open-edit-spanAnnotation", onOpenEditAnnotation);
    return () => {
      eventBus.remove("open-edit-spanAnnotation", onOpenEditAnnotation);
    };
  }, [onOpenEditAnnotation]);

  // mutations
  const updateAnnotationMutation = SpanAnnotationHooks.useUpdateSpan();

  const handleClose = () => {
    setOpen(false);
    setSelectedCode(undefined);
    setAnnotationIds([]);
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
          onSuccess: (data) => {
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
      <DialogTitle>Change the code of the annotation</DialogTitle>
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
          loading={updateAnnotationMutation.isLoading}
          loadingPosition="start"
        >
          Update Annotation
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}

export default SpanAnnotationEditDialog;
