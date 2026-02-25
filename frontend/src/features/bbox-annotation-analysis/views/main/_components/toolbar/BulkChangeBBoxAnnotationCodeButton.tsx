import EditIcon from "@mui/icons-material/Edit";
import { IconButton, Tooltip } from "@mui/material";
import { useAppDispatch } from "@plugins/redux";
import { useCallback } from "react";
import { BBoxAnnotationRow } from "../../../../../../api/openapi/models/BBoxAnnotationRow";
import { UIDialogActions } from "../../../../../../store/global/dialogSlice";
import { BBoxAnnotationsActions } from "../../../../store/bboxAnnotationAnalysisSlice";

interface BulkChangeBBoxAnnotationCodeButtonProps {
  selectedData: BBoxAnnotationRow[];
}

export function BulkChangeBBoxAnnotationCodeButton({ selectedData }: BulkChangeBBoxAnnotationCodeButtonProps) {
  // global client state (redux)
  const dispatch = useAppDispatch();

  // actions
  const handleEditSuccess = useCallback(() => {
    dispatch(BBoxAnnotationsActions.onClearRowSelection());
  }, [dispatch]);

  const handleChangeCodeClick = () => {
    dispatch(
      UIDialogActions.openBBoxAnnotationEditDialog({
        bboxAnnotationIds: selectedData.map((row) => row.id),
        onEdit: handleEditSuccess,
      }),
    );
  };

  return (
    <>
      {selectedData.length > 0 && (
        <Tooltip
          title={`Change code of ${selectedData.length} bbox annotation` + (selectedData.length > 1 ? "s" : "")}
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
