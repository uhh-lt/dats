import SaveIcon from "@mui/icons-material/Save";
import { LoadingButton } from "@mui/lab";
import { Box, Button, ButtonProps, Dialog, DialogActions, DialogTitle, Divider } from "@mui/material";
import { useEffect, useState } from "react";
import BboxAnnotationHooks from "../../../api/BboxAnnotationHooks.ts";
import { CodeRead } from "../../../api/openapi/models/CodeRead.ts";
import BBoxAnnotationRenderer from "../../../components/DataGrid/BBoxAnnotationRenderer.tsx";
import CodeSelector from "../../../components/Selectors/CodeSelector.tsx";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import SnackbarAPI from "../../Snackbar/SnackbarAPI.ts";
import { CRUDDialogActions } from "../dialogSlice.ts";

export interface BBoxAnnotationEditDialogProps extends ButtonProps {
  projectId: number;
}

function BBoxAnnotationEditDialog({ projectId }: BBoxAnnotationEditDialogProps) {
  // local state
  const [selectedCode, setSelectedCode] = useState<CodeRead | undefined>(undefined);

  // global client state (redux)
  const open = useAppSelector((state) => state.dialog.isBBoxAnnotationEditDialogOpen);
  const annotation = useAppSelector((state) => state.dialog.bboxAnnotation);
  const dispatch = useAppDispatch();

  useEffect(() => {
    setSelectedCode(annotation?.code);
  }, [annotation]);

  // mutations
  const updateAnnotationMutation = BboxAnnotationHooks.useUpdateBBox();

  const handleClose = () => {
    dispatch(CRUDDialogActions.closeBBoxAnnotationEditDialog());
  };

  const handleUpdateAnnotation = () => {
    if (!selectedCode || !annotation) return;

    updateAnnotationMutation.mutate(
      {
        bboxToUpdate: annotation,
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
      {!!annotation && (
        <>
          <Divider />
          <DialogTitle style={{ paddingBottom: 0 }}>Preview</DialogTitle>
          <Box px={3} mb={2}>
            Before:
            <BBoxAnnotationRenderer bboxAnnotation={annotation} />
            After:
            <BBoxAnnotationRenderer
              bboxAnnotation={selectedCode ? { ...annotation, code: selectedCode } : annotation}
            />
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
          disabled={!selectedCode || selectedCode?.id === annotation?.code.id}
          loading={updateAnnotationMutation.isPending}
          loadingPosition="start"
        >
          Update Annotation
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}

export default BBoxAnnotationEditDialog;
