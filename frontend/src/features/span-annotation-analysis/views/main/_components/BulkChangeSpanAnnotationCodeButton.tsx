import EditIcon from "@mui/icons-material/Edit";
import { IconButton, Tooltip } from "@mui/material";
import { useAppDispatch } from "@plugins/redux";
import { useCallback } from "react";
import { SpanAnnotationRow } from "../../../../../api/openapi/models/SpanAnnotationRow";
import { UIDialogActions } from "../../../../../store/global/dialogSlice";
import { SpanAnnotationsActions } from "../../../store/spanAnnotationAnalysisSlice";

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
      UIDialogActions.openSpanAnnotationEditDialog({
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
