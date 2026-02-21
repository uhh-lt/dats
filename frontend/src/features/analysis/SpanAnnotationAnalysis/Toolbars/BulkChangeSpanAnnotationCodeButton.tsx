import EditIcon from "@mui/icons-material/Edit";
import { IconButton, Tooltip } from "@mui/material";
import { useCallback } from "react";
import { SpanAnnotationRow } from "../../../../api/openapi/models/SpanAnnotationRow.ts";
import { useAppDispatch } from "../../../../plugins/ReduxHooks.ts";
import { CRUDDialogActions } from "../../../../store/dialogSlice.ts";
import { SpanAnnotationsActions } from "../spanAnnotationAnalysisSlice.ts";

interface BulkChangeSpanAnnotationCodeButtonProps {
  selectedData: SpanAnnotationRow[];
}

export function BulkChangeSpanAnnotationCodeButton({ selectedData }: BulkChangeSpanAnnotationCodeButtonProps) {
  // global client state (redux)
  const dispatch = useAppDispatch();

  // actions
  const handleEditSuccess = useCallback(() => {
    dispatch(SpanAnnotationsActions.onClearRowSelection());
  }, [dispatch]);

  const handleChangeCodeClick = () => {
    dispatch(
      CRUDDialogActions.openSpanAnnotationEditDialog({
        spanAnnotationIds: selectedData.map((row) => row.id),
        onEdit: handleEditSuccess,
      }),
    );
  };

  return (
    <>
      {selectedData.length > 0 && (
        <Tooltip
          title={`Change code of ${selectedData.length} span annotation` + (selectedData.length > 1 ? "s" : "")}
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
