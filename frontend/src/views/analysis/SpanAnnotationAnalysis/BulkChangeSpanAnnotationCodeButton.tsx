import EditIcon from "@mui/icons-material/Edit";
import { IconButton, Stack, Tooltip } from "@mui/material";
import { useCallback } from "react";
import { SATToolbarProps } from "../../../components/SpanAnnotation/SpanAnnotationTable/SATToolbar.tsx";
import { CRUDDialogActions } from "../../../components/dialogSlice.ts";
import { useAppDispatch } from "../../../plugins/ReduxHooks.ts";
import { SpanAnnotationsActions } from "./spanAnnotationAnalysisSlice.ts";

function BulkChangeSpanAnnotationCodeButton({ selectedAnnotations }: SATToolbarProps & { filterName: string }) {
  // global client state (redux)
  const dispatch = useAppDispatch();

  // actions
  const handleEditSuccess = useCallback(() => {
    dispatch(SpanAnnotationsActions.onClearRowSelection());
  }, [dispatch]);

  const handleChangeCodeClick = () => {
    dispatch(
      CRUDDialogActions.openSpanAnnotationEditDialog({
        spanAnnotationIds: selectedAnnotations.map((row) => row.id),
        onEdit: handleEditSuccess,
      }),
    );
  };

  return (
    <Stack direction={"row"} spacing={1} alignItems="center" p={0.5} height={48}>
      {selectedAnnotations.length > 0 && (
        <Tooltip title={`Change code of ${selectedAnnotations.length} span annotations`} placement="top">
          <IconButton onClick={handleChangeCodeClick}>
            <EditIcon />
          </IconButton>
        </Tooltip>
      )}
    </Stack>
  );
}

export default BulkChangeSpanAnnotationCodeButton;
