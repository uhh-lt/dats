import EditIcon from "@mui/icons-material/Edit";
import { IconButton, Tooltip } from "@mui/material";
import { useCallback } from "react";
import { SATToolbarProps } from "../../../components/SpanAnnotation/SpanAnnotationTable/SATToolbar.tsx";
import { CRUDDialogActions } from "../../../components/dialogSlice.ts";
import { useAppDispatch } from "../../../plugins/ReduxHooks.ts";
import { SpanAnnotationsActions } from "./spanAnnotationAnalysisSlice.ts";

function BulkChangeSpanAnnotationCodeButton({ selectedAnnotations }: SATToolbarProps) {
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
    <>
      {selectedAnnotations.length > 0 && (
        <Tooltip
          title={
            `Change code of ${selectedAnnotations.length} span annotation` + (selectedAnnotations.length > 1 ? "s" : "")
          }
          placement="top"
        >
          <IconButton onClick={handleChangeCodeClick}>
            <EditIcon />
          </IconButton>
        </Tooltip>
      )}
    </>
  );
}

export default BulkChangeSpanAnnotationCodeButton;
