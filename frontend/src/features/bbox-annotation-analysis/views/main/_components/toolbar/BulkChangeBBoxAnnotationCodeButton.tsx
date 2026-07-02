import { BBoxAnnotationRow } from "@models/BBoxAnnotationRow";
import EditIcon from "@mui/icons-material/Edit";
import { IconButton, Tooltip } from "@mui/material";
import { useOpenDialog } from "@store/global/dialogBusSlice";
import { useAppDispatch } from "@store/storeHooks";
import { useCallback } from "react";
import { BBoxAnnotationsActions } from "../../../../store/bboxAnnotationAnalysisSlice";

interface BulkChangeBBoxAnnotationCodeButtonProps {
  selectedData: BBoxAnnotationRow[];
}

export function BulkChangeBBoxAnnotationCodeButton({ selectedData }: BulkChangeBBoxAnnotationCodeButtonProps) {
  // global client state (redux)
  const dispatch = useAppDispatch();
  const openBBoxAnnotationEdit = useOpenDialog("bboxAnnotationEdit");

  // actions
  const handleEditSuccess = useCallback(() => {
    dispatch(BBoxAnnotationsActions.onClearRowSelection());
  }, [dispatch]);

  const handleChangeCodeClick = () => {
    openBBoxAnnotationEdit(
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
