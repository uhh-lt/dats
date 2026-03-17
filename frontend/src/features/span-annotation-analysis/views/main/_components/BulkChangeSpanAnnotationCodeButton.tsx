import { SpanAnnotationRow } from "@api/models/SpanAnnotationRow";
import EditIcon from "@mui/icons-material/Edit";
import { IconButton, Tooltip } from "@mui/material";
import { useOpenDialog } from "@store/global/dialogBusSlice";
import { useAppDispatch } from "@store/storeHooks";
import { useCallback } from "react";
import { SpanAnnotationsActions } from "../../../store/spanAnnotationAnalysisSlice";

interface BulkChangeSpanAnnotationCodeButtonProps {
  selectedData: SpanAnnotationRow[];
}

export function BulkChangeSpanAnnotationCodeButton({ selectedData }: BulkChangeSpanAnnotationCodeButtonProps) {
  // global client state (redux)
  const dispatch = useAppDispatch();
  const openSpanAnnotationEdit = useOpenDialog("spanAnnotationEdit");

  // actions
  const handleEditSuccess = useCallback(() => {
    dispatch(SpanAnnotationsActions.onClearRowSelection());
  }, [dispatch]);

  const handleChangeCodeClick = () => {
    openSpanAnnotationEdit(
      {
        annotationIds: selectedData.map((row) => row.id),
      },
      handleEditSuccess,
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
