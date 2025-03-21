import SaveIcon from "@mui/icons-material/Save";
import { LoadingButton } from "@mui/lab";
import { Box, Button, Dialog, DialogActions, DialogTitle, Divider } from "@mui/material";
import { MRT_RowSelectionState } from "material-react-table";
import { memo, useCallback, useMemo, useState } from "react";
import BboxAnnotationHooks from "../../api/BboxAnnotationHooks.ts";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks.ts";
import CodeTable from "../Code/CodeTable.tsx";
import { CRUDDialogActions } from "../dialogSlice.ts";
import DATSDialogHeader from "../MUI/DATSDialogHeader.tsx";
import BBoxAnnotationRenderer from "./BBoxAnnotationRenderer.tsx";

export interface BBoxAnnotationEditDialogProps {
  projectId: number;
}

function BBoxAnnotationEditDialog({ projectId }: BBoxAnnotationEditDialogProps) {
  // local state
  const [rowSelectionModel, setRowSelectionModel] = useState<MRT_RowSelectionState>({});

  // memoized computed value
  const selectedCodeId = useMemo(
    () => (Object.keys(rowSelectionModel).length === 1 ? parseInt(Object.keys(rowSelectionModel)[0]) : undefined),
    [rowSelectionModel],
  );

  // global client state (redux)
  const open = useAppSelector((state) => state.dialog.isBBoxAnnotationEditDialogOpen);
  const annotation = useAppSelector((state) => state.dialog.bboxAnnotation);
  const dispatch = useAppDispatch();

  // mutations
  const updateAnnotationMutation = BboxAnnotationHooks.useUpdateBBoxAnnotation();

  // memoized actions
  const handleClose = useCallback(() => {
    dispatch(CRUDDialogActions.closeBBoxAnnotationEditDialog());
    setRowSelectionModel({});
  }, [dispatch]);

  const handleUpdateAnnotation = useCallback(() => {
    if (!selectedCodeId || !annotation) return;

    updateAnnotationMutation.mutate(
      {
        bboxToUpdate: annotation,
        requestBody: {
          code_id: selectedCodeId,
        },
      },
      {
        onSuccess: () => {
          handleClose();
        },
      },
    );
  }, [selectedCodeId, annotation, updateAnnotationMutation, handleClose]);

  // maximize dialog
  const [isMaximized, setIsMaximized] = useState(false);
  const handleToggleMaximize = () => {
    setIsMaximized((prev) => !prev);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth fullScreen={isMaximized}>
      <DATSDialogHeader
        title="Change the code of the annotation"
        onClose={handleClose}
        isMaximized={isMaximized}
        onToggleMaximize={handleToggleMaximize}
      />
      <CodeTable
        projectId={projectId}
        rowSelectionModel={rowSelectionModel}
        onRowSelectionChange={setRowSelectionModel}
      />
      {!!annotation && (
        <>
          <Divider />
          <DialogTitle style={{ paddingBottom: 0 }}>Preview</DialogTitle>
          <Box px={3} mb={2}>
            Before:
            <BBoxAnnotationRenderer bboxAnnotation={annotation} showCode showSpanText />
            After:
            {selectedCodeId ? (
              <BBoxAnnotationRenderer
                bboxAnnotation={{ ...annotation, code_id: selectedCodeId }}
                showCode
                showSpanText
              />
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
          onClick={handleUpdateAnnotation}
          disabled={!selectedCodeId || selectedCodeId === annotation?.code_id}
          loading={updateAnnotationMutation.isPending}
          loadingPosition="start"
        >
          Update Annotation
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}

export default memo(BBoxAnnotationEditDialog);
